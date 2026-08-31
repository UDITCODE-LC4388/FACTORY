import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Invoice, Party, Factory, ProductionBatch, ProductionJob } from '@/types/database.types';
import { formatINR } from './gst';
import QRCode from 'qrcode';

// Extend jsPDF interface for autoTable
interface jsPDFCustom extends jsPDF {
  autoTable: (options: unknown) => jsPDFCustom;
  lastAutoTable?: {
    finalY: number;
  };
}

export async function generateInvoicePDF(
  invoice: Invoice,
  factory: Factory,
  party: Party
): Promise<void> {
  const doc = new jsPDF() as jsPDFCustom;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ORIGINAL FOR RECIPIENT`, 150, 18);

  // Factory (Seller) Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(factory.name, 14, 38);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(factory.address || '', 14, 44);
  doc.text(`GSTIN: ${factory.gstin} | State: ${factory.state} (${factory.state_code})`, 14, 50);
  doc.text(`Phone: ${factory.phone}`, 14, 56);

  // Invoice Meta Box
  doc.setFillColor(248, 250, 252);
  doc.rect(130, 32, 66, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(130, 32, 66, 26, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Invoice No: ${invoice.number}`, 134, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${invoice.date}`, 134, 44);
  doc.text(`Sale Type: ${invoice.sale_type.toUpperCase()}`, 134, 50);
  doc.text(`Payment: ${invoice.payment_status.toUpperCase()}`, 134, 55);

  // Bill To (Party / Customer Details)
  doc.line(14, 62, 196, 62);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Billed To (Customer):', 14, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(party.name, 14, 74);
  doc.text(party.address || 'Address on file', 14, 79);
  doc.text(`GSTIN: ${party.gstin || 'UNREGISTERED'} | State: ${party.state} (${party.state_code})`, 14, 84);

  // Line Items Table
  const tableData = (invoice.items || []).map((item, idx) => [
    idx + 1,
    item.description,
    item.hsn_code,
    `${item.qty}`,
    formatINR(item.price),
    formatINR(item.taxable_value),
    `${item.gst_percent}%`,
    formatINR(item.cgst + item.sgst + item.igst),
    formatINR(item.total),
  ]);

  doc.autoTable({
    startY: 90,
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'GST %', 'Tax Amt', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 21, halign: 'right' },
    },
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 180;

  // Tax Summary Box
  doc.setFillColor(248, 250, 252);
  doc.rect(120, finalY, 76, 45, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(120, finalY, 76, 45, 'D');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Taxable Amount:', 124, finalY + 8);
  doc.text(formatINR(invoice.taxable_amount), 192, finalY + 8, { align: 'right' });

  if (invoice.cgst > 0 || invoice.sgst > 0) {
    doc.text('CGST:', 124, finalY + 15);
    doc.text(formatINR(invoice.cgst), 192, finalY + 15, { align: 'right' });
    doc.text('SGST:', 124, finalY + 22);
    doc.text(formatINR(invoice.sgst), 192, finalY + 22, { align: 'right' });
  } else {
    doc.text('IGST (Interstate):', 124, finalY + 15);
    doc.text(formatINR(invoice.igst), 192, finalY + 15, { align: 'right' });
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(124, finalY + 28, 192, finalY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 124, finalY + 36);
  doc.text(formatINR(invoice.total), 192, finalY + 36, { align: 'right' });

  // Bank & Footer Notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Bank Details for Payment:', 14, finalY + 8);
  doc.text(`Bank: HDFC Bank Ltd | A/C: 50200012345678`, 14, finalY + 14);
  doc.text(`IFSC: HDFC0000123 | Branch: Bhiwandi MIDC`, 14, finalY + 20);
  doc.text('Terms: Payment due within 30 days. Subject to Thane jurisdiction.', 14, finalY + 30);

  // Authorised Signatory
  doc.text(`For ${factory.name}`, 140, finalY + 58);
  doc.text('Authorized Signatory', 140, finalY + 70);

  doc.save(`${invoice.number}.pdf`);
}

export async function generateJobCardPDF(
  batch: ProductionBatch,
  job?: ProductionJob,
  factory?: Factory
): Promise<void> {
  const doc = new jsPDF() as jsPDFCustom;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTORY TROLLEY JOB CARD / ROUTE TRAVELER', 14, 16);

  // Batch Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text(`BATCH NO: ${batch.batch_no}`, 14, 35);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Factory: ${factory?.name || 'Vardhman Textiles'}`, 14, 42);
  doc.text(`Job Reference: ${job?.number || 'Direct Stock Batch'}`, 14, 48);
  doc.text(`Style / Product: ${batch.style} (${batch.product?.name || 'Garment'})`, 14, 54);
  doc.text(`Colour: ${batch.colour}`, 14, 60);
  doc.text(`Original Batch Qty: ${batch.initial_qty} Pcs`, 14, 66);
  doc.text(`Current Stage: ${batch.current_stage.toUpperCase()}`, 14, 72);

  // Generate QR Code data URL
  const qrDataUrl = await QRCode.toDataURL(
    `https://factoryos.app/qr/${batch.batch_no}`
  );
  doc.addImage(qrDataUrl, 'PNG', 140, 30, 45, 45);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan for instant Floor Move/Receive', 135, 78);

  // Size Line Matrix
  const sizeData = (batch.size_lines || []).map((s) => [s.colour, s.size, `${s.qty} Pcs`]);
  doc.autoTable({
    startY: 84,
    head: [['Colour', 'Size', 'Cut Quantity']],
    body: sizeData,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9 },
  });

  const nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 130;

  // Stage Tracking Sign-off Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Floor Stage Route & Quality Sign-Off:', 14, nextY);

  const stageGrid = [
    ['1. Cutting', 'In-House', '250', '2', '248', 'Manoj K.', 'Passed'],
    ['2. Stitching', 'In-House', '248', '', '', '', ''],
    ['3. Washing', 'Apex Dyeing', '248', '', '', '', ''],
    ['4. QC Inspection', 'In-House', '', '', '', '', ''],
    ['5. Packing', 'In-House', '', '', '', '', ''],
    ['6. Dispatch', 'In-House', '', '', '', '', ''],
  ];

  doc.autoTable({
    startY: nextY + 4,
    head: [['Stage', 'Dept/Vendor', 'Sent Qty', 'Scrap', 'Recv Qty', 'Operator Sign', 'QC Stamp']],
    body: stageGrid,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    bodyStyles: { minCellHeight: 12, fontSize: 8 },
  });

  doc.save(`JobCard_${batch.batch_no}.pdf`);
}
