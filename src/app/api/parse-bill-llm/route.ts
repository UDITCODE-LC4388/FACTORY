import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { parseBillTextToASN, formatASNDate, cleanPONumber } from '@/lib/bill-asn-parser';
import { ASNFormData } from '@/types/asn.types';

const LLM_SYSTEM_PROMPT = `
You are an expert AI Document Intelligence engine specializing in Indian GST Tax Invoices, Garment/Textile bills, and Advance Shipping Notifications (ASN).
Your task is to analyze the provided Tax Invoice / Bill text (or OCR text) and extract the exact billing and shipping details.

CRITICAL INSTRUCTIONS:
1. Extract ONLY facts genuinely present in the document.
2. DO NOT make up or hallucinate any numbers, names, addresses, or phone numbers.
3. If a field is not found or not mentioned in the document, return an empty string "" (or 0 for numeric totals).
4. Return a strict JSON object with these EXACT keys:
{
  "vendorName": string (Seller / Supplier legal company name from top/header),
  "vendorCity": string (City of seller from seller address),
  "bookingLocation": string (Booking city / dispatch origin city),
  "vendorMobileNo": string (Seller phone/mobile number if present),
  "asnNumber": string (Leave empty "" unless an ASN number is explicitly specified),
  "asnDate": string (Invoice date in DD/MM/YYYY format),
  "dispatchLocation": string (Full Consignee / Delivery destination name and complete address lines),
  "poNo": string (Buyer's Order No / PO number without 'PO NO.' prefix),
  "poDate": string (PO / Buyer Order date in DD/MM/YYYY format),
  "vendorBillNo": string (Invoice Number / Bill Number),
  "vendorBillDate": string (Invoice Date in DD/MM/YYYY format),
  "vendorBillValue": number or string (Total invoice amount / Grand Total including tax),
  "vendorBillQuantity": number or string (Total quantity in PCS / units),
  "transporterName": string (Transporter / Despatched through carrier name if present),
  "transporterLrNo": string (LR Number / GR Number / Despatch Doc No if present),
  "dateOfLr": string (Date of LR / Delivery Note Date in DD/MM/YYYY if present),
  "wayBillNo": string (E-Way Bill Number if present),
  "noOfCartons": string (Number of cartons / boxes / packages if present),
  "identificationMark": string (Identification marks on cases if present),
  "totalWeight": string (Total gross or net weight if present),
  "expectedLeadTimeDays": string (Lead time in days if present),
  "buyerName": string (Buyer / Consignee company name),
  "emailRecipient": string (Buyer email address if in document, else empty ""),
  "contactPhone": string (Buyer contact phone if in document, else empty "")
}
Return STRICT JSON ONLY. No markdown, no conversational commentary.
`;

