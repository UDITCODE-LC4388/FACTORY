'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR, calculateGST } from '@/lib/gst';
import {
  ShoppingCart,
  Plus,
  ArrowRight,
  FileCheck2,
  CheckCircle2,
  Trash2,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SaleOrdersPage() {
  const router = useRouter();
  const {
    factory,
    parties,
    products,
    saleOrders,
    createSaleOrder,
    convertSaleOrderToInvoice,
    sendWhatsAppNotification,
    deleteSaleOrder,
    currentProfile,
  } = useFactory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partyId, setPartyId] = useState(parties[0]?.id || '');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Line items state
  const [lineItems, setLineItems] = useState<
    Array<{ product_id: string; description: string; qty: number; price: number; gst_percent: number }>
  >([
    {
      product_id: products[0]?.id || '',
      description: products[0]?.name || '',
      qty: 100,
      price: products[0]?.sale_price || 450,
      gst_percent: products[0]?.gst_percent || 5,
    },
  ]);

  const customerParties = parties.filter((p) => p.type === 'customer' || p.type === 'both');

  const handleAddItem = () => {
    const defaultProd = products[0];
    setLineItems([
      ...lineItems,
      {
        product_id: defaultProd?.id || '',
        description: defaultProd?.name || 'Garment Item',
        qty: 50,
        price: defaultProd?.sale_price || 450,
        gst_percent: defaultProd?.gst_percent || 5,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      description: prod.name,
      price: prod.sale_price,
      gst_percent: prod.gst_percent,
    };
    setLineItems(updated);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || lineItems.length === 0) return;

    const newOrder = createSaleOrder(
      {
        number: orderNumber || undefined,
        party_id: partyId,
        notes,
      },
      lineItems
    );

    setIsModalOpen(false);
    setNotes('');
    setOrderNumber('');
  };

  const handleConvertToInvoice = (orderId: string) => {
    try {
      const inv = convertSaleOrderToInvoice(orderId);
      router.push(`/sell/invoices?search=${encodeURIComponent(inv.number)}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSendWhatsApp = async (order: (typeof saleOrders)[0]) => {
    const party = parties.find((p) => p.id === order.party_id);
    if (!party) return;
    const msg = `Namaste ${party.name}, your Sale Order #${order.number} for ${formatINR(
      order.total_amount
    )} has been recorded at ${factory.name}. Production is scheduled.`;
    const res = await sendWhatsAppNotification(party.phone, party.name, msg, 'sale_orders', order.id);
    if (res.directUrl) {
      window.open(res.directUrl, '_blank');
    }
  };

  const canEdit = ['owner', 'master', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-400" />
            Customer Sale Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Book buyer purchase orders, build item batches, and convert atomically to tax invoices
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sale Order</span>
          </button>
        )}
      </div>

      {/* Sale Orders Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Order # / Date</th>
                <th className="py-3.5 px-4">Customer Party</th>
                <th className="py-3.5 px-4">Items / Garments</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {saleOrders.map((order) => {
                const party = parties.find((p) => p.id === order.party_id);
                const totalPieces = (order.items || []).reduce((sum, it) => sum + it.qty, 0);

                return (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex flex-col">
                        <span className="font-mono text-blue-400">{order.number}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {order.date}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>
                        <span>{party?.name || 'Customer'}</span>
                        <p className="text-[11px] text-slate-400 font-normal">
                          {party?.state} (GST: {party?.gstin || 'None'})
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="font-bold text-white">{totalPieces} Pcs</span>
                      <p className="text-[11px] text-slate-400">
                        {(order.items || []).map((it) => it.description).join(', ')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                      {formatINR(order.total_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          order.status === 'invoiced'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'draft' && canEdit && (
                          <button
                            onClick={() => handleConvertToInvoice(order.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                            title="Atomic DB conversion to Tax Invoice & Finished Stock Deduction"
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            <span>Convert to Invoice</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleSendWhatsApp(order)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700"
                          title="Send WhatsApp Order Confirmation"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete sale order ${order.number}?`)) {
                              deleteSaleOrder(order.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                          title="Delete Order"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Sale Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
                Create New Sale Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Customer Party *</label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {customerParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Order Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated e.g. SO-2026-002"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Order Line Items / Garments</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Garment Line
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-850 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Product</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        >
                          {products.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name} (Stock: {pr.stock_qty})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Qty (Pcs)</label>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].qty = Number(e.target.value) || 1;
                            setLineItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].price = Number(e.target.value) || 0;
                            setLineItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Total</label>
                        <span className="font-bold text-slate-200 text-xs block py-1">
                          {formatINR(item.qty * item.price)}
                        </span>
                      </div>

                      <div className="sm:col-span-1 text-right">
                        {lineItems.length > 1 && (
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
                <label className="font-semibold text-slate-300">Order Delivery Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special packing instructions or delivery deadlines..."
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
                  Save Sale Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
