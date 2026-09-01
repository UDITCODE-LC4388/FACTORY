import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { parseMultiOrderPOText, ParsedPurchaseOrder } from '@/lib/po-parser';
import { parsePOWithGemini } from '@/lib/ai-po-engine';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawTextParam = formData.get('text') as string | null;
    const clientApiKey = formData.get('apiKey') as string | null;

    if (!file && !rawTextParam) {
      return NextResponse.json(
        { error: 'No PDF, Image file or text provided' },
        { status: 400 }
      );
    }

    const apiKey =
      clientApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let orders: ParsedPurchaseOrder[] = [];
    let parsedWith = 'deterministic';

    // 1. Try Google Gemini Multimodal Document Vision if API key is present
    if (apiKey) {
      try {
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');

          orders = await parsePOWithGemini(buffer, {
            apiKey,
            mimeType,
          });
          parsedWith = 'gemini-vision';
        } else if (rawTextParam) {
          orders = await parsePOWithGemini(rawTextParam, {
            apiKey,
          });
          parsedWith = 'gemini-vision';
        }
      } catch (geminiError: any) {
        console.warn('Gemini vision parsing failed, falling back to local OCR:', geminiError.message);
      }
    }

    // 2. Fallback Engine (PDF unpdf + Tesseract OCR) if Gemini was not used or failed
    if (orders.length === 0) {
      let extractedPages: string[] = [];

      if (file) {
        const fileName = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
          const { text } = await extractText(buffer);
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
          const worker = await createWorker('eng');
          const nodeBuffer = Buffer.from(arrayBuffer);
          const ret = await worker.recognize(nodeBuffer);
          await worker.terminate();

          extractedPages = [ret.data.text];
        } else {
          const textDecoder = new TextDecoder('utf-8');
          extractedPages = [textDecoder.decode(buffer)];
        }
      } else if (rawTextParam) {
        extractedPages = [rawTextParam];
      }

      orders = parseMultiOrderPOText(extractedPages);
      parsedWith = 'local-engine';
    }

    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      orders,
      parsedWith,
      hasApiKey: Boolean(apiKey),
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
