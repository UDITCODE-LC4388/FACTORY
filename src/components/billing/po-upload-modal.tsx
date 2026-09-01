'use client';

import React, { useState, useRef } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { ParsedPurchaseOrder, parseMultiOrderPOText } from '@/lib/po-parser';
import { formatINR } from '@/lib/gst';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
  Zap,
  Cpu,
} from 'lucide-react';
import { Invoice, Party } from '@/types/database.types';

interface POUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdInvoice: Invoice, shouldPrint?: boolean) => void;
}

export type AnalysisEngine = 'auto' | 'groq-llm' | 'deterministic';

export function POUploadModal({ isOpen, onClose, onSuccess }: POUploadModalProps) {
  const { factory, parties, addParty, createSaleOrder, convertSaleOrderToInvoice } = useFactory();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [engineMode, setEngineMode] = useState<AnalysisEngine>('auto');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedOrders, setParsedOrders] = useState<ParsedPurchaseOrder[] | null>(null);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);
  const [billingDate, setBillingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedMultiIndices, setSelectedMultiIndices] = useState<number[]>([]);
  const [parsedMethod, setParsedMethod] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseFile(file);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setParsedOrders(null);
    setParsedMethod('');

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        // Direct in-browser ultra-fast extraction (handles 100+ page PDFs with 0 Vercel payload limits)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const { extractText } = await import('unpdf');
        const { text } = await extractText(buffer);
        const pagesArray = Array.isArray(text) ? text : [typeof text === 'string' ? text : ''];
        
        let orders = parseMultiOrderPOText(pagesArray);
        let usedEngine = 'deterministic';

        // If Groq LLM mode selected, enrich with Groq Cloud LLM
        if (engineMode === 'groq-llm' || (engineMode === 'auto' && orders.length <= 5)) {
          try {
            const formData = new FormData();
            formData.append('text', pagesArray.join('\n\n---PAGE---\n\n'));
            formData.append('engineMode', 'groq-llm');

            const res = await fetch('/api/parse-po', {
              method: 'POST',
              body: formData,
            });

            if (res.ok) {
              const aiData = await res.json();
              if (aiData.success && aiData.orders && aiData.orders.length > 0) {
                orders = aiData.orders;
                usedEngine = 'groq-llm';
              }
            }
          } catch (llmErr) {
            console.warn('Groq LLM text enrichment fallback to precision parser:', llmErr);
          }
        }

        if (!orders || orders.length === 0) {
          throw new Error('No valid purchase orders could be extracted from this PDF.');
        }

        setParsedOrders(orders);
        setSelectedOrderIndex(0);
        setSelectedMultiIndices(orders.map((_item: ParsedPurchaseOrder, idx: number) => idx));
        setParsedMethod(usedEngine);
      } else {
        // Images (PNG, JPG, WEBP) -> send to API route for OCR / Groq LLM
        const formData = new FormData();
        formData.append('file', file);
        formData.append('engineMode', engineMode);

        const res = await fetch('/api/parse-po', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to parse image document');
        }

        const orders: ParsedPurchaseOrder[] = data.orders;
        if (!orders || orders.length === 0) {
          throw new Error('No valid purchase orders could be extracted from this image.');
        }

        setParsedOrders(orders);
        setSelectedOrderIndex(0);
        setSelectedMultiIndices(orders.map((_item: ParsedPurchaseOrder, idx: number) => idx));
        setParsedMethod(data.parsedWith || 'groq-llm');
      }
    } catch (err: unknown) {
      console.error('PO Parsing error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseText = async () => {
    if (!pastedText.trim()) {
      setError('Please paste document text to parse');
      return;
    }

    setIsParsing(true);
    setError(null);
    setParsedOrders(null);
    setParsedMethod('');

    try {
      let orders = parseMultiOrderPOText(pastedText);
      let usedEngine = 'deterministic';

      if (engineMode === 'groq-llm' || engineMode === 'auto') {
        try {
          const formData = new FormData();
          formData.append('text', pastedText);
          formData.append('engineMode', 'groq-llm');

          const res = await fetch('/api/parse-po', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const aiData = await res.json();
            if (aiData.success && aiData.orders && aiData.orders.length > 0) {
              orders = aiData.orders;
              usedEngine = 'groq-llm';
            }
          }
        } catch (llmErr) {
          console.warn('Groq LLM text parsing fallback:', llmErr);
        }
      }

      if (!orders || orders.length === 0) {
        throw new Error('No valid purchase orders found in pasted text.');
      }

      setParsedOrders(orders);
      setSelectedOrderIndex(0);
      setSelectedMultiIndices(orders.map((_item: ParsedPurchaseOrder, idx: number) => idx));
      setParsedMethod(usedEngine);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsing(false);
    }
  };

  // Helper: Match or Add Party to Party Directory
  const ensurePartyExists = (
    name: string,
    gstin?: string,
    address?: string,
    state?: string,
    stateCode?: string,
    pan?: string
  ): Party => {
    let existing = parties.find(
      (p) =>
        (gstin && p.gstin?.toUpperCase() === gstin.toUpperCase()) ||
        p.name.toLowerCase() === name.toLowerCase()
    );

    if (!existing) {
      existing = addParty({
        name: name || 'New Customer',
        type: 'customer',
        gstin: gstin?.toUpperCase() || '',
        pan: pan?.toUpperCase() || (gstin ? gstin.slice(2, 12).toUpperCase() : ''),
        address: address || '',
        state: state || 'West Bengal',
        state_code: stateCode || '19',
        balance: 0,
      });
    }

    return existing;
  };

  // Action: Bill Single Selected PO
  const handleBillSingleOrder = (order: ParsedPurchaseOrder) => {
    try {
      const consigneeParty = ensurePartyExists(
        order.consigneeName,
        order.consigneeGstin,
        order.consigneeAddress,
        order.consigneeState,
        order.consigneeStateCode,
        order.consigneePan
      );

      let buyerParty: Party | undefined;
      if (order.isThroughBuyer && order.buyerName) {
        buyerParty = ensurePartyExists(
          order.buyerName,
          order.buyerGstin,
          order.buyerAddress,
          order.buyerState,
          order.buyerStateCode,
          order.buyerPan
        );
      }

      const newSO = createSaleOrder(
        {
          number: order.orderNumber,
          party_id: consigneeParty.id,
          buyer_party_id: order.isThroughBuyer && buyerParty ? buyerParty.id : undefined,
          is_through_buyer: order.isThroughBuyer,
          date: order.orderDate || new Date().toISOString().split('T')[0],
          buyer_order_no: order.orderNumber,
          buyer_order_date: order.orderDate,
          supplier_ref: order.orderNumber,
          terms_of_delivery: order.termsOfDelivery,
          place_of_supply: order.placeOfSupply,
          notes: `Parsed via ${parsedMethod === 'groq-llm' ? 'Groq Open-Source LLM' : 'High-Precision Engine'} (${order.orderNumber})`,
        },
        order.items.map((it) => ({
          description: it.description,
          hsn_code: it.hsn_code,
          qty: it.qty,
          unit_symbol: it.unit_symbol,
          price: it.price,
          discount_percent: it.discount_percent,
          gst_percent: it.gst_percent,
        }))
      );

      const invoice = convertSaleOrderToInvoice(newSO.id, {
        date: billingDate || new Date().toISOString().split('T')[0],
      });

      if (onSuccess) {
        onSuccess(invoice, true);
      }
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Action: Bill All Selected Orders
  const handleBillAllSelected = () => {
    if (!parsedOrders || selectedMultiIndices.length === 0) return;

    let lastInvoice: Invoice | null = null;

    try {
      selectedMultiIndices.forEach((idx) => {
        const order = parsedOrders[idx];
        if (!order) return;

        const consigneeParty = ensurePartyExists(
          order.consigneeName,
          order.consigneeGstin,
          order.consigneeAddress,
          order.consigneeState,
          order.consigneeStateCode,
          order.consigneePan
        );

        let buyerParty: Party | undefined;
        if (order.isThroughBuyer && order.buyerName) {
          buyerParty = ensurePartyExists(
            order.buyerName,
            order.buyerGstin,
            order.buyerAddress,
            order.buyerState,
            order.buyerStateCode,
            order.buyerPan
          );
        }

        const newSO = createSaleOrder(
          {
            number: order.orderNumber,
            party_id: consigneeParty.id,
            buyer_party_id: order.isThroughBuyer && buyerParty ? buyerParty.id : undefined,
            is_through_buyer: order.isThroughBuyer,
            date: order.orderDate || new Date().toISOString().split('T')[0],
            buyer_order_no: order.orderNumber,
            buyer_order_date: order.orderDate,
            supplier_ref: order.orderNumber,
            terms_of_delivery: order.termsOfDelivery,
            place_of_supply: order.placeOfSupply,
            notes: `Parsed via ${parsedMethod === 'groq-llm' ? 'Groq Open-Source LLM' : 'High-Precision Engine'} (${order.orderNumber})`,
          },
          order.items.map((it) => ({
            description: it.description,
            hsn_code: it.hsn_code,
            qty: it.qty,
            unit_symbol: it.unit_symbol,
            price: it.price,
            discount_percent: it.discount_percent,
            gst_percent: it.gst_percent,
          }))
        );

        lastInvoice = convertSaleOrderToInvoice(newSO.id, {
          date: billingDate || new Date().toISOString().split('T')[0],
        });
      });

      if (lastInvoice && onSuccess) {
        onSuccess(lastInvoice, true);
      }
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleMultiSelect = (idx: number) => {
    if (selectedMultiIndices.includes(idx)) {
      setSelectedMultiIndices(selectedMultiIndices.filter((i) => i !== idx));
    } else {
      setSelectedMultiIndices([...selectedMultiIndices, idx]);
    }
  };

  const currentOrder = parsedOrders?.[selectedOrderIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-850/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Purchase Order Reading Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-bold flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Groq LLaMA Cloud Embedded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Template-Independent &bull; Multi-PO Splitting &bull; 1-Click Instant Billing
              </p>
            </div>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setEngineMode('auto')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  engineMode === 'auto'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Smart Hybrid: In-browser ultra fast + Groq LLM"
              >
                <Zap className="h-3 w-3" />
                <span>Auto</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('groq-llm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  engineMode === 'groq-llm'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cloud Open-Source Groq LLM"
              >
                <Sparkles className="h-3 w-3" />
                <span>Groq LLM</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('deterministic')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  engineMode === 'deterministic'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Precision Table Rule Engine"
              >
                <Cpu className="h-3 w-3" />
                <span>Precision</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-200">
          {/* Step 1: Upload / Input Tabs if no parsed orders yet */}
          {!parsedOrders && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-850 rounded-xl w-fit border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload PO File (PDF / Image)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Paste Document Text</span>
                </button>
              </div>

              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-8 sm:p-12 text-center bg-slate-950/40 hover:bg-slate-850/40 transition cursor-pointer flex flex-col items-center justify-center gap-3 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition">
                    <Upload className="h-8 w-8" />
                  </div>

                  <div>
                    <span className="font-bold text-sm sm:text-base text-white block">
                      Click or Drag & Drop any Purchase Order Document
                    </span>
                    <span className="text-xs text-slate-400 block mt-1">
                      Works on <strong>ANY layout, format, or multi-order file</strong> &bull; PDFs (50+ MB) &bull; Scans & Images
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-red-400" /> Multi-Page PDF
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-400" /> Scans & Photos
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-purple-400" /> Multi-PO Splitting
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    placeholder="Paste the raw text of the PO or Tax Invoice here (e.g. Consignee, Items, Quantity, Rate, Buyer Order No)..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseText}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Parse Document</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              <div>
                <span className="font-bold text-white text-sm block">
                  Analyzing Document & Extracting Orders...
                </span>
                <span className="text-xs text-slate-400">
                  Detecting PO boundaries, parties, line items, rates, discounts, HSN codes, and delivery terms
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Document Reading Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Step 2: Parsed Multi-Order Results View */}
          {parsedOrders && parsedOrders.length > 0 && (
            <div className="space-y-6">
              {/* Parsing Method Badge */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {parsedMethod === 'groq-llm'
                    ? 'Extracted via Groq LLaMA Cloud AI'
                    : 'Extracted via High-Precision Multi-Order Engine'}
                </span>
                <span className="text-xs text-slate-400">
                  Found <strong>{parsedOrders.length} Purchase Order(s)</strong>
                </span>
              </div>

              {/* Multi-Order Tabs Header if more than 1 order found */}
              {parsedOrders.length > 1 && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-purple-400" />
                      <div>
                        <span className="font-bold text-white text-xs sm:text-sm block">
                          Multi-Order Document Detected!
                        </span>
                        <span className="text-[11px] text-slate-300">
                          Found <strong>{parsedOrders.length} separate orders</strong> in this file. Select which ones to bill:
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedMultiIndices.length === parsedOrders.length) {
                          setSelectedMultiIndices([]);
                        } else {
                          setSelectedMultiIndices(parsedOrders.map((_, i) => i));
                        }
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                    >
                      {selectedMultiIndices.length === parsedOrders.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {parsedOrders.map((ord, idx) => {
                      const isSelected = selectedMultiIndices.includes(idx);
                      const isCurrent = selectedOrderIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedOrderIndex(idx)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-2 ${
                            isCurrent
                              ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white block text-xs font-mono">{ord.orderNumber}</span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                              {ord.consigneeName}
                            </span>
                            <span className="text-[10.5px] text-emerald-400 font-bold mt-0.5 block">
                              {ord.items.length} item(s) &bull; {ord.items.reduce((s, i) => s + i.qty, 0)} Pcs
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMultiSelect(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-purple-400" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-600" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Order Summary Card */}
              {currentOrder && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5 space-y-4">
                  {/* Order Overview Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-400">
                          {currentOrder.orderNumber}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          Dated: {currentOrder.orderDate}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {currentOrder.isThroughBuyer
                          ? 'Through Buyer / Agency Shipment'
                          : 'Direct Supply to Party'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setParsedOrders(null);
                        setPastedText('');
                      }}
                      className="text-xs text-slate-400 hover:text-white underline self-start sm:self-auto"
                    >
                      Upload Different Document
                    </button>
                  </div>

                  {/* Parties Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Consignee */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                        Consignee (Ship-To)
                      </span>
                      <span className="font-bold text-white text-xs block mt-1">
                        {currentOrder.consigneeName}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {currentOrder.consigneeAddress || 'Address on file'}
                      </span>
                      <span className="text-[10.5px] font-mono text-slate-300 block mt-1">
                        GSTIN: {currentOrder.consigneeGstin || 'UNREGISTERED'} &bull; {currentOrder.consigneeState} ({currentOrder.consigneeStateCode})
                      </span>
                    </div>

                    {/* Buyer (if through buyer) */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                        Buyer (Bill-To)
                      </span>
                      {currentOrder.isThroughBuyer && currentOrder.buyerName ? (
                        <>
                          <span className="font-bold text-white text-xs block mt-1">
                            {currentOrder.buyerName}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {currentOrder.buyerAddress || 'Address on file'}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-300 block mt-1">
                            GSTIN: {currentOrder.buyerGstin || 'UNREGISTERED'} &bull; {currentOrder.buyerState} ({currentOrder.buyerStateCode})
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block mt-1">
                          Same as Consignee (Direct Supply)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs block">Extracted Line Items / Garments:</span>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-850 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-3">HSN</th>
                            <th className="py-2 px-3">Qty</th>
                            <th className="py-2 px-3">Rate</th>
                            <th className="py-2 px-3">Disc %</th>
                            <th className="py-2 px-3 text-right">Taxable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {currentOrder.items.map((it, idx) => {
                            const taxable = it.qty * it.price * (1 - (it.discount_percent || 0) / 100);
                            return (
                              <tr key={idx} className="hover:bg-slate-850/40">
                                <td className="py-2 px-3 font-sans text-white font-medium whitespace-pre-line">
                                  {it.description}
                                </td>
                                <td className="py-2 px-3 text-slate-400">{it.hsn_code}</td>
                                <td className="py-2 px-3 text-slate-200 font-bold">
                                  {it.qty} {it.unit_symbol}
                                </td>
                                <td className="py-2 px-3 text-slate-300">{formatINR(it.price)}</td>
                                <td className="py-2 px-3 text-amber-400">
                                  {it.discount_percent > 0 ? `${it.discount_percent}%` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-400">
                                  {formatINR(taxable)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ⚡ 1-Click Billing Form: Enter Billing Date */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/70 border border-blue-600/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      Enter Date of Billing
                    </span>
                    <span className="text-[11px] text-slate-300 block">
                      Everything else is 100% prepared &bull; Tax invoice will be generated simultaneously
                    </span>
                  </div>

                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="e.g. 15-Aug-2026 or 2026-08-15"
                      value={billingDate}
                      onChange={(e) => setBillingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-blue-500/50 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-inner"
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-blue-800/40">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>

                  {parsedOrders.length > 1 && selectedMultiIndices.length > 1 ? (
                    <button
                      type="button"
                      onClick={handleBillAllSelected}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>⚡ Bill All {selectedMultiIndices.length} Selected Orders Now</span>
                    </button>
                  ) : (
                    currentOrder && (
                      <button
                        type="button"
                        onClick={() => handleBillSingleOrder(currentOrder)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>⚡ Generate Tax Invoice & Print ({currentOrder.orderNumber})</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
