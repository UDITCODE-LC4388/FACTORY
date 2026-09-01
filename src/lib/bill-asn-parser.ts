import { ASNFormData } from '@/types/asn.types';
import { Invoice, Factory, Party } from '@/types/database.types';

const INDIAN_CITIES = [
  'KOLKATA', 'HOWRAH', 'SALKIA', 'HOOGHLY', 'SHRIRAMPUR', 'SERAMPORE',
  'MUMBAI', 'THANE', 'BHIWANDI', 'PUNE', 'NAGPUR', 'NASHIK',
  'DELHI', 'NEW DELHI', 'GURUGRAM', 'GURGAON', 'NOIDA', 'GREATER NOIDA', 'FARIDABAD', 'GHAZIABAD',
  'SURAT', 'AHMEDABAD', 'VADODARA', 'RAJKOT',
  'JAIPUR', 'JODHPUR', 'BHILWARA', 'KISHANGARH',
  'TIRUPUR', 'CHENNAI', 'COIMBATORE', 'ERODE', 'SALEM', 'MADURAI',
  'BENGALURU', 'BANGALORE', 'MYSORE', 'BELGAUM',
  'HYDERABAD', 'SECUNDERABAD', 'WARANGAL',
  'LUDHIANA', 'AMRITSAR', 'JALANDHAR',
  'KANPUR', 'VARANASI', 'LUCKNOW', 'AGRA', 'MEERUT',
  'INDORE', 'BHOPAL', 'GWALIOR',
  'PATNA', 'RANCHI', 'GUWAHATI', 'BHUBANESWAR', 'CUTTACK',
];

/**
 * Formats a Date string into DD/MM/YYYY
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

  // If already in DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (slashMatch) {
    const d = String(slashMatch[1]).padStart(2, '0');
    const m = String(slashMatch[2]).padStart(2, '0');
    let y = slashMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}/${m}/${y}`;
  }

  // If in DD-MMM-YYYY format (e.g. 31-Aug-2026 or 10-Jun-2026 or 31 Aug 2026)
  const mmmMatch = clean.match(/^(\d{1,2})[-/\s.]([A-Za-z]{3,9})[-/\s.](\d{2,4})$/i);
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
    // ignore
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
    .replace(/^P\.O\.\s*(?:NO\.?|#|\:)\s*/i, '')
    .trim();
}

/**
 * Helper to extract Indian city from text or address line
 */
function extractCityFromText(text: string): string {
  const upper = text.toUpperCase();

  // 1. Scan known city list first
  for (const city of INDIAN_CITIES) {
    const wordRegex = new RegExp(`\\b${city}\\b`, 'i');
    if (wordRegex.test(upper)) {
      return city;
    }
  }

  // 2. Check for word before 6-digit Indian PIN code (e.g. HOWRAH-711106 or GURUGRAM - 122015)
  const pinMatch = upper.match(/([A-Z\s]{3,20})[-,\s]+(?:PIN\s*(?:CODE)?\s*[-:\s]*)?([1-9][0-9]{5})\b/);
  if (pinMatch && pinMatch[1]) {
    const candidate = pinMatch[1].trim().split(/[\n,]/).pop()?.trim() || '';
    if (candidate.length >= 3 && candidate.length <= 18) {
      return candidate;
    }
  }

  return '';
}

/**
 * Deterministically and accurately parses raw Tax Invoice text into structured ASN form data.
 * Zero hardcoded false defaults.
 */
