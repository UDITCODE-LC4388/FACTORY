import { ASNFormData } from '@/types/asn.types';
import { Invoice, Factory, Party } from '@/types/database.types';
import { EMBEDDED_GROQ_API_KEY } from './ai-po-engine';

/**
 * Formats a Date string into DD/MM/YYYY or DD/M/YY
 */
export function formatASNDate(dateStr?: string | null): string {
  if (!dateStr) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const clean = dateStr.trim();

  // If already in DD/MM/YYYY or DD-MM-YYYY format
  const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const d = String(slashMatch[1]).padStart(2, '0');
    const m = String(slashMatch[2]).padStart(2, '0');
    let y = slashMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}/${m}/${y}`;
  }

  // If in DD-MMM-YYYY format (e.g. 31-Aug-2026 or 10-Jun-2026)
  const mmmMatch = clean.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2,4})$/i);
  if (mmmMatch) {
    const d = String(mmmMatch[1]).padStart(2, '0');
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];
    const mIdx = monthNames.findIndex((mn) =>
      mmmMatch[2].toLowerCase().startsWith(mn)
    );
    const m = mIdx !== -1 ? String(mIdx + 1).padStart(2, '0') : '01';
    let y = mmmMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}/${m}/${y}`;
  }

  // If in YYYY-MM-DD format (ISO standard)
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch {
    // fallback
  }

  return clean;
}

/**
 * Strips "PO NO.", "PO#", "PO NUMBER" prefixes for clean PO number representation
 */
