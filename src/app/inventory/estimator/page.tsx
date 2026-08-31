'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { Calculator, Sparkles, CheckCircle2, History, Layers, ArrowRight } from 'lucide-react';
import { FabricEstimate } from '@/types/database.types';

export default function FabricEstimatorPage() {
  const { boms, generateFabricEstimate, fabricEstimates } = useFactory();
  const [bomId, setBomId] = useState(boms[0]?.id || '');
  const [requestedQty, setRequestedQty] = useState('500');
  const [currentEstimate, setCurrentEstimate] = useState<FabricEstimate | null>(null);

  const handleRunEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomId || !requestedQty) return;

    const est = generateFabricEstimate(bomId, Number(requestedQty));
    setCurrentEstimate(est);
  };

  const selectedBOM = boms.find((b) => b.id === bomId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-400" />
            Fabric & Trim Estimation Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Simulate yarn/fabric requirements, trim allowances, and auditable production run costing
          </p>
        </div>
      </div>

      {/* Estimator Configuration & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Controls Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 lg:col-span-1 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Estimation Parameters</h2>
          </div>

          <form onSubmit={handleRunEstimate} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Select BOM Recipe *</label>
              <select
                value={bomId}
                onChange={(e) => setBomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Planned Batch Quantity (Pieces) *</label>
              <input
                type="number"
                min={1}
                required
                value={requestedQty}
                onChange={(e) => setRequestedQty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Calculator className="h-4 w-4" />
              <span>Calculate Requirements</span>
            </button>
          </form>
        </div>

        {/* Real-time Calculation Result Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 lg:col-span-2 shadow">
          {currentEstimate ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Estimated Requirements ({currentEstimate.requested_qty} Pcs)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Audit ID: #{currentEstimate.id.slice(0, 8)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Landed Cost / Pc:</span>
                  <p className="text-xl font-black text-emerald-400">
                    {formatINR(currentEstimate.result.estimated_cost_per_piece)}
                  </p>
                </div>
              </div>

              {/* Requirement Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Fabric Needed
                  </span>
                  <p className="text-lg font-black text-blue-400 mt-0.5">
                    {currentEstimate.result.total_fabric_meters} <span className="text-xs font-normal">mtr</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Thread Needed
                  </span>
                  <p className="text-lg font-black text-cyan-400 mt-0.5">
                    {currentEstimate.result.total_thread_cones} <span className="text-xs font-normal">cones</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Polybags
                  </span>
                  <p className="text-lg font-black text-purple-400 mt-0.5">
                    {currentEstimate.result.total_polybags} <span className="text-xs font-normal">pcs</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Care Labels
                  </span>
                  <p className="text-lg font-black text-amber-400 mt-0.5">
                    {currentEstimate.result.total_labels} <span className="text-xs font-normal">pcs</span>
                  </p>
                </div>
              </div>

              {/* Detailed Ingredient Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-850/60 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-750">
                    <tr>
                      <th className="py-2.5 px-3">Raw Material / Trim</th>
                      <th className="py-2.5 px-3">Total Qty Needed</th>
                      <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {currentEstimate.result.line_breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {item.material_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.qty_needed} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                          {formatINR(item.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Costing Summary */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between items-center text-xs">
                <div className="space-y-0.5 text-slate-400">
                  <p>Raw Materials: <strong className="text-white">{formatINR(currentEstimate.result.estimated_raw_material_cost)}</strong></p>
                  <p>Labor Cost: <strong className="text-white">{formatINR(currentEstimate.result.estimated_labor_cost)}</strong></p>
                  <p>Overhead Allowance: <strong className="text-white">{formatINR(currentEstimate.result.estimated_overhead_cost)}</strong></p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Run Cost:</span>
                  <p className="text-lg font-black text-white">
                    {formatINR(currentEstimate.result.estimated_total_cost)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs space-y-2">
              <Calculator className="h-10 w-10 text-slate-600 mx-auto" />
              <p>Configure parameters on the left and click &ldquo;Calculate Requirements&rdquo; to simulate fabric demand.</p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Audit Trail */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-850/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-blue-400" />
            Auditable Fabric Estimate Run Logs
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {fabricEstimates.length} logged simulations
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Target Qty</th>
                <th className="py-3 px-4">Fabric Meters</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4 text-right">Landed Cost / Pc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fabricEstimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(est.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {est.requested_qty} Pcs
                  </td>
                  <td className="py-3 px-4 text-blue-400 font-medium">
                    {est.result.total_fabric_meters} mtr
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    {formatINR(est.result.estimated_total_cost)}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                    {formatINR(est.result.estimated_cost_per_piece)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
