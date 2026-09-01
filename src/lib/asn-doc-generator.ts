import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  TableVerticalAlign,
  ShadingType,
} from 'docx';
import { ASNFormData } from '@/types/asn.types';

// Standard styling constants
const FONT_FAMILY = 'Arial';
const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 4, // 0.5 pt
  color: '000000',
};

const TABLE_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
  insideHorizontal: BORDER_STYLE,
  insideVertical: BORDER_STYLE,
};

const CELL_MARGINS = {
  top: 80, // twips
  bottom: 80,
  left: 120,
  right: 120,
};

/**
 * Helper to build a standard cell with text
 */
function createCell(
  text: string | number | undefined,
  options: {
    bold?: boolean;
    italic?: boolean;
    size?: number; // in half-pts (20 = 10pt)
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    widthPercent?: number;
    colSpan?: number;
    shadingColor?: string;
    vAlign?: TableVerticalAlign;
  } = {}
): TableCell {
  const content = text !== undefined && text !== null ? String(text) : '';
  const lines = content.split('\n');

  const paragraphs = lines.map(
    (line) =>
      new Paragraph({
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          new TextRun({
            text: line,
            bold: options.bold || false,
            italics: options.italic || false,
            size: options.size || 18, // 9pt
            font: FONT_FAMILY,
          }),
        ],
      })
  );

  return new TableCell({
    columnSpan: options.colSpan || 1,
    width: options.widthPercent
      ? { size: options.widthPercent, type: WidthType.PERCENTAGE }
      : undefined,
    shading: options.shadingColor
      ? { fill: options.shadingColor, type: ShadingType.CLEAR }
      : undefined,
    margins: CELL_MARGINS,
    verticalAlign: options.vAlign,
    borders: TABLE_BORDERS,
    children: paragraphs.length > 0 ? paragraphs : [new Paragraph({})],
  });
}

/**
 * Builds the complete Advance Shipping Notification docx Document object
 */
