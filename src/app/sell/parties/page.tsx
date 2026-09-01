'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR, INDIAN_STATES } from '@/lib/gst';
import { Party, PartyType, Invoice } from '@/types/database.types';
import { Users, Plus, Search, Phone, MapPin, Building, ShieldCheck, X, Trash2, FileText, Printer } from 'lucide-react';
import { CreateInvoiceModal } from '@/components/billing/create-invoice-modal';
import { TaxInvoiceTemplate } from '@/components/billing/tax-invoice-template';
import { generateInvoicePDF } from '@/lib/pdf-generator';

export default function PartiesPage() {
  const { factory, parties, addParty, deleteParty, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingPartyId, setBillingPartyId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // New Party Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<PartyType>('customer');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [stateName, setStateName] = useState('West Bengal');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankBranchIfsc, setBankBranchIfsc] = useState('');

  const filteredParties = parties.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm);
    const matchType = selectedType === 'all' || p.type === selectedType || p.type === 'both';
    return matchSearch && matchType;
  });

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stateObj = INDIAN_STATES.find((s) => s.name === stateName) || { name: 'West Bengal', code: '19' };

    addParty({
      name,
      type,
      phone,
      gstin: gstin.toUpperCase(),
      pan: pan.toUpperCase() || (gstin ? gstin.slice(2, 12).toUpperCase() : undefined),
      state: stateObj.name,
      state_code: stateObj.code,
      address,
      balance: Number(openingBalance) || 0,
      bank_name: bankName,
      bank_account_no: bankAccountNo,
      bank_branch_ifsc: bankBranchIfsc,
    });

    setIsModalOpen(false);
    setName('');
    setPhone('');
    setGstin('');
    setPan('');
    setAddress('');
    setOpeningBalance('');
    setBankName('');
    setBankAccountNo('');
    setBankBranchIfsc('');
  };

  const canEdit = ['owner', 'master', 'accountant', 'purchase'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Parties & Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Customers, buyers, raw material vendors, and jobwork processing units
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Party</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name, phone, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'customer', 'vendor', 'both'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${
                selectedType === t
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Party Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Contact & Location</th>
                <th className="py-3.5 px-4">GSTIN / State</th>
                <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredParties.map((party) => (
                <tr key={party.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-[11px]">
                        {party.name.charAt(0)}
                      </div>
                      <div>
                        <span>{party.name}</span>
                        {party.address && (
                          <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs whitespace-pre-line">
                            {party.address.split('\n')[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        party.type === 'customer'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : party.type === 'vendor'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}
                    >
                      {party.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="flex flex-col gap-0.5">
                      {party.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Phone className="h-3 w-3 text-slate-400" /> {party.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500" /> {party.state}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="font-mono text-[11px] font-semibold">
                      {party.gstin || 'UNREGISTERED'}
                    </span>
                    <p className="text-[10px] text-slate-400">State Code: {party.state_code}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div>
                      <span
                        className={`font-bold ${
                          party.balance > 0
                            ? 'text-emerald-400'
                            : party.balance < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatINR(Math.abs(party.balance))}
                      </span>
                      <p className="text-[10px] text-slate-500">
                        {party.balance > 0
                          ? '(Receivable)'
                          : party.balance < 0
                          ? '(Payable)'
                          : 'Settled'}
                      </p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setBillingPartyId(party.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition shadow-sm"
                        title="Create Tax Invoice for this party"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Create Bill</span>
                      </button>

                      <button
                        onClick={() => deleteParty(party.id)}
                        title="Delete Party"
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Party Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Add New Business Party
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Party Legal / Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zara Retail India Pvt Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Party Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PartyType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Customer (Buyer)</option>
                    <option value="vendor">Vendor (Supplier / Jobworker)</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+91 98200 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">GSTIN (15 Digit)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="19AAQCM5944G1ZW"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">PAN (10 Digit)</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AAQCM5944G"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">GST State</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Billing Address</label>
                <textarea
                  rows={2}
                  placeholder="Plot/Street, Industrial Area, City..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bank Details */}
              <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-800 space-y-2.5">
                <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider block">
                  Party Bank Account Details (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 50200019284712"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Branch & IFSC</label>
                    <input
                      type="text"
                      placeholder="e.g. HOWRAH & HDFC0000014"
                      value={bankBranchIfsc}
                      onChange={(e) => setBankBranchIfsc(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500">Positive for Customer Receivable, Negative for Vendor Payable</p>
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tax Invoice Modal for Selected Party */}
      {billingPartyId && (
        <CreateInvoiceModal
          isOpen={!!billingPartyId}
          initialPartyId={billingPartyId}
          onClose={() => setBillingPartyId(null)}
          onSuccess={(createdInv, shouldPrint) => {
            setBillingPartyId(null);
            if (shouldPrint) {
              setPreviewInvoice(createdInv);
            }
          }}
        />
      )}

      {/* Tax Invoice Print Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[96vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/90 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Tax Invoice — {previewInvoice.number}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={async () => {
                    const p = parties.find((pt) => pt.id === previewInvoice.party_id) || previewInvoice.party || parties[0];
                    const b = previewInvoice.buyer_party_id ? (parties.find((pt) => pt.id === previewInvoice.buyer_party_id) || previewInvoice.buyer) : undefined;
                    await generateInvoicePDF(previewInvoice, factory, p, b);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <FileText className="h-4 w-4" />
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

            <div className="p-4 sm:p-8 overflow-y-auto bg-neutral-900 flex justify-center print:p-0 print:bg-white">
              {(() => {
                const party = parties.find((p) => p.id === previewInvoice.party_id) || previewInvoice.party || parties[0];
                const buyer = previewInvoice.buyer_party_id ? (parties.find((p) => p.id === previewInvoice.buyer_party_id) || previewInvoice.buyer) : undefined;
                return (
                  <TaxInvoiceTemplate
                    invoice={previewInvoice}
                    factory={factory}
                    party={party}
                    buyer={buyer}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
