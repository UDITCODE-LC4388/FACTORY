import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ParsedPurchaseOrder, ParsedPOLineItem, getStateFromGSTINOrName, panFromGSTIN } from './po-parser';

export interface AIParsingOptions {
  apiKey?: string;
  provider?: 'gemini' | 'openai';
  mimeType?: string;
}

const PO_EXTRACTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  description: 'List of all purchase orders detected in the document (one or many)',
  items: {
    type: Type.OBJECT,
    properties: {
      orderNumber: {
        type: Type.STRING,
        description: "Buyer's PO Number, Buyer's Order No, or document reference (e.g. PO/NO-50995, PO. NO 3490)",
      },
      orderDate: {
        type: Type.STRING,
        description: 'Order Date (e.g. 12-Aug-2026 or 2026-08-12)',
      },
      consigneeName: {
        type: Type.STRING,
        description: 'Legal Name of the Consignee / Ship-To company (e.g. V BAZAAR RETAIL PVT LTD, MADO BAZAAR)',
      },
      consigneeAddress: {
        type: Type.STRING,
        description: 'Complete shipping address of the consignee',
      },
      consigneeGstin: {
        type: Type.STRING,
        description: '15-digit GSTIN/UIN of the consignee',
      },
      consigneeState: {
        type: Type.STRING,
        description: 'State of consignee (e.g. West Bengal, Haryana, Delhi)',
      },
      consigneeStateCode: {
        type: Type.STRING,
        description: '2-digit state code of consignee (e.g. 19, 06, 07)',
      },
      isThroughBuyer: {
        type: Type.BOOLEAN,
        description: 'True if there is a separate Buyer (Bill-To) agency/firm mentioned (e.g. Buyer if other than consignee)',
      },
      buyerName: {
        type: Type.STRING,
        description: 'Legal Name of Buyer / Agency (e.g. JM JAIN LLP)',
      },
      buyerAddress: {
        type: Type.STRING,
        description: 'Billing address of the buyer agency',
      },
      buyerGstin: {
        type: Type.STRING,
        description: '15-digit GSTIN of the buyer agency',
      },
      buyerState: {
        type: Type.STRING,
        description: 'State of buyer agency',
      },
      buyerStateCode: {
        type: Type.STRING,
        description: '2-digit state code of buyer agency',
      },
      termsOfDelivery: {
        type: Type.STRING,
        description: 'Terms of Delivery or Place of Supply (e.g. PLACE OF SUPPLY DELHI)',
      },
      placeOfSupply: {
        type: Type.STRING,
        description: 'Place of supply state or city name',
      },
      supplierRef: {
        type: Type.STRING,
        description: 'Supplier reference if provided',
      },
      items: {
        type: Type.ARRAY,
        description: 'List of all garment/item rows in the order',
        items: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: 'Full item description including Style No, Color, Sub-category, and Size Range (e.g. STYLE NO 3125A(22X28)OLIVE BOYS CARGO PANTS)',
            },
            hsn_code: {
              type: Type.STRING,
              description: 'HSN/SAC code (e.g. 610990, 6107, 61101120)',
            },
            qty: {
              type: Type.NUMBER,
              description: 'Total quantity ordered',
            },
            unit_symbol: {
              type: Type.STRING,
              description: 'Unit of measurement (e.g. PCS, SET, DOZ, MTR, KG)',
            },
            price: {
              type: Type.NUMBER,
              description: 'Unit rate / price per unit (excluding GST)',
            },
            discount_percent: {
              type: Type.NUMBER,
              description: 'Trade discount percentage if applicable (e.g. 3 for 3%), 0 if none',
            },
            gst_percent: {
              type: Type.NUMBER,
              description: 'GST percentage rate (typically 5.0)',
            },
          },
          required: ['description', 'qty', 'price'],
        },
      },
    },
    required: ['orderNumber', 'consigneeName', 'items'],
  },
};

const SYSTEM_PROMPT = `
You are an expert AI Document Intelligence engine specialized in garment manufacturing, textile supply chain, Indian GST billing, and purchase order parsing.
Your task is to analyze the provided Purchase Order document (which can be a single PO or MULTIPLE separate POs combined into one PDF or image) and extract structured data for 1-click GST Tax Invoice generation.

CRITICAL INSTRUCTIONS:
1. MULTI-ORDER DETECTION: If the document contains multiple separate purchase orders (e.g., across multiple pages or separated by headers), parse EVERY order as a separate object in the output array.
2. CONSIGNEE vs. BUYER:
   - "Consignee (Ship To)": Where goods are delivered.
   - "Buyer (Bill To / Other than consignee)": If present and distinct from consignee, set "isThroughBuyer" to true and populate buyerName, buyerGstin, buyerAddress, etc.
3. LINE ITEMS & GARMENTS:
   - Capture full garment description (Style Number, Item Name, Colors, Sizes).
   - Extract exact HSN code, Quantity, Unit (default PCS), Unit Rate (Price), Discount % (if any), and GST % (default 5%).
4. ACCURACY: Extract exact numbers, GSTINs (15 characters), and PO numbers directly from the document.
`;

