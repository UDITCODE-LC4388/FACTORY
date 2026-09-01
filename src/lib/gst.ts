// GST calculation engine for FactoryOS (India GST compliant)

export interface GSTCalculationResult {
  taxableAmount: number;
  isInterstate: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  totalGst: number;
  totalAmount: number;
  itemBreakdown: Array<{
    description: string;
    hsnCode: string;
    qty: number;
    unitSymbol: string;
    price: number;
    discountPercent: number;
    gstPercent: number;
    grossAmount: number;
    discountAmount: number;
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

export function formatIndianNumber(num: number, decimals: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function calculateGST(
  factoryStateCode: string,
  partyStateCode: string,
  items: Array<{
    description: string;
    hsnCode: string;
    qty: number;
    unitSymbol?: string;
    price: number;
    discountPercent?: number;
    gstPercent: number;
  }>,
  customRoundOff?: number
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
    const discPct = Number(item.discountPercent) || 0;
    const gstRate = Number(item.gstPercent) || 0;
    const unitSymbol = item.unitSymbol || 'PCS';

    const grossAmount = Math.round(qty * price * 100) / 100;
    const discountAmount = discPct > 0 ? Math.round((grossAmount * (discPct / 100)) * 100) / 100 : 0;
    const taxableValue = Math.round((grossAmount - discountAmount) * 100) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = Math.round(taxableValue * (gstRate / 100) * 100) / 100;
    } else {
      cgst = Math.round(taxableValue * (gstRate / 2 / 100) * 100) / 100;
      sgst = Math.round(taxableValue * (gstRate / 2 / 100) * 100) / 100;
    }

    const itemTotal = Math.round((taxableValue + cgst + sgst + igst) * 100) / 100;

    totalTaxable += taxableValue;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return {
      description: item.description,
      hsnCode: item.hsnCode,
      qty,
      unitSymbol,
      price,
      discountPercent: discPct,
      gstPercent: gstRate,
      grossAmount,
      discountAmount,
      taxableValue,
      cgst,
      sgst,
      igst,
      total: itemTotal,
    };
  });

  const totalGst = totalCgst + totalSgst + totalIgst;
  const rawTotal = totalTaxable + totalGst;
  
  let roundOff = 0;
  let totalAmount = rawTotal;

  if (typeof customRoundOff === 'number') {
    roundOff = customRoundOff;
    totalAmount = Math.round((rawTotal + roundOff) * 100) / 100;
  } else {
    const rounded = Math.round(rawTotal);
    roundOff = Math.round((rounded - rawTotal) * 100) / 100;
    totalAmount = rounded;
  }

  return {
    taxableAmount: Math.round(totalTaxable * 100) / 100,
    isInterstate,
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
    roundOff,
    totalGst: Math.round(totalGst * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    itemBreakdown,
  };
}

// Convert number to Indian Currency Words (e.g. "INR Sixty Three Thousand Five Hundred Fifty Four Only")
export function numberToIndianWords(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'INR Zero Only';

  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return tens[ten] + (rest > 0 ? ' ' + ones[rest] : '');
  }

  function convertThreeDigits(n: number): string {
    if (n === 0) return '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) {
      str += ones[hundred] + ' Hundred';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  if (integerPart === 0 && decimalPart === 0) {
    return 'INR Zero Only';
  }

  let words = '';
  let num = integerPart;

  const crores = Math.floor(num / 10000000);
  num %= 10000000;

  const lakhs = Math.floor(num / 100000);
  num %= 100000;

  const thousands = Math.floor(num / 1000);
  num %= 1000;

  const hundreds = num;

  if (crores > 0) {
    words += convertTwoDigits(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    words += convertTwoDigits(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    words += convertTwoDigits(thousands) + ' Thousand ';
  }
  if (hundreds > 0) {
    words += convertThreeDigits(hundreds);
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `INR ${words}`;

  if (decimalPart > 0) {
    const paiseWords = convertTwoDigits(decimalPart);
    result += ` and ${paiseWords} paise`;
  }

  result += ' Only';
  return result;
}

export const INDIAN_STATES: Array<{ name: string; code: string }> = [
  { name: 'West Bengal', code: '19' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Delhi', code: '07' },
  { name: 'Haryana', code: '06' },
  { name: 'Gujarat', code: '24' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Karnataka', code: '29' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Punjab', code: '03' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Telangana', code: '36' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Kerala', code: '32' },
  { name: 'Bihar', code: '10' },
  { name: 'Odisha', code: '21' },
  { name: 'Assam', code: '18' },
  { name: 'Jharkhand', code: '20' },
];
