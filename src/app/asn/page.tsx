'use client';

import React, { useState, useRef } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { ASNFormData } from '@/types/asn.types';
import { parseBillTextToASN, convertInvoiceToASN } from '@/lib/bill-asn-parser';
import { downloadASNDocx } from '@/lib/asn-doc-generator';
import { ASNPreviewTemplate } from '@/components/billing/asn-preview-template';
import { WhatsAppModal } from '@/components/common/whatsapp-modal';
import {
  Truck,
  Upload,
  FileText,
  Download,
  Printer,
  Copy,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  FileCode,
  FileSpreadsheet,
  Zap,
  Check,
} from 'lucide-react';

const SAMPLE_BILL_TEXT = `Tax Invoice
MANISHA GARMENTS
NA,34-35/2/1 SITA RAM SUPER MARKET
SRI AUROBINDRA ROAD ,SALKIA
HOWRAH-711106
GSTIN/UIN: 19AGGPB3696R1ZM
State Name : West Bengal, Code : 19
Consignee
PRIMART
LOHARUKA ,INFRASTRUCTURE PRIVATE LIMITED
KHATIAN NO 871 MOUZA-PANDIT SATHGHARA
VILLAGE-SIMLA P.S -SHRIRAMPUR
DIST HOOGHLY
GSTIN/UIN : 19AABCG6822C2ZT
State Name : West Bengal, Code : 19
Buyer (if other than consignee)
PRIMART
LOHARUKA ,INFRASTRUCTURE PRIVATE LIMITED
KHATIAN NO 871 MOUZA-PANDIT SATHGHARA
VILLAGE-SIMLA P.S -SHRIRAMPUR
DIST HOOGHLY
GSTIN/UIN : 19AABCG6822C2ZT
State Name : West Bengal, Code : 19
Invoice No.
GST/MG/201/26-27
Delivery Note
Supplier’s Ref.
Buyer’s Order No.
PO NO.3472
Despatch Document No.
Despatched through
Dated
31-Aug-2026
Mode/Terms of Payment
Other Reference(s)
Dated
10-Jun-2026
Delivery Note Date
Destination
Terms of Delivery
Sl Description of HSN/SAC Quantity Rate per Disc. % Amount
No. Goods
1 STYLE NO.3079(0X20)CREAM 61101120 196.000 PCS 135.00 PCS 26,460.00
INFANT F/S T-SHIRT MG 191
OUTPUT CGST 2.5% 2.50 % 661.50
OUTPUT SGST 2.5% 2.50 % 661.50
Total 196.000 PCS ₹ 27,783.00
Amount Chargeable (in words) E. & O.E
INR Twenty Seven Thousand Seven Hundred Eighty Three Only
Company’s PAN : AGGPB3696R`;

