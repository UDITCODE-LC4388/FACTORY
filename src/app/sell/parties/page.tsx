'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR, INDIAN_STATES } from '@/lib/gst';
import { Party, PartyType } from '@/types/database.types';
import { Users, Plus, Search, Phone, MapPin, Building, ShieldCheck, X } from 'lucide-react';

export default function PartiesPage() {
  const { parties, addParty, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Party Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<PartyType>('customer');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  const filteredParties = parties.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm);
    const matchType = selectedType === 'all' || p.type === selectedType || p.type === 'both';
    return matchSearch && matchType;
  });

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stateObj = INDIAN_STATES.find((s) => s.name === stateName) || { name: 'Maharashtra', code: '27' };

    addParty({
      name,
      type,
      phone,
      gstin: gstin.toUpperCase(),
      state: stateObj.name,
      state_code: stateObj.code,
      address,
      balance: Number(openingBalance) || 0,
    });

    setIsModalOpen(false);
    setName('');
    setPhone('');
    setGstin('');
    setAddress('');
    setOpeningBalance('');
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
            Customers, raw material vendors, and jobwork processing units
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
                          <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {party.address}
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
                    placeholder="27AAACF1029P1Z8"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
    </div>
  );
}
