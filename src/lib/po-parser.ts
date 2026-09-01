import { INDIAN_STATES } from './gst';

export interface ParsedPOLineItem {
  description: string;
  hsn_code: string;
  qty: number;
  unit_symbol: string;
  price: number;
  discount_percent: number;
  gst_percent: number;
}

export interface ParsedPurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  consigneeState: string;
  consigneeStateCode: string;
  consigneePan?: string;
  
  isThroughBuyer: boolean;
  buyerName?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  buyerState?: string;
  buyerStateCode?: string;
  buyerPan?: string;

  termsOfDelivery?: string;
  placeOfSupply?: string;
  supplierRef?: string;
  despatchDetails?: string;

  items: ParsedPOLineItem[];
  rawText?: string;
}

/**
 * Extracts standard 15-digit Indian GSTIN from text
 */
export function extractGSTIN(text: string): string | null {
  const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i;
  const match = text.match(gstinRegex);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Derives 10-digit PAN from 15-digit GSTIN (characters 3-12)
 */
export function panFromGSTIN(gstin?: string | null): string {
  if (!gstin || gstin.length < 12) return '';
  return gstin.substring(2, 12).toUpperCase();
}

/**
 * Derives state name & code from 2-digit GST prefix or state string
 */
export function getStateFromGSTINOrName(gstinOrState?: string): { name: string; code: string } {
  if (!gstinOrState) return { name: 'West Bengal', code: '19' };
  
  // Try matching 2-digit code
  const codeMatch = gstinOrState.match(/^([0-9]{2})/);
  if (codeMatch) {
    const found = INDIAN_STATES.find((s) => s.code === codeMatch[1]);
    if (found) return found;
  }

  // Try matching state name
  const nameClean = gstinOrState.toLowerCase();
  const foundByName = INDIAN_STATES.find((s) => nameClean.includes(s.name.toLowerCase()));
  if (foundByName) return foundByName;

  return { name: 'West Bengal', code: '19' };
}

/**
 * Parses raw text from a single PO / Invoice section
 */
export function parseSinglePOText(rawText: string, index: number = 1): ParsedPurchaseOrder {
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. PO Number / Order Number
  let orderNumber = '';
  const poNumMatch = cleanText.match(/(?:Order\s*No\.?|Buyer(?:’|')?s Order No\.?|PO\s*NO\.?|PO\s*NUMBER|PO\s*#)\s*[:\s]*([A-Z0-9\/\-_.]+)/i);
  if (poNumMatch && poNumMatch[1]) {
    const candidate = poNumMatch[1].trim().split(/\s+Date/i)[0].replace(/^(?:NO|NO\.|\:)\s*/i, '').trim();
    if (candidate && !candidate.toLowerCase().includes('despatch') && candidate.length >= 3) {
      orderNumber = candidate;
    }
  }

  if (!orderNumber) {
    const looseMatch = cleanText.match(/\b(PO\/[0-9]{4,10}\/[0-9]{2}-[0-9]{2}|PO\/[A-Z0-9\/\-_.]+)\b/i);
    if (looseMatch && looseMatch[1]) {
      orderNumber = looseMatch[1].trim();
    }
  }

  if (!orderNumber) {
    const invMatch = cleanText.match(/(?:Invoice No\.?)\s*[:\s]*([A-Z0-9\/\-_.]+)/i);
    if (invMatch && invMatch[1]) {
      orderNumber = `PO-${invMatch[1].trim()}`;
    } else {
      orderNumber = `PO-${new Date().getFullYear()}-${String(index).padStart(3, '0')}`;
    }
  }

  // 2. Order Date
  let orderDate = new Date().toISOString().split('T')[0];
  const dateMatch = cleanText.match(/(?:Date|Dated|Order Date|PO Date)\s*[:\s]*([0-9]{1,2}[-/\s][A-Za-z0-9]+[-/\s][0-9]{2,4})/i);
  if (dateMatch && dateMatch[1]) {
    orderDate = dateMatch[1].trim();
  }

  // 3. Consignee (Ship To) Extraction
  let consigneeName = '';
  let consigneeAddress = '';
  let consigneeGstin = '';
  let consigneeState = 'West Bengal';
  let consigneeStateCode = '19';

  // Check for Primart / Loharuka / Warehouse layout
  if (cleanText.includes('LIPL Shrirampur') || cleanText.includes('Loharuka Infrastructure') || cleanText.includes('Primart')) {
    consigneeName = 'PRIMART (Loharuka Infrastructure Pvt Ltd)';
    consigneeAddress = 'Khatian No. 871 Mouza- Pandit Sathghara, Village-Simla, P.S. Serampore, Dist: Hooghly- Pin-712203, West Bengal';
    consigneeGstin = '19AABCG6822C2ZT';
    consigneeState = 'West Bengal';
    consigneeStateCode = '19';
  } else {
    const consigneeIdx = cleanText.indexOf('Consignee');
    const buyerIdx = cleanText.indexOf('Buyer (if other than consignee)');
    const invNoIdx = cleanText.indexOf('Invoice No.');

    if (consigneeIdx !== -1) {
      const endConsigneeIdx = buyerIdx !== -1 ? buyerIdx : (invNoIdx !== -1 ? invNoIdx : consigneeIdx + 400);
      const consigneeBlock = cleanText.substring(consigneeIdx, endConsigneeIdx);
      const blockLines = consigneeBlock.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('Consignee'));

      if (blockLines.length > 0) {
        consigneeName = blockLines[0];
        const addrLines: string[] = [];
        for (let i = 1; i < blockLines.length; i++) {
          const line = blockLines[i];
          if (line.includes('GSTIN') || line.includes('State Name')) break;
          addrLines.push(line);
        }
        consigneeAddress = addrLines.join(', ');
      }

      const gstin = extractGSTIN(consigneeBlock);
      if (gstin) {
        consigneeGstin = gstin;
        const stateObj = getStateFromGSTINOrName(gstin);
        consigneeState = stateObj.name;
        consigneeStateCode = stateObj.code;
      }
    }
  }

  // Fallback GSTIN search if not found yet
  if (!consigneeGstin) {
    const gstin = extractGSTIN(cleanText);
    if (gstin && gstin !== '19AGGPB3696R1ZM') { // not seller GSTIN
      consigneeGstin = gstin;
      const stateObj = getStateFromGSTINOrName(gstin);
      consigneeState = stateObj.name;
      consigneeStateCode = stateObj.code;
    }
  }

  // 4. Buyer (Bill To) Extraction
  let isThroughBuyer = false;
  let buyerName = '';
  let buyerAddress = '';
  let buyerGstin = '';
  let buyerState = '';
  let buyerStateCode = '';

  const buyerIdx = cleanText.indexOf('Buyer (if other than consignee)');
  const invNoIdx = cleanText.indexOf('Invoice No.');

  if (buyerIdx !== -1) {
    const endBuyerIdx = invNoIdx !== -1 ? invNoIdx : buyerIdx + 400;
    const buyerBlock = cleanText.substring(buyerIdx, endBuyerIdx);
    const blockLines = buyerBlock.split('\n').map((l) => l.trim()).filter((l) => l && !l.includes('Buyer (if other'));

    if (blockLines.length > 0) {
      buyerName = blockLines[0];
      const addrLines: string[] = [];
      for (let i = 1; i < blockLines.length; i++) {
        const line = blockLines[i];
        if (line.includes('GSTIN') || line.includes('State Name')) break;
        addrLines.push(line);
      }
      buyerAddress = addrLines.join(', ');
    }

    const gstin = extractGSTIN(buyerBlock);
    if (gstin && gstin !== '19AGGPB3696R1ZM') {
      buyerGstin = gstin;
      const stateObj = getStateFromGSTINOrName(gstin);
      buyerState = stateObj.name;
      buyerStateCode = stateObj.code;
    }

    if (buyerName && consigneeName && buyerName.toLowerCase() !== consigneeName.toLowerCase()) {
      isThroughBuyer = true;
    }
  }

  // 5. Terms of Delivery & Place of Supply
  let termsOfDelivery = '';
  let placeOfSupply = '';
  const posMatch = cleanText.match(/(?:PLACE OF SUPPLY|Terms of Delivery)\s*[:\s]*([A-Z\s]+)/i);
  if (posMatch && posMatch[1]) {
    const cleanPos = posMatch[1].replace(/\n/g, ' ').trim().slice(0, 40);
    if (cleanPos && !cleanPos.includes('Description') && !cleanPos.includes('Vendor')) {
      termsOfDelivery = `PLACE OF SUPPLY\n${cleanPos.replace(/PLACE OF SUPPLY/i, '').trim() || (buyerState || consigneeState).toUpperCase()}`;
      placeOfSupply = cleanPos.replace(/PLACE OF SUPPLY/i, '').trim() || (buyerState || consigneeState).toUpperCase();
    }
  }

  if (!termsOfDelivery && isThroughBuyer && buyerState) {
    termsOfDelivery = `PLACE OF SUPPLY\n${buyerState.toUpperCase()}`;
    placeOfSupply = buyerState.toUpperCase();
  }

  // 6. Line Items Extraction
  const items: ParsedPOLineItem[] = [];

  // Look for HSN in document (e.g. from HSN table or line)
  let defaultHsn = '610439';
  const hsnTableMatch = cleanText.match(/\b(61\d{4,6}|62\d{4,6})\b/);
  if (hsnTableMatch) {
    defaultHsn = hsnTableMatch[1];
  }

  // Check Table Format A: Primart / Retail Format
  // "JB_PYJAMA P386043 MG-76 NAVY 2-3 Y Q2(26-27) 112.00 195 349 21840.00"
  // "JB_BABA_SUIT_H/S P386204 MG-95 CREAM 2-3 Y Q2(26-27) 64.00 170 299 10880.00"
  for (const line of lines) {
    const primartMatch = line.match(/^([A-Z0-9_\/]+)\s+([A-Z0-9]+)\s+([A-Z0-9\-_]+)\s+([A-Z0-9\s\-_]+?)\s+([0-9\-]+\s*[Y|M|T|S|XL|XXL|L|M|XS]?)\s+([A-Z0-9\(\)\-_]+)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/i);
    
    if (primartMatch) {
      const dept = primartMatch[1];
      const barcode = primartMatch[2];
      const style = primartMatch[3];
      const color = primartMatch[4].trim();
      const size = primartMatch[5].trim();
      const qty = parseFloat(primartMatch[7]) || 1;
      const rate = parseFloat(primartMatch[8]) || 150;

      items.push({
        description: `${dept} ${style} ${color} (${size})`,
        hsn_code: defaultHsn,
        qty,
        unit_symbol: 'PCS',
        price: rate,
        discount_percent: 0,
        gst_percent: 5.0,
      });
    }
  }

  // If no Primart items found, check Format B: Standard Tax Invoice table
  // "1 STYLE NO 3125A(22X28)OLIVE 60,528.003 %PCS195.00320.000 PCS610990"
  if (items.length === 0) {
    const lineItemRegex = /^\d+\s+(.*?)\s+([0-9,]+\.[0-9]{2})(?:\s*([0-9]+(?:\.[0-9]+)?)\s*%)?(?:\s*(?:PCS|SET|MTR|KG|DOZ))?\s*([0-9,]+\.[0-9]{2})\s*([0-9,]+(?:\.[0-9]+)?)\s*(PCS|SET|MTR|KG|DOZ)\s*(\d{4,8})/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(lineItemRegex);

      if (match) {
        const desc = match[1].trim();
        const discount = match[3] ? parseFloat(match[3]) : 0;
        const rate = parseFloat(match[4].replace(/,/g, '')) || 150;
        const qty = parseFloat(match[5].replace(/,/g, '')) || 100;
        const unit = match[6] || 'PCS';
        const hsn = match[7] || defaultHsn;

        let nextLineDesc = '';
        if (
          i + 1 < lines.length &&
          !/^\d+\s+/.test(lines[i + 1]) &&
          !/CGST|SGST|IGST|Total|Less/i.test(lines[i + 1])
        ) {
          nextLineDesc = lines[i + 1];
          i++;
        }

        items.push({
          description: nextLineDesc ? `${desc}\n${nextLineDesc}` : desc,
          hsn_code: hsn,
          qty,
          unit_symbol: unit,
          price: rate,
          discount_percent: discount,
          gst_percent: 5.0,
        });
      }
    }
  }

  // Fallback defaults if still no items found
  if (items.length === 0) {
    items.push({
      description: 'Garment Ready Goods (Parsed from PO)',
      hsn_code: defaultHsn,
      qty: 100,
      unit_symbol: 'PCS',
      price: 150,
      discount_percent: 0,
      gst_percent: 5.0,
    });
  }

  return {
    id: crypto.randomUUID(),
    orderNumber: orderNumber || `PO-${new Date().getFullYear()}-${String(index).padStart(3, '0')}`,
    orderDate,
    consigneeName: consigneeName || 'Loharuka Infrastructure Pvt Ltd (Primart)',
    consigneeAddress: consigneeAddress || 'Khatian No. 871 Mouza- Pandit Sathghara, Serampore, Hooghly, West Bengal',
    consigneeGstin: consigneeGstin || '19AABCG6822C2ZT',
    consigneeState,
    consigneeStateCode,
    consigneePan: panFromGSTIN(consigneeGstin),
    isThroughBuyer,
    buyerName: isThroughBuyer ? buyerName : undefined,
    buyerAddress: isThroughBuyer ? buyerAddress : undefined,
    buyerGstin: isThroughBuyer ? buyerGstin : undefined,
    buyerState: isThroughBuyer ? buyerState : undefined,
    buyerStateCode: isThroughBuyer ? buyerStateCode : undefined,
    buyerPan: isThroughBuyer ? panFromGSTIN(buyerGstin) : undefined,
    termsOfDelivery,
    placeOfSupply,
    items,
    rawText,
  };
}

/**
 * Splits multi-page / multi-order text into an array of separate ParsedPurchaseOrder objects
 */
export function parseMultiOrderPOText(pagesText: string[] | string): ParsedPurchaseOrder[] {
  // If array of page texts is passed
  if (Array.isArray(pagesText)) {
    const poGroups: { [key: string]: string[] } = {};
    let currentOrderNo = '';

    pagesText.forEach((pageText, pIdx) => {
      if (!pageText || pageText.trim().length < 10) return;

      const orderMatch = pageText.match(/(?:Order\s*No\.?|PO\s*No\.?|Buyer(?:’|')?s Order No\.?)\s*[:\s]*([A-Z0-9\/\-_.]+)/i);
      if (orderMatch && orderMatch[1]) {
        currentOrderNo = orderMatch[1].trim();
      } else if (!currentOrderNo) {
        currentOrderNo = `PO-ORDER-${pIdx + 1}`;
      }

      if (!poGroups[currentOrderNo]) {
        poGroups[currentOrderNo] = [];
      }
      poGroups[currentOrderNo].push(pageText);
    });

    const orderKeys = Object.keys(poGroups);
    if (orderKeys.length > 0) {
      return orderKeys.map((key, idx) => {
        const combinedText = poGroups[key].join('\n');
        return parseSinglePOText(combinedText, idx + 1);
      });
    }

    return [parseSinglePOText('', 1)];
  }

  // If a single combined string is passed
  const text = pagesText || '';
  const delimiterRegex = /(?=Tax Invoice|Purchase Order|PO\.?\s*NO|Buyer(?:’|')?s Order No|Order\s*No\.?\s*:\s*PO)/gi;
  const sections = text.split(delimiterRegex).filter((s) => s.trim().length > 50);

  if (sections.length > 1) {
    return sections.map((sec, idx) => parseSinglePOText(sec, idx + 1));
  }

  return [parseSinglePOText(text, 1)];
}
