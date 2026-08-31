'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { ArrowDownToLine, Search, PlusCircle, MinusCircle, FileText, Receipt, Trash2 } from 'lucide-react';

export default function InventoryLedgerPage() {
  const { inventoryLedger, products, materials, deleteInventoryLedgerEntry } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLedger = inventoryLedger.filter((entry) => {
    const itemName =
      entry.item_type === 'product'
        ? products.find((p) => p.id === entry.item_id)?.name || 'Garment Product'
        : materials.find((m) => m.id === entry.item_id)?.name || 'Raw Material';

    const matchesSearch =
      itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || entry.item_type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6 text-blue-400" />
            Inventory Movement Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable single source of truth tracking every raw material inward and finished garment dispatch
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search movements by item or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'material', 'product'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition ${
                filterType === t
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'All Items' : t === 'material' ? 'Raw Materials' : 'Finished Products'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Item Type</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Reason / Transaction</th>
                <th className="py-3.5 px-4">Reference Table</th>
                <th className="py-3.5 px-4 text-right">Quantity Change</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No movement entries logged yet. Convert invoices or post purchase bills to see live ledger movements.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => {
                  const itemName =
                    entry.item_type === 'product'
                      ? products.find((p) => p.id === entry.item_id)?.name || 'Garment Product'
                      : materials.find((m) => m.id === entry.item_id)?.name || 'Raw Material';

                  const isPositive = entry.change_qty > 0;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            entry.item_type === 'product'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}
                        >
                          {entry.item_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {itemName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {entry.reason}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {entry.ref_table || 'manual'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold flex items-center justify-end gap-1 text-sm ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <PlusCircle className="h-3.5 w-3.5" />
                          ) : (
                            <MinusCircle className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? `+${entry.change_qty}` : entry.change_qty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Delete this ledger movement record?')) {
                              deleteInventoryLedgerEntry(entry.id);
                            }
                          }}
                          title="Delete Ledger Entry"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
