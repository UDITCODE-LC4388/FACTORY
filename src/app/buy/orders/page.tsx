'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { Truck, Plus, CheckCircle2, Trash2, X, MessageSquare, Receipt } from 'lucide-react';
import { PurchaseOrder } from '@/types/database.types';
import { useRouter } from 'next/navigation';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const {
    factory,
    purchaseOrders,
    parties,
    materials,
    createPurchaseOrder,
    postPurchaseBill,
    sendWhatsAppNotification,
    currentProfile,
  } = useFactory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [poItems, setPoItems] = useState<
    Array<{ material_id: string; qty: number; price: number; gst_percent: number }>
  >([
    {
      material_id: materials[0]?.id || '',
      qty: 500,
      price: materials[0]?.cost_per_unit || 145,
      gst_percent: 5,
    },
  ]);

  const vendorParties = parties.filter((p) => p.type === 'vendor' || p.type === 'both');

  const handleAddItem = () => {
    const defaultMat = materials[0];
    setPoItems([
      ...poItems,
      {
        material_id: defaultMat?.id || '',
        qty: 100,
        price: defaultMat?.cost_per_unit || 100,
        gst_percent: 5,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || poItems.length === 0) return;

    createPurchaseOrder(
      {
        number: orderNumber || undefined,
        party_id: vendorId,
        notes,
      },
      poItems
    );

    setIsModalOpen(false);
    setOrderNumber('');
    setNotes('');
  };

  const handleConvertToBill = (po: PurchaseOrder) => {
    const billNum = `BILL-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = (po.items || []).map((it) => ({
      material_id: it.material_id,
      qty: it.qty,
      price: it.price,
      gst_percent: it.gst_percent,
    }));

    try {
      postPurchaseBill(po.id, billNum, items);
      router.push(`/buy/bills?search=${encodeURIComponent(billNum)}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSendWhatsApp = async (po: PurchaseOrder) => {
    const vendor = parties.find((p) => p.id === po.party_id);
    if (!vendor) return;
    const msg = `Namaste ${vendor.name}, Purchase Order #${po.number} for ${formatINR(
      po.total_amount
    )} has been raised by ${factory.name}. Please confirm dispatch timeline.`;
    const res = await sendWhatsAppNotification(vendor.phone, vendor.name, msg, 'purchase_orders', po.id);
    if (res.directUrl) {
      window.open(res.directUrl, '_blank');
    }
  };

  const canEdit = ['owner', 'master', 'purchase'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-400" />
            Supplier Purchase Orders (PO)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Issue procurement orders for yarn, fabrics, threads, and trims with automated WhatsApp dispatch
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setVendorId(vendorParties[0]?.id || '');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* PO Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">PO # / Date</th>
                <th className="py-3.5 px-4">Supplier / Vendor</th>
                <th className="py-3.5 px-4">Ordered Materials</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No purchase orders logged yet. Click &ldquo;Create Purchase Order&rdquo; to begin procurement.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const vendor = parties.find((p) => p.id === po.party_id) || po.party;
                  return (
                    <tr key={po.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span className="font-mono text-blue-400">{po.number}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {po.date}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>
                          <span>{vendor?.name || 'Vendor'}</span>
                          <p className="text-[11px] text-slate-400 font-normal">
                            {vendor?.state}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {(po.items || []).map((it) => {
                          const mat = materials.find((m) => m.id === it.material_id);
                          return `${it.qty}x ${mat?.name || 'Material'}`;
                        }).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {formatINR(po.total_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            po.status === 'billed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {po.status === 'draft' && canEdit && (
                            <button
                              onClick={() => handleConvertToBill(po)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                              title="Convert to Inward Purchase Bill & Increment Material Stock"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Receive Goods & Bill</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsApp(po)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700"
                            title="Send WhatsApp PO copy to vendor"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-400" />
                Create Supplier Purchase Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Supplier / Vendor *</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {vendorParties.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">PO Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto (e.g. PO-2026-001)"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Procurement Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Material
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-850 border border-slate-800 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-6">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Material</label>
                        <select
                          value={item.material_id}
                          onChange={(e) => {
                            const updated = [...poItems];
                            const mat = materials.find((m) => m.id === e.target.value);
                            updated[idx].material_id = e.target.value;
                            if (mat) updated[idx].price = mat.cost_per_unit;
                            setPoItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Qty</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const updated = [...poItems];
                            updated[idx].qty = Number(e.target.value) || 1;
                            setPoItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const updated = [...poItems];
                            updated[idx].price = Number(e.target.value) || 0;
                            setPoItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Delivery Notes</label>
                <textarea
                  rows={2}
                  placeholder="Payment terms, delivery date, quality standards..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/30"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
