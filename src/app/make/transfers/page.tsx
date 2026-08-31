'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { STAGE_CONFIG } from '@/lib/reconciliation';
import {
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Truck,
  Building,
  UserCheck,
  X,
  Radio,
} from 'lucide-react';
import { BatchStageTransfer } from '@/types/database.types';

interface TransferWithBatch extends BatchStageTransfer {
  batch_no: string;
}

export default function TransfersPage() {
  const { batches, parties, receiveBatchStage, currentProfile } = useFactory();
  const [selectedTransfer, setSelectedTransfer] = useState<TransferWithBatch | null>(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [varianceAlert, setVarianceAlert] = useState<{ variance: number } | null>(null);

  // Extract all transfers across batches
  const allTransfers: TransferWithBatch[] = batches.flatMap((b) =>
    (b.transfers || []).map((t) => ({ ...t, batch_no: b.batch_no }))
  );

  const pendingTransfers = allTransfers.filter((t) => t.status === 'awaiting_receive');
  const completedTransfers = allTransfers.filter((t) => t.status === 'received');

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer || !receivedQty) return;

    try {
      const res = receiveBatchStage(selectedTransfer.id, Number(receivedQty), receiveNotes);
      if (res.variance > 0) {
        setVarianceAlert({ variance: res.variance });
      } else {
        setVarianceAlert(null);
      }
      setSelectedTransfer(null);
      setReceivedQty('');
      setReceiveNotes('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const canReceive = ['owner', 'master', 'helper', 'supervisor', 'operator'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scissors className="h-6 w-6 text-blue-400" />
            Floor Move &rarr; Receive Transfers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Two-step physical floor handoff loop with strict variance detection and scrap logging
          </p>
        </div>
      </div>

      {/* Variance Alert Banner */}
      {varianceAlert && varianceAlert.variance > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs animate-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-white text-sm">
              Variance Detected: {varianceAlert.variance} Pieces Missing / Scrapped in Transit!
            </p>
            <p className="mt-0.5 text-amber-200">
              The received quantity was less than the sent quantity. An automatic Transit Loss / Scrap Write-off entry has been posted to preserve 100% piece reconciliation.
            </p>
          </div>
          <button
            onClick={() => setVarianceAlert(null)}
            className="p-1 rounded text-amber-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending Transfers Queue (Needs Receiver Action) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Awaiting Receive (Pending Floor Handoffs)
              </h2>
              <p className="text-xs text-slate-400">
                Transfers initiated by sending departments waiting for physical inspection & sign-off
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {pendingTransfers.length} Pending
          </span>
        </div>

        {pendingTransfers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            All floor moves have been received and verified.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTransfers.map((t) => {
              const fromCfg = STAGE_CONFIG[t.from_stage];
              const toCfg = STAGE_CONFIG[t.to_stage];
              const vendor = parties.find((p) => p.id === t.vendor_id);

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-slate-850 border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {t.batch_no}
                      </span>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
                        <span className={fromCfg.color}>{fromCfg.label}</span>
                        <span className="text-slate-500">&rarr;</span>
                        <span className={toCfg.color}>{toCfg.label}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-amber-400">
                        {t.sent_qty}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">Pcs Sent</span>
                    </div>
                  </div>

                  {t.is_outside_vendor && (
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      <span>Outside Vendor: <strong>{vendor?.name || 'External Jobwork'}</strong></span>
                    </div>
                  )}

                  {t.notes && (
                    <p className="text-[11px] text-slate-400 italic">
                      &ldquo;{t.notes}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Sent: {new Date(t.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {canReceive && (
                      <button
                        onClick={() => {
                          setSelectedTransfer(t);
                          setReceivedQty(String(t.sent_qty));
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Inspect & Receive</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Transfers History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-850/50">
          <h3 className="text-sm font-bold text-white">Transfer Audit Log (Completed Floor Moves)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Batch #</th>
                <th className="py-3.5 px-4">From &rarr; To Stage</th>
                <th className="py-3.5 px-4">Sent Qty</th>
                <th className="py-3.5 px-4">Received Qty</th>
                <th className="py-3.5 px-4">Variance / Loss</th>
                <th className="py-3.5 px-4 text-right">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {completedTransfers.map((t) => {
                const variance = t.sent_qty - (t.received_qty || t.sent_qty);
                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {t.batch_no}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200">
                        {t.from_stage.toUpperCase()} &rarr; {t.to_stage.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {t.sent_qty} Pcs
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {t.received_qty} Pcs
                    </td>
                    <td className="py-3.5 px-4">
                      {variance > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          -{variance} Pcs (Scrapped)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold text-[11px]">0 Variance</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {t.received_at ? new Date(t.received_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Receive Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Confirm Received Pieces at Destination
              </h3>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <p className="text-[11px] text-slate-400">Incoming Batch:</p>
                <p className="text-sm font-bold text-white font-mono">{selectedTransfer.batch_no}</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Route: <strong className="text-amber-400 uppercase">{selectedTransfer.from_stage}</strong> &rarr; <strong className="text-emerald-400 uppercase">{selectedTransfer.to_stage}</strong>
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Sent Qty by Previous Stage: <strong className="text-white">{selectedTransfer.sent_qty} pcs</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Physically Counted / Received Qty *</label>
                <input
                  type="number"
                  min={0}
                  max={selectedTransfer.sent_qty}
                  required
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-base text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {Number(receivedQty) < selectedTransfer.sent_qty && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1">
                    Variance: {selectedTransfer.sent_qty - Number(receivedQty)} pieces will be written off as transit scrap.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Receiving Quality Inspection Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All pieces verified in good order..."
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  Accept & Advance Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
