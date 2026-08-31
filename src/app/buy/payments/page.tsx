'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { CreditCard, Plus, Search, X } from 'lucide-react';

export default function PaymentsOutPage() {
  const { paymentsOut, parties, recordPaymentOut, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('bank');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const vendorParties = parties.filter((p) => p.type === 'vendor' || p.type === 'both');

  const filteredPayments = paymentsOut.filter(
    (p) =>
      p.party?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || !amount) return;

    recordPaymentOut({
      party_id: partyId,
      amount: Number(amount),
      mode,
      reference_no: referenceNo,
      notes,
    });

    setIsModalOpen(false);
    setAmount('');
    setReferenceNo('');
    setNotes('');
  };

  const canEdit = ['owner', 'master', 'purchase', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-rose-400" />
            Supplier Payments Made (Payments-Out)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Debits paid to yarn, fabric, and trim suppliers updating vendor balance books in real-time
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setPartyId(vendorParties[0]?.id || '');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment-Out</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search payments out by supplier name or UTR reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Supplier / Vendor</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">UTR / Ref #</th>
                <th className="py-3.5 px-4 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                    No payments out recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const vendor = parties.find((pt) => pt.id === p.party_id) || p.party;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {p.date}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {vendor?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {p.reference_no || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-400 text-sm">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Out Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-400" />
                Record Supplier Payment-Out
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Supplier / Vendor *</label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {vendorParties.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Payable: {formatINR(Math.abs(v.balance))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Amount to Pay (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Ref / UTR #</label>
                  <input
                    type="text"
                    placeholder="Transaction ID"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-600/30"
                >
                  Record Payment-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
