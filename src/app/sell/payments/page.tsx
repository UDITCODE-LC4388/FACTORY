'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { CreditCard, Plus, Search, Calendar, UserCheck, X } from 'lucide-react';

export default function PaymentsInPage() {
  const { paymentsIn, parties, invoices, recordPaymentIn, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [partyId, setPartyId] = useState(parties[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('upi');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const customerParties = parties.filter((p) => p.type === 'customer' || p.type === 'both');

  const filteredPayments = paymentsIn.filter(
    (p) =>
      p.party?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || !amount) return;

    recordPaymentIn({
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

  const canEdit = ['owner', 'master', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-400" />
            Customer Payments Received (Payments-In)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time receipt ledger updating party ledger and outstanding balances automatically
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment-In</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search payment by customer or transaction reference..."
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
                <th className="py-3.5 px-4">Customer Party</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4">Reference / UTR</th>
                <th className="py-3.5 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                    No payment receipts logged yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const party = parties.find((pt) => pt.id === p.party_id) || p.party;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {p.date}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {party?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {p.mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {p.reference_no || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">
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

      {/* Record Payment In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Record Customer Receipt
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
                <label className="font-semibold text-slate-300">Customer Party *</label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {customerParties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Balance: {formatINR(p.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Payment Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upi">UPI / QR</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
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
                  placeholder="Payment remarks..."
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
