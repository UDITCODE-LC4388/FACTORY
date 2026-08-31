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
} from 'lucide-react';
import { Invoice } from '@/types/database.types';

export default function InvoicesPage() {
  const {
    factory,
    invoices,
    parties,
    recordPaymentIn,
    sendWhatsAppNotification,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
    });

    setPaymentModalInvoice(null);
    setPaymentAmount('');
    setPaymentRef('');
  };

  const handleSendWhatsApp = async (inv: Invoice) => {
    const party = parties.find((p) => p.id === inv.party_id) || inv.party;
    if (!party) return;
    const msg = `Namaste ${party.name}, Tax Invoice #${inv.number} for ${formatINR(
      inv.total
    )} has been raised by ${factory.name}. View/Download PDF: ${inv.pdf_url || 'Sent via FactoryOS'}`;
    const res = await sendWhatsAppNotification(party.phone, party.name, msg, 'invoices', inv.id);
    if (res.directUrl) {
      window.open(res.directUrl, '_blank');
    }
  };

  const canRecordPayment = ['owner', 'master', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            GST Tax Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            GST-correct financial invoices with intra/interstate tax splits and piece-level ledger deduction
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search invoices by invoice #, customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Invoices List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Invoice # / Date</th>
                <th className="py-3.5 px-4">Customer Party</th>
                <th className="py-3.5 px-4">Taxable Value</th>
                <th className="py-3.5 px-4">GST Tax Breakdown</th>
                <th className="py-3.5 px-4">Grand Total</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                    No invoices generated yet. Convert a Sale Order to generate an invoice.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const party = parties.find((p) => p.id === inv.party_id) || inv.party;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span className="font-mono text-blue-400">{inv.number}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {inv.date} &bull; {inv.sale_type.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>
                          <span>{party?.name || 'Customer'}</span>
                          <p className="text-[11px] text-slate-400 font-normal">
                            {party?.state} ({party?.gstin || 'Unregistered'})
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {formatINR(inv.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {inv.cgst > 0 || inv.sgst > 0 ? (
                          <div className="flex flex-col text-[11px]">
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
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition"
                            title="Download Tax Invoice PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
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
                            onClick={() => handleSendWhatsApp(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700 transition"
                            title="Send WhatsApp Invoice Copy"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
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

      {/* Payment Recording Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Record Customer Payment (Payment-In)
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
    </div>
  );
}
