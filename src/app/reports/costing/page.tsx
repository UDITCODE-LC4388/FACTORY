'use client';

import React from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { Calculator, TrendingUp, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandedCostingPage() {
  const { costingViews } = useFactory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-400" />
            Live Landed Costing & Margins
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time computed costing per piece: (Raw Materials BOM) + (Stage Labor) + (Factory Overhead %)
          </p>
        </div>
      </div>

      {/* Costing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {costingViews.map((item) => {
          const marginPercent =
            item.sale_price > 0
              ? Math.round((item.gross_margin_per_piece / item.sale_price) * 100)
              : 0;

          return (
            <div
              key={item.product_id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{item.product_name}</h3>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">{item.sku}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Sale Rate:</span>
                  <p className="text-lg font-black text-white">{formatINR(item.sale_price)}</p>
                </div>
              </div>

              {/* Costing Composition Bar */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>1. Raw Material (BOM):</span>
                  <span className="font-bold text-white">{formatINR(item.raw_material_cost)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>2. Stage Labor Cost:</span>
                  <span className="font-bold text-white">{formatINR(item.labor_cost)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>3. Factory Overhead ({item.overhead_percent}%):</span>
                  <span className="font-bold text-white">
                    {formatINR(
                      (item.raw_material_cost + item.labor_cost) * (item.overhead_percent / 100)
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-750 flex justify-between font-bold text-sm">
                  <span className="text-slate-300">Landed Cost / Piece:</span>
                  <span className="text-blue-400">{formatINR(item.landed_cost_per_piece)}</span>
                </div>
              </div>

              {/* Profitability Metric */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Gross Margin / Piece:
                  </span>
                  <p className="text-base font-black text-emerald-400">
                    {formatINR(item.gross_margin_per_piece)}{' '}
                    <span className="text-xs font-normal">({marginPercent}% Margin)</span>
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
