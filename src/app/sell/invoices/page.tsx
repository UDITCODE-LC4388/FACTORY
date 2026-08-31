'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  FileCheck,
  Eye,
  X,
  Trash2,
  Printer,
} from 'lucide-react';
import { Invoice } from '@/types/database.types';
import { WhatsAppModal } from '@/components/common/whatsapp-modal';
import { WhatsAppTemplates } from '@/lib/whatsapp';

export default function InvoicesPage() {
  const {
    factory,
    invoices,
    parties,
    recordPaymentIn,
    sendWhatsAppNotification,
    deleteInvoice,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    phone: string;
    name: string;
    message: string;
    invoiceId: string;
  } | null>(null);

  // Payment Recording State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('upi');
  const [paymentRef, setPaymentRef] = useState('');

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.party?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = async (invoice: Invoice) => {
    const party = parties.find((p) => p.id === invoice.party_id) || invoice.party;
    if (!party) return;
    await generateInvoicePDF(invoice, factory, party);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice || !paymentAmount) return;

    recordPaymentIn({
      party_id: paymentModalInvoice.party_id,
      invoice_id: paymentModalInvoice.id,
      amount: Number(paymentAmount),
      mode: paymentMode,
      reference_no: paymentRef,
      notes: 'Recorded against invoice',
    });

    setPaymentModalInvoice(null);
    setPaymentAmount('');
    setPaymentRef('');
  };

  const handleOpenWhatsAppModal = (inv: Invoice) => {
    const party = parties.find((p) => p.id === inv.party_id) || inv.party;
    const phone = party?.phone || '+91 98000 00000';
    const partyName = party?.name || 'Valued Customer';
    const msg = WhatsAppTemplates.invoice({
      customerName: partyName,
      invoiceNo: inv.number,
      totalAmount: formatINR(inv.total),
      factoryName: factory.name || 'Manisha Garments',
      date: inv.date,
      paymentStatus: inv.payment_status,
    });

    setWhatsAppModalData({
      phone,
      name: partyName,
      message: msg,
      invoiceId: inv.id,
    });
  };

  const canRecordPayment = ['owner', 'master', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-400" />
            GST Tax Invoices & Receivables
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Compliant B2B / B2C tax invoices, automatic CGST/SGST/IGST calculation & receipt ledger
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Invoice # or Customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850/50 text-slate-400 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Taxable</th>
                <th className="py-3 px-4">GST</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No tax invoices generated yet. Convert orders from &ldquo;Sale Orders&rdquo; tab to create invoices.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const party = parties.find((p) => p.id === inv.party_id) || inv.party;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        {inv.number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        {inv.date}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div>
                          <span>{party?.name || 'Customer'}</span>
                          <p className="text-[11px] text-slate-400 font-normal">
                            {party?.state} (GST: {party?.gstin || 'None'})
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatINR(inv.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.cgst > 0 || inv.sgst > 0 ? (
                          <div className="flex flex-col text-[10px] font-mono text-slate-400">
                            <span>CGST: {formatINR(inv.cgst)}</span>
                            <span>SGST: {formatINR(inv.sgst)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-cyan-400">
                            IGST: {formatINR(inv.igst)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-400 text-sm">
                        {formatINR(inv.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            inv.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : inv.payment_status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                        {inv.paid_amount > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Paid: {formatINR(inv.paid_amount)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              handleDownloadPDF(inv);
                              setPreviewInvoice(inv);
                            }}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition"
                            title="Print / Download Tax Invoice PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {canRecordPayment && inv.payment_status !== 'paid' && (
                            <button
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setPaymentAmount(String(inv.total - (inv.paid_amount || 0)));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                              title="Record Payment In"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenWhatsAppModal(inv)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition"
                            title="Send WhatsApp Invoice Copy (1-Click or Meta Cloud)"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Cancel/Delete Invoice ${inv.number}? This will reverse customer balance and restore stock quantities in ledger.`)) {
                                deleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                            title="Delete / Cancel Invoice (Restores Stock & Balance)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Payment Recording */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Record Payment Received (Payment-In)
              </h3>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <p className="text-slate-400 text-[11px]">Invoice Reference:</p>
                <p className="text-sm font-bold text-white font-mono">{paymentModalInvoice.number}</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Total: <strong className="text-emerald-400">{formatINR(paymentModalInvoice.total)}</strong> &bull; Outstanding: <strong className="text-amber-400">{formatINR(paymentModalInvoice.total - (paymentModalInvoice.paid_amount || 0))}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upi">UPI / QR (Instant)</option>
                  <option value="bank">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="cheque">Cheque Deposit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Transaction Ref / UTR / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12849019284"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invoice Print Preview */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[95vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/80">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Tax Invoice Preview — {previewInvoice.number}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print (System)</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewInvoice)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice White Paper */}
            <div className="p-6 overflow-y-auto bg-slate-950 flex justify-center">
              <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-6 text-xs border border-slate-300 font-sans">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                      {factory.name || 'Manisha Garments'}
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-0.5">{factory.address || 'Industrial Area Unit'}</p>
                    <p className="text-[11px] text-slate-600">
                      GSTIN: <strong>{factory.gstin || '27AAAAA0000A1Z5'}</strong> &bull; State: {factory.state} ({factory.state_code})
                    </p>
                    <p className="text-[11px] text-slate-600">Phone: {factory.phone || '+91 98000 00000'}</p>
                  </div>

                  <div className="text-right bg-slate-100 p-3 rounded-lg border border-slate-300">
                    <span className="font-extrabold text-slate-900 text-sm block">TAX INVOICE</span>
                    <p className="font-mono font-bold text-slate-800 mt-1">Invoice: {previewInvoice.number}</p>
                    <p className="text-slate-600">Date: {previewInvoice.date}</p>
                    <p className="text-slate-600 uppercase font-semibold">
                      Payment: {previewInvoice.payment_status}
                    </p>
                  </div>
                </div>

                {/* Customer Block */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-1">
                    Billed To (Customer):
                  </span>
                  <p className="font-bold text-sm text-slate-900">{previewInvoice.party?.name || 'Customer Name'}</p>
                  <p className="text-slate-600">{previewInvoice.party?.address || 'Address on file'}</p>
                  <p className="text-slate-600">
                    GSTIN: {previewInvoice.party?.gstin || 'UNREGISTERED'} &bull; State: {previewInvoice.party?.state} ({previewInvoice.party?.state_code})
                  </p>
                </div>

                {/* Line Items Table */}
                <div>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="border border-slate-300 p-2 text-left">#</th>
                        <th className="border border-slate-300 p-2 text-left">Description</th>
                        <th className="border border-slate-300 p-2 text-left">HSN</th>
                        <th className="border border-slate-300 p-2 text-right">Qty</th>
                        <th className="border border-slate-300 p-2 text-right">Rate</th>
                        <th className="border border-slate-300 p-2 text-right">Taxable</th>
                        <th className="border border-slate-300 p-2 text-center">GST</th>
                        <th className="border border-slate-300 p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewInvoice.items || []).map((it, idx) => (
                        <tr key={it.id} className="border-b border-slate-300">
                          <td className="border border-slate-300 p-2">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold">{it.description}</td>
                          <td className="border border-slate-300 p-2 font-mono">{it.hsn_code}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold">{it.qty}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatINR(it.price)}</td>
                          <td className="border border-slate-300 p-2 text-right">{formatINR(it.taxable_value)}</td>
                          <td className="border border-slate-300 p-2 text-center">{it.gst_percent}%</td>
                          <td className="border border-slate-300 p-2 text-right font-bold">{formatINR(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                <div className="flex justify-end">
                  <div className="w-64 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount:</span>
                      <span>{formatINR(previewInvoice.taxable_amount)}</span>
                    </div>
                    {previewInvoice.cgst > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span>{formatINR(previewInvoice.cgst)}</span>
                      </div>
                    )}
                    {previewInvoice.sgst > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span>{formatINR(previewInvoice.sgst)}</span>
                      </div>
                    )}
                    {previewInvoice.igst > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST:</span>
                        <span>{formatINR(previewInvoice.igst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                      <span>Grand Total:</span>
                      <span>{formatINR(previewInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Authorised Signatory */}
                <div className="pt-8 flex justify-between items-end text-slate-800 text-[11px]">
                  <div className="text-slate-500 text-[10px]">
                    Thank you for your business. Terms apply.
                  </div>
                  <div className="text-center font-bold">
                    <div className="w-48 border-t border-slate-400 pt-1">For {factory.name || 'Company'}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Authorised Signatory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: WhatsApp Dispatcher */}
      {whatsAppModalData && (
        <WhatsAppModal
          isOpen={!!whatsAppModalData}
          onClose={() => setWhatsAppModalData(null)}
          defaultPhone={whatsAppModalData.phone}
          defaultName={whatsAppModalData.name}
          defaultMessage={whatsAppModalData.message}
          refTable="invoices"
          refId={whatsAppModalData.invoiceId}
        />
      )}
    </div>
  );
}
