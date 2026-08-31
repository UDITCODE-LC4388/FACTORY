'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { STAGE_CONFIG, STAGE_ORDER, getNextStage } from '@/lib/reconciliation';
import { generateJobCardPDF } from '@/lib/pdf-generator';
import {
  Factory,
  Plus,
  QrCode,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  Scissors,
  CheckCircle2,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { ProductionBatch, FactoryStage } from '@/types/database.types';

export default function BatchesPage() {
  const {
    factory,
    batches,
    products,
    productionJobs,
    parties,
    createProductionBatch,
    moveBatchStage,
    recordBatchWriteOff,
    currentProfile,
  } = useFactory();

  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);

  // New Batch Form State
  const [batchNo, setBatchNo] = useState('');
  const [jobId, setJobId] = useState('');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [style, setStyle] = useState('Classic Crew Neck');
  const [colour, setColour] = useState('Navy');
  const [sizeMatrix, setSizeMatrix] = useState<Array<{ size: string; qty: number; colour: string }>>([
    { size: 'S', qty: 50, colour: 'Navy' },
    { size: 'M', qty: 100, colour: 'Navy' },
    { size: 'L', qty: 75, colour: 'Navy' },
    { size: 'XL', qty: 25, colour: 'Navy' },
  ]);

  // Move Stage State
  const [moveBatch, setMoveBatch] = useState<ProductionBatch | null>(null);
  const [targetStage, setTargetStage] = useState<FactoryStage>('stitching');
  const [moveQty, setMoveQty] = useState('');
  const [isOutsideVendor, setIsOutsideVendor] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [moveNotes, setMoveNotes] = useState('');

  // Scrap State
  const [scrapBatch, setScrapBatch] = useState<ProductionBatch | null>(null);
  const [scrapQty, setScrapQty] = useState('');
  const [scrapReason, setScrapReason] = useState('');

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || sizeMatrix.length === 0) return;

    createProductionBatch(
      {
        batch_no: batchNo || undefined,
        production_job_id: jobId || undefined,
        product_id: productId,
        style,
        colour,
      },
      sizeMatrix
    );

    setIsCreateModalOpen(false);
    setBatchNo('');
  };

  const handleInitiateMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveBatch || !moveQty) return;

    try {
      moveBatchStage(
        moveBatch.id,
        targetStage,
        Number(moveQty),
        isOutsideVendor,
        vendorId || undefined,
        moveNotes
      );
      setIsMoveModalOpen(false);
      setMoveBatch(null);
      setMoveQty('');
      setMoveNotes('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRecordScrap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapBatch || !scrapQty || !scrapReason) return;

    try {
      recordBatchWriteOff(
        scrapBatch.id,
        scrapBatch.current_stage,
        Number(scrapQty),
        scrapReason
      );
      setIsScrapModalOpen(false);
      setScrapBatch(null);
      setScrapQty('');
      setScrapReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePrintJobCard = async (batch: ProductionBatch) => {
    const job = productionJobs.find((j) => j.id === batch.production_job_id);
    await generateJobCardPDF(batch, job, factory);
  };

  const canManage = ['owner', 'master', 'supervisor'].includes(currentProfile.role);
  const canOperate = ['owner', 'master', 'helper', 'supervisor', 'operator'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-400" />
            Floor Production Batches (Trolleys)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Physical trolley tracking with size breakdowns, QR traveler cards, and Move &rarr; Receive stage transitions
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Batch / Trolley</span>
          </button>
        )}
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map((batch) => {
          const stageCfg = STAGE_CONFIG[batch.current_stage];
          const prod = products.find((p) => p.id === batch.product_id);
          const job = productionJobs.find((j) => j.id === batch.production_job_id);
          const nextStg = getNextStage(batch.current_stage);
          const totalScrap = (batch.write_offs || []).reduce((sum, w) => sum + w.qty, 0);

          return (
            <div
              key={batch.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 hover:border-slate-700 transition"
            >
              {/* Batch Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                      {batch.batch_no}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${stageCfg.bgLight} ${stageCfg.color}`}
                    >
                      {stageCfg.label}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-200 mt-1.5">
                    {batch.style} &bull; <span className="text-slate-400 font-normal">{batch.colour}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Job Ref: <span className="text-slate-400 font-medium">{job?.number || 'Direct Stock Batch'}</span>
                  </p>
                </div>

                {/* Quantity Pill */}
                <div className="text-right">
                  <span className="text-xl font-black text-white">{batch.current_qty}</span>
                  <span className="text-xs text-slate-400 ml-1">Pcs on-hand</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Original: {batch.initial_qty} | Scrap: <span className="text-rose-400 font-bold">{totalScrap}</span>
                  </p>
                </div>
              </div>

              {/* Size Line Breakdown */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800/80">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Size Breakdown (Trolley Matrix):
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {(batch.size_lines || []).map((s) => (
                    <div key={s.id} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
                      <span className="text-slate-400 font-semibold text-[10px] block">{s.size}</span>
                      <span className="font-bold text-white text-xs">{s.qty} pcs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handlePrintJobCard(batch)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  title="Generate & Print Physical QR Trolley Traveler"
                >
                  <FileDown className="h-3.5 w-3.5 text-blue-400" />
                  <span>Job Card PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  {canOperate && (
                    <button
                      onClick={() => {
                        setScrapBatch(batch);
                        setScrapQty('1');
                        setIsScrapModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                    >
                      Log Scrap
                    </button>
                  )}

                  {canOperate && nextStg && batch.current_qty > 0 && (
                    <button
                      onClick={() => {
                        setMoveBatch(batch);
                        setTargetStage(nextStg);
                        setMoveQty(String(batch.current_qty));
                        setIsMoveModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    >
                      <span>Move to {STAGE_CONFIG[nextStg].label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Batch Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-400" />
                Create New Production Batch (Trolley)
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Product / Garment *</label>
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
                  <label className="font-semibold text-slate-300">Link Make IQ Job (Optional)</label>
                  <select
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Direct Stock Batch (No Job)</option>
                    {productionJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.number} ({j.target_qty} pcs target)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Batch / Trolley Number</label>
                  <input
                    type="text"
                    placeholder="Auto (e.g. BATCH-2603)"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Colour Shade</label>
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Size Matrix Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="font-bold text-white block">Cut Quantity Size Matrix</label>
                <div className="grid grid-cols-4 gap-2">
                  {sizeMatrix.map((s, idx) => (
                    <div key={s.size} className="space-y-1">
                      <span className="text-[10px] text-slate-400 block text-center font-bold">
                        Size {s.size}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={s.qty}
                        onChange={(e) => {
                          const updated = [...sizeMatrix];
                          updated[idx].qty = Number(e.target.value) || 0;
                          setSizeMatrix(updated);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center font-bold"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 text-right font-semibold">
                  Total Batch Cut Qty:{' '}
                  <strong className="text-white">
                    {sizeMatrix.reduce((sum, s) => sum + s.qty, 0)} Pcs
                  </strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  Create Batch & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Stage Modal */}
      {isMoveModalOpen && moveBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-blue-400" />
                Initiate Floor Stage Transfer (Move)
              </h3>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInitiateMove} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <p className="text-[11px] text-slate-400">Transferring Batch:</p>
                <p className="text-sm font-bold text-white font-mono">{moveBatch.batch_no}</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Current Stage: <strong className="text-amber-400 uppercase">{moveBatch.current_stage}</strong> &bull; Available: <strong className="text-emerald-400">{moveBatch.current_qty} pcs</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Stage *</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value as FactoryStage)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STAGE_ORDER.map((stg) => (
                      <option key={stg} value={stg} disabled={stg === moveBatch.current_stage}>
                        {STAGE_CONFIG[stg].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Sent Quantity (Pcs) *</label>
                  <input
                    type="number"
                    max={moveBatch.current_qty}
                    min={1}
                    required
                    value={moveQty}
                    onChange={(e) => setMoveQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOutsideVendor}
                    onChange={(e) => setIsOutsideVendor(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-300">Outside Jobwork / Vendor Processing</span>
                </label>

                {isOutsideVendor && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Select Jobwork Vendor</label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="">Select Vendor...</option>
                      {parties
                        .filter((p) => p.type === 'vendor' || p.type === 'both')
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.state})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Transfer Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Line 2 stitching handoff..."
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  Confirm Move & Await Receive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scrap Write-off Modal */}
      {isScrapModalOpen && scrapBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Record Scrap & Defect Write-off
              </h3>
              <button
                onClick={() => setIsScrapModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordScrap} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <p className="text-[11px] text-slate-400">Batch Reference:</p>
                <p className="text-sm font-bold text-white font-mono">{scrapBatch.batch_no}</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Stage: <strong className="text-amber-400 uppercase">{scrapBatch.current_stage}</strong> &bull; Available: <strong className="text-emerald-400">{scrapBatch.current_qty} pcs</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Scrap Quantity (Pcs) *</label>
                <input
                  type="number"
                  min={1}
                  max={scrapBatch.current_qty}
                  required
                  value={scrapQty}
                  onChange={(e) => setScrapQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Defect Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Needle cut hole during stitching, color shading variance..."
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-600/30"
                >
                  Deduct & Reconcile Scrap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