/**
 * Parses a document (PDF or Image) or raw text using Google Gemini Multimodal Vision API
 */
export async function parsePOWithGemini(
  bufferOrText: Uint8Array | string,
  options: AIParsingOptions = {}
): Promise<ParsedPurchaseOrder[]> {
  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-2.5-flash';

  const parts: any[] = [];

  if (typeof bufferOrText === 'string') {
    parts.push({
      text: `Please parse the following Purchase Order document text:\n\n${bufferOrText}`,
    });
  } else {
    const base64Data = Buffer.from(bufferOrText).toString('base64');
    const mimeType = options.mimeType || 'application/pdf';

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
    parts.push({
      text: 'Extract all purchase orders and line items from this document according to the schema.',
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: PO_EXTRACTION_SCHEMA,
      temperature: 0.1,
    },
  });

  const rawJson = response.text?.trim();
  if (!rawJson) {
    throw new Error('Empty response received from Gemini Vision');
  }

  const extractedList: any[] = JSON.parse(rawJson);

  if (!Array.isArray(extractedList) || extractedList.length === 0) {
    throw new Error('No purchase orders found in the document');
  }

  // Convert raw LLM objects to normalized ParsedPurchaseOrder objects
  return extractedList.map((rawOrder, idx) => {
    const consigneeStateObj = getStateFromGSTINOrName(rawOrder.consigneeGstin || rawOrder.consigneeState);
    const buyerStateObj = rawOrder.isThroughBuyer
      ? getStateFromGSTINOrName(rawOrder.buyerGstin || rawOrder.buyerState)
      : undefined;

    const items: ParsedPOLineItem[] = (rawOrder.items || []).map((it: any) => ({
      description: it.description || 'Garment Item',
      hsn_code: it.hsn_code || '610990',
      qty: Number(it.qty) || 1,
      unit_symbol: (it.unit_symbol || 'PCS').toUpperCase(),
      price: Number(it.price) || 100,
      discount_percent: Number(it.discount_percent) || 0,
      gst_percent: Number(it.gst_percent) || 5.0,
    }));

    return {
      id: crypto.randomUUID(),
      orderNumber: rawOrder.orderNumber || `PO-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
      orderDate: rawOrder.orderDate || new Date().toISOString().split('T')[0],
      consigneeName: rawOrder.consigneeName || 'Customer Party',
      consigneeAddress: rawOrder.consigneeAddress || '',
      consigneeGstin: rawOrder.consigneeGstin?.toUpperCase() || '',
      consigneeState: rawOrder.consigneeState || consigneeStateObj.name,
      consigneeStateCode: rawOrder.consigneeStateCode || consigneeStateObj.code,
      consigneePan: panFromGSTIN(rawOrder.consigneeGstin),
      isThroughBuyer: Boolean(rawOrder.isThroughBuyer && rawOrder.buyerName),
      buyerName: rawOrder.isThroughBuyer ? rawOrder.buyerName : undefined,
      buyerAddress: rawOrder.isThroughBuyer ? rawOrder.buyerAddress : undefined,
      buyerGstin: rawOrder.isThroughBuyer ? rawOrder.buyerGstin?.toUpperCase() : undefined,
      buyerState: rawOrder.isThroughBuyer ? (rawOrder.buyerState || buyerStateObj?.name) : undefined,
      buyerStateCode: rawOrder.isThroughBuyer ? (rawOrder.buyerStateCode || buyerStateObj?.code) : undefined,
      buyerPan: rawOrder.isThroughBuyer ? panFromGSTIN(rawOrder.buyerGstin) : undefined,
      termsOfDelivery: rawOrder.termsOfDelivery,
      placeOfSupply: rawOrder.placeOfSupply,
      supplierRef: rawOrder.supplierRef,
      items: items.length > 0 ? items : [
        {
          description: 'Garment Ready Goods',
          hsn_code: '610990',
          qty: 100,
          unit_symbol: 'PCS',
          price: 150,
          discount_percent: 0,
          gst_percent: 5.0,
        },
      ],
    };
  });
}
