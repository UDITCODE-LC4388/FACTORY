'use client';

import React, { useState } from 'react';
import { ASNFormData } from '@/types/asn.types';
import { Invoice, Factory, Party } from '@/types/database.types';
import { convertInvoiceToASN, parseBillTextToASN } from '@/lib/bill-asn-parser';
import { downloadASNDocx } from '@/lib/asn-doc-generator';
import { ASNPreviewTemplate } from './asn-preview-template';
import {
  X,
  Download,
  Printer,
  FileText,
  Truck,
  Edit3,
  Eye,
  CheckCircle2,
  Copy,
  Send,
  Sparkles,
} from 'lucide-react';

interface ASNGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  factory: Factory;
  parties: Party[];
  initialData?: ASNFormData;
}

export function ASNGeneratorModal({
  isOpen,
  onClose,
  invoice,
  factory,
  parties,
  initialData,
}: ASNGeneratorModalProps) {
  const defaultData = React.useMemo(() => {
    if (initialData) return initialData;
    if (invoice) {
      const party = parties.find((p) => p.id === invoice.party_id) || invoice.party;
      const buyer = invoice.buyer_party_id
        ? parties.find((p) => p.id === invoice.buyer_party_id) || invoice.buyer
        : undefined;
      return convertInvoiceToASN(invoice, factory, party, buyer);
    }
    return parseBillTextToASN('', factory);
  }, [initialData, invoice, factory, parties]);

  const [formData, setFormData] = useState<ASNFormData>(defaultData);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setFormData(defaultData);
  }, [defaultData]);

  if (!isOpen) return null;

  const handleDownloadDocx = async () => {
    try {
      setIsGenerating(true);
      await downloadASNDocx(formData);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    const textSummary = `
ADVANCE SHIPPING NOTIFICATION
=================================
Vendor Name: ${formData.vendorName}
Vendor City: ${formData.vendorCity}
Booking Location: ${formData.bookingLocation}
Vendor Mobile No: ${formData.vendorMobileNo}
ASN Number: ${formData.asnNumber || 'To be allotted'}
ASN Date: ${formData.asnDate}
Dispatch Location: ${formData.dispatchLocation}
PO NO: ${formData.poNo}
PO DATE: ${formData.poDate}
Vendor Bill No: ${formData.vendorBillNo}
Vendor Bill Date: ${formData.vendorBillDate}
Vendor Bill Value: ${formData.vendorBillValue}
Vendor Bill Quantity: ${formData.vendorBillQuantity}

MATERIAL BOOKING DETAILS:
Transporter Name: ${formData.transporterName || 'Pending'}
Transporter LR NO: ${formData.transporterLrNo || 'Pending'}
Date of LR: ${formData.dateOfLr || 'Pending'}
Way Bill No: ${formData.wayBillNo || 'Pending'}
No of Cartons: ${formData.noOfCartons || 'Pending'}
Identification mark: ${formData.identificationMark || 'Pending'}
Total Weight: ${formData.totalWeight || 'Pending'}
Expected Lead Time: ${formData.expectedLeadTimeDays || 'Pending'} Days
=================================
Email to: ${formData.emailRecipient || 'sdr@primart.co.in'}
`;
    navigator.clipboard.writeText(textSummary.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[94vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-850/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Advance Shipping Notification (ASN Generator)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10.5px] font-bold">
                  Exact .DOCX Format
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bill #{formData.vendorBillNo || '—'} &bull; PO #{formData.poNo || '—'} &bull; {formData.vendorBillQuantity} PCS
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Doc Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Fields</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Generating...' : 'Download .DOCX'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">
          {activeTab === 'preview' ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-full flex items-center justify-between px-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Exact layout matching Microsoft Word .DOCX template
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Exact Paper Document Preview */}
              <div className="w-full flex justify-center overflow-x-auto py-2">
                <ASNPreviewTemplate data={formData} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-200">
              {/* Left Column: Vendor & Bill Details */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  1. Vendor & Bill Details (Table 1)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor City</label>
                    <input
                      type="text"
                      value={formData.vendorCity}
                      onChange={(e) => setFormData({ ...formData, vendorCity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Booking Location</label>
                    <input
                      type="text"
                      value={formData.bookingLocation}
                      onChange={(e) => setFormData({ ...formData, bookingLocation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Mobile No</label>
                    <input
                      type="text"
                      value={formData.vendorMobileNo}
                      onChange={(e) => setFormData({ ...formData, vendorMobileNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ASN Number (If Allotted)</label>
                    <input
                      type="text"
                      placeholder="Leave blank if pending"
                      value={formData.asnNumber}
                      onChange={(e) => setFormData({ ...formData, asnNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ASN Date</label>
                    <input
                      type="text"
                      value={formData.asnDate}
                      onChange={(e) => setFormData({ ...formData, asnDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dispatch Location (Delivery Address)</label>
                  <textarea
                    rows={3}
                    value={formData.dispatchLocation}
                    onChange={(e) => setFormData({ ...formData, dispatchLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PO Number</label>
                    <input
                      type="text"
                      value={formData.poNo}
                      onChange={(e) => setFormData({ ...formData, poNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">PO Date</label>
                    <input
                      type="text"
                      value={formData.poDate}
                      onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Bill No</label>
                    <input
                      type="text"
                      value={formData.vendorBillNo}
                      onChange={(e) => setFormData({ ...formData, vendorBillNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Vendor Bill Date</label>
                    <input
                      type="text"
                      value={formData.vendorBillDate}
                      onChange={(e) => setFormData({ ...formData, vendorBillDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bill Value (₹)</label>
                    <input
                      type="text"
                      value={formData.vendorBillValue}
                      onChange={(e) => setFormData({ ...formData, vendorBillValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-extrabold font-mono focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Vendor Bill Quantity (PCS)</label>
                  <input
                    type="text"
                    value={formData.vendorBillQuantity}
                    onChange={(e) => setFormData({ ...formData, vendorBillQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-extrabold font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Right Column: Material Booking Details (Table 2) */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  2. Material Booking Details (Table 2)
                </h3>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. V-Trans / TCI Express / Self"
                    value={formData.transporterName}
                    onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Transporter LR NO</label>
                    <input
                      type="text"
                      placeholder="e.g. LR-98741"
                      value={formData.transporterLrNo}
                      onChange={(e) => setFormData({ ...formData, transporterLrNo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date of LR</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.dateOfLr}
                      onChange={(e) => setFormData({ ...formData, dateOfLr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Way Bill No (E-Way Bill)</label>
                  <input
                    type="text"
                    placeholder="12-digit E-Way Bill Number"
                    value={formData.wayBillNo}
                    onChange={(e) => setFormData({ ...formData, wayBillNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium font-mono focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">No of Cartons / Bales</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 Cartons"
                      value={formData.noOfCartons}
                      onChange={(e) => setFormData({ ...formData, noOfCartons: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Total Weight</label>
                    <input
                      type="text"
                      placeholder="e.g. 45.5 KG"
                      value={formData.totalWeight}
                      onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Identification Mark on Cartons</label>
                  <input
                    type="text"
                    placeholder="e.g. MG/PRIMART/01-05"
                    value={formData.identificationMark}
                    onChange={(e) => setFormData({ ...formData, identificationMark: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expected Lead Time (Days)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2 Days"
                      value={formData.expectedLeadTimeDays}
                      onChange={(e) => setFormData({ ...formData, expectedLeadTimeDays: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Email Recipient</label>
                    <input
                      type="email"
                      value={formData.emailRecipient}
                      onChange={(e) => setFormData({ ...formData, emailRecipient: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-medium focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Ready for Microsoft Word, LibreOffice, and Google Docs export</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'preview' ? 'edit' : 'preview')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              {activeTab === 'preview' ? 'Edit Details' : 'Preview Document'}
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Exporting .DOCX...' : 'Download .DOCX'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
