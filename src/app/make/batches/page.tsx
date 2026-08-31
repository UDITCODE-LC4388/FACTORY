'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import {
  Layers,
  Plus,
  Search,
  Printer,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Sparkles,
  X,
  Truck,
  Scissors,
  FileSpreadsheet,
} from 'lucide-react';
import { generateJobCardPDF } from '@/lib/pdf-generator';
import { FactoryStage } from '@/types/database.types';
import { STAGE_CONFIG, STAGE_ORDER } from '@/lib/reconciliation';
import Link from 'next/link';

export default function BatchesPage() {
  const {
    batches,
    createProductionBatch,
    moveBatchStage,
    recordBatchWriteOff,
    deleteProductionBatch,
    factory,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // 100% Typable Batch Form State
  const [batchNo, setBatchNo] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [productName, setProductName] = useState('');
  const [colour, setColour] = useState('');
  const [fabric, setFabric] = useState('');
  const [sizeLines, setSizeLines] = useState<Array<{ size: string; qty: number; colour?: string }>>([
    { size: '22', qty: 25 },
    { size: '24', qty: 50 },
    { size: '26', qty: 50 },
    { size: '28', qty: 25 },
  ]);
  const [newSizeInput, setNewSizeInput] = useState('');

  // Move Stage State
  const [targetStage, setTargetStage] = useState<FactoryStage>('stitching');
  const [sentQty, setSentQty] = useState('');
  const [moveNotes, setMoveNotes] = useState('');

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.colour?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fabric?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || b.current_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleAddCustomSize = () => {
    if (!newSizeInput.trim()) return;
    setSizeLines([...sizeLines, { size: newSizeInput.trim(), qty: 25 }]);
    setNewSizeInput('');
  };

  const handleUpdateSizeQty = (index: number, qty: number) => {
    const updated = [...sizeLines];
    updated[index].qty = qty;
    setSizeLines(updated);
  };

  const handleRemoveSize = (index: number) => {
    setSizeLines(sizeLines.filter((_, i) => i !== index));
  };

  const handleOpenCreateModal = () => {
    const autoNo = `BATCH-${Math.floor(2600 + Math.random() * 900)}`;
    setBatchNo(autoNo);
    setStyleCode('Style-01');
    setProductName('Garment Style');
    setColour('Navy Blue');
    setFabric('100% Bio-Wash Cotton');
    setSizeLines([
      { size: '22', qty: 25 },
      { size: '24', qty: 50 },
      { size: '26', qty: 50 },
      { size: '28', qty: 25 },
    ]);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductionBatch(
      {
        batch_no: batchNo,
        style: styleCode,
        article_code: styleCode,
        product_name: productName,
        colour,
        fabric,
      },
      sizeLines
    );

    setIsCreateOpen(false);
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !sentQty) return;

    try {
      moveBatchStage(
        selectedBatchId,
        targetStage,
        Number(sentQty),
        false,
        undefined,
        moveNotes
      );
      setIsMoveOpen(false);
      setSelectedBatchId(null);
      setSentQty('');
      setMoveNotes('');
      alert('Trolley stage transfer initiated! Head to Floor Transfers to confirm receipt.');
    } catch (err: any) {
      alert(err.message || 'Failed to move batch stage');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400" />
            Production Batches & Floor Trolleys
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Create typable garment lots, track piece counts across sizes, generate QR job cards, and route transfers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/make/challans"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Truck className="h-4 w-4 text-blue-400" />
            <span>Road Challans</span>
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Production Batch</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by batch #, style, colour, fabric..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg capitalize font-semibold whitespace-nowrap transition ${
              stageFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Stages
          </button>
          {STAGE_ORDER.map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold whitespace-nowrap transition ${
                stageFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {STAGE_CONFIG[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBatches.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs rounded-2xl border border-slate-800 bg-slate-900/60">
            <Layers className="h-10 w-10 mx-auto mb-2 text-slate-600" />
            No production batches found. Click &ldquo;New Production Batch&rdquo; to create one with custom typable styles and sizes.
          </div>
        ) : (
          filteredBatches.map((batch) => {
            const stageCfg = STAGE_CONFIG[batch.current_stage] || STAGE_CONFIG.cutting;
            const inTransitQty = (batch.transfers || [])
              .filter((t) => t.status === 'awaiting_receive')
              .reduce((sum, t) => sum + t.sent_qty, 0);

            return (
              <div
                key={batch.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {batch.batch_no}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">
                        {batch.style || batch.article_code || 'Garment Style'}
                      </h3>
                      <p className="text-xs text-slate-400">{batch.product_name || 'Standard'}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${stageCfg.bgLight} ${stageCfg.color}`}
                      >
                        {stageCfg.label}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`Delete batch ${batch.batch_no}?`)) {
                            deleteProductionBatch(batch.id);
                          }
                        }}
                        title="Delete Batch"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[11px]">Colour:</span>
                      <p className="font-semibold text-slate-200">{batch.colour}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Fabric:</span>
                      <p className="font-semibold text-slate-200 truncate">{batch.fabric || 'Cotton'}</p>
                    </div>
                  </div>

                  {/* Size Matrix */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">Size Breakdown:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(batch.size_lines || []).map((s) => (
                        <span
                          key={s.size}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                        >
                          {s.size}: <strong className="text-white">{s.qty}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quantities */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
                    <div>
                      <span className="text-slate-400 text-[11px]">On Floor:</span>
                      <p className="font-extrabold text-white text-base">{batch.current_qty} Pcs</p>
                    </div>
                    {inTransitQty > 0 && (
                      <div className="text-right">
                        <span className="text-amber-400 font-semibold text-[11px]">In Transit:</span>
                        <p className="font-bold text-amber-400">{inTransitQty} Pcs</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => generateJobCardPDF(batch, undefined, factory)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-400" />
                    <span>Print Job Card</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBatchId(batch.id);
                      setSentQty(String(batch.current_qty));
                      setIsMoveOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <span>Move Stage</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: CREATE 100% TYPABLE BATCH */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-blue-400" />
                New Production Batch (100% Typable Form)
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Batch / Lot # *</label>
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Style / Article Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="M-TEE-01"
                    value={styleCode}
                    onChange={(e) => setStyleCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Garment / Product Name</label>
                  <input
                    type="text"
                    placeholder="Crew Neck Cotton Tee"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Colour</label>
                  <input
                    type="text"
                    placeholder="Navy Blue"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Fabric Composition / Lot Info</label>
                <input
                  type="text"
                  placeholder="100% Cotton Single Jersey 180 GSM"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              {/* Dynamic Size × Quantity Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">
                    Size-Wise Cut Breakdown:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add Size (e.g. 30, XXL)"
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] w-32"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSize}
                      className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px]"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sizeLines.map((s, idx) => (
                    <div key={s.size} className="p-2 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-blue-400 text-xs w-8">{s.size}:</span>
                      <input
                        type="number"
                        min={0}
                        value={s.qty}
                        onChange={(e) => handleUpdateSizeQty(idx, Number(e.target.value))}
                        className="w-16 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white text-right font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-right text-slate-400 text-xs pt-1">
                  Total Cut Quantity:{' '}
                  <strong className="text-white text-sm font-extrabold">
                    {sizeLines.reduce((sum, s) => sum + s.qty, 0)} Pieces
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Create Batch & Start Cutting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: MOVE STAGE */}
      {/* ------------------------------------------------------------------ */}
      {isMoveOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-blue-400" />
                Move Batch Trolley — {selectedBatch.batch_no}
              </h3>
              <button
                onClick={() => setIsMoveOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-1">
                <p className="text-slate-400">Current Stage: <strong className="text-blue-400 uppercase">{selectedBatch.current_stage}</strong></p>
                <p className="text-slate-400">Available Pieces: <strong className="text-white font-bold">{selectedBatch.current_qty} Pcs</strong></p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Transfer Destination Stage *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="printing">Printing (Screen / Digital)</option>
                  <option value="stitching">Stitching / Making</option>
                  <option value="qc">Quality Check (QC)</option>
                  <option value="ironing">Ironing / Pressing</option>
                  <option value="packing">Packing</option>
                  <option value="dispatch">Dispatch / Finished Goods</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Quantity to Send (Pieces) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedBatch.current_qty}
                  value={sentQty}
                  onChange={(e) => setSentQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Transfer Notes / Trolley #</label>
                <input
                  type="text"
                  placeholder="e.g. Trolley #4 to Floor Line 2"
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMoveOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Initiate Stage Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
