'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import {
  PackageCheck,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Box,
  X,
  Trash2,
  Printer,
  Layers,
} from 'lucide-react';
import { PackingList, PackingListItem } from '@/types/database.types';

export default function PackingPage() {
  const { packingLists, createPackingList, deletePackingList, products, invoices, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewList, setPreviewList] = useState<PackingList | null>(null);

  // Form State
  const [packingNumber, setPackingNumber] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [status, setStatus] = useState<'draft' | 'dispatched'>('draft');
  const [items, setItems] = useState<
    Array<{
      product_id: string;
      carton_no: string;
      size: string;
      colour: string;
      qty: number;
    }>
  >([
    {
      product_id: products[0]?.id || '',
      carton_no: 'Carton 01',
      size: 'M',
      colour: 'Navy',
      qty: 50,
    },
    {
      product_id: products[0]?.id || '',
      carton_no: 'Carton 02',
      size: 'L',
      colour: 'Navy',
      qty: 50,
    },
  ]);

  const filteredLists = packingLists.filter(
    (pl) =>
      pl.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pl.items || []).some((i) => i.carton_no.toLowerCase().includes(searchTerm.toLowerCase()) || i.size.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: products[0]?.id || '',
        carton_no: `Carton ${String(items.length + 1).padStart(2, '0')}`,
        size: 'XL',
        colour: 'Navy',
        qty: 50,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleOpenCreateModal = () => {
    setPackingNumber(`PL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setItems([
      {
        product_id: products[0]?.id || '',
        carton_no: 'Carton 01',
        size: 'M',
        colour: 'Navy',
        qty: 50,
      },
      {
        product_id: products[0]?.id || '',
        carton_no: 'Carton 02',
        size: 'L',
        colour: 'Navy',
        qty: 50,
      },
    ]);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    createPackingList(
      {
        number: packingNumber,
        invoice_id: invoiceId || undefined,
        status,
      },
      items
    );

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-blue-400" />
            Dispatch Packing Lists & Cartons
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Generate carton breakdown packing slips for buyer dispatches and shipping logistics
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Packing Slip</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search packing lists by slip # or carton #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Packing Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLists.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-500 text-xs rounded-2xl border border-slate-800 bg-slate-900/60">
            <PackageCheck className="h-10 w-10 mx-auto mb-2 text-slate-600" />
            No packing slips created yet. Click &ldquo;New Packing Slip&rdquo; to build dispatch cartons.
          </div>
        ) : (
          filteredLists.map((pl) => {
            const totalCartons = new Set((pl.items || []).map((i) => i.carton_no)).size;
            const totalPieces = (pl.items || []).reduce((sum, i) => sum + i.qty, 0);

            return (
              <div
                key={pl.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {pl.number}
                      </span>
                      <h3 className="text-xs font-bold text-slate-200 mt-1.5">
                        Total Volume: <span className="text-white font-bold">{totalPieces} Pcs</span> across {totalCartons} Carton(s)
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          pl.status === 'dispatched'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {pl.status}
                      </span>

                      <button
                        onClick={() => {
                          if (confirm(`Delete packing slip ${pl.number}?`)) {
                            deletePackingList(pl.id);
                          }
                        }}
                        title="Delete Packing Slip"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Carton Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Carton Line Breakdown:
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {(pl.items || []).map((item) => {
                        const prod = products.find((p) => p.id === item.product_id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-750"
                          >
                            <div className="flex items-center gap-2">
                              <Box className="h-3.5 w-3.5 text-blue-400" />
                              <span className="font-mono text-slate-300 font-bold">{item.carton_no}:</span>
                              <span className="text-white">{prod?.name || 'Garment Style'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-400">
                                Size {item.size} ({item.colour})
                              </span>
                              <span className="font-bold text-emerald-400 font-mono">
                                {item.qty} Pcs
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(pl.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setPreviewList(pl)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-400" />
                    <span>Print Packing Slip</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: CREATE NEW PACKING LIST */}
      {/* ------------------------------------------------------------------ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-400" />
                Create New Packing Slip & Cartons
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Packing Slip Number *</label>
                  <input
                    type="text"
                    required
                    value={packingNumber}
                    onChange={(e) => setPackingNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white capitalize font-semibold"
                  >
                    <option value="draft">Draft</option>
                    <option value="dispatched">Dispatched</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Carton Lines */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1">
                    <Box className="h-4 w-4 text-blue-400" /> Carton Packing Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Carton Row
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Carton #</label>
                        <input
                          type="text"
                          value={it.carton_no}
                          onChange={(e) => handleUpdateItem(idx, 'carton_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] text-slate-400">Garment Style</label>
                        <select
                          value={it.product_id}
                          onChange={(e) => handleUpdateItem(idx, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Size</label>
                        <input
                          type="text"
                          value={it.size}
                          onChange={(e) => handleUpdateItem(idx, 'size', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Pcs Qty</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => handleUpdateItem(idx, 'qty', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Generate Packing Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: PRINT PREVIEW */}
      {/* ------------------------------------------------------------------ */}
      {previewList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/80">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Packing Slip Print Preview — {previewList.number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setPreviewList(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-950 flex justify-center">
              <div className="w-full bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-5 text-xs border border-slate-300 font-sans">
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">DISPATCH PACKING SLIP</h2>
                    <p className="text-[11px] text-slate-600">Carton & Packaging Manifest</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{previewList.number}</span>
                    <p className="text-[11px] text-slate-600">{new Date(previewList.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="border border-slate-300 p-2 text-left">Carton #</th>
                      <th className="border border-slate-300 p-2 text-left">Product / Garment</th>
                      <th className="border border-slate-300 p-2 text-left">Size</th>
                      <th className="border border-slate-300 p-2 text-left">Colour</th>
                      <th className="border border-slate-300 p-2 text-right">Qty (Pcs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewList.items || []).map((it) => {
                      const prod = products.find((p) => p.id === it.product_id);
                      return (
                        <tr key={it.id} className="border-b border-slate-300">
                          <td className="border border-slate-300 p-2 font-mono font-bold">{it.carton_no}</td>
                          <td className="border border-slate-300 p-2 font-bold">{prod?.name || 'Garment'}</td>
                          <td className="border border-slate-300 p-2 font-mono">{it.size}</td>
                          <td className="border border-slate-300 p-2">{it.colour}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold">{it.qty} Pcs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-slate-700">
                  <span>Total Cartons: <strong>{new Set((previewList.items || []).map((i) => i.carton_no)).size}</strong></span>
                  <span>Total Volume: <strong>{(previewList.items || []).reduce((sum, i) => sum + i.qty, 0)} Pieces</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
