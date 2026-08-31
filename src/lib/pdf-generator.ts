import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Invoice,
  Party,
  Factory,
  ProductionBatch,
  ProductionJob,
  RoadChallan,
  JobWorker,
} from '@/types/database.types';
import { formatINR } from './gst';
import QRCode from 'qrcode';

/**
 * Universal safe helper to download and preview PDF in browser
 */
export function printOrDownloadPDF(doc: jsPDF, filename: string) {
  if (typeof window === 'undefined') return;

  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // 1. Trigger reliable download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Open in new window for direct print preview
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  } catch (err) {
    console.error('PDF generation error, attempting fallback save:', err);
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.error('Fallback save failed:', saveErr);
      alert('Unable to generate PDF. Please ensure popups are allowed or use the print preview.');
    }
  }
}

/**
 * 1. Road Challan (Job-Work Delivery Challan) PDF Generator
 */
export async function generateRoadChallanPDF(
  challan: RoadChallan,
  factory: Factory,
  jobWorker?: JobWorker
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('JOB-WORK DELIVERY CHALLAN (ROAD CHALLAN)', 14, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('OUTSIDE PROCESSING SLIP', 150, 17);

  // Company / Factory Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(factory.name || 'Manisha Garments', 14, 35);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(factory.address || 'Factory Unit, Industrial Area', 14, 41);
  doc.text(
    `GSTIN: ${factory.gstin || '27AAAAA0000A1Z5'} | State: ${factory.state || 'Maharashtra'} (${factory.state_code || '27'})`,
    14,
    46
  );
  doc.text(`Phone: ${factory.phone || '+91 98000 00000'}`, 14, 51);

  // Challan Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(125, 29, 72, 28, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(125, 29, 72, 28, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Challan No: ${challan.challan_no}`, 129, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${challan.challan_date}`, 129, 42);
  doc.text(`Process: ${(challan.process_type || 'Job Work').toUpperCase().replace(/_/g, ' ')}`, 129, 48);
  doc.text(`Status: ${(challan.status || 'Dispatched').toUpperCase().replace(/_/g, ' ')}`, 129, 54);

  // Job Worker / Vendor Details Block
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 60, 196, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Job Worker / Outside Vendor:', 14, 66);

  const worker = jobWorker || challan.job_worker;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(worker?.name || 'Assigned Job Worker', 14, 72);
  doc.text(worker?.address || 'Premises / Unit address on file', 14, 77);
  doc.text(`Contact: ${worker?.phone || '—'}`, 14, 82);

  // Outbound Dispatch Line Items Table
  let totalDispatched = 0;
  const dispatchRows: Array<Array<string | number>> = [];

  (challan.lots || []).forEach((lot, lIdx) => {
    const sizeBreakdown = (lot.sizes || [])
      .map((s) => `${s.size}:${s.dispatched_qty}`)
      .join(', ');
    const lotTotal = (lot.sizes || []).reduce((sum, s) => sum + (Number(s.dispatched_qty) || 0), 0);
    totalDispatched += lotTotal;

    dispatchRows.push([
      lIdx + 1,
      lot.lot_no,
      lot.article,
      lot.color,
      sizeBreakdown || 'All Sizes',
      `${lotTotal} Pcs`,
      lot.rate_per_pc && lot.rate_per_pc > 0 ? `Rs. ${lot.rate_per_pc}` : '—',
      lot.rate_per_pc && lot.rate_per_pc > 0 ? `Rs. ${lotTotal * lot.rate_per_pc}` : '—',
    ]);
  });

  autoTable(doc, {
    startY: 88,
    head: [
      [
        '#',
        'Lot / Batch #',
        'Article / Style',
        'Color',
        'Size-Wise Dispatched Breakdown',
        'Dispatched Qty',
        'Appx Rate',
        'Estimated Cost',
      ],
    ],
    body: dispatchRows.length > 0 ? dispatchRows : [['1', 'LOT-01', 'Article 01', 'Navy', '22:50, 24:50, 26:50, 28:50', '200 Pcs', 'Rs. 15', 'Rs. 3000']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 50 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 16, halign: 'right' },
    },
  });

  let currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 140;

  // Attached Product Photo if present
  if (challan.photo_url && challan.photo_url.startsWith('data:image')) {
    try {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Attached Product / Sample Photo:', 14, currentY);
      doc.addImage(challan.photo_url, 'JPEG', 14, currentY + 3, 30, 30);
      currentY += 36;
    } catch {
      // ignore
    }
  }

  // Inbound Return Reconciliation Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Inbound Return / Completion Reconciliation (Before vs After):', 14, currentY);

  const reconRows: Array<Array<string | number>> = [];
  (challan.lots || []).forEach((lot) => {
    (lot.sizes || []).forEach((s) => {
      const returned = s.returned_qty !== null ? s.returned_qty : '—';
      const shortage =
        s.returned_qty !== null
          ? s.dispatched_qty - s.returned_qty
          : 'Pending Return';
      reconRows.push([
        lot.lot_no,
        lot.article,
        s.size,
        `${s.dispatched_qty} Pcs`,
        s.returned_qty !== null ? `${returned} Pcs` : '—',
        typeof shortage === 'number'
          ? shortage > 0
            ? `Shortage: -${shortage} Pcs`
            : shortage < 0
            ? `Excess: +${Math.abs(shortage)} Pcs`
            : 'Exact Match (0)'
          : 'Pending Return',
      ]);
    });
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Lot #', 'Article', 'Size', 'Dispatched Qty', 'Returned Qty', 'Shortage / Excess Delta']],
    body: reconRows.length > 0 ? reconRows : [['LOT-01', 'Article 01', 'All', `${totalDispatched || 200} Pcs`, 'Pending Return', 'Pending Return']],
    theme: 'striped',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
  });

  currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 210;

  // Terms & Conditions
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    '1. Goods dispatched strictly on job-work basis and remain the property of the sender.',
    14,
    currentY
  );
  doc.text(
    '2. Job worker is responsible for piece count reconciliation. Any shortage beyond 1% will be debited.',
    14,
    currentY + 5
  );

  // Signatures & Stamp Block
  currentY += 15;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY + 12, 60, currentY + 12);
  doc.line(75, currentY + 12, 125, currentY + 12);
  doc.line(140, currentY + 12, 196, currentY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Prepared / Dispatched By', 14, currentY + 17);
  doc.text('Job Worker Signature & Stamp', 75, currentY + 17);
  doc.text(`For ${factory.name || 'Company'}`, 140, currentY + 17);

  printOrDownloadPDF(doc, `RoadChallan_${challan.challan_no}.pdf`);
}

