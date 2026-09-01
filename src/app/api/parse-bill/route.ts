import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { parseBillTextToASN } from '@/lib/bill-asn-parser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawTextParam = formData.get('text') as string | null;

    if (!file && !rawTextParam) {
      return NextResponse.json(
        { error: 'No PDF, image file or text provided' },
        { status: 400 }
      );
    }

    let extractedText = '';

    if (file) {
      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        const { text } = await extractText(buffer);
        if (Array.isArray(text)) {
          extractedText = text.join('\n\n');
        } else if (typeof text === 'string') {
          extractedText = text;
        }

        // If PDF was a scanned image and text is empty or very short, run Tesseract OCR
        if (!extractedText.trim() || extractedText.length < 20) {
          try {
            const worker = await createWorker('eng');
            const nodeBuffer = Buffer.from(arrayBuffer);
            const ret = await worker.recognize(nodeBuffer);
            await worker.terminate();
            if (ret.data.text && ret.data.text.trim()) {
              extractedText = ret.data.text;
            }
          } catch {
            // keep whatever text we had
          }
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
        extractedText = ret.data.text || '';
      } else {
        const textDecoder = new TextDecoder('utf-8');
        extractedText = textDecoder.decode(buffer);
      }
    } else if (rawTextParam) {
      extractedText = rawTextParam;
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract readable text from document' },
        { status: 422 }
      );
    }

    const asnData = parseBillTextToASN(extractedText);

    return NextResponse.json({
      success: true,
      rawText: extractedText,
      asnData,
    });
  } catch (err: unknown) {
    console.error('Error parsing bill:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to parse bill document',
      },
      { status: 500 }
    );
  }
}