export function parseBillTextToASN(
  rawText: string,
  fallbackFactory?: Partial<Factory>
): ASNFormData {
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  // -------------------------------------------------------------
  // 1. Vendor (Seller) Extraction
  // -------------------------------------------------------------
  let vendorName = '';
  let vendorCity = '';
  let vendorMobileNo = '';

  // Look for seller block at the top of the invoice (before Consignee/Buyer/Invoice No)
  const headerEndMarkers = [
    'Consignee',
    'Buyer',
    'Bill To',
    'Ship To',
    'Invoice No',
    'Bill No',
    'GSTIN/UIN',
    'GSTIN:',
    'State Name',
  ];

  let headerLines: string[] = [];
  for (const line of lines) {
    const isMarker = headerEndMarkers.some((m) =>
      line.toLowerCase().startsWith(m.toLowerCase())
    );
    if (isMarker && headerLines.length >= 1) break;
    if (
      !line.match(/^(?:TAX\s*INVOICE|INVOICE|ORIGINAL\s*FOR\s*RECIPIENT|DUPLICATE|TRIPLICATE)/i)
    ) {
      headerLines.push(line);
    }
  }

  if (headerLines.length > 0) {
    vendorName = headerLines[0].replace(/^M\/s\.?\s*/i, '').trim();
  }

  // Fallback to factory store name only if vendorName is empty or invalid
  if (!vendorName || vendorName.length < 2) {
    vendorName = fallbackFactory?.name || '';
  }

  // Extract seller city
  const headerText = headerLines.join('\n');
  vendorCity = extractCityFromText(headerText);
  if (!vendorCity && fallbackFactory) {
    vendorCity = extractCityFromText(fallbackFactory.address || '') || fallbackFactory.state || '';
  }

  // Extract seller mobile/phone
  const phoneMatch = cleanText.match(/(?:Phone|Ph|Tel|Mobile|Mob|Contact)\s*[:\s\-]*([0-9+\-\s]{10,15})/i);
  if (phoneMatch && phoneMatch[1]) {
    const digits = phoneMatch[1].replace(/[^0-9]/g, '');
    if (digits.length >= 10) {
      vendorMobileNo = digits.slice(-10);
    }
  }
  if (!vendorMobileNo && fallbackFactory?.phone) {
    vendorMobileNo = fallbackFactory.phone;
  }

  const bookingLocation = vendorCity || (fallbackFactory ? extractCityFromText(fallbackFactory.address || '') || fallbackFactory.state || '' : '');

  // -------------------------------------------------------------
  // 2. Invoice / Bill Number & Date
  // -------------------------------------------------------------
  let vendorBillNo = '';
  let vendorBillDate = '';

  const invNumMatch = cleanText.match(
    /(?:Invoice\s*(?:No\.?|Number|#)|Bill\s*(?:No\.?|Number|#)|Inv\s*No\.?|Tax\s*Invoice\s*No\.?|GST\s*Invoice\s*No\.?)\s*[:\s\n]*([A-Za-z0-9\/\-_.]+)/i
  );
  if (invNumMatch && invNumMatch[1]) {
    const cand = invNumMatch[1].trim();
    if (!cand.toLowerCase().includes('dated') && !cand.toLowerCase().includes('delivery') && cand.length >= 2) {
      vendorBillNo = cand;
    }
  }

  // Look for Invoice Date
  const invDateMatch = cleanText.match(
    /(?:Invoice\s*Date|Bill\s*Date|Dated)\s*[:\s\n]*([0-9]{1,2}[-/\s.][A-Za-z0-9]+[-/\s.][0-9]{2,4})/i
  );
  if (invDateMatch && invDateMatch[1]) {
    vendorBillDate = formatASNDate(invDateMatch[1]);
  } else {
    vendorBillDate = formatASNDate();
  }

  // -------------------------------------------------------------
  // 3. Buyer's Order No (PO NO) & PO Date
  // -------------------------------------------------------------
  let poNo = '';
  let poDate = '';

  // Pattern 1: Direct "PO NO. 3472" or "PO#: PO-7712" or "PO NUMBER: 12345" or "PO: 12345"
  const directPoMatch = cleanText.match(
    /\b(?:PO\s*(?:NO\.?|NUMBER|#|\:|\-|\/)*|P\.O\.\s*(?:NO\.?|NUMBER|#|\:|\-|\/)*)\s*([A-Za-z0-9\/\-_.]+)/i
  );
  if (directPoMatch && directPoMatch[1]) {
    const cand = cleanPONumber(directPoMatch[1]);
    if (cand && !cand.toLowerCase().includes('dated') && !cand.toLowerCase().includes('despatch') && cand.length >= 2) {
      poNo = cand;
    }
  }

  // Pattern 2: Buyer's Order No. / Order No.
  if (!poNo) {
    const buyerOrderMatch = cleanText.match(
      /(?:Buyer(?:’|')?s\s*Order\s*No\.?|Buyer\s*PO\s*No\.?|Order\s*No\.?|Order\s*#)\s*[:\s\n]*([A-Za-z0-9\/\-_.]+)/i
    );
    if (buyerOrderMatch && buyerOrderMatch[1]) {
      const cand = cleanPONumber(buyerOrderMatch[1]);
      if (cand && !cand.toLowerCase().includes('dated') && !cand.toLowerCase().includes('despatch') && cand.length >= 2) {
        poNo = cand;
      }
    }
  }

  // Look for PO Date (often a second "Dated" line after Buyer's Order No or explicit "PO Date" / "Order Date")
  const explicitPoDateMatch = cleanText.match(
    /(?:PO\s*Date|Order\s*Date|Buyer(?:’|')?s\s*Order\s*Date)\s*[:\s\n]*([0-9]{1,2}[-/\s.][A-Za-z0-9]+[-/\s.][0-9]{2,4})/i
  );
  if (explicitPoDateMatch && explicitPoDateMatch[1]) {
    poDate = formatASNDate(explicitPoDateMatch[1]);
  } else {
    // Collect all dates
    const allDates: string[] = [];
    const dateRegex = /(?:Dated|Date)\s*[:\s\n]*([0-9]{1,2}[-/\s.][A-Za-z0-9]+[-/\s.][0-9]{2,4})/gi;
    let dMatch;
    while ((dMatch = dateRegex.exec(cleanText)) !== null) {
      if (dMatch[1]) allDates.push(dMatch[1].trim());
    }
    if (allDates.length > 1) {
      poDate = formatASNDate(allDates[1]);
    } else {
      poDate = vendorBillDate;
    }
  }

  // -------------------------------------------------------------
  // 4. Consignee / Dispatch Location & Buyer
  // -------------------------------------------------------------
  let buyerName = '';
  let dispatchLocation = '';
  let emailRecipient = '';
  let contactPhone = '';

  const consigneeStartIdx = cleanText.search(/Consignee(?:\s*\(Ship to\))?/i);
  const buyerStartIdx = cleanText.search(/Buyer(?:\s*\(Bill to\)|\s*\(if other than consignee\))?/i);
  const invoiceStartIdx = cleanText.search(/(?:Invoice\s*No|Bill\s*No)/i);

  const cleanPartyLine = (line: string) => {
    return line
      .replace(/^(?:Bill\s*To\s*\/?\s*Ship\s*To|Bill\s*To|Ship\s*To|Consignee\s*\(Ship\s*to\)|Buyer\s*\(Bill\s*to\)|Consignee|Buyer)\s*[:\s\-]*/i, '')
      .replace(/^M\/s\.?\s*/i, '')
      .trim();
  };

  if (consigneeStartIdx !== -1) {
    const endIdx =
      buyerStartIdx > consigneeStartIdx
        ? buyerStartIdx
        : invoiceStartIdx > consigneeStartIdx
        ? invoiceStartIdx
        : consigneeStartIdx + 400;

    const consigneeBlock = cleanText.substring(consigneeStartIdx, endIdx);
    const cLines = consigneeBlock
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !l.match(/^(?:Consignee|GSTIN|State\s*Name|PAN|CIN)/i) &&
          !l.includes('GSTIN/UIN')
      )
      .map(cleanPartyLine)
      .filter(Boolean);

    if (cLines.length > 0) {
      buyerName = cLines[0];
      dispatchLocation = cLines.join('\n');
    }
  } else if (buyerStartIdx !== -1) {
    const endIdx = invoiceStartIdx > buyerStartIdx ? invoiceStartIdx : buyerStartIdx + 400;
    const buyerBlock = cleanText.substring(buyerStartIdx, endIdx);
    const bLines = buyerBlock
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.match(/^(?:Buyer|GSTIN|State\s*Name)/i))
      .map(cleanPartyLine)
      .filter(Boolean);

    if (bLines.length > 0) {
      buyerName = bLines[0];
      dispatchLocation = bLines.join('\n');
    }
  } else {
    // Check for "Bill To" or "Ship To"
    const billToMatch = cleanText.match(/(?:Bill\s*To\s*\/?\s*Ship\s*To|Bill\s*To|Ship\s*To)\s*[:\s\n]*([\s\S]*?)(?:Invoice\s*No|Bill\s*No|Total|Sl\s*No|\n\n)/i);
    if (billToMatch && billToMatch[1]) {
      const bLines = billToMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('GSTIN'))
        .map(cleanPartyLine)
        .filter(Boolean);
      if (bLines.length > 0) {
        buyerName = bLines[0];
        dispatchLocation = bLines.join('\n');
      }
    }
  }

  // Look for buyer email in document text
  const emailMatch = cleanText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  if (emailMatch && emailMatch[1]) {
    emailRecipient = emailMatch[1];
  }

  // -------------------------------------------------------------
  // 5. Quantities & Total Value
  // -------------------------------------------------------------
  let vendorBillQuantity: string | number = '';
  let vendorBillValue: string | number = '';

  // Pattern A: "Total 196.000 PCS ₹ 27,783.00" or "Total 800.00 PCS ₹ 2,10,000.00"
  const totalLineMatch = cleanText.match(
    /Total\s+([0-9,]+(?:\.[0-9]+)?)\s*(?:PCS|Units|SET|MTR|KG|DOZ|NOS|Pieces)?\s*(?:₹|INR|Rs\.?|\u20B9|\u012B)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
  );
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
    const qtyMatch = cleanText.match(
      /(?:Total\s*Quantity|Total\s*Qty|Qty\s*Total|Quantity\s*Total|Total\s*PCS)\s*[:\s]*([0-9,]+(?:\.[0-9]+)?)/i
    );
    if (qtyMatch && qtyMatch[1]) {
      vendorBillQuantity = Math.round(parseFloat(qtyMatch[1].replace(/,/g, '')) || 0);
    }
  }

  // Fallback for Total Amount / Value
  if (!vendorBillValue) {
    const valMatch = cleanText.match(
      /(?:Amount\s*Chargeable|Total\s*Amount|Grand\s*Total|Invoice\s*Total|Net\s*Payable|Net\s*Amount)\s*[:\s]*(?:₹|INR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{2})?)/i
    );
    if (valMatch && valMatch[1]) {
      vendorBillValue = Math.round(parseFloat(valMatch[1].replace(/,/g, '')) || 0);
    }
  }

  // -------------------------------------------------------------
  // 6. Logistics / Transport Details
  // -------------------------------------------------------------
  let transporterName = '';
  let transporterLrNo = '';
  let dateOfLr = '';
  let wayBillNo = '';
  let noOfCartons: string | number = '';
  let totalWeight: string | number = '';

  const transMatch = cleanText.match(
    /(?:Despatched\s*through|Transport(?:er)?(?:\s*Name)?|Carrier|Courier|Through|By\s*Transport)\s*[:\s\n]*([A-Za-z0-9\s.,&-]+?)(?:\n|LR|Despatch|Date|Mode|Terms|Vehicle|Destination|Delivery|Terms|$)/i
  );
  if (transMatch && transMatch[1]) {
    const cand = transMatch[1].trim();
    if (cand.length >= 2 && !cand.toLowerCase().includes('dated') && !cand.toLowerCase().includes('terms')) {
      transporterName = cand;
    }
  }

  const lrMatch = cleanText.match(
    /(?:Despatch\s*Document\s*No\.?|LR\s*(?:No\.?|Number|#)|GR\s*(?:No\.?|Number|#)|Bilty\s*No\.?|Docket\s*No\.?|RR\s*No\.?|CN\s*No\.?)\s*[:\s\n]*([A-Za-z0-9\/\-_.]+)/i
  );
  if (lrMatch && lrMatch[1]) {
    const cand = lrMatch[1].trim();
    if (cand.length >= 2 && !cand.toLowerCase().includes('dated')) {
      transporterLrNo = cand;
    }
  }

  const lrDateMatch = cleanText.match(
    /(?:Delivery\s*Note\s*Date|LR\s*Date|GR\s*Date|Date\s*of\s*LR)\s*[:\s\n]*([0-9]{1,2}[-/\s.][A-Za-z0-9]+[-/\s.][0-9]{2,4})/i
  );
  if (lrDateMatch && lrDateMatch[1]) {
    dateOfLr = formatASNDate(lrDateMatch[1]);
  }

  const ewbMatch = cleanText.match(
    /(?:E-?Way\s*Bill\s*No\.?|Way\s*Bill\s*No\.?|EWB\s*No\.?)\s*[:\s\n]*([0-9A-Za-z\/\-_.]+)/i
  );
  if (ewbMatch && ewbMatch[1]) {
    wayBillNo = ewbMatch[1].trim();
  }

  const cartonsMatch = cleanText.match(
    /(?:No\.?\s*of\s*(?:Cartons|Boxes|Packages|Cases|Bales|Bags|Pkgs)|Cartons|Packages)\s*[:\s\n]*([0-9]+)/i
  );
  if (cartonsMatch && cartonsMatch[1]) {
    noOfCartons = cartonsMatch[1].trim();
  }

  const weightMatch = cleanText.match(
    /(?:Total\s*Weight|Gross\s*Weight|Net\s*Weight|Weight)\s*[:\s\n]*([0-9.,]+\s*(?:KG|KGS|MT|TONS|GMS)?)/i
  );
  if (weightMatch && weightMatch[1]) {
    totalWeight = weightMatch[1].trim();
  }

  return {
    vendorName,
    vendorCity,
    bookingLocation,
    vendorMobileNo,
    asnNumber: '',
    asnDate: vendorBillDate || formatASNDate(),
    dispatchLocation,
    poNo,
    poDate: poDate || vendorBillDate || formatASNDate(),
    vendorBillNo,
    vendorBillDate: vendorBillDate || formatASNDate(),
    vendorBillValue: vendorBillValue || '',
    vendorBillQuantity: vendorBillQuantity || '',
    transporterName,
    transporterLrNo,
    dateOfLr,
    wayBillNo,
    noOfCartons,
    identificationMark: '',
    totalWeight,
    expectedLeadTimeDays: '',
    buyerName,
    emailRecipient,
    contactPhone,
  };
}

/**
 * Converts an existing Invoice record in FactoryOS into ASN form data.
 * Zero hardcoded false defaults.
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
    dispatchLocation = consigneeParty?.name || '';
  }

  const billDate = formatASNDate(invoice.date);
  const poDate = formatASNDate(invoice.buyer_order_date || invoice.date);

  const factoryCity = (extractCityFromText(factory.address || '') || factory.state || '').toUpperCase();

  return {
    vendorName: factory.name || '',
    vendorCity: factoryCity,
    bookingLocation: factoryCity,
    vendorMobileNo: factory.phone || '',
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
    buyerName: buyerParty?.name || consigneeParty?.name || '',
    emailRecipient: '',
    contactPhone: buyerParty?.phone || consigneeParty?.phone || '',
  };
}
