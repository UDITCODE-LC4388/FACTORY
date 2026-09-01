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
import { formatINR, formatIndianNumber, numberToIndianWords } from './gst';
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
/**
 * 2. GST Tax Invoice PDF Generator (Exact Sample Template Matching)
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  factory: Factory,
  party: Party,
  buyerParty?: Party
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const consignee = party;
  const buyer = (invoice.is_through_buyer && (buyerParty || invoice.buyer))
    ? (buyerParty || invoice.buyer!)
    : party;

  const isInterstate = invoice.igst > 0 || (
    factory.state_code.trim() !== (buyer.state_code || consignee.state_code).trim() &&
    Boolean(buyer.state_code || consignee.state_code)
  );

  const startX = 14;
  const pageWidth = 182; // 210 - 28

  // Outer Border Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // Top Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Tax Invoice', 105, 14, { align: 'center' });

  let curY = 17;

  // Header Box (Seller on Left, Metadata on Right)
  const headerHeight = 44;
  doc.rect(startX, curY, pageWidth, headerHeight);
  doc.line(startX + 91, curY, startX + 91, curY + headerHeight); // Mid divider

  // Seller Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(factory.name || 'MANISHA GARMENTS', startX + 2, curY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addrLines = (factory.address || 'NA,34-35/2/1 SITA RAM SUPER MARKET\nSRI AUROBINDRA ROAD ,SALKIA\nHOWRAH-711106').split('\n');
  let sY = curY + 9;
  addrLines.forEach((al) => {
    doc.text(al, startX + 2, sY);
    sY += 3.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN: ${factory.gstin || '19AGGPB3696R1ZM'}`, startX + 2, sY + 1);
  doc.text(`State Name : ${factory.state || 'West Bengal'}, Code : ${factory.state_code || '19'}`, startX + 2, sY + 5);

  // Metadata Grid (Right)
  const metaX = startX + 91;
  const colW = 45.5;
  const rH = 5.5;

  // Row 1: Invoice No | Dated
  doc.line(metaX, curY + rH, startX + pageWidth, curY + rH);
  doc.line(metaX + colW, curY, metaX + colW, curY + (rH * 6));
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice No.', metaX + 2, curY + 2.5);
  doc.text('Dated', metaX + colW + 2, curY + 2.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.number, metaX + 2, curY + 5);
  doc.text(invoice.date, metaX + colW + 2, curY + 5);

  // Row 2: Delivery Note | Mode/Terms of Payment
  doc.line(metaX, curY + (rH * 2), startX + pageWidth, curY + (rH * 2));
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Delivery Note', metaX + 2, curY + rH + 2.5);
  doc.text('Mode/Terms of Payment', metaX + colW + 2, curY + rH + 2.5);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.delivery_note || '', metaX + 2, curY + rH + 5);
  doc.text(invoice.sale_type ? invoice.sale_type.toUpperCase() : 'CREDIT', metaX + colW + 2, curY + rH + 5);

  // Row 3: Supplier's Ref | Other Reference(s)
  doc.line(metaX, curY + (rH * 3), startX + pageWidth, curY + (rH * 3));
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Supplier's Ref.", metaX + 2, curY + (rH * 2) + 2.5);
  doc.text('Other Reference(s)', metaX + colW + 2, curY + (rH * 2) + 2.5);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.supplier_ref || invoice.number, metaX + 2, curY + (rH * 2) + 5);
  doc.text(invoice.other_references || '', metaX + colW + 2, curY + (rH * 2) + 5);

  // Row 4: Buyer's Order No | Dated
  doc.line(metaX, curY + (rH * 4), startX + pageWidth, curY + (rH * 4));
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Buyer's Order No.", metaX + 2, curY + (rH * 3) + 2.5);
  doc.text('Dated', metaX + colW + 2, curY + (rH * 3) + 2.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.buyer_order_no || '', metaX + 2, curY + (rH * 3) + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.buyer_order_date || '', metaX + colW + 2, curY + (rH * 3) + 5);

  // Row 5: Despatch Doc No | Delivery Note Date
  doc.line(metaX, curY + (rH * 5), startX + pageWidth, curY + (rH * 5));
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Despatch Document No.', metaX + 2, curY + (rH * 4) + 2.5);
  doc.text('Delivery Note Date', metaX + colW + 2, curY + (rH * 4) + 2.5);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.despatch_doc_no || '', metaX + 2, curY + (rH * 4) + 5);
  doc.text(invoice.delivery_note_date || '', metaX + colW + 2, curY + (rH * 4) + 5);

  // Row 6: Despatched through | Destination
  doc.line(metaX, curY + (rH * 6), startX + pageWidth, curY + (rH * 6));
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Despatched through', metaX + 2, curY + (rH * 5) + 2.5);
  doc.text('Destination', metaX + colW + 2, curY + (rH * 5) + 2.5);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.despatched_through || '', metaX + 2, curY + (rH * 5) + 5);
  doc.text(invoice.destination || consignee.state || '', metaX + colW + 2, curY + (rH * 5) + 5);

  // Row 7: Terms of Delivery
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Terms of Delivery', metaX + 2, curY + (rH * 6) + 2.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const terms = invoice.terms_of_delivery || (isInterstate ? `PLACE OF SUPPLY\n${buyer.state?.toUpperCase() || ''}` : '');
  const tLines = terms.split('\n');
  tLines.forEach((tl, tidx) => {
    doc.text(tl, metaX + 2, curY + (rH * 6) + 5.5 + (tidx * 3.5));
  });

  curY += headerHeight;

  // Consignee & Buyer Boxes
  const partyBoxHeight = 32;
  doc.rect(startX, curY, pageWidth, partyBoxHeight);
  doc.line(startX + 91, curY, startX + 91, curY + partyBoxHeight);

  // Consignee (Left)
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Consignee', startX + 2, curY + 3);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(consignee.name, startX + 2, curY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const cAddr = (consignee.address || 'Address on file').split('\n');
  let cY = curY + 10;
  cAddr.slice(0, 4).forEach((cal) => {
    doc.text(cal, startX + 2, cY);
    cY += 3;
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${consignee.gstin || 'UNREGISTERED'}`, startX + 2, curY + 26);
  doc.text(`State Name : ${consignee.state}, Code : ${consignee.state_code}`, startX + 2, curY + 29.5);

  // Buyer (Right)
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Buyer (if other than consignee)', metaX + 2, curY + 3);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(buyer.name, metaX + 2, curY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const bAddr = (buyer.address || consignee.address || 'Address on file').split('\n');
  let bY = curY + 10;
  bAddr.slice(0, 4).forEach((bal) => {
    doc.text(bal, metaX + 2, bY);
    bY += 3;
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN/UIN : ${buyer.gstin || consignee.gstin || 'UNREGISTERED'}`, metaX + 2, curY + 26);
  doc.text(`State Name : ${buyer.state || consignee.state}, Code : ${buyer.state_code || consignee.state_code}`, metaX + 2, curY + 29.5);

  curY += partyBoxHeight;

  // Table Body Rows
  const totalQty = (invoice.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const unitSymbol = invoice.items?.[0]?.unit_symbol || 'PCS';

  const tableRows: Array<Array<string>> = [];

  (invoice.items || []).forEach((it, idx) => {
    tableRows.push([
      String(idx + 1),
      it.description,
      it.hsn_code || '610990',
      `${formatIndianNumber(it.qty, 3)} ${it.unit_symbol || 'PCS'}`,
      formatIndianNumber(it.price, 2),
      it.unit_symbol || 'PCS',
      it.discount_percent && it.discount_percent > 0 ? `${it.discount_percent} %` : '',
      formatIndianNumber(it.taxable_value, 2),
    ]);
  });

  // Sub-lines for Taxes inside the table
  if (isInterstate) {
    tableRows.push(['', 'OUTPUT IGST 5%', '', '', '5 %', '', '', formatIndianNumber(invoice.igst, 2)]);
  } else {
    tableRows.push(['', 'OUTPUT CGST 2.5%', '', '', '2.50 %', '', '', formatIndianNumber(invoice.cgst, 2)]);
    tableRows.push(['', 'OUTPUT SGST 2.5%', '', '', '2.50 %', '', '', formatIndianNumber(invoice.sgst, 2)]);
  }

  if (typeof invoice.round_off === 'number' && invoice.round_off !== 0) {
    tableRows.push(['', 'Less : R/OFF', '', '', '', '', '', invoice.round_off < 0 ? `(-)${Math.abs(invoice.round_off).toFixed(2)}` : `(+)${invoice.round_off.toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: curY,
    margin: { left: startX, right: 14 },
    tableWidth: pageWidth,
    head: [['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
    body: tableRows,
    foot: [['', 'Total', '', `${formatIndianNumber(totalQty, 3)} ${unitSymbol}`, '', '', '', `INR ${formatIndianNumber(invoice.total, 2)}`]],
    theme: 'plain',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 60, halign: 'left' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 26, halign: 'right' },
    },
  });

  curY = (doc as any).lastAutoTable.finalY;

  // Amount Chargeable in Words Box
  doc.rect(startX, curY, pageWidth, 8);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Amount Chargeable (in words)', startX + 2, curY + 2.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(numberToIndianWords(invoice.total), startX + 2, curY + 5.5);
  doc.text('E. & O.E', startX + pageWidth - 14, curY + 5.5);

  curY += 8;

  // HSN Tax Breakdown Table
  const totalTaxAmount = invoice.cgst + invoice.sgst + invoice.igst;
  const hsnHead = isInterstate
    ? [['HSN/SAC', 'Taxable Value', 'Integrated Tax Rate', 'Integrated Tax Amount', 'Total Tax Amount']]
    : [['HSN/SAC', 'Taxable Value', 'Central Tax Rate', 'Central Tax Amount', 'State Tax Rate', 'State Tax Amount', 'Total Tax Amount']];

  const hsnBody = (invoice.items || []).map((it) => {
    if (isInterstate) {
      return [
        it.hsn_code || '610990',
        formatIndianNumber(it.taxable_value, 2),
        '5%',
        formatIndianNumber(it.igst, 2),
        formatIndianNumber(it.igst, 2),
      ];
    } else {
      return [
        it.hsn_code || '610990',
        formatIndianNumber(it.taxable_value, 2),
        '2.50%',
        formatIndianNumber(it.cgst, 2),
        '2.50%',
        formatIndianNumber(it.sgst, 2),
        formatIndianNumber(it.cgst + it.sgst, 2),
      ];
    }
  });

  const hsnFoot = isInterstate
    ? [['Total', formatIndianNumber(invoice.taxable_amount, 2), '', formatIndianNumber(invoice.igst, 2), formatIndianNumber(invoice.igst, 2)]]
    : [['Total', formatIndianNumber(invoice.taxable_amount, 2), '', formatIndianNumber(invoice.cgst, 2), '', formatIndianNumber(invoice.sgst, 2), formatIndianNumber(totalTaxAmount, 2)]];

  autoTable(doc, {
    startY: curY,
    margin: { left: startX, right: 14 },
    tableWidth: pageWidth,
    head: hsnHead,
    body: hsnBody,
    foot: hsnFoot,
    theme: 'plain',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
    styles: {
      fontSize: 7,
      cellPadding: 1,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'center',
    },
    headStyles: {
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      3: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  curY = (doc as any).lastAutoTable.finalY;

  // Tax Amount in Words Box
  doc.rect(startX, curY, pageWidth, 5.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tax Amount (in words) :  ${numberToIndianWords(totalTaxAmount)}`, startX + 2, curY + 3.8);

  curY += 5.5;

  // Footer: PAN, Declaration, Bank Details (Left) & Signatory (Right)
  const footerHeight = 28;
  doc.rect(startX, curY, pageWidth, footerHeight);
  doc.line(startX + 105, curY, startX + 105, curY + footerHeight);

  // Left Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`Company's PAN : ${factory.pan || 'AGGPB3696R'}`, startX + 2, curY + 4);

  doc.setFontSize(6.5);
  doc.text('Declaration', startX + 2, curY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', startX + 2, curY + 10.5, { maxWidth: 100 });

  // Bank Details
  doc.setFont('helvetica', 'bold');
  doc.text("Company's Bank Details", startX + 2, curY + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name : ${invoice.bank_name || factory.bank_name || 'UNION BANK OF INDIA C/A'}`, startX + 2, curY + 20.5);
  doc.text(`A/c No. : ${invoice.bank_account_no || factory.bank_account_no || '397001010230872'}`, startX + 2, curY + 23.5);
  doc.text(`Branch & IFS Code : ${invoice.bank_branch_ifsc || factory.bank_branch_ifsc || 'M.G.ROAD KOLKTA & UBIN0539708'}`, startX + 2, curY + 26.5);

  // Right Footer: Authorised Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`for ${factory.name || 'MANISHA GARMENTS'}`, startX + 108, curY + 5);
  doc.text('Authorised Signatory', startX + 108, curY + 25);

  curY += footerHeight;

  // Bottom text
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('This is a Computer Generated Invoice', 105, curY + 3.5, { align: 'center' });

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
