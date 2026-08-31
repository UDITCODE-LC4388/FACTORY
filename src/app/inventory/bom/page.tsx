'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { FileSpreadsheet, Plus, Layers, Trash2, X, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function BOMPage() {
  const { boms, products, materials, units, createBOM, deleteBOM, currentProfile } = useFactory();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [recipeName, setRecipeName] = useState('');
  const [laborCost, setLaborCost] = useState('35');
  const [overheadPercent, setOverheadPercent] = useState('12');
  const [lines, setLines] = useState<
    Array<{ material_id: string; qty_per_unit: number; notes?: string }>
  >([
    {
      material_id: materials[0]?.id || '',
      qty_per_unit: 1.35,
      notes: 'Body & rib fabric consumption',
    },
  ]);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        material_id: materials[0]?.id || '',
        qty_per_unit: 1,
        notes: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleCreateBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || lines.length === 0) return;

    createBOM(
      productId,
      recipeName || `Standard Recipe - ${products.find((p) => p.id === productId)?.name}`,
      Number(laborCost) || 0,
      Number(overheadPercent) || 0,
      lines
    );

    setIsModalOpen(false);
    setRecipeName('');
  };

  const canEdit = ['owner', 'master', 'inventory_manager'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-400" />
            Bill of Materials (BOM Recipes)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Garment recipes defining raw material consumption per unit, stage labor rates, and overhead percentages
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create BOM Recipe</span>
          </button>
        )}
      </div>

      {/* BOM Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boms.map((bom) => {
          const prod = products.find((p) => p.id === bom.product_id) || bom.product;
          
          let totalRawCost = 0;
          (bom.lines || []).forEach((line) => {
            const mat = materials.find((m) => m.id === line.material_id) || line.material;
            totalRawCost += line.qty_per_unit * (mat?.cost_per_unit || 0);
          });
          const labor = bom.labor_cost_per_unit || 25;
          const overhead = (totalRawCost + labor) * ((bom.overhead_percent || 10) / 100);
          const landedCost = totalRawCost + labor + overhead;

          return (
            <div
              key={bom.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{bom.name}</h3>
                  <p className="text-xs text-blue-400 font-semibold mt-0.5">
                    Target Garment: {prod?.name || 'Apparel'}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Landed Cost / Pc:</span>
                    <p className="text-lg font-black text-emerald-400">
                      {formatINR(landedCost)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete BOM recipe ${bom.name}?`)) {
                        deleteBOM(bom.id);
                      }
                    }}
                    title="Delete BOM"
                    className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* BOM Recipe Lines */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ingredients & Consumption (Per Unit):
                </p>
                <div className="space-y-1.5 text-xs">
                  {(bom.lines || []).map((line) => {
                    const mat = materials.find((m) => m.id === line.material_id) || line.material;
                    const unit = units.find((u) => u.id === mat?.unit_id);
                    const lineCost = line.qty_per_unit * (mat?.cost_per_unit || 0);

                    return (
                      <div
                        key={line.id}
                        className="flex items-center justify-between text-slate-300 py-0.5"
                      >
                        <div>
                          <span className="font-medium text-white">{mat?.name}</span>
                          <span className="text-slate-500 ml-1.5 text-[11px]">
                            ({line.qty_per_unit} {unit?.symbol || 'unit'} @ {formatINR(mat?.cost_per_unit || 0)})
                          </span>
                        </div>
                        <span className="font-bold text-slate-200">{formatINR(lineCost)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-750 flex justify-between text-[11px] text-slate-400">
                  <span>Labor Cost: <strong className="text-white">{formatINR(labor)}</strong></span>
                  <span>Overhead: <strong className="text-white">{bom.overhead_percent}% ({formatINR(overhead)})</strong></span>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Link
                  href={`/inventory/estimator?bomId=${bom.id}`}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Calculator className="h-3.5 w-3.5" /> Run Fabric Estimator &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create BOM Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                Build Bill of Materials (BOM) Recipe
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBOM} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Finished Product *</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Recipe Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard Recipe - Polo"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Labor Rate / Piece (₹)</label>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Factory Overhead (%)</label>
                  <input
                    type="number"
                    value={overheadPercent}
                    onChange={(e) => setOverheadPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Recipe Lines */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Recipe Raw Materials & Trims</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-850 border border-slate-800 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-6">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Material</label>
                        <select
                          value={line.material_id}
                          onChange={(e) => {
                            const updated = [...lines];
                            updated[idx].material_id = e.target.value;
                            setLines(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({formatINR(m.cost_per_unit)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Qty / Piece</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0.01}
                          value={line.qty_per_unit}
                          onChange={(e) => {
                            const updated = [...lines];
                            updated[idx].qty_per_unit = Number(e.target.value) || 0;
                            setLines(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Cost/Pc</label>
                        <span className="text-xs font-bold text-white block py-1">
                          {formatINR(
                            line.qty_per_unit *
                              (materials.find((m) => m.id === line.material_id)?.cost_per_unit || 0)
                          )}
                        </span>
                      </div>

                      <div className="col-span-1 text-right">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
                  Save BOM Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