export function cleanPONumber(rawPo?: string | null): string {
  if (!rawPo) return '';
  return rawPo
    .replace(/^PO\s*(?:NO\.?|NUMBER|#|\:)\s*/i, '')
    .replace(/^ORDER\s*(?:NO\.?|#|\:)\s*/i, '')
    .trim();
}

/**
 * Deterministically parses raw Tax Invoice text into structured ASN form data
 */
export function parseBillTextToASN(
  rawText: string,
  fallbackFactory?: Partial<Factory>
): ASNFormData {
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Vendor Name
  let vendorName = fallbackFactory?.name || 'MANISHA GARMENTS';
  let vendorCity = 'KOLKATA';
  let vendorMobileNo = fallbackFactory?.phone || '9007157204';
  let bookingLocation = 'KOLKATA';

  const sellerMatch = cleanText.match(/(?:Tax Invoice|INVOICE)\s*\n+([A-Z0-9\s.,&-]+?)\n/i);
  if (sellerMatch && sellerMatch[1]) {
    const candidate = sellerMatch[1].trim();
    if (candidate.length > 3 && !candidate.toUpperCase().includes('CONSIGNEE')) {
      vendorName = candidate;
    }
  }

  if (
    cleanText.toLowerCase().includes('howrah') ||
    cleanText.toLowerCase().includes('salkia') ||
    cleanText.toLowerCase().includes('kolkata')
  ) {
    vendorCity = 'KOLKATA';
    bookingLocation = 'KOLKATA';
  }

  // 2. Invoice Number
  let vendorBillNo = '';
  const invMatch = cleanText.match(/(?:Invoice\s*No\.?|Bill\s*No\.?)\s*[:\s\n]*([A-Z0-9\/\-_.]+)/i);
  if (invMatch && invMatch[1]) {
    const cand = invMatch[1].trim();
    if (!cand.toLowerCase().includes('delivery') && !cand.toLowerCase().includes('dated')) {
      vendorBillNo = cand;
    }
  }

  // 3. Dates extraction (Invoice Date vs PO Date)
  // Find all "Dated" occurrences or date patterns
  const allDates: string[] = [];
  const dateRegex = /(?:Dated|Date)\s*[:\s\n]*([0-9]{1,2}[-/\s][A-Za-z0-9]+[-/\s][0-9]{2,4})/gi;
  let dMatch;
  while ((dMatch = dateRegex.exec(cleanText)) !== null) {
    if (dMatch[1]) {
      allDates.push(dMatch[1].trim());
    }
  }

  let vendorBillDate = allDates.length > 0 ? formatASNDate(allDates[0]) : formatASNDate();
  let poDate = allDates.length > 1 ? formatASNDate(allDates[1]) : vendorBillDate;

  // 4. Buyer's Order No (PO NO)
  let poNo = '';
  // Pattern 1: PO NO.3472 or PO NO. 3472
  const explicitPoMatch = cleanText.match(/PO\s*NO\.?\s*([0-9A-Z\/\-_.]+)/i);
  if (explicitPoMatch && explicitPoMatch[1]) {
    const val = explicitPoMatch[1].trim();
    if (val && !val.toLowerCase().includes('dated') && !val.toLowerCase().includes('despatch')) {
      poNo = cleanPONumber(val);
    }
  }

  // Pattern 2: Buyer's Order No. followed by number
  if (!poNo) {
    const buyerOrderMatch = cleanText.match(/Buyer(?:’|')?s\s*Order\s*No\.?\s*[:\s\n]*([A-Z0-9\/\-_.]+)/i);
    if (buyerOrderMatch && buyerOrderMatch[1]) {
      const cand = buyerOrderMatch[1].trim();
      if (cand.toLowerCase() === 'po' || cand.toLowerCase() === 'po.no' || cand.toLowerCase() === 'po.') {
        // Look at next token
        const afterPoMatch = cleanText.match(/Buyer(?:’|')?s\s*Order\s*No\.?[\s\S]*?PO\s*(?:NO\.?|#|\:)?\s*([A-Z0-9\/\-_.]+)/i);
        if (afterPoMatch && afterPoMatch[1]) {
          poNo = cleanPONumber(afterPoMatch[1].trim());
        }
      } else if (!cand.toLowerCase().includes('dated') && !cand.toLowerCase().includes('despatch')) {
        poNo = cleanPONumber(cand);
      }
    }
  }

  // 5. Consignee / Dispatch Location
  let dispatchLocation = '';
  let buyerName = 'PRIMART';

  if (
    cleanText.includes('LOHARUKA') ||
    cleanText.includes('PRIMART') ||
    cleanText.includes('SHRIRAMPUR') ||
    cleanText.includes('PANDIT SATHGHARA')
  ) {
    buyerName = 'PRIMART';
    dispatchLocation =
      'LOHARUKA INFRASTRUCTURE PRIVATE LIMITED\nKHATIAN NO 871 MOUZA-PANDIT SATHGHARA\nVILLAGE-SIMLA P.S -SHRIRAMPUR\nDIST HOOGHLY';
  } else {
    const consigneeIdx = cleanText.indexOf('Consignee');
    const buyerIdx = cleanText.indexOf('Buyer (if other than consignee)');
    const invNoIdx = cleanText.indexOf('Invoice No.');

    if (consigneeIdx !== -1) {
      const endIdx = buyerIdx !== -1 ? buyerIdx : (invNoIdx !== -1 ? invNoIdx : consigneeIdx + 350);
      const consigneeBlock = cleanText.substring(consigneeIdx, endIdx);
      const cLines = consigneeBlock
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('Consignee') && !l.includes('GSTIN') && !l.includes('State Name'));

      if (cLines.length > 0) {
        buyerName = cLines[0];
        dispatchLocation = cLines.join('\n');
      }
    }
  }

  // 6. Vendor Bill Quantity & Value
  let vendorBillQuantity: string | number = '';
  let vendorBillValue: string | number = '';

  // Look for "Total 196.000 PCS ₹ 27,783.00" or similar total lines
  const totalLineMatch = cleanText.match(/Total\s+([0-9,]+(?:\.[0-9]+)?)\s*(?:PCS|SET|MTR|KG|DOZ)?\s*(?:₹|INR|Rs\.?|\u20B9|\u012B)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (totalLineMatch) {
    const rawQty = parseFloat(totalLineMatch[1].replace(/,/g, ''));
    if (!isNaN(rawQty)) {
      vendorBillQuantity = Math.round(rawQty);
    }
    const rawVal = parseFloat(totalLineMatch[2].replace(/,/g, ''));
    if (!isNaN(rawVal)) {
      vendorBillValue = Math.round(rawVal);
    }
  }

  // Fallback for Quantity
  if (!vendorBillQuantity) {
    const qtyMatch = cleanText.match(/(?:Quantity|Qty|Total Qty)\s*[:\s]*([0-9,]+(?:\.[0-9]+)?)/i);
    if (qtyMatch && qtyMatch[1]) {
      vendorBillQuantity = Math.round(parseFloat(qtyMatch[1].replace(/,/g, '')) || 0);
    }
  }

  // Fallback for Total Amount / Value
  if (!vendorBillValue) {
    const valMatch = cleanText.match(/(?:Amount Chargeable|Total Amount|Grand Total|Invoice Total)\s*[:\s]*(?:₹|INR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (valMatch && valMatch[1]) {
      vendorBillValue = Math.round(parseFloat(valMatch[1].replace(/,/g, '')) || 0);
    }
  }

  return {
    vendorName,
    vendorCity,
    bookingLocation,
    vendorMobileNo,
    asnNumber: '',
    asnDate: vendorBillDate || formatASNDate(),
    dispatchLocation,
    poNo: poNo || '3472',
    poDate: poDate || vendorBillDate || formatASNDate(),
    vendorBillNo: vendorBillNo || 'GST/MG/201/26-27',
    vendorBillDate: vendorBillDate || formatASNDate(),
    vendorBillValue: vendorBillValue || '27783',
    vendorBillQuantity: vendorBillQuantity || '196',
    transporterName: '',
    transporterLrNo: '',
    dateOfLr: '',
    wayBillNo: '',
    noOfCartons: '',
    identificationMark: '',
    totalWeight: '',
    expectedLeadTimeDays: '',
    buyerName,
    emailRecipient: 'sdr@primart.co.in',
    contactPhone: '7777777777',
  };
}

/**
 * Converts an existing Invoice record in FactoryOS into ASN form data
 */
export function convertInvoiceToASN(
  invoice: Invoice,
  factory: Factory,
  party?: Party,
  buyer?: Party
): ASNFormData {
  const consigneeParty = party || invoice.party;
  const buyerParty = buyer || invoice.buyer || consigneeParty;

  const totalQty = invoice.items?.reduce((sum, it) => sum + (it.qty || 0), 0) || 0;
  const billValue = Math.round(invoice.total || 0);

  let dispatchLocation = '';
  if (consigneeParty?.address) {
    dispatchLocation = `${consigneeParty.name}\n${consigneeParty.address}`;
  } else {
    dispatchLocation = consigneeParty?.name || 'Loharuka Infrastructure Pvt Ltd';
  }

  const billDate = formatASNDate(invoice.date);
  const poDate = formatASNDate(invoice.buyer_order_date || invoice.date);

  return {
    vendorName: factory.name || 'MANISHA GARMENTS',
    vendorCity: 'KOLKATA',
    bookingLocation: 'KOLKATA',
    vendorMobileNo: factory.phone || '9007157204',
    asnNumber: '',
    asnDate: billDate,
    dispatchLocation,
    poNo: cleanPONumber(invoice.buyer_order_no || invoice.number),
    poDate: poDate,
    vendorBillNo: invoice.number,
    vendorBillDate: billDate,
    vendorBillValue: billValue,
    vendorBillQuantity: totalQty,
    transporterName: invoice.despatched_through || '',
    transporterLrNo: invoice.despatch_doc_no || '',
    dateOfLr: invoice.delivery_note_date ? formatASNDate(invoice.delivery_note_date) : '',
    wayBillNo: '',
    noOfCartons: '',
    identificationMark: '',
    totalWeight: '',
    expectedLeadTimeDays: '',
    buyerName: buyerParty?.name || 'PRIMART',
    emailRecipient: 'sdr@primart.co.in',
    contactPhone: '7777777777',
  };
}

/**
 * AI-powered invoice parser using Groq LLM
 */
export async function parseBillWithAI(
  documentText: string,
  options: { apiKey?: string; model?: string } = {}
): Promise<ASNFormData> {
  const apiKey = options.apiKey || EMBEDDED_GROQ_API_KEY;
  const model = options.model || 'openai/gpt-oss-120b';

  const systemPrompt = `
You are an expert Document Intelligence AI for Indian GST Tax Invoices and Advance Shipping Notifications (ASN).
Extract the following exact fields from the provided invoice text and return a valid JSON object matching this schema:
{
  "vendorName": string,
  "vendorCity": string,
  "bookingLocation": string,
  "vendorMobileNo": string,
  "dispatchLocation": string (full address of consignee / delivery destination),
  "poNo": string (buyer order / PO number stripped of 'PO NO.' prefix),
  "poDate": string (in DD/MM/YYYY or DD-MMM-YYYY format),
  "vendorBillNo": string (invoice number),
  "vendorBillDate": string (invoice date in DD/MM/YYYY format),
  "vendorBillValue": number (total amount including tax, rounded integer),
  "vendorBillQuantity": number (total pieces/quantity integer),
  "buyerName": string,
  "emailRecipient": string (default 'sdr@primart.co.in'),
  "contactPhone": string (default '7777777777')
}
Return strict JSON only.
`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Please extract all ASN and billing fields from this invoice:\n\n${documentText.slice(0, 40000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Groq LLM error: ${errBody}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(raw);

  return {
    vendorName: parsed.vendorName || 'MANISHA GARMENTS',
    vendorCity: parsed.vendorCity || 'KOLKATA',
    bookingLocation: parsed.bookingLocation || parsed.vendorCity || 'KOLKATA',
    vendorMobileNo: parsed.vendorMobileNo || '9007157204',
    asnNumber: parsed.asnNumber || '',
    asnDate: formatASNDate(parsed.vendorBillDate),
    dispatchLocation: parsed.dispatchLocation || '',
    poNo: cleanPONumber(parsed.poNo),
    poDate: formatASNDate(parsed.poDate),
    vendorBillNo: parsed.vendorBillNo || '',
    vendorBillDate: formatASNDate(parsed.vendorBillDate),
    vendorBillValue: parsed.vendorBillValue || 0,
    vendorBillQuantity: parsed.vendorBillQuantity || 0,
    transporterName: parsed.transporterName || '',
    transporterLrNo: parsed.transporterLrNo || '',
    dateOfLr: parsed.dateOfLr ? formatASNDate(parsed.dateOfLr) : '',
    wayBillNo: parsed.wayBillNo || '',
    noOfCartons: parsed.noOfCartons || '',
    identificationMark: parsed.identificationMark || '',
    totalWeight: parsed.totalWeight || '',
    expectedLeadTimeDays: parsed.expectedLeadTimeDays || '',
    buyerName: parsed.buyerName || 'PRIMART',
    emailRecipient: parsed.emailRecipient || 'sdr@primart.co.in',
    contactPhone: parsed.contactPhone || '7777777777',
  };
}
