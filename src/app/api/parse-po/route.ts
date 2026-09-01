import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { parseMultiOrderPOText, ParsedPurchaseOrder } from '@/lib/po-parser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawTextParam = formData.get('text') as string | null;

    if (!file && !rawTextParam) {
      return NextResponse.json(
        { error: 'No PDF, Image file or text provided' },
        { status: 400 }
      );
    }

    let extractedPages: string[] = [];

    if (file) {
      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        // PDF Extraction using unpdf
        const { text, totalPages } = await extractText(buffer);
        if (Array.isArray(text)) {
          extractedPages = text;
        } else if (typeof text === 'string') {
          extractedPages = [text];
        }
      } else if (
        fileName.endsWith('.png') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.webp') ||
        file.type.startsWith('image/')
      ) {
        // Image OCR using Tesseract.js
        const worker = await createWorker('eng');
        const nodeBuffer = Buffer.from(arrayBuffer);
        const ret = await worker.recognize(nodeBuffer);
        await worker.terminate();

        extractedPages = [ret.data.text];
      } else {
        // Try fallback text decode
        const textDecoder = new TextDecoder('utf-8');
        extractedPages = [textDecoder.decode(buffer)];
      }
    } else if (rawTextParam) {
      extractedPages = [rawTextParam];
    }

    const orders: ParsedPurchaseOrder[] = parseMultiOrderPOText(extractedPages);

    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      orders,
    });
  } catch (err: unknown) {
    console.error('Error parsing PO:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to parse PO document',
      },
      { status: 500 }
    );
  }
}
