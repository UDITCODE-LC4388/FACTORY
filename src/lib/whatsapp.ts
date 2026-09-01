/**
 * Universal WhatsApp Helper Utility
 * Provides instant 1-click direct WhatsApp Web/App opening (no API key required)
 * as well as Meta Cloud API automated delivery support.
 */

export function formatWhatsAppPhone(rawPhone: string): string {
  const clean = (rawPhone || '').replace(/\D/g, '');
  if (!clean) return '919800000000';
  if (clean.length === 10) return `91${clean}`;
  if (clean.startsWith('0') && clean.length === 11) return `91${clean.slice(1)}`;
  return clean;
}

export function getWhatsAppDirectUrl(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Synchronously opens WhatsApp Web or the WhatsApp mobile app.
 * MUST be called directly in the onClick event handler to avoid browser popup blockers.
 */
export function openWhatsAppInstant(phone: string, message: string): string {
  const url = getWhatsAppDirectUrl(phone, message);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

/**
 * Pre-formatted business message templates
 */
export const WhatsAppTemplates = {
  invoice: (params: {
    customerName: string;
    invoiceNo: string;
    totalAmount: string;
    factoryName: string;
    date: string;
    paymentStatus?: string;
  }) => {
    return (
      `*GST TAX INVOICE* — ${params.factoryName}\n\n` +
      `Dear *${params.customerName}*,\n` +
      `Your Tax Invoice *#${params.invoiceNo}* has been generated.\n\n` +
      `📄 *Invoice No:* ${params.invoiceNo}\n` +
      `📅 *Date:* ${params.date}\n` +
      `💰 *Total Amount:* ₹${params.totalAmount}\n\n` +
      `Thank you for doing business with *${params.factoryName}*!`
    );
  },

  roadChallan: (params: {
    vendorName: string;
    challanNo: string;
    processType: string;
    totalPcs: number;
    factoryName: string;
    date: string;
  }) => {
    return (
      `*JOB-WORK ROAD CHALLAN* — ${params.factoryName}\n\n` +
      `To: *${params.vendorName}*\n` +
      `Goods dispatched for outside job-work processing:\n\n` +
      `🚚 *Challan No:* ${params.challanNo}\n` +
      `📅 *Date:* ${params.date}\n` +
      `⚙️ *Process:* ${params.processType.toUpperCase().replace(/_/g, ' ')}\n` +
      `📦 *Total Quantity:* ${params.totalPcs} Pieces\n\n` +
      `Please reconcile piece count upon delivery and acknowledge receipt.`
    );
  },

  saleOrder: (params: {
    customerName: string;
    orderNo: string;
    itemCount: number;
    totalAmount: string;
    factoryName: string;
  }) => {
    return (
      `*ORDER CONFIRMATION* — ${params.factoryName}\n\n` +
      `Dear *${params.customerName}*,\n` +
      `We have received and confirmed your order *#${params.orderNo}*.\n\n` +
      `📦 *Items:* ${params.itemCount} Styles\n` +
      `💰 *Estimated Value:* ₹${params.totalAmount}\n` +
      `🏭 *Status:* Scheduled for Production\n\n` +
      `Thank you for your order!`
    );
  },

  paymentReceipt: (params: {
    customerName: string;
    amount: string;
    paymentMode: string;
    refNo: string;
    factoryName: string;
  }) => {
    return (
      `*PAYMENT RECEIVED ACKNOWLEDGMENT* — ${params.factoryName}\n\n` +
      `Dear *${params.customerName}*,\n` +
      `We have received your payment of *₹${params.amount}*.\n\n` +
      `💳 *Mode:* ${params.paymentMode.toUpperCase()}\n` +
      `🔖 *Ref / UTR:* ${params.refNo || 'Confirmed'}\n\n` +
      `Thank you for your timely settlement!`
    );
  },
};