export default function StandaloneASNPage() {
  const { factory, invoices, parties } = useFactory();

  const [asnData, setAsnData] = useState<ASNFormData | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'select' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler (PDF or Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);
    setUploadedFileName(file.name);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const { extractText } = await import('unpdf');
        const { text } = await extractText(buffer);
        const fullText = Array.isArray(text) ? text.join('\n\n') : String(text || '');

        if (!fullText.trim()) {
          throw new Error('Could not extract text from this PDF. Please ensure it is readable.');
        }

        const parsed = parseBillTextToASN(fullText, factory);
        setAsnData(parsed);
        setStatusMessage(`Bill "${file.name}" parsed! Bill No: ${parsed.vendorBillNo}, PO No: ${parsed.poNo}, Qty: ${parsed.vendorBillQuantity} PCS, Total: ₹${parsed.vendorBillValue}`);
      } else {
        // OCR route for images / scans
        const formData = new FormData();
        formData.append('file', file);
        formData.append('engineMode', 'auto');

        const res = await fetch('/api/parse-po', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Failed to process image with OCR engine.');
        }

        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          const ord = data.orders[0];
          const parsedASN: ASNFormData = {
            vendorName: factory.name || 'MANISHA GARMENTS',
            vendorCity: 'KOLKATA',
            bookingLocation: 'KOLKATA',
            vendorMobileNo: factory.phone || '9007157204',
            asnNumber: '',
            asnDate: ord.orderDate || new Date().toISOString().split('T')[0],
            dispatchLocation: ord.consigneeAddress || ord.consigneeName || '',
            poNo: ord.orderNumber || '3472',
            poDate: ord.orderDate || new Date().toISOString().split('T')[0],
            vendorBillNo: `GST/MG/${ord.orderNumber}`,
            vendorBillDate: ord.orderDate || new Date().toISOString().split('T')[0],
            vendorBillValue: ord.items.reduce((s: number, i: any) => s + (i.price * i.qty), 0),
            vendorBillQuantity: ord.items.reduce((s: number, i: any) => s + i.qty, 0),
            transporterName: '',
            transporterLrNo: '',
            dateOfLr: '',
            wayBillNo: '',
            noOfCartons: '',
            identificationMark: '',
            totalWeight: '',
            expectedLeadTimeDays: '',
            buyerName: ord.buyerName || ord.consigneeName || 'PRIMART',
            emailRecipient: 'sdr@primart.co.in',
            contactPhone: '7777777777',
          };
          setAsnData(parsedASN);
          setStatusMessage(`Bill image "${file.name}" parsed successfully!`);
        } else {
          throw new Error('No structured bill data found in image.');
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load Sample Demo Bill
  const handleLoadSample = () => {
    const parsed = parseBillTextToASN(SAMPLE_BILL_TEXT, factory);
    setAsnData(parsed);
    setUploadedFileName('sample-tax-invoice-manisha-garments.pdf');
    setStatusMessage('Sample bill loaded (Invoice GST/MG/201/26-27 -> Primart PO #3472).');
  };

  // Handle Pick from existing invoice
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      const party = parties.find((p) => p.id === inv.party_id) || inv.party;
      const buyer = inv.buyer_party_id ? parties.find((p) => p.id === inv.buyer_party_id) || inv.buyer : undefined;
      const parsed = convertInvoiceToASN(inv, factory, party, buyer);
      setAsnData(parsed);
      setUploadedFileName(`Invoice ${inv.number}`);
      setStatusMessage(`Loaded Invoice #${inv.number} into ASN Generator.`);
    }
  };

  // Handle Parse Pasted Text
  const handleParseText = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = parseBillTextToASN(pastedText, factory);
      setAsnData(parsed);
      setUploadedFileName('Pasted Bill Text');
      setStatusMessage('Pasted bill text parsed successfully!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // Download DOCX
  const handleDownloadDocx = async () => {
    if (!asnData) return;
    setIsDownloading(true);
    try {
      await downloadASNDocx(asnData);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy Summary
  const handleCopyText = () => {
    if (!asnData) return;
    const textSummary = `
ADVANCE SHIPPING NOTIFICATION
=================================
Vendor Name: ${asnData.vendorName}
Vendor City: ${asnData.vendorCity}
Booking Location: ${asnData.bookingLocation}
Vendor Mobile No: ${asnData.vendorMobileNo}
ASN Number: ${asnData.asnNumber || 'To be allotted by Primart'}
ASN Date: ${asnData.asnDate}
Dispatch Location: ${asnData.dispatchLocation}
PO NO: ${asnData.poNo}
PO DATE: ${asnData.poDate}
Vendor Bill No: ${asnData.vendorBillNo}
Vendor Bill Date: ${asnData.vendorBillDate}
Vendor Bill Value: ₹${asnData.vendorBillValue}
Vendor Bill Quantity: ${asnData.vendorBillQuantity} PCS

MATERIAL BOOKING DETAILS:
Transporter Name: ${asnData.transporterName || 'Pending'}
Transporter LR NO: ${asnData.transporterLrNo || 'Pending'}
Date of LR: ${asnData.dateOfLr || 'Pending'}
Way Bill No: ${asnData.wayBillNo || 'Pending'}
No of Cartons: ${asnData.noOfCartons || 'Pending'}
Identification mark: ${asnData.identificationMark || 'Pending'}
Total Weight: ${asnData.totalWeight || 'Pending'}
Expected Lead Time: ${asnData.expectedLeadTimeDays || 'Pending'} Days
=================================
Email to: ${asnData.emailRecipient || 'sdr@primart.co.in'}
`;
    navigator.clipboard.writeText(textSummary.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                ASN Generator
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-bold font-mono">
                  .DOCX Template
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Upload your Tax Invoice / Bill and instantly generate the exact Word formatted Advance Shipping Notification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Load Sample Bill</span>
          </button>

          {asnData && (
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isDownloading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? 'Generating .DOCX...' : 'Download .DOCX'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bill Upload & Ingestion Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Source Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs sm:text-sm">1. Provide Bill / Tax Invoice:</span>
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File (PDF / Photo)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'select'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Select Existing Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'paste'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Paste Text</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusMessage}
            </span>
          )}
        </div>

        {/* Tab 1: Upload Drag & Drop */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center bg-slate-950/40 hover:bg-slate-850/40 transition cursor-pointer flex flex-col items-center justify-center gap-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                <span className="text-sm text-slate-200 font-bold">
                  Extracting invoice details, PO numbers, items & totals...
                </span>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <span className="font-bold text-sm sm:text-base text-white block">
                    Click or Drag & Drop your Tax Invoice / Bill here
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Supports <strong>PDFs (any size), Scans, and Photos</strong> (PNG, JPG, WEBP)
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Select Existing Invoice */}
        {activeTab === 'select' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="w-full sm:w-1/2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            >
              <option value="">-- Choose an Invoice from System ({invoices.length} available) --</option>
              {invoices.map((inv) => {
                const party = parties.find((p) => p.id === inv.party_id) || inv.party;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} &bull; {party?.name || 'Party'} &bull; ₹{Math.round(inv.total)} &bull; ({inv.date})
                  </option>
                );
              })}
            </select>
            <span className="text-xs text-slate-400">
              Pick any bill from your factory sales ledger to generate its corresponding shipping notification.
            </span>
          </div>
        )}

        {/* Tab 3: Paste Text */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              rows={5}
              placeholder="Paste raw text from your invoice (e.g. Tax Invoice, MANISHA GARMENTS, PRIMART, PO NO.3472, Total 196 PCS ₹ 27,783)..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseText}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>Parse to ASN</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generated ASN Result & Workspace */}
      {asnData ? (
        <div className="space-y-6">
          {/* Quick Action Bar for the Generated ASN */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">
                  ASN Ready &bull; Bill #{asnData.vendorBillNo} &bull; PO #{asnData.poNo}
                </span>
                <span className="text-xs text-slate-300">
                  {asnData.vendorName} &rarr; {asnData.buyerName} &bull; {asnData.vendorBillQuantity} PCS &bull; ₹{asnData.vendorBillValue}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWhatsAppModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isDownloading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{isDownloading ? 'Downloading...' : 'Download .DOCX'}</span>
              </button>
            </div>
          </div>

          {/* Dual Panel Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Panel: Editable Details (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Table 1: Vendor & Bill Details */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Table 1: Vendor & Bill Details
                  </h3>
                  <span className="text-[10.5px] font-mono text-slate-400">Pre-filled from Bill</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={asnData.vendorName}
                      onChange={(e) => setAsnData({ ...asnData, vendorName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor City</label>
                    <input
                      type="text"
                      value={asnData.vendorCity}
                      onChange={(e) => setAsnData({ ...asnData, vendorCity: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Booking Location</label>
                    <input
                      type="text"
                      value={asnData.bookingLocation}
                      onChange={(e) => setAsnData({ ...asnData, bookingLocation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Mobile No</label>
                    <input
                      type="text"
                      value={asnData.vendorMobileNo}
                      onChange={(e) => setAsnData({ ...asnData, vendorMobileNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ASN Number (if allotted)</label>
                    <input
                      type="text"
                      placeholder="Leave blank if pending"
                      value={asnData.asnNumber}
                      onChange={(e) => setAsnData({ ...asnData, asnNumber: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ASN Date</label>
                    <input
                      type="text"
                      value={asnData.asnDate}
                      onChange={(e) => setAsnData({ ...asnData, asnDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dispatch Location (Delivery Address)</label>
                  <textarea
                    rows={3}
                    value={asnData.dispatchLocation}
                    onChange={(e) => setAsnData({ ...asnData, dispatchLocation: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PO Number</label>
                    <input
                      type="text"
                      value={asnData.poNo}
                      onChange={(e) => setAsnData({ ...asnData, poNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 font-bold font-mono text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PO Date</label>
                    <input
                      type="text"
                      value={asnData.poDate}
                      onChange={(e) => setAsnData({ ...asnData, poDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Bill No</label>
                    <input
                      type="text"
                      value={asnData.vendorBillNo}
                      onChange={(e) => setAsnData({ ...asnData, vendorBillNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold font-mono text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bill Date</label>
                    <input
                      type="text"
                      value={asnData.vendorBillDate}
                      onChange={(e) => setAsnData({ ...asnData, vendorBillDate: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bill Value (₹)</label>
                    <input
                      type="text"
                      value={asnData.vendorBillValue}
                      onChange={(e) => setAsnData({ ...asnData, vendorBillValue: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold font-mono text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Vendor Bill Quantity (PCS)</label>
                  <input
                    type="text"
                    value={asnData.vendorBillQuantity}
                    onChange={(e) => setAsnData({ ...asnData, vendorBillQuantity: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-extrabold font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Table 2: Material Booking Details */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-400" />
                    Table 2: Material Booking Details
                  </h3>
                  <span className="text-[10.5px] font-mono text-slate-400">Post-Dispatch Info</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. V-Trans / TCI Express / Self"
                    value={asnData.transporterName}
                    onChange={(e) => setAsnData({ ...asnData, transporterName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Transporter LR NO</label>
                    <input
                      type="text"
                      placeholder="e.g. LR-98741"
                      value={asnData.transporterLrNo}
                      onChange={(e) => setAsnData({ ...asnData, transporterLrNo: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date of LR</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={asnData.dateOfLr}
                      onChange={(e) => setAsnData({ ...asnData, dateOfLr: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Way Bill No (E-Way Bill)</label>
                  <input
                    type="text"
                    placeholder="12-digit E-Way Bill Number"
                    value={asnData.wayBillNo}
                    onChange={(e) => setAsnData({ ...asnData, wayBillNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">No of Cartons / Bales</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 Cartons"
                      value={asnData.noOfCartons}
                      onChange={(e) => setAsnData({ ...asnData, noOfCartons: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Total Weight</label>
                    <input
                      type="text"
                      placeholder="e.g. 45.5 KG"
                      value={asnData.totalWeight}
                      onChange={(e) => setAsnData({ ...asnData, totalWeight: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Identification Mark on Cartons</label>
                  <input
                    type="text"
                    placeholder="e.g. MG/PRIMART/01-05"
                    value={asnData.identificationMark}
                    onChange={(e) => setAsnData({ ...asnData, identificationMark: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expected Lead Time (Days)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Days"
                      value={asnData.expectedLeadTimeDays}
                      onChange={(e) => setAsnData({ ...asnData, expectedLeadTimeDays: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={asnData.emailRecipient}
                      onChange={(e) => setAsnData({ ...asnData, emailRecipient: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Live Document Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-4 sticky top-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs sm:text-sm">Word Document Live Preview</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    disabled={isDownloading}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isDownloading ? 'Saving...' : 'DOCX'}</span>
                  </button>
                </div>
              </div>

              {/* Paper Preview */}
              <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-slate-800 shadow-2xl flex justify-center overflow-x-auto">
                <ASNPreviewTemplate data={asnData} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-2xl bg-purple-600/10 text-purple-400">
            <Truck className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-white text-base">No Bill Uploaded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Upload your Tax Invoice (PDF / Photo) or click &ldquo;Load Sample Bill&rdquo; above to generate and preview your .DOCX Advance Shipping Notification.
          </p>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsAppModalOpen && asnData && (
        <WhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => setWhatsAppModalOpen(false)}
          defaultPhone={asnData.vendorMobileNo || '+91 9007157204'}
          defaultName={asnData.buyerName || 'Primart Logistics'}
          defaultMessage={`*ADVANCE SHIPPING NOTIFICATION (ASN)*\nVendor: ${asnData.vendorName}\nBill No: ${asnData.vendorBillNo} (Dated: ${asnData.vendorBillDate})\nPO No: ${asnData.poNo}\nQty: ${asnData.vendorBillQuantity} PCS\nValue: ₹${asnData.vendorBillValue}\nDispatch To: ${asnData.dispatchLocation.split('\n')[0]}`}
          refTable="asn_documents"
          refId={asnData.vendorBillNo}
        />
      )}
    </div>
  );
}
