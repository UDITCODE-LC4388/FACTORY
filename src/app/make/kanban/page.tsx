'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { STAGE_CONFIG, STAGE_ORDER, getNextStage } from '@/lib/reconciliation';
import { Boxes, ArrowRight, Factory, FileDown, CheckCircle2 } from 'lucide-react';
import { generateJobCardPDF } from '@/lib/pdf-generator';
import { FactoryStage } from '@/types/database.types';

export default function FloorKanbanPage() {
  const { factory, batches, productionJobs, moveBatchStage, currentProfile } = useFactory();

  const handleQuickMove = (batchId: string, currentStage: FactoryStage) => {
    const next = getNextStage(currentStage);
    if (!next) return;
    const batch = batches.find((b) => b.id === batchId);
    if (!batch || batch.current_qty <= 0) return;

    try {
      moveBatchStage(batch.id, next, batch.current_qty, false, undefined, 'Kanban Quick Move');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePrintJobCard = async (batch: (typeof batches)[0]) => {
    const job = productionJobs.find((j) => j.id === batch.production_job_id);
    await generateJobCardPDF(batch, job, factory);
  };

  const canOperate = ['owner', 'master', 'helper', 'supervisor', 'operator'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-400" />
            Floor Production Kanban Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time trolley pipeline across all factory departments & quality checkpoints
          </p>
        </div>
      </div>

      {/* 6 Stage Kanban Column Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {STAGE_ORDER.map((stage) => {
          const cfg = STAGE_CONFIG[stage];
          const stageBatches = batches.filter((b) => b.current_stage === stage);
          const stagePieces = stageBatches.reduce((sum, b) => sum + b.current_qty, 0);
          const next = getNextStage(stage);

          return (
            <div
              key={stage}
              className="w-72 flex-shrink-0 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col max-h-[750px] shadow-lg"
            >
              {/* Column Header */}
              <div className={`p-4 rounded-t-2xl border-b border-slate-800 ${cfg.bgLight}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-white">
                    {stageBatches.length} Trolleys
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">On-Hand Volume:</span>
                  <span className="font-bold text-white text-sm">{stagePieces} pcs</span>
                </div>
              </div>

              {/* Batches Stack in Column */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {stageBatches.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 text-xs italic">
                    No active trolleys at this stage
                  </div>
                ) : (
                  stageBatches.map((batch) => {
                    const totalScrap = (batch.write_offs || []).reduce((sum, w) => sum + w.qty, 0);

                    return (
                      <div
                        key={batch.id}
                        className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-2.5 shadow hover:border-slate-600 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {batch.batch_no}
                            </span>
                            <p className="text-xs font-bold text-slate-200 mt-1">
                              {batch.style}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {batch.colour}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400">
                              {batch.current_qty}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Pcs</span>
                          </div>
                        </div>

                        {/* Mini Size Breakdown */}
                        <div className="flex gap-1 justify-between text-[10px] bg-slate-800/60 p-1.5 rounded-lg text-slate-400">
                          {(batch.size_lines || []).map((s) => (
                            <span key={s.id}>
                              <strong>{s.size}:</strong> {s.qty}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs">
                          <button
                            onClick={() => handlePrintJobCard(batch)}
                            className="p-1 rounded text-slate-400 hover:text-blue-400"
                            title="Print Job Card"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>

                          {canOperate && next && batch.current_qty > 0 && (
                            <button
                              onClick={() => handleQuickMove(batch.id, stage)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                            >
                              <span>Move to {STAGE_CONFIG[next].label}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