async function callLLM(text: string, userApiKey?: string, userProvider?: string): Promise<Partial<ASNFormData> | null> {
  const groqKey = userApiKey || process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const geminiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const openaiKey = userApiKey || process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  // 1. Try Groq if available
  if (groqKey && (!userProvider || userProvider === 'groq')) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: LLM_SYSTEM_PROMPT },
            { role: 'user', content: `Extract ASN and billing details from this Tax Invoice text:\n\n${text.slice(0, 40000)}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return JSON.parse(content);
      }
    } catch (err) {
      console.warn('Groq LLM call failed:', err);
    }
  }

  // 2. Try Gemini if available
  if (geminiKey && (!userProvider || userProvider === 'gemini')) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${LLM_SYSTEM_PROMPT}\n\nInvoice Text:\n${text.slice(0, 40000)}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Gemini call failed:', err);
    }
  }

  // 3. Try OpenAI if available
  if (openaiKey && (!userProvider || userProvider === 'openai')) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: LLM_SYSTEM_PROMPT },
            { role: 'user', content: `Extract ASN and billing details from this invoice:\n\n${text.slice(0, 40000)}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return JSON.parse(content);
      }
    } catch (err) {
      console.warn('OpenAI call failed:', err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawTextParam = formData.get('text') as string | null;
    const userApiKey = (formData.get('apiKey') as string) || undefined;
    const userProvider = (formData.get('provider') as string) || undefined;

    if (!file && !rawTextParam) {
      return NextResponse.json(
        { error: 'No invoice PDF, image, or text provided.' },
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
        extractedText = Array.isArray(text) ? text.join('\n\n') : String(text || '');

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
            // continue with whatever text was available
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
        { error: 'Could not extract readable text from document.' },
        { status: 422 }
      );
    }

    // 1. Try LLM extraction first
    let llmResult: Partial<ASNFormData> | null = null;
    try {
      llmResult = await callLLM(extractedText, userApiKey, userProvider);
    } catch (llmErr) {
      console.warn('LLM extraction attempt threw error:', llmErr);
    }

    // 2. Deterministic Precision Parser
    const fallbackParsed = parseBillTextToASN(extractedText);

    // Merge LLM result with deterministic fallback for 100% coverage
    const finalASN: ASNFormData = {
      vendorName: llmResult?.vendorName || fallbackParsed.vendorName || '',
      vendorCity: llmResult?.vendorCity || fallbackParsed.vendorCity || '',
      bookingLocation: llmResult?.bookingLocation || fallbackParsed.bookingLocation || '',
      vendorMobileNo: llmResult?.vendorMobileNo || fallbackParsed.vendorMobileNo || '',
      asnNumber: llmResult?.asnNumber || '',
      asnDate: formatASNDate(llmResult?.asnDate || fallbackParsed.vendorBillDate),
      dispatchLocation: llmResult?.dispatchLocation || fallbackParsed.dispatchLocation || '',
      poNo: cleanPONumber(llmResult?.poNo || fallbackParsed.poNo || ''),
      poDate: formatASNDate(llmResult?.poDate || fallbackParsed.poDate),
      vendorBillNo: llmResult?.vendorBillNo || fallbackParsed.vendorBillNo || '',
      vendorBillDate: formatASNDate(llmResult?.vendorBillDate || fallbackParsed.vendorBillDate),
      vendorBillValue: llmResult?.vendorBillValue !== undefined && llmResult?.vendorBillValue !== ''
        ? llmResult.vendorBillValue
        : fallbackParsed.vendorBillValue || '',
      vendorBillQuantity: llmResult?.vendorBillQuantity !== undefined && llmResult?.vendorBillQuantity !== ''
        ? llmResult.vendorBillQuantity
        : fallbackParsed.vendorBillQuantity || '',
      transporterName: llmResult?.transporterName || fallbackParsed.transporterName || '',
      transporterLrNo: llmResult?.transporterLrNo || fallbackParsed.transporterLrNo || '',
      dateOfLr: llmResult?.dateOfLr ? formatASNDate(llmResult.dateOfLr) : fallbackParsed.dateOfLr || '',
      wayBillNo: llmResult?.wayBillNo || fallbackParsed.wayBillNo || '',
      noOfCartons: llmResult?.noOfCartons || fallbackParsed.noOfCartons || '',
      identificationMark: llmResult?.identificationMark || fallbackParsed.identificationMark || '',
      totalWeight: llmResult?.totalWeight || fallbackParsed.totalWeight || '',
      expectedLeadTimeDays: llmResult?.expectedLeadTimeDays || fallbackParsed.expectedLeadTimeDays || '',
      buyerName: llmResult?.buyerName || fallbackParsed.buyerName || '',
      emailRecipient: llmResult?.emailRecipient || fallbackParsed.emailRecipient || '',
      contactPhone: llmResult?.contactPhone || fallbackParsed.contactPhone || '',
    };

    return NextResponse.json({
      success: true,
      extractedBy: llmResult ? 'llm' : 'deterministic',
      asnData: finalASN,
      rawTextSnippet: extractedText.slice(0, 500),
    });
  } catch (err: unknown) {
    console.error('Error in parse-bill-llm:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to extract bill details',
      },
      { status: 500 }
    );
  }
}
