'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { Receipt, Plus, CreditCard, Search, X, Trash2 } from 'lucide-react';
import { PurchaseBill } from '@/types/database.types';

export default function PurchaseBillsPage() {
  const { purchaseBills, parties, recordPaymentOut, deletePurchaseBill, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Out Modal State
  const [paymentBill, setPaymentBill] = useState<PurchaseBill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('bank');
  const [payRef, setPayRef] = useState('');

  const filteredBills = purchaseBills.filter(
    (b) =>
      b.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.party?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill || !payAmount) return;

    recordPaymentOut({
      party_id: paymentBill.party_id,
      purchase_bill_id: paymentBill.id,
      amount: Number(payAmount),
      mode: payMode,
      reference_no: payRef,
    });

    setPaymentBill(null);
    setPayAmount('');
    setPayRef('');
  };

  const canPay = ['owner', 'master', 'purchase', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-400" />
            Purchase Bills (Goods Inward Receipts)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Raw materials stock-inward invoices with atomic ledger increments and vendor payable debits
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search bills by invoice #, vendor name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Bills Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Bill # / Date</th>
                <th className="py-3.5 px-4">Vendor Supplier</th>
                <th className="py-3.5 px-4">Taxable Amount</th>
                <th className="py-3.5 px-4">GST Tax</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No purchase bills posted yet. Convert a Purchase Order to generate an inward bill.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => {
                  const vendor = parties.find((p) => p.id === b.party_id) || b.party;
                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span className="font-mono text-blue-400">{b.number}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {b.date}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {vendor?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {formatINR(b.taxable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {formatINR(b.cgst + b.sgst + b.igst)}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-white text-sm">
                        {formatINR(b.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            b.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {b.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canPay && b.payment_status !== 'paid' && (
                            <button
                              onClick={() => {
                                setPaymentBill(b);
                                setPayAmount(String(b.total - (b.paid_amount || 0)));
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition inline-flex"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Pay Vendor</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Delete Purchase Bill ${b.number}? This will reverse vendor balance and deduct received raw materials from inventory.`)) {
                                deletePurchaseBill(b.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                            title="Delete / Cancel Purchase Bill (Restores Stock & Balance)"
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

      {/* Pay Vendor Modal */}
      {paymentBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Pay Vendor (Payment-Out)
              </h3>
              <button
                onClick={() => setPaymentBill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <p className="text-slate-400 text-[11px]">Bill Reference:</p>
                <p className="text-sm font-bold text-white font-mono">{paymentBill.number}</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Amount Due: <strong className="text-rose-400">{formatINR(paymentBill.total - (paymentBill.paid_amount || 0))}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Amount to Pay (₹) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Transaction Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR819283749"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentBill(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
