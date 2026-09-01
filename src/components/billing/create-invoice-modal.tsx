'use client';

import React, { useState, useEffect } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { Invoice, InvoiceItem, Party } from '@/types/database.types';
import { calculateGST, formatINR, formatIndianNumber, numberToIndianWords, INDIAN_STATES } from '@/lib/gst';
import {
  FileText,
  Plus,
  Trash2,
  X,
  Truck,
  Building,
  UserCheck,
  Percent,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartyId?: string;
  initialSaleOrderId?: string;
  editInvoice?: Invoice | null;
  onSuccess?: (createdInvoice: Invoice, shouldPrint?: boolean) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  initialPartyId,
  initialSaleOrderId,
  editInvoice,
  onSuccess,
}: CreateInvoiceModalProps) {
  const { factory, parties, products, saleOrders, createDirectInvoice, updateInvoice } = useFactory();

  // PO Selection state
  const [selectedSaleOrderId, setSelectedSaleOrderId] = useState<string>(
    editInvoice?.sale_order_id || initialSaleOrderId || ''
  );

  // Supply Mode: false = Direct Supply (Consignee == Buyer), true = Through Buyer (Consignee != Buyer)
  const [isThroughBuyer, setIsThroughBuyer] = useState(editInvoice?.is_through_buyer || false);
  const [consigneePartyId, setConsigneePartyId] = useState(
    editInvoice?.party_id || initialPartyId || parties[0]?.id || ''
  );
  const [buyerPartyId, setBuyerPartyId] = useState(
    editInvoice?.buyer_party_id || (parties[1]?.id || '')
  );

  // Invoice Metadata
  const defaultInvoiceNumber = `GST/MG/${new Date().getFullYear().toString().slice(2)}-${(new Date().getFullYear() + 1).toString().slice(2)}/${String(Date.now()).slice(-4)}`;
  const [invoiceNumber, setInvoiceNumber] = useState(editInvoice?.number || defaultInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(editInvoice?.date || new Date().toISOString().split('T')[0]);
  const [saleType, setSaleType] = useState<'credit' | 'cash'>(editInvoice?.sale_type || 'credit');

  // Transport & Delivery metadata
  const [showTransportDetails, setShowTransportDetails] = useState(Boolean(editInvoice?.buyer_order_no || editInvoice?.terms_of_delivery));
  const [supplierRef, setSupplierRef] = useState(editInvoice?.supplier_ref || '');
  const [otherReferences, setOtherReferences] = useState(editInvoice?.other_references || '');
  const [buyerOrderNo, setBuyerOrderNo] = useState(editInvoice?.buyer_order_no || '');
  const [buyerOrderDate, setBuyerOrderDate] = useState(editInvoice?.buyer_order_date || '');
  const [deliveryNote, setDeliveryNote] = useState(editInvoice?.delivery_note || '');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState(editInvoice?.delivery_note_date || '');
  const [despatchDocNo, setDespatchDocNo] = useState(editInvoice?.despatch_doc_no || '');
  const [despatchedThrough, setDespatchedThrough] = useState(editInvoice?.despatched_through || '');
  const [destination, setDestination] = useState(editInvoice?.destination || '');
  const [termsOfDelivery, setTermsOfDelivery] = useState(editInvoice?.terms_of_delivery || '');
  const [placeOfSupply, setPlaceOfSupply] = useState(editInvoice?.place_of_supply || '');

  // Line items
  const [lineItems, setLineItems] = useState<
    Array<{
      id?: string;
      product_id?: string;
      description: string;
      hsn_code: string;
      qty: number;
      unit_symbol: string;
      price: number;
      discount_percent: number;
      gst_percent: number;
    }>
  >(
    editInvoice?.items?.map((it) => ({
      id: it.id,
      product_id: it.product_id,
      description: it.description,
      hsn_code: it.hsn_code,
      qty: it.qty,
      unit_symbol: it.unit_symbol || 'PCS',
      price: it.price,
      discount_percent: it.discount_percent || 0,
      gst_percent: it.gst_percent,
    })) || [
      {
        description: 'STYLE NO 3125A(22X28)OLIVE\nBOYS CARGO PANTS',
        hsn_code: '610990',
        qty: 320,
        unit_symbol: 'PCS',
        price: 195,
        discount_percent: 3,
        gst_percent: 5,
      },
    ]
  );

  // Function to load entire PO details
  const handleLoadPO = (poId: string) => {
    setSelectedSaleOrderId(poId);
    if (!poId) return;

    const po = saleOrders.find((s) => s.id === poId);
    if (!po) return;

    setConsigneePartyId(po.party_id);
    if (po.is_through_buyer && po.buyer_party_id) {
      setIsThroughBuyer(true);
      setBuyerPartyId(po.buyer_party_id);
    } else {
      setIsThroughBuyer(false);
    }

    setBuyerOrderNo(po.buyer_order_no || po.number);
    setBuyerOrderDate(po.buyer_order_date || po.date);
    setSupplierRef(po.supplier_ref || po.number);
    setDeliveryNote(po.delivery_note || '');
    setDeliveryNoteDate(po.delivery_note_date || '');
    setDespatchDocNo(po.despatch_doc_no || '');
    setDespatchedThrough(po.despatched_through || '');
    setDestination(po.destination || '');
    setTermsOfDelivery(po.terms_of_delivery || '');
    setPlaceOfSupply(po.place_of_supply || '');
    setShowTransportDetails(true);

    if (po.items && po.items.length > 0) {
      setLineItems(
        po.items.map((it) => ({
          product_id: it.product_id,
          description: it.description,
          hsn_code: it.hsn_code || '610990',
          qty: it.qty,
          unit_symbol: it.unit_symbol || 'PCS',
          price: it.price,
          discount_percent: it.discount_percent || 0,
          gst_percent: it.gst_percent || 5,
        }))
      );
    }
  };

  // Sync initial props
  useEffect(() => {
    if (initialSaleOrderId && !editInvoice) {
      handleLoadPO(initialSaleOrderId);
    } else if (initialPartyId && !editInvoice) {
      setConsigneePartyId(initialPartyId);
    }
  }, [initialSaleOrderId, initialPartyId, editInvoice]);

  const consigneeParty = parties.find((p) => p.id === consigneePartyId) || parties[0];
  const buyerParty = isThroughBuyer ? (parties.find((p) => p.id === buyerPartyId) || parties[0]) : consigneeParty;

  // Auto-set Place of Supply when Buyer/Consignee changes
  useEffect(() => {
    if (!termsOfDelivery) {
      const activeState = (isThroughBuyer ? buyerParty?.state : consigneeParty?.state) || '';
      if (activeState && factory.state_code !== (isThroughBuyer ? buyerParty?.state_code : consigneeParty?.state_code)) {
        setTermsOfDelivery(`PLACE OF SUPPLY\n${activeState.toUpperCase()}`);
        setPlaceOfSupply(activeState.toUpperCase());
      }
    }
  }, [isThroughBuyer, buyerParty, consigneeParty, factory.state_code, termsOfDelivery]);

  // Live GST Calculations
  const destinationStateCode = (isThroughBuyer ? buyerParty?.state_code : consigneeParty?.state_code) || '19';
  const gstCalcItems = lineItems.map((it) => ({
    description: it.description,
    hsnCode: it.hsn_code,
    qty: it.qty,
    unitSymbol: it.unit_symbol,
    price: it.price,
    discountPercent: it.discount_percent,
    gstPercent: it.gst_percent,
  }));
  const gstRes = calculateGST(factory.state_code, destinationStateCode, gstCalcItems);

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: 'STYLE NO 3092(0X20)WHITE\nINFANT F/S T-SHIRT MG-151',
        hsn_code: '61101120',
        qty: 100,
        unit_symbol: 'PCS',
        price: 115,
        discount_percent: 0,
        gst_percent: 5,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) {
      alert('An invoice must have at least 1 item.');
      return;
    }
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      description: prod.name,
      hsn_code: prod.hsn_code || '610990',
      price: prod.sale_price,
      gst_percent: prod.gst_percent || 5,
    };
    setLineItems(updated);
  };

  const handleSubmit = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!consigneePartyId) {
      alert('Please select a Consignee party.');
      return;
    }

    const payload: Partial<Invoice> = {
      number: invoiceNumber,
      date: invoiceDate,
      party_id: consigneePartyId,
      buyer_party_id: isThroughBuyer ? buyerPartyId : undefined,
      is_through_buyer: isThroughBuyer,
      sale_order_id: selectedSaleOrderId || undefined,
      sale_type: saleType,
      supplier_ref: supplierRef || invoiceNumber,
      other_references: otherReferences,
      buyer_order_no: buyerOrderNo,
      buyer_order_date: buyerOrderDate,
      delivery_note: deliveryNote,
      delivery_note_date: deliveryNoteDate,
      despatch_doc_no: despatchDocNo,
      despatched_through: despatchedThrough,
      destination: destination || consigneeParty?.state || '',
      terms_of_delivery: termsOfDelivery,
      place_of_supply: placeOfSupply || (buyerParty?.state ? buyerParty.state.toUpperCase() : ''),
      round_off: gstRes.roundOff,
    };

    let resultInvoice: Invoice;
    if (editInvoice) {
      resultInvoice = updateInvoice(editInvoice.id, payload, lineItems);
    } else {
      resultInvoice = createDirectInvoice(payload, lineItems);
    }

    if (onSuccess) {
      onSuccess(resultInvoice, shouldPrint);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-850/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editInvoice ? `Edit Tax Invoice (${editInvoice.number})` : 'Create Advanced Tax Invoice'}
              </h2>
              <p className="text-xs text-slate-400">
                Direct Supply or Agency/Buyer shipments &bull; Exact PDF Template Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-200">
          {/* ⚡ PO Quick Loader Banner & Selector */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-slate-900/80 border border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">⚡ Load from Posted PO / Buyer Order:</span>
                <span className="text-[11px] text-slate-300">
                  Pre-fills all parties, items, rates, discounts, and terms — you only need to confirm the <strong>Bill Date</strong>!
                </span>
              </div>
            </div>

            <div className="w-full sm:w-80">
              <select
                value={selectedSaleOrderId}
                onChange={(e) => handleLoadPO(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-blue-500/50 text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              >
                <option value="">-- Select Posted PO or Enter Manually --</option>
                {saleOrders.map((so) => {
                  const p = parties.find((pt) => pt.id === so.party_id);
                  const b = so.buyer_party_id ? parties.find((pt) => pt.id === so.buyer_party_id) : undefined;
                  return (
                    <option key={so.id} value={so.id}>
                      {so.number} &bull; {p?.name || 'Party'} {b ? `(via ${b.name})` : ''} — {formatINR(so.total_amount)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 1. Supply Mode Switcher (Direct Supply vs Through a Buyer) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-cyan-400" />
                Select Supply & Billing Mode
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${isThroughBuyer ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                {isThroughBuyer ? 'Through a Buyer (Consignee ≠ Buyer)' : 'Direct Supply (Consignee == Buyer)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mode 1: Direct Supply */}
              <button
                type="button"
                onClick={() => setIsThroughBuyer(false)}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-3 ${
                  !isThroughBuyer
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${!isThroughBuyer ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Direct Supply to Party</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Consignee and Buyer are identical. Bill and ship directly to party (e.g. MADO BAZAAR or PRIMART).
                  </div>
                </div>
              </button>

              {/* Mode 2: Through a Buyer / Third Party */}
              <button
                type="button"
                onClick={() => setIsThroughBuyer(true)}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-3 ${
                  isThroughBuyer
                    ? 'bg-purple-600/15 border-purple-500 text-white shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${isThroughBuyer ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Building className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">Supply Through a Buyer / Agent</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ship to destination/store (Consignee) and Bill to buyer/agency (e.g. Ship to V BAZAAR, Bill to JM JAIN LLP).
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Parties Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Consignee (Ship-To) */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
              <label className="font-bold text-white flex items-center justify-between">
                <span>1. Consignee (Ship To Party) *</span>
                <span className="text-[10px] text-blue-400 uppercase font-mono">{consigneeParty?.state} ({consigneeParty?.state_code})</span>
              </label>
              <select
                value={consigneePartyId}
                onChange={(e) => setConsigneePartyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.state} ({p.gstin || 'Unregistered'})
                  </option>
                ))}
              </select>
              {consigneeParty && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="whitespace-pre-line text-slate-400">{consigneeParty.address || 'Address on file'}</div>
                  <div className="font-mono text-[10.5px] text-slate-300">GSTIN: {consigneeParty.gstin || 'UNREGISTERED'}</div>
                </div>
              )}
            </div>

            {/* Buyer (Bill-To) */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
              <label className="font-bold text-white flex items-center justify-between">
                <span>2. Buyer (Bill To Party) {isThroughBuyer ? '*' : '(Same as Consignee)'}</span>
                {isThroughBuyer && (
                  <span className="text-[10px] text-purple-400 uppercase font-mono">{buyerParty?.state} ({buyerParty?.state_code})</span>
                )}
              </label>
              {isThroughBuyer ? (
                <select
                  value={buyerPartyId}
                  onChange={(e) => setBuyerPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-purple-500/50 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.state} ({p.gstin || 'Unregistered'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 italic">
                  Identical to Consignee: {consigneeParty?.name}
                </div>
              )}
              {isThroughBuyer && buyerParty && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="whitespace-pre-line text-slate-400">{buyerParty.address || 'Address on file'}</div>
                  <div className="font-mono text-[10.5px] text-slate-300">GSTIN: {buyerParty.gstin || 'UNREGISTERED'}</div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Invoice Main Identifiers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Invoice Number *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Invoice Date *</label>
              <input
                type="text"
                placeholder="e.g. 12-Aug-2026 or 2026-08-12"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Payment Terms</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="credit">Credit</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Supplier's Ref</label>
              <input
                type="text"
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
                placeholder="Same as Invoice #"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 4. Collapsible Transport & Delivery Metadata */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTransportDetails(!showTransportDetails)}
              className="w-full p-3.5 flex items-center justify-between text-left font-bold text-xs text-slate-300 hover:bg-slate-850/50 transition"
            >
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                Transport, Delivery & Order References (PO No, Place of Supply, Despatch)
              </span>
              {showTransportDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showTransportDetails && (
              <div className="p-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Buyer's Order No (PO #)</label>
                  <input
                    type="text"
                    placeholder="e.g. PO/NO-50995"
                    value={buyerOrderNo}
                    onChange={(e) => setBuyerOrderNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Buyer's Order Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 16-Jul-2026"
                    value={buyerOrderDate}
                    onChange={(e) => setBuyerOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Terms of Delivery / Place of Supply</label>
                  <input
                    type="text"
                    placeholder="e.g. PLACE OF SUPPLY DELHI"
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Despatched Through</label>
                  <input
                    type="text"
                    placeholder="e.g. Road Transport / V-Trans"
                    value={despatchedThrough}
                    onChange={(e) => setDespatchedThrough(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Despatch Doc No / L.R. No</label>
                  <input
                    type="text"
                    placeholder="e.g. LR-994812"
                    value={despatchDocNo}
                    onChange={(e) => setDespatchDocNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Destination</label>
                  <input
                    type="text"
                    placeholder="e.g. Gurugram / Delhi"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs sm:text-sm">
                Line Items (Description, HSN, Quantity, Rate, Discount %, GST)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-850/80 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Description of Goods</th>
                      <th className="py-2.5 px-3 w-28">HSN/SAC</th>
                      <th className="py-2.5 px-3 w-24">Qty</th>
                      <th className="py-2.5 px-3 w-20">Unit</th>
                      <th className="py-2.5 px-3 w-24">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-20">Disc %</th>
                      <th className="py-2.5 px-3 w-28 text-right">Taxable</th>
                      <th className="py-2.5 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {lineItems.map((item, idx) => {
                      const gross = item.qty * item.price;
                      const disc = item.discount_percent > 0 ? (gross * item.discount_percent) / 100 : 0;
                      const taxable = gross - disc;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 min-w-[200px]">
                            {products.length > 0 && (
                              <select
                                onChange={(e) => handleProductSelect(idx, e.target.value)}
                                className="w-full mb-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                              >
                                <option value="">Select from Product Catalog...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (HSN: {p.hsn_code}, ₹{p.sale_price})
                                  </option>
                                ))}
                              </select>
                            )}
                            <textarea
                              rows={2}
                              required
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].description = e.target.value;
                                setLineItems(updated);
                              }}
                              placeholder="e.g. STYLE NO 3125A(22X28)OLIVE&#10;BOYS CARGO PANTS"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.hsn_code}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].hsn_code = e.target.value;
                                setLineItems(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.qty}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].qty = Number(e.target.value);
                                setLineItems(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-right"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.unit_symbol}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].unit_symbol = e.target.value;
                                setLineItems(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].price = Number(e.target.value);
                                setLineItems(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-right"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.discount_percent}
                              onChange={(e) => {
                                const updated = [...lineItems];
                                updated[idx].discount_percent = Number(e.target.value);
                                setLineItems(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-center"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {formatINR(taxable)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 6. Live Calculation Card & Tax Summary */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between gap-6">
            {/* Left: In Words */}
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Amount Chargeable (in words):</span>
                <span className="font-bold text-xs sm:text-sm text-emerald-400">
                  {numberToIndianWords(gstRes.totalAmount)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Tax Amount (in words):</span>
                <span className="font-semibold text-xs text-cyan-300">
                  {numberToIndianWords(gstRes.totalGst)}
                </span>
              </div>
            </div>

            {/* Right: Math Breakdown */}
            <div className="w-full sm:w-80 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold">{formatINR(gstRes.taxableAmount)}</span>
              </div>

              {gstRes.isInterstate ? (
                <div className="flex justify-between text-cyan-400">
                  <span>Output IGST (5%):</span>
                  <span className="font-mono font-bold">{formatINR(gstRes.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Output CGST (2.5%):</span>
                    <span className="font-mono font-bold">{formatINR(gstRes.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Output SGST (2.5%):</span>
                    <span className="font-mono font-bold">{formatINR(gstRes.sgst)}</span>
                  </div>
                </>
              )}

              {gstRes.roundOff !== 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Round Off:</span>
                  <span className="font-mono font-semibold">
                    {gstRes.roundOff < 0 ? `(-)₹${Math.abs(gstRes.roundOff).toFixed(2)}` : `(+)₹${gstRes.roundOff.toFixed(2)}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-base text-white border-t border-slate-800 pt-2 text-emerald-400">
                <span>Grand Total:</span>
                <span className="font-mono">{formatINR(gstRes.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Save & Open Print Preview</span>
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{editInvoice ? 'Save Invoice Changes' : 'Generate & Post Tax Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
