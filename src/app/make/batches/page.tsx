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
  Download,
  Boxes,
} from 'lucide-react';
import { generateJobCardPDF } from '@/lib/pdf-generator';
import { FactoryStage, ProductionBatch } from '@/types/database.types';
import { STAGE_CONFIG, STAGE_ORDER } from '@/lib/reconciliation';
import Link from 'next/link';

export default function BatchesPage() {
  const {
    batches,
    materials,
    units,
    createProductionBatch,
    recordBatchCuttingMaterial,
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
  const [previewJobCardBatch, setPreviewJobCardBatch] = useState<ProductionBatch | null>(null);

  // Add Fabric Modal for Existing Batch
  const [addFabricBatch, setAddFabricBatch] = useState<ProductionBatch | null>(null);
  const [extraMaterialId, setExtraMaterialId] = useState('');
  const [extraKgUsed, setExtraKgUsed] = useState('');
  const [extraScrapKg, setExtraScrapKg] = useState('');

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

  // Cutting Raw Material Inward Mapping State
  const [linkRawMaterial, setLinkRawMaterial] = useState(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [cuttingKgUsed, setCuttingKgUsed] = useState('');
  const [cuttingScrapKg, setCuttingScrapKg] = useState('');

  // Move Stage State
  const [targetStage, setTargetStage] = useState<FactoryStage>('printing');
  const [sentQty, setSentQty] = useState('');
  const [moveNotes, setMoveNotes] = useState('');

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.colour?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fabric?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.material_consumptions || []).some((mc) => mc.material_name.toLowerCase().includes(searchTerm.toLowerCase()) || mc.lot_no.toLowerCase().includes(searchTerm.toLowerCase()));

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
    setSelectedMaterialId(materials[0]?.id || '');
    setCuttingKgUsed('26.5');
    setCuttingScrapKg('0.8');
    setIsCreateOpen(true);
  };

  const totalCutPieces = sizeLines.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
  const calculatedGramsPerPc =
    totalCutPieces > 0 && cuttingKgUsed && Number(cuttingKgUsed) > 0
      ? Math.round(((Number(cuttingKgUsed) * 1000) / totalCutPieces) * 10) / 10
      : 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cuttingMaterials =
      linkRawMaterial && selectedMaterialId && Number(cuttingKgUsed) > 0
        ? [
            {
              material_id: selectedMaterialId,
              qty_used: Number(cuttingKgUsed),
              scrap_qty: Number(cuttingScrapKg) || 0,
            },
          ]
        : undefined;

    const created = createProductionBatch(
      {
        batch_no: batchNo,
        style: styleCode,
        article_code: styleCode,
        product_name: productName,
        colour,
        fabric,
        cuttingMaterials,
      },
      sizeLines
    );

    setIsCreateOpen(false);
    alert(`Batch ${created.batch_no} created and cut successfully! Raw material stock automatically deducted.`);
  };

  const handleAddFabricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFabricBatch || !extraMaterialId || !extraKgUsed) return;

    recordBatchCuttingMaterial(addFabricBatch.id, {
      material_id: extraMaterialId,
      qty_used: Number(extraKgUsed),
      scrap_qty: Number(extraScrapKg) || 0,
    });

    setAddFabricBatch(null);
    setExtraMaterialId('');
    setExtraKgUsed('');
    setExtraScrapKg('');
    alert('Fabric consumption linked and deducted from inventory!');
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
      alert('Batch moved to next stage successfully!');
    } catch (err: any) {
      alert(err.message || 'Error transferring stage');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400" />
            Floor Batches & 7-Stage Route
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Live Raw Material Cutting Deduction &bull; Cutting &rarr; Printing &rarr; Stitching &rarr; QC &rarr; Ironing &rarr; Packing &rarr; Dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>New Production Batch (Cut)</span>
          </button>
        </div>
      </div>

      {/* 7-Stage Interactive Pipeline Header Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setStageFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            stageFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Stages ({batches.length})
        </button>

        {STAGE_ORDER.map((stg, idx) => {
          const cfg = STAGE_CONFIG[stg];
          const count = batches.filter((b) => b.current_stage === stg).length;
          const isActive = stageFilter === stg;

          return (
            <button
              key={stg}
              onClick={() => setStageFilter(stg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                isActive
                  ? `${cfg.bgLight} ${cfg.color} ring-1 ring-white/20`
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{idx + 1}. {cfg.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Batch #, Garment Style, Colour, Fabric, or Raw Material Lot #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Batch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBatches.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-slate-500 text-xs rounded-2xl border border-slate-800 bg-slate-900/60">
            <Layers className="h-10 w-10 mx-auto mb-2 text-slate-600" />
            No batches found. Click &ldquo;New Production Batch (Cut)&rdquo; to start a production batch.
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
                          if (confirm(`Delete batch ${batch.batch_no}? This will restore deducted raw material quantities back to inventory.`)) {
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

                  {/* Raw Material Inward & Cutting Mapping Badge */}
                  {(batch.material_consumptions && batch.material_consumptions.length > 0) ? (
                    <div className="p-2.5 rounded-xl bg-slate-850 border border-blue-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-blue-300 flex items-center gap-1">
                          <Scissors className="h-3.5 w-3.5 text-blue-400" /> Cutting Fabric Mapping:
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {batch.material_consumptions.length} Roll(s)
                        </span>
                      </div>
                      {batch.material_consumptions.map((mc) => (
                        <div key={mc.id} className="text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800 pt-1">
                          <div>
                            <strong className="text-white">{mc.material_name}</strong>
                            <span className="text-slate-400 font-mono ml-1">({mc.lot_no})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-400">{mc.qty_used} {mc.unit_symbol}</span>
                            {mc.consumption_per_piece ? (
                              <span className="text-emerald-400 text-[10px] ml-1">({mc.consumption_per_piece} g/pc)</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-850/60 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5 text-slate-500" /> No Raw Material Linked
                      </span>
                      <button
                        onClick={() => {
                          setAddFabricBatch(batch);
                          setExtraMaterialId(materials[0]?.id || '');
                        }}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline"
                      >
                        + Link Fabric Cut
                      </button>
                    </div>
                  )}

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
                    onClick={() => {
                      try {
                        generateJobCardPDF(batch, undefined, factory);
                      } catch (e) {
                        console.error(e);
                      }
                      setPreviewJobCardBatch(batch);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-400" />
                    <span>Print Job Card</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBatchId(batch.id);
                      const currentIdx = STAGE_ORDER.indexOf(batch.current_stage);
                      const nextStage = STAGE_ORDER[Math.min(currentIdx + 1, STAGE_ORDER.length - 1)];
                      setTargetStage(nextStage);
                      setSentQty(String(batch.current_qty));
                      setIsMoveOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
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
      {/* MODAL 1: CREATE 100% TYPABLE PRODUCTION BATCH WITH RAW MATERIAL CUTTING */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-blue-400" />
                Create New Production Batch (Cutting Department)
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="BATCH-2601"
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
                    placeholder="e.g. T-SHIRT-01"
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
                <label className="font-semibold text-slate-300">Fabric Description / GSM</label>
                <input
                  type="text"
                  placeholder="100% Cotton Single Jersey 180 GSM"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              {/* LIVE RAW MATERIAL INWARD MAPPING & DEDUCTION SECTION */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-blue-400" />
                    Raw Material / Inward KG Mapping (Live Deduction)
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold text-[11px]">
                    <input
                      type="checkbox"
                      checked={linkRawMaterial}
                      onChange={(e) => setLinkRawMaterial(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Link & Deduct Inward Stock</span>
                  </label>
                </div>

                {linkRawMaterial && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Select Inward Raw Material / Fabric Lot *</label>
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Raw Material / Lot --</option>
                        {materials.map((m) => {
                          const unit = units.find((u) => u.id === m.unit_id);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} | Lot #{m.lot_no} | On-Hand: {m.qty_on_hand} {unit?.symbol || 'kg'} (₹{m.cost_per_unit}/unit)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Fabric Used (KG / Mtr) *</label>
                        <input
                          type="number"
                          step="any"
                          required={linkRawMaterial}
                          placeholder="e.g. 26.5"
                          value={cuttingKgUsed}
                          onChange={(e) => setCuttingKgUsed(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-amber-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Scrap / End-bit (KG)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 0.8"
                          value={cuttingScrapKg}
                          onChange={(e) => setCuttingScrapKg(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                        />
                      </div>

                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <label className="text-slate-300 font-semibold">Calculated Yield</label>
                        <div className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-750 text-emerald-400 font-bold font-mono">
                          {calculatedGramsPerPc > 0 ? `${calculatedGramsPerPc} g / pc` : '—'}
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 italic">
                      * On saving, {Number(cuttingKgUsed || 0) + Number(cuttingScrapKg || 0)} KG will be immediately deducted from the material ledger with an audit trail to this batch.
                    </p>
                  </div>
                )}
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
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-1 p-2 rounded-xl bg-slate-850 border border-slate-800"
                    >
                      <span className="font-mono font-bold text-blue-400 w-8">{s.size}:</span>
                      <input
                        type="number"
                        min={0}
                        value={s.qty}
                        onChange={(e) => handleUpdateSizeQty(idx, Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-bold text-right"
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

                <div className="p-2 rounded-xl bg-slate-800 text-right font-bold text-slate-200">
                  Total Cut Quantity: <strong className="text-emerald-400 text-sm ml-1">{totalCutPieces} Pcs</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Cut Batch & Deduct Raw Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: LINK ADDITIONAL FABRIC ROLL CUT */}
      {/* ------------------------------------------------------------------ */}
      {addFabricBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-blue-400" />
                Link Fabric Roll to Batch {addFabricBatch.batch_no}
              </h3>
              <button
                onClick={() => setAddFabricBatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddFabricSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Select Raw Material / Fabric Lot *</label>
                <select
                  required
                  value={extraMaterialId}
                  onChange={(e) => setExtraMaterialId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Material --</option>
                  {materials.map((m) => {
                    const unit = units.find((u) => u.id === m.unit_id);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} | Lot #{m.lot_no} | On-Hand: {m.qty_on_hand} {unit?.symbol || 'kg'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Qty Used (KG / Mtr) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 15.0"
                    value={extraKgUsed}
                    onChange={(e) => setExtraKgUsed(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Scrap / Wastage (KG)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 0.5"
                    value={extraScrapKg}
                    onChange={(e) => setExtraScrapKg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddFabricBatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Save & Deduct Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: MOVE BATCH STAGE */}
      {/* ------------------------------------------------------------------ */}
      {isMoveOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                Move Stage — {selectedBatch.batch_no}
              </h3>
              <button
                onClick={() => setIsMoveOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <p className="text-slate-400">Current Stage: <strong className="text-white uppercase">{selectedBatch.current_stage}</strong></p>
                <p className="text-slate-400 mt-0.5">Available On-Hand: <strong className="text-emerald-400">{selectedBatch.current_qty} Pcs</strong></p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Target Stage (Next Destination) *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white capitalize font-semibold"
                >
                  {STAGE_ORDER.map((stg) => (
                    <option key={stg} value={stg}>
                      {STAGE_CONFIG[stg]?.label || stg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Quantity to Transfer (Pieces) *</label>
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

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 4: JOB CARD PRINT PREVIEW */}
      {/* ------------------------------------------------------------------ */}
      {previewJobCardBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[95vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/80">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Job Card Print Preview — {previewJobCardBatch.batch_no}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print (System / Thermal)</span>
                </button>
                <button
                  onClick={() => generateJobCardPDF(previewJobCardBatch, undefined, factory)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewJobCardBatch(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Job Card Paper */}
            <div className="p-6 overflow-y-auto bg-slate-950 flex justify-center">
              <div className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-5 text-xs border border-slate-300 font-sans">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                      {factory.name || 'Manisha Garments'}
                    </h2>
                    <p className="text-[11px] text-slate-600">Factory Floor Route Traveler & Piece Job Card</p>
                    <p className="text-sm font-black text-blue-900 mt-1 font-mono">BATCH: {previewJobCardBatch.batch_no}</p>
                  </div>

                  <div className="text-right bg-slate-100 p-3 rounded-lg border border-slate-300">
                    <span className="font-extrabold text-slate-900 text-xs block">INITIAL LOT SIZE</span>
                    <p className="text-xl font-black text-slate-900">{previewJobCardBatch.initial_qty} Pcs</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">Stage: {previewJobCardBatch.current_stage.toUpperCase()}</p>
                  </div>
                </div>

                {/* Garment Details */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Style / Article</span>
                    <p className="font-bold text-slate-900">{previewJobCardBatch.style || previewJobCardBatch.article_code}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Colour</span>
                    <p className="font-bold text-slate-900">{previewJobCardBatch.colour}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Fabric / GSM</span>
                    <p className="font-bold text-slate-900 truncate">{previewJobCardBatch.fabric || 'Single Jersey Cotton'}</p>
                  </div>
                </div>

                {/* Linked Raw Material Cutting Breakdown */}
                {previewJobCardBatch.material_consumptions && previewJobCardBatch.material_consumptions.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-[11px] font-bold text-blue-900 uppercase block mb-1">
                      Raw Material Inward & Cutting Traceability:
                    </span>
                    <div className="space-y-1">
                      {previewJobCardBatch.material_consumptions.map((mc) => (
                        <div key={mc.id} className="flex justify-between text-slate-800">
                          <span>
                            <strong>{mc.material_name}</strong> (Lot: {mc.lot_no})
                          </span>
                          <span className="font-mono font-bold">
                            {mc.qty_used} {mc.unit_symbol} consumed ({mc.consumption_per_piece || '—'} g/pc)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Breakdown */}
                <div>
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    Cut Size Matrix:
                  </span>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="border border-slate-300 p-1.5 text-left">Colour</th>
                        <th className="border border-slate-300 p-1.5 text-left">Size</th>
                        <th className="border border-slate-300 p-1.5 text-right">Quantity (Pieces)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewJobCardBatch.size_lines || []).map((s, idx) => (
                        <tr key={idx} className="border-b border-slate-300">
                          <td className="border border-slate-300 p-1.5">{s.colour || previewJobCardBatch.colour}</td>
                          <td className="border border-slate-300 p-1.5 font-bold font-mono">{s.size}</td>
                          <td className="border border-slate-300 p-1.5 text-right font-bold">{s.qty} Pcs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 7-Stage Route & Quality Sign-off Grid */}
                <div>
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
                    Stage Route Tracking & Quality Sign-Off (All 7 Stages):
                  </span>
                  <table className="w-full border-collapse border border-slate-300 text-[10px]">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="border border-slate-300 p-1 text-left">Stage</th>
                        <th className="border border-slate-300 p-1 text-left">Dept / Vendor</th>
                        <th className="border border-slate-300 p-1 text-right">Sent Qty</th>
                        <th className="border border-slate-300 p-1 text-right">Scrap</th>
                        <th className="border border-slate-300 p-1 text-right">Recv Qty</th>
                        <th className="border border-slate-300 p-1 text-center">Operator Sign</th>
                        <th className="border border-slate-300 p-1 text-center">QC Stamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        '1. Cutting',
                        '2. Printing (Screen/Digital)',
                        '3. Stitching / Making',
                        '4. Quality Check (QC)',
                        '5. Ironing / Pressing',
                        '6. Packing',
                        '7. Dispatch / Finished',
                      ].map((stg, sIdx) => (
                        <tr key={sIdx} className="border-b border-slate-300 h-8">
                          <td className="border border-slate-300 p-1 font-bold">{stg}</td>
                          <td className="border border-slate-300 p-1 text-slate-600">{sIdx === 0 ? 'In-House' : 'In-House / Jobwork'}</td>
                          <td className="border border-slate-300 p-1 text-right font-bold">{sIdx === 0 ? previewJobCardBatch.initial_qty : ''}</td>
                          <td className="border border-slate-300 p-1 text-right"></td>
                          <td className="border border-slate-300 p-1 text-right font-bold">{sIdx === 0 ? previewJobCardBatch.initial_qty : ''}</td>
                          <td className="border border-slate-300 p-1 text-center"></td>
                          <td className="border border-slate-300 p-1 text-center text-emerald-700 font-bold">{sIdx === 0 ? 'PASSED' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer instructions */}
                <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-200">
                  Trolley card must physically accompany the batch at all times through all 7 stages.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
