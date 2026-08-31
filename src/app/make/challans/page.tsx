'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Truck,
  Layers,
  X,
  UserCheck,
  Building,
} from 'lucide-react';
import { generateRoadChallanPDF } from '@/lib/pdf-generator';
import { RoadChallan, JobWorkerProcess } from '@/types/database.types';

export default function RoadChallansPage() {
  const {
    roadChallans,
    jobWorkers,
    createRoadChallan,
    reconcileRoadChallan,
    createJobWorker,
    factory,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dispatched' | 'partially_returned' | 'completed'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reconChallan, setReconChallan] = useState<RoadChallan | null>(null);

  // Form State: Create Road Challan
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerAddress, setNewWorkerAddress] = useState('');
  const [processType, setProcessType] = useState<JobWorkerProcess>('screen_printing');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Dynamic Lots & Size breakdown
  const [lots, setLots] = useState<
    Array<{
      lot_no: string;
      article: string;
      color: string;
      rate_per_pc: number;
      sizes: Array<{ size: string; dispatched_qty: number }>;
    }>
  >([
    {
      lot_no: 'LOT-2601',
      article: 'Round Neck Tee',
      color: 'Navy Blue',
      rate_per_pc: 12,
      sizes: [
        { size: '22', dispatched_qty: 50 },
        { size: '24', dispatched_qty: 50 },
        { size: '26', dispatched_qty: 50 },
        { size: '28', dispatched_qty: 50 },
      ],
    },
  ]);

  // Reconciliation State
  const [returnedInputs, setReturnedInputs] = useState<Record<string, number>>({});
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtered Challans
  const filteredChallans = roadChallans.filter((c) => {
    const matchesSearch =
      c.challan_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.job_worker?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lots?.some((l) => l.article.toLowerCase().includes(searchTerm.toLowerCase()) || l.lot_no.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Lot row additions
  const handleAddLot = () => {
    setLots([
      ...lots,
      {
        lot_no: `LOT-${Math.floor(2600 + Math.random() * 900)}`,
        article: 'Polo Shirt',
        color: 'Black',
        rate_per_pc: 15,
        sizes: [
          { size: 'S', dispatched_qty: 25 },
          { size: 'M', dispatched_qty: 50 },
          { size: 'L', dispatched_qty: 50 },
          { size: 'XL', dispatched_qty: 25 },
        ],
      },
    ]);
  };

  const handleUpdateLot = (index: number, field: string, value: any) => {
    const updated = [...lots];
    (updated[index] as any)[field] = value;
    setLots(updated);
  };

  const handleUpdateSizeQty = (lotIndex: number, sizeIndex: number, qty: number) => {
    const updated = [...lots];
    updated[lotIndex].sizes[sizeIndex].dispatched_qty = qty;
    setLots(updated);
  };

  const handleAddSizeColumn = (lotIndex: number, customSize: string) => {
    if (!customSize.trim()) return;
    const updated = [...lots];
    updated[lotIndex].sizes.push({ size: customSize.trim(), dispatched_qty: 0 });
    setLots(updated);
  };

  // Submit Create Challan
  const handleCreateChallanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let workerId = selectedWorkerId;

    if (!workerId && newWorkerName.trim()) {
      const created = createJobWorker({
        name: newWorkerName,
        phone: newWorkerPhone || '+91 98000 00000',
        address: newWorkerAddress,
        process_type: processType,
        default_rate: lots[0]?.rate_per_pc || 15,
      });
      workerId = created.id;
    }

    if (!workerId) {
      alert('Please select or enter an outside Job Worker name');
      return;
    }

    const createdChallan = createRoadChallan({
      job_worker_id: workerId,
      process_type: processType,
      challan_date: challanDate,
      notes,
      lots,
    });

    setIsCreateOpen(false);
    setSelectedWorkerId('');
    setNewWorkerName('');
    alert(`Road Challan ${createdChallan.challan_no} created successfully!`);
  };

  // Open Reconciliation Modal
  const openReconciliationModal = (ch: RoadChallan) => {
    setReconChallan(ch);
    const initialInputs: Record<string, number> = {};
    (ch.lots || []).forEach((lot) => {
      lot.sizes.forEach((s) => {
        const key = `${lot.id}_${s.size}`;
        initialInputs[key] = s.returned_qty !== null ? s.returned_qty : s.dispatched_qty;
      });
    });
    setReturnedInputs(initialInputs);
  };

  // Submit Inbound Reconciliation
  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconChallan) return;

    const returnedSizes: Array<{ lot_id: string; size: string; returned_qty: number }> = [];
    (reconChallan.lots || []).forEach((lot) => {
      lot.sizes.forEach((s) => {
        const key = `${lot.id}_${s.size}`;
        const returned = returnedInputs[key] !== undefined ? Number(returnedInputs[key]) : s.dispatched_qty;
        returnedSizes.push({
          lot_id: lot.id,
          size: s.size,
          returned_qty: returned,
        });
      });
    });

    reconcileRoadChallan(reconChallan.id, {
      completion_date: completionDate,
      returnedSizes,
    });

    setReconChallan(null);
    alert('Challan inbound return reconciled successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-400" />
            Road Challans (Job-Work Delivery Slips)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Dispatch garment lots to outside job workers (Making, Printing, Embroidery, Ironing) with Before vs After piece reconciliation
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Road Challan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Challan #, Job Worker, Article / Style, Lot No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'dispatched', 'partially_returned', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Road Challans Cards / Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChallans.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-500 text-xs rounded-2xl border border-slate-800 bg-slate-900/60">
            <Truck className="h-10 w-10 mx-auto mb-2 text-slate-600" />
            No Road Challans created yet. Click &ldquo;New Road Challan&rdquo; to dispatch lots to outside job workers.
          </div>
        ) : (
          filteredChallans.map((ch) => {
            const totalDispatched = (ch.lots || []).reduce(
              (sum, lot) => sum + lot.sizes.reduce((lSum, s) => lSum + s.dispatched_qty, 0),
              0
            );
            const totalReturned = (ch.lots || []).reduce(
              (sum, lot) => sum + lot.sizes.reduce((lSum, s) => lSum + (s.returned_qty || 0), 0),
              0
            );
            const shortage = totalDispatched - totalReturned;

            return (
              <div
                key={ch.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {ch.challan_no}
                        </span>
                        <span className="text-xs text-slate-400">{ch.challan_date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        {ch.job_worker?.name || 'Job Worker'}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                        Process: <strong className="text-blue-400">{ch.process_type.replace(/_/g, ' ')}</strong>
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        ch.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : ch.status === 'partially_returned'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}
                    >
                      {ch.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Lots & Size Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2 text-xs">
                    {(ch.lots || []).map((lot) => (
                      <div key={lot.id} className="border-b border-slate-800 last:border-0 pb-2 last:pb-0 space-y-1">
                        <div className="flex justify-between font-semibold text-slate-200">
                          <span>
                            <strong className="text-white">{lot.article}</strong> ({lot.color})
                          </span>
                          <span className="font-mono text-slate-400">{lot.lot_no}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lot.sizes.map((s) => (
                            <span
                              key={s.size}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700"
                            >
                              Size {s.size}: <strong>{s.dispatched_qty}</strong>
                              {s.returned_qty !== null && (
                                <span className={s.shortage_qty && s.shortage_qty > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                  {' '}&rarr; Ret: {s.returned_qty}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Piece Reconciliation Summary */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
                    <span className="text-slate-400">
                      Dispatched: <strong className="text-white">{totalDispatched} Pcs</strong>
                    </span>
                    {ch.status !== 'dispatched' ? (
                      <span className="text-slate-400">
                        Returned: <strong className="text-emerald-400">{totalReturned} Pcs</strong>
                        {shortage > 0 && <span className="text-rose-400 ml-1 font-bold">(-{shortage} Shortage)</span>}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Out at Vendor
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => generateRoadChallanPDF(ch, factory)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-400" />
                    <span>Print Challan PDF</span>
                  </button>

                  {ch.status !== 'completed' && (
                    <button
                      onClick={() => openReconciliationModal(ch)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Reconcile Return</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: CREATE NEW ROAD CHALLAN */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-400" />
                Create New Road Challan (Job-Work Delivery Slip)
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChallanSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* Job Worker Details */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  Outside Job Worker / Vendor
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Select Existing Vendor</label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => {
                        setSelectedWorkerId(e.target.value);
                        if (e.target.value) {
                          const w = jobWorkers.find((jw) => jw.id === e.target.value);
                          if (w) setProcessType(w.process_type);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Or type new vendor below --</option>
                      {jobWorkers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.process_type.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Process / Job Type *</label>
                    <select
                      value={processType}
                      onChange={(e) => setProcessType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="screen_printing">Screen Printing</option>
                      <option value="digital_printing">Digital Printing</option>
                      <option value="making">Making / Stitching</option>
                      <option value="dyeing">Dyeing & Washing</option>
                      <option value="embroidery">Embroidery</option>
                      <option value="ironing">Ironing & Finishing</option>
                    </select>
                  </div>
                </div>

                {!selectedWorkerId && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">New Vendor Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Screen Printers"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Phone #</label>
                      <input
                        type="text"
                        placeholder="+91 98..."
                        value={newWorkerPhone}
                        onChange={(e) => setNewWorkerPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Address</label>
                      <input
                        type="text"
                        placeholder="Unit location..."
                        value={newWorkerAddress}
                        onChange={(e) => setNewWorkerAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Dispatch Lots & Size Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-400" />
                    Dispatch Lot(s) & Size Quantities
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLot}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Another Lot Row
                  </button>
                </div>

                {lots.map((lot, lIdx) => (
                  <div key={lIdx} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Lot / Batch #</label>
                        <input
                          type="text"
                          value={lot.lot_no}
                          onChange={(e) => handleUpdateLot(lIdx, 'lot_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Article / Style</label>
                        <input
                          type="text"
                          value={lot.article}
                          onChange={(e) => handleUpdateLot(lIdx, 'article', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Color</label>
                        <input
                          type="text"
                          value={lot.color}
                          onChange={(e) => handleUpdateLot(lIdx, 'color', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400">Appx Rate/Pc (₹)</label>
                        <input
                          type="number"
                          value={lot.rate_per_pc}
                          onChange={(e) => handleUpdateLot(lIdx, 'rate_per_pc', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold"
                        />
                      </div>
                    </div>

                    {/* Size × Quantity Grid */}
                    <div className="pt-2 border-t border-slate-800">
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                        Size-Wise Breakdown (Pieces)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {lot.sizes.map((s, sIdx) => (
                          <div key={s.size} className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-750">
                            <span className="font-mono font-bold text-blue-400 w-8 text-center">{s.size}:</span>
                            <input
                              type="number"
                              min={0}
                              value={s.dispatched_qty}
                              onChange={(e) => handleUpdateSizeQty(lIdx, sIdx, Number(e.target.value))}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-bold text-xs text-right"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Special Instructions / Dispatch Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Front chest 4-colour print. Delivery expected in 3 days."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
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
                  Generate Road Challan & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: INBOUND RETURN & RECONCILIATION */}
      {/* ------------------------------------------------------------------ */}
      {reconChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Reconcile Inbound Return — {reconChallan.challan_no}
              </h3>
              <button
                onClick={() => setReconChallan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <p className="text-slate-400">Job Worker: <strong className="text-white">{reconChallan.job_worker?.name}</strong></p>
                <p className="text-slate-400 mt-0.5">Process: <strong className="text-blue-400 capitalize">{reconChallan.process_type.replace(/_/g, ' ')}</strong></p>
              </div>

              {/* Before vs After Size Reconciliation Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">Enter Returned Quantities (Before vs After):</h4>

                {(reconChallan.lots || []).map((lot) => (
                  <div key={lot.id} className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2.5">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{lot.article} ({lot.color})</span>
                      <span className="font-mono text-slate-400">{lot.lot_no}</span>
                    </div>

                    <div className="space-y-2">
                      {lot.sizes.map((s) => {
                        const key = `${lot.id}_${s.size}`;
                        const currentRet = returnedInputs[key] !== undefined ? returnedInputs[key] : s.dispatched_qty;
                        const delta = s.dispatched_qty - currentRet;

                        return (
                          <div key={s.size} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800">
                            <span className="font-mono font-bold text-slate-200 w-16">Size {s.size}</span>
                            <span className="text-slate-400 text-[11px]">Sent: {s.dispatched_qty}</span>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-[11px]">Recv:</span>
                              <input
                                type="number"
                                min={0}
                                value={currentRet}
                                onChange={(e) => {
                                  setReturnedInputs({
                                    ...returnedInputs,
                                    [key]: Number(e.target.value),
                                  });
                                }}
                                className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-bold text-right"
                              />
                            </div>

                            <span
                              className={`w-28 text-right font-bold text-[11px] ${
                                delta > 0 ? 'text-rose-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {delta > 0 ? `-${delta} Shortage` : delta < 0 ? `+${Math.abs(delta)} Excess` : '0 Match'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Completion / Return Date *</label>
                <input
                  type="date"
                  required
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReconChallan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30"
                >
                  Confirm Inbound Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
