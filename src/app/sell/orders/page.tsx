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
  Printer,
  FileText,
  Download,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WhatsAppModal } from '@/components/common/whatsapp-modal';
import { WhatsAppTemplates } from '@/lib/whatsapp';
import { CreateInvoiceModal } from '@/components/billing/create-invoice-modal';
import { POUploadModal } from '@/components/billing/po-upload-modal';
import { TaxInvoiceTemplate } from '@/components/billing/tax-invoice-template';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { Invoice } from '@/types/database.types';

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
  const [isPOUploadModalOpen, setIsPOUploadModalOpen] = useState(false);
  const [billingOrderId, setBillingOrderId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [partyId, setPartyId] = useState(parties[0]?.id || '');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    phone: string;
    name: string;
    message: string;
    orderId: string;
  } | null>(null);

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

  const handleSendWhatsApp = (order: (typeof saleOrders)[0]) => {
    const party = parties.find((p) => p.id === order.party_id);
    const phone = party?.phone || '+91 98000 00000';
    const name = party?.name || 'Customer';
    const msg = WhatsAppTemplates.saleOrder({
      customerName: name,
      orderNo: order.number,
      itemCount: order.items?.length || 1,
      totalAmount: formatINR(order.total_amount),
      factoryName: factory.name || 'Manisha Garments',
    });
    setWhatsAppModalData({
      phone,
      name,
      message: msg,
      orderId: order.id,
    });
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
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsPOUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Upload PO (PDF / Image)</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Manual Entry</span>
            </button>
          </div>
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
              {saleOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="h-8 w-8 text-slate-600" />
                      <span className="font-bold text-slate-300">No Sale Orders Yet</span>
                      <span className="text-xs text-slate-500">
                        Upload a PO document (PDF/Image) or enter an order manually to start billing.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                saleOrders.map((order) => {
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
                              onClick={() => setBillingOrderId(order.id)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                              title="Generate Tax Invoice from this PO (Pre-fills all items, just enter date)"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Bill this PO</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsApp(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700 transition"
                            title="Send WhatsApp Order Confirmation"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSaleOrder(order.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                            title="Delete Sale Order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Modal 1: Create Sale Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
                Book New Buyer Purchase Order / Sale Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Customer (Party) *</label>
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
                  <label className="font-semibold text-slate-300">Buyer's PO Number / Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. PO/MB/2026/01 or PO-50995"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Order Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 items-center"
                    >
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].description = e.target.value;
                            setLineItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div className="col-span-3">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].qty = Number(e.target.value);
                              setLineItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">Pcs</span>
                        </div>
                      </div>

                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400">₹</span>
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.price}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].price = Number(e.target.value);
                              setLineItems(updated);
                            }}
                            className="w-full pl-5 pr-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold text-emerald-400"
                          />
                        </div>
                      </div>

                      <div className="col-span-1 text-right">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Order Delivery Terms / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Terms of delivery, destination, despatch details..."
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

      {/* Modal 2: 1-Click Bill this PO Modal */}
      {billingOrderId && (
        <CreateInvoiceModal
          isOpen={!!billingOrderId}
          initialSaleOrderId={billingOrderId}
          onClose={() => setBillingOrderId(null)}
          onSuccess={(createdInv, shouldPrint) => {
            setBillingOrderId(null);
            if (shouldPrint) {
              setPreviewInvoice(createdInv);
            } else {
              router.push(`/sell/invoices?search=${encodeURIComponent(createdInv.number)}`);
            }
          }}
        />
      )}

      {/* Modal 3: Exact Tax Invoice Print Preview */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[96vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/90 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Tax Invoice — {previewInvoice.number}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={async () => {
                    const p = parties.find((pt) => pt.id === previewInvoice.party_id) || previewInvoice.party || parties[0];
                    const b = previewInvoice.buyer_party_id ? (parties.find((pt) => pt.id === previewInvoice.buyer_party_id) || previewInvoice.buyer) : undefined;
                    await generateInvoicePDF(previewInvoice, factory, p, b);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto bg-neutral-900 flex justify-center print:p-0 print:bg-white">
              {(() => {
                const party = parties.find((p) => p.id === previewInvoice.party_id) || previewInvoice.party || parties[0];
                const buyer = previewInvoice.buyer_party_id ? (parties.find((p) => p.id === previewInvoice.buyer_party_id) || previewInvoice.buyer) : undefined;
                return (
                  <TaxInvoiceTemplate
                    invoice={previewInvoice}
                    factory={factory}
                    party={party}
                    buyer={buyer}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: PO Document (PDF / Image) Upload & Instant Billing Modal */}
      {isPOUploadModalOpen && (
        <POUploadModal
          isOpen={isPOUploadModalOpen}
          onClose={() => setIsPOUploadModalOpen(false)}
          onSuccess={(createdInv, shouldPrint) => {
            setIsPOUploadModalOpen(false);
            if (shouldPrint) {
              setPreviewInvoice(createdInv);
            } else {
              router.push(`/sell/invoices?search=${encodeURIComponent(createdInv.number)}`);
            }
          }}
        />
      )}

      {/* Modal 5: WhatsApp Dispatcher */}
      {whatsAppModalData && (
        <WhatsAppModal
          isOpen={!!whatsAppModalData}
          onClose={() => setWhatsAppModalData(null)}
          defaultPhone={whatsAppModalData.phone}
          defaultName={whatsAppModalData.name}
          defaultMessage={whatsAppModalData.message}
          refTable="sale_orders"
          refId={whatsAppModalData.orderId}
        />
      )}
    </div>
  );
}