export function buildASNDocument(data: ASNFormData): Document {
  const emailRecipient = data.emailRecipient || '';
  const contactPhone = data.contactPhone || '';

  // Table 1 Rows (Vendor & Billing Details)
  const table1Rows: TableRow[] = [
    // Header Banner: ADVANCE SHIPING NOTIFICATION
    new TableRow({
      children: [
        createCell('ADVANCE SHIPING NOTIFICATION', {
          bold: true,
          size: 22, // 11pt
          alignment: AlignmentType.CENTER,
          colSpan: 4,
          shadingColor: 'FFFFFF',
        }),
      ],
    }),

    // Subtitle Note 1
    new TableRow({
      children: [
        createCell(
          `Information to be filled by Vendor for taking ASN number and Waybill before booking of shipment and to be emailed at: ${emailRecipient}`,
          {
            bold: true,
            italic: true,
            size: 16, // 8pt
            alignment: AlignmentType.LEFT,
            colSpan: 4,
            shadingColor: 'F2F2F2',
          }
        ),
      ],
    }),

    // Row 1: Vendor Name & ASN Number
    new TableRow({
      children: [
        createCell('Vendor Name', { bold: true, widthPercent: 22 }),
        createCell(data.vendorName || '', { widthPercent: 28 }),
        createCell('ASN Number (to be allotted by Primart)', { bold: true, widthPercent: 25 }),
        createCell(data.asnNumber || '', { widthPercent: 25 }),
      ],
    }),

    // Row 2: Vendor City & ASN Date
    new TableRow({
      children: [
        createCell('Vendor City', { bold: true }),
        createCell(data.vendorCity || ''),
        createCell('ASN Date', { bold: true }),
        createCell(data.asnDate || ''),
      ],
    }),

    // Row 3: Booking Location & Dispatch Location
    new TableRow({
      children: [
        createCell('Booking Location', { bold: true }),
        createCell(data.bookingLocation || data.vendorCity || ''),
        createCell('Dispatch Location', { bold: true }),
        createCell(data.dispatchLocation || ''),
      ],
    }),

    // Row 4: Vendor Mobile No & PO DATE
    new TableRow({
      children: [
        createCell('Vendor Mobile No', { bold: true }),
        createCell(data.vendorMobileNo || ''),
        createCell('PO DATE', { bold: true }),
        createCell(data.poDate || ''),
      ],
    }),

    // Row 5: PO NO & Vendor Bill Date
    new TableRow({
      children: [
        createCell('PO NO', { bold: true }),
        createCell(data.poNo || ''),
        createCell('Vendor Bill Date', { bold: true }),
        createCell(data.vendorBillDate || ''),
      ],
    }),

    // Row 6: Vendor Bill No & Vendor Bill Value
    new TableRow({
      children: [
        createCell('Vendor Bill No', { bold: true }),
        createCell(data.vendorBillNo || ''),
        createCell('Vendor Bill Value', { bold: true }),
        createCell(data.vendorBillValue ? String(data.vendorBillValue) : ''),
      ],
    }),

    // Row 7: Vendor Bill Quantity
    new TableRow({
      children: [
        createCell('Vendor Bill Quantity', { bold: true }),
        createCell(data.vendorBillQuantity ? String(data.vendorBillQuantity) : ''),
        createCell('', {}),
        createCell('', {}),
      ],
    }),
  ];

  // Table 2 Rows (Material Booking Details)
  const table2Rows: TableRow[] = [
    // Subtitle Note 2
    new TableRow({
      children: [
        createCell(
          `Information to be filled by Vendor after getting waybill number and booking of goods and email to be send at: ${emailRecipient} within 1 day of despatch of goods. MATERIAL BOOKING DETAILS`,
          {
            bold: true,
            italic: true,
            size: 16,
            alignment: AlignmentType.LEFT,
            colSpan: 4,
            shadingColor: 'F2F2F2',
          }
        ),
      ],
    }),

    // Booking Field Rows (2 Columns spanning across table)
    new TableRow({
      children: [
        createCell('Transporter Name', { bold: true, colSpan: 2, widthPercent: 40 }),
        createCell(data.transporterName || '', { colSpan: 2, widthPercent: 60 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Transporter LR NO', { bold: true, colSpan: 2 }),
        createCell(data.transporterLrNo || '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Date of LR', { bold: true, colSpan: 2 }),
        createCell(data.dateOfLr || '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Way Bill No If Applicable', { bold: true, colSpan: 2 }),
        createCell(data.wayBillNo || '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('No of Cartons/Bales', { bold: true, colSpan: 2 }),
        createCell(data.noOfCartons ? String(data.noOfCartons) : '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Identification mark on Cartons', { bold: true, colSpan: 2 }),
        createCell(data.identificationMark || '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Total Weight', { bold: true, colSpan: 2 }),
        createCell(data.totalWeight || '', { colSpan: 2 }),
      ],
    }),
    new TableRow({
      children: [
        createCell('Expected Lead Time in Days', { bold: true, colSpan: 2 }),
        createCell(data.expectedLeadTimeDays ? String(data.expectedLeadTimeDays) : '', { colSpan: 2 }),
      ],
    }),

    // Footer note row
    new TableRow({
      children: [
        createCell(
          `* Copy of Bill , LR , PO hard copies to be attached while booking shipment/ For any clarification contact on - ${contactPhone}`,
          {
            bold: false,
            italic: true,
            size: 15,
            colSpan: 4,
            shadingColor: 'FFFFFF',
          }
        ),
      ],
    }),
  ];

  const mainTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: TABLE_BORDERS,
    rows: [...table1Rows, ...table2Rows],
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 576, // 0.4 in
              bottom: 576,
              left: 576,
              right: 576,
            },
          },
        },
        children: [mainTable],
      },
    ],
  });
}

/**
 * Generate a .docx Blob ready for browser download
 */
export async function generateASNDocxBlob(data: ASNFormData): Promise<Blob> {
  const doc = buildASNDocument(data);
  return await Packer.toBlob(doc);
}

/**
 * Generate a .docx Buffer for Node.js server use
 */
export async function generateASNDocxBuffer(data: ASNFormData): Promise<Buffer> {
  const doc = buildASNDocument(data);
  return await Packer.toBuffer(doc);
}

/**
 * Triggers a direct browser file download for the ASN document (.docx)
 */
export async function downloadASNDocx(data: ASNFormData, customFilename?: string): Promise<void> {
  const blob = await generateASNDocxBlob(data);
  const cleanBillNo = (data.vendorBillNo || 'ASN').replace(/[\/\\:]/g, '-');
  const filename = customFilename || `ASN_${cleanBillNo}_${data.asnDate.replace(/[\/\\:]/g, '-')}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