/**
 * 2. GST Tax Invoice PDF Generator
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  factory: Factory,
  party: Party
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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
  doc.text(factory.name || 'FactoryOS', 14, 38);

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
  doc.setDrawColor(226, 232, 240);
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

  autoTable(doc, {
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

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 180;

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
  doc.text('Terms: Payment due within specified period. Subject to local jurisdiction.', 14, finalY + 8);

  // Authorised Signatory
  doc.text(`For ${factory.name}`, 140, finalY + 58);
  doc.text('Authorized Signatory', 140, finalY + 70);

  printOrDownloadPDF(doc, `${invoice.number}.pdf`);
}

/**
 * 3. Factory Trolley Job Card / Route Traveler PDF Generator
 */
export async function generateJobCardPDF(
  batch: ProductionBatch,
  job?: ProductionJob,
  factory?: Factory
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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
  doc.text(`Factory: ${factory?.name || 'Factory Unit'}`, 14, 42);
  doc.text(`Job Reference: ${job?.number || 'Direct Stock Batch'}`, 14, 48);
  doc.text(`Style / Product: ${batch.style || batch.article_code || 'Garment'} (${batch.product?.name || batch.product_name || 'Garment'})`, 14, 54);
  doc.text(`Colour: ${batch.colour} | Fabric: ${batch.fabric || 'Standard'}`, 14, 60);
  doc.text(`Original Batch Qty: ${batch.initial_qty} Pcs`, 14, 66);
  doc.text(`Current Stage: ${batch.current_stage.toUpperCase()}`, 14, 72);

  // Generate QR Code data URL
  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://factoryos.app/qr/${batch.batch_no}`
    );
    doc.addImage(qrDataUrl, 'PNG', 140, 30, 45, 45);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Scan for instant Floor Move/Receive', 135, 78);
  } catch {
    // ignore
  }

  // Size Line Matrix
  const sizeData = (batch.size_lines || []).map((s) => [s.colour || batch.colour, s.size, `${s.qty} Pcs`]);
  autoTable(doc, {
    startY: 84,
    head: [['Colour', 'Size', 'Cut Quantity']],
    body: sizeData.length > 0 ? sizeData : [[batch.colour || 'Standard', 'Standard', `${batch.initial_qty} Pcs`]],
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9 },
  });

  let nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 120;

  // Raw Material Cutting Inward Mapping if present
  if (batch.material_consumptions && batch.material_consumptions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Raw Material / Inward KG Cutting Traceability:', 14, nextY);

    const matRows = batch.material_consumptions.map((mc) => [
      mc.material_name,
      mc.lot_no,
      `${mc.qty_used} ${mc.unit_symbol}`,
      mc.scrap_qty ? `${mc.scrap_qty} ${mc.unit_symbol}` : '—',
      mc.consumption_per_piece ? `${mc.consumption_per_piece} g/pc` : '—',
      mc.recorded_at ? mc.recorded_at.split('T')[0] : '—',
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [['Material Description', 'Lot / Roll #', 'Consumed Qty', 'Scrap / End-bit', 'Average Yield', 'Cut Date']],
      body: matRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : nextY + 25;
  }

  // Stage Tracking Sign-off Grid (All 7 Stages)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Floor Stage Route & Quality Sign-Off (All 7 Stages):', 14, nextY);

  const stageGrid = [
    ['1. Cutting', 'In-House', `${batch.initial_qty}`, '', `${batch.initial_qty}`, '', 'Passed'],
    ['2. Printing', 'In-House / Jobwork', '', '', '', '', ''],
    ['3. Stitching', 'In-House / Jobwork', '', '', '', '', ''],
    ['4. Quality Check (QC)', 'In-House', '', '', '', '', ''],
    ['5. Ironing / Pressing', 'In-House / Jobwork', '', '', '', '', ''],
    ['6. Packing', 'In-House', '', '', '', '', ''],
    ['7. Dispatch', 'In-House', '', '', '', '', ''],
  ];

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Stage', 'Dept/Vendor', 'Sent Qty', 'Scrap', 'Recv Qty', 'Operator Sign', 'QC Stamp']],
    body: stageGrid,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    bodyStyles: { minCellHeight: 10, fontSize: 8 },
  });

  printOrDownloadPDF(doc, `JobCard_${batch.batch_no}.pdf`);
}
