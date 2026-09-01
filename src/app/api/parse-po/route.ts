import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { parseMultiOrderPOText, ParsedPurchaseOrder } from '@/lib/po-parser';
import { parsePOWithGroqLLM } from '@/lib/ai-po-engine';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawTextParam = formData.get('text') as string | null;
    const engineMode = (formData.get('engineMode') as string) || 'auto'; // 'groq-llm' | 'deterministic' | 'auto'

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

    const fullText = extractedPages.join('\n\n---PAGE---\n\n');
    let orders: ParsedPurchaseOrder[] = [];
    let parsedWith = 'deterministic';

    // 1. If Groq LLM mode requested or Auto mode
    if (engineMode === 'groq-llm' || engineMode === 'auto') {
      try {
        orders = await parsePOWithGroqLLM(fullText);
        parsedWith = 'groq-llm';
      } catch (llmErr: any) {
        console.warn('Groq LLM extraction error, falling back to precision parser:', llmErr.message);
      }
    }

    // 2. Fallback or Explicit Deterministic Precision Engine
    if (orders.length === 0 || engineMode === 'deterministic') {
      orders = parseMultiOrderPOText(extractedPages);
      parsedWith = 'deterministic';
    }

    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      orders,
      parsedWith,
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
