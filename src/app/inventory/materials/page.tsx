'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { Boxes, Plus, Search, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Material } from '@/types/database.types';

export default function MaterialsPage() {
  const { materials, addMaterial, units, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [qtyOnHand, setQtyOnHand] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('50');
  const [unitId, setUnitId] = useState(units[0]?.id || '');

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.lot_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addMaterial({
      name,
      lot_no: lotNo || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
      cost_per_unit: Number(costPerUnit) || 0,
      qty_on_hand: Number(qtyOnHand) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 20,
      unit_id: unitId,
    });

    setIsModalOpen(false);
    setName('');
    setLotNo('');
    setCostPerUnit('');
    setQtyOnHand('');
  };

  const canEdit = ['owner', 'master', 'inventory_manager', 'purchase'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-400" />
            Raw Materials & Trims Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Fabrics, threads, buttons, polybags, and care labels with lot tracking and reorder limits
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Raw Material</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search materials by name or lot number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Materials Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Material / Description</th>
                <th className="py-3.5 px-4">Lot / Batch #</th>
                <th className="py-3.5 px-4">Unit Cost (Rate)</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 text-right">Available On-Hand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMaterials.map((mat) => {
                const unit = units.find((u) => u.id === mat.unit_id);
                const isLow = mat.qty_on_hand <= mat.low_stock_threshold;

                return (
                  <tr key={mat.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                          <Boxes className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <span>{mat.name}</span>
                          <p className="text-[11px] text-slate-400 font-normal">
                            Reorder Limit: {mat.low_stock_threshold} {unit?.symbol || 'units'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {mat.lot_no || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatINR(mat.cost_per_unit)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">
                        / {unit?.symbol || 'unit'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Healthy
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`text-sm font-extrabold ${
                          isLow ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {mat.qty_on_hand.toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-xs ml-1 font-semibold">
                        {unit?.symbol || 'units'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="h-4 w-4 text-blue-400" />
                Add New Raw Material
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Material Name / Specification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Cotton Single Jersey (180 GSM)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Lot / Inward #</label>
                  <input
                    type="text"
                    placeholder="LOT-2026-01"
                    value={lotNo}
                    onChange={(e) => setLotNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Measuring Unit</label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Cost Per Unit (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="145.00"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Initial Stock Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={qtyOnHand}
                    onChange={(e) => setQtyOnHand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Low Stock Reorder Threshold</label>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
