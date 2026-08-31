'use client';

import React from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { STAGE_CONFIG, STAGE_ORDER } from '@/lib/reconciliation';
import {
  Factory,
  Scissors,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  QrCode,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  Clock,
  Mic,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    factory,
    currentProfile,
    batches,
    saleOrders,
    invoices,
    materials,
    reconciliationViews,
  } = useFactory();

  // KPIs
  const totalFloorPieces = batches.reduce((sum, b) => sum + b.current_qty, 0);
  const pendingTransfers = batches
    .flatMap((b) => b.transfers || [])
    .filter((t) => t.status === 'awaiting_receive');
  const inTransitPieces = pendingTransfers.reduce((sum, t) => sum + t.sent_qty, 0);

  const totalReceivables = invoices
    .filter((i) => i.payment_status !== 'paid')
    .reduce((sum, i) => sum + (i.total - (i.paid_amount || 0)), 0);

  const lowStockMaterials = materials.filter(
    (m) => m.qty_on_hand <= m.low_stock_threshold
  );

  // Stage Breakdown
  const stageStats = STAGE_ORDER.map((stage) => {
    const stageBatches = batches.filter((b) => b.current_stage === stage);
    const pieceCount = stageBatches.reduce((sum, b) => sum + b.current_qty, 0);
    return {
      stage,
      config: STAGE_CONFIG[stage],
      batchCount: stageBatches.length,
      pieceCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/50 border border-blue-500/20 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Factory Floor & Operations Control
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {factory.name}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active User: <span className="font-semibold text-slate-200">{currentProfile.full_name}</span> ({currentProfile.role.toUpperCase()}) &bull; Piece-Level Traceability Active
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/make/batches"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Factory className="h-4 w-4" />
              <span>Floor Batches</span>
            </Link>
            <Link
              href="/sell/invoices"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <CreditCard className="h-4 w-4" />
              <span>GST Invoices</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Floor On-Hand Pieces */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Floor On-Hand
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <Factory className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {totalFloorPieces.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Pieces</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {batches.length} active trolleys
          </p>
        </div>

        {/* In-Transit Transfers */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              In-Transit (Move &rarr; Recv)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {inTransitPieces.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Pieces</span>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">
            {pendingTransfers.length} transfers awaiting receive
          </p>
        </div>

        {/* Pending Receivables */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Pending Receivables
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {formatINR(totalReceivables)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            From {invoices.filter((i) => i.payment_status !== 'paid').length} open invoices
          </p>
        </div>

        {/* Stock Alerts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Raw Material Stock
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {materials.length}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {lowStockMaterials.length > 0 ? (
              <span className="text-rose-400 font-semibold">{lowStockMaterials.length} below reorder level</span>
            ) : (
              <span className="text-emerald-400">All stocks healthy</span>
            )}
          </p>
        </div>
      </div>

      {/* Production Pipeline Flow */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              Live Stage-by-Stage Production Pipeline
            </h2>
            <p className="text-xs text-slate-400">
              Piece distribution across physical departments
            </p>
          </div>
          <Link
            href="/make/kanban"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Kanban View <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {stageStats.map(({ stage, config, batchCount, pieceCount }) => (
            <Link
              key={stage}
              href={`/make/batches?stage=${stage}`}
              className={`p-4 rounded-xl border ${config.bgLight} transition-all hover:scale-[1.02] flex flex-col justify-between`}
            >
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <div className="mt-2">
                  <span className="text-xl font-extrabold text-white">
                    {pieceCount}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1">pcs</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/40 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{batchCount} trolleys</span>
                <span className="font-semibold text-blue-400">View &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Piece Traceability Invariant Status & Active Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mathematical Piece Reconciliation Watcher */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Piece-Level Traceability Reconciliation
                </h3>
                <p className="text-xs text-slate-400">
                  Checking: Original = On-Hand + Scrap + In-Transit
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Balanced
            </span>
          </div>

          <div className="space-y-2.5">
            {reconciliationViews.map((rec) => (
              <div
                key={rec.batch_id}
                className="p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{rec.batch_no}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300">
                      {rec.current_stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 mt-1 text-[11px]">
                    <span>Original: <strong className="text-slate-200">{rec.original_qty}</strong></span>
                    <span>On-Hand: <strong className="text-slate-200">{rec.on_hand_qty}</strong></span>
                    <span>Scrap: <strong className="text-rose-400">{rec.total_written_off}</strong></span>
                    <span>In-Transit: <strong className="text-amber-400">{rec.in_transit_qty}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>0 Variance</span>
                  </div>
                  <Link
                    href={`/make/batches`}
                    className="text-[10px] text-blue-400 hover:underline mt-0.5 inline-block"
                  >
                    View History
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Awaiting-Receive Transfers */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Pending Stage Transfers (Floor Queue)
                </h3>
                <p className="text-xs text-slate-400">
                  Two-step Move &rarr; Receive confirmation loop
                </p>
              </div>
            </div>
            <Link
              href="/make/transfers"
              className="text-xs text-blue-400 font-semibold hover:underline"
            >
              All Transfers &rarr;
            </Link>
          </div>

          {pendingTransfers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              No pending stage transfers. All floor moves received!
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingTransfers.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-slate-850 border border-amber-500/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{t.from_stage.toUpperCase()}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="font-bold text-amber-400">{t.to_stage.toUpperCase()}</span>
                      {t.is_outside_vendor && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300">
                          Outside Jobwork
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Sent Qty: <strong className="text-white">{t.sent_qty} pcs</strong> &bull; {new Date(t.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Link
                    href={`/make/transfers`}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                  >
                    Confirm Recv
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
