// GST calculation engine for FactoryOS (India GST compliant)

export interface GSTCalculationResult {
  taxableAmount: number;
  isInterstate: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  itemBreakdown: Array<{
    description: string;
    hsnCode: string;
    qty: number;
    price: number;
    gstPercent: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }>;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function calculateGST(
  factoryStateCode: string,
  partyStateCode: string,
  items: Array<{
    description: string;
    hsnCode: string;
    qty: number;
    price: number;
    gstPercent: number;
  }>
): GSTCalculationResult {
  const isInterstate =
    factoryStateCode.trim() !== partyStateCode.trim() &&
    Boolean(partyStateCode.trim());

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemBreakdown = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const gstRate = Number(item.gstPercent) || 0;

    const taxableValue = Math.round(qty * price * 100) / 100;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = Math.round(taxableValue * (gstRate / 100) * 100) / 100;
    } else {
      cgst = Math.round(taxableValue * (gstRate / 2 / 100) * 100) / 100;
      sgst = Math.round(taxableValue * (gstRate / 2 / 100) * 100) / 100;
    }

    const itemTotal =
      Math.round((taxableValue + cgst + sgst + igst) * 100) / 100;

    totalTaxable += taxableValue;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return {
      description: item.description,
      hsnCode: item.hsnCode,
      qty,
      price,
      gstPercent: gstRate,
      taxableValue,
      cgst,
      sgst,
      igst,
      total: itemTotal,
    };
  });

  const totalGst = totalCgst + totalSgst + totalIgst;
  const totalAmount = totalTaxable + totalGst;

  return {
    taxableAmount: Math.round(totalTaxable * 100) / 100,
    isInterstate,
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    itemBreakdown,
  };
}

export const INDIAN_STATES: Array<{ name: string; code: string }> = [
  { name: 'Maharashtra', code: '27' },
  { name: 'Gujarat', code: '24' },
  { name: 'Delhi', code: '07' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Karnataka', code: '29' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Rajasthan', code: '08' },
  { name: 'West Bengal', code: '19' },
  { name: 'Punjab', code: '03' },
  { name: 'Haryana', code: '06' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Telangana', code: '36' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Kerala', code: '32' },
];
