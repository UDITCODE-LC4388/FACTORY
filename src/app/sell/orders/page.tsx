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
  Search,
  CheckSquare,
  Square,
  Layers,
  Eye,
  Calendar,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WhatsAppModal } from '@/components/common/whatsapp-modal';
import { WhatsAppTemplates } from '@/lib/whatsapp';
import { CreateInvoiceModal } from '@/components/billing/create-invoice-modal';
import { POUploadModal } from '@/components/billing/po-upload-modal';
import { TaxInvoiceTemplate } from '@/components/billing/tax-invoice-template';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { Invoice, SaleOrder } from '@/types/database.types';

export default function SaleOrdersPage() {
  const router = useRouter();
  const {
    factory,
    parties,
    products,
    saleOrders,
    invoices,
    createSaleOrder,
    convertSaleOrderToInvoice,
    sendWhatsAppNotification,
    deleteSaleOrder,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'invoiced'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPOUploadModalOpen, setIsPOUploadModalOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState<SaleOrder | null>(null);
  const [billingDate, setBillingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewingOrder, setViewingOrder] = useState<SaleOrder | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Manual Add State
  const [partyId, setPartyId] = useState(parties[0]?.id || '');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    phone: string;
    name: string;
    message: string;
    orderId: string;
  } | null>(null);

  // Line items state for manual order
  const [lineItems, setLineItems] = useState<
    Array<{ product_id: string; description: string; qty: number; price: number; gst_percent: number }>
  >([
    {
      product_id: products[0]?.id || '',
      description: products[0]?.name || 'Garment Item',
      qty: 100,
      price: products[0]?.sale_price || 450,
      gst_percent: products[0]?.gst_percent || 5,
    },
  ]);

  const customerParties = parties.filter((p) => p.type === 'customer' || p.type === 'both');

  const filteredOrders = saleOrders.filter((order) => {
    const party = parties.find((p) => p.id === order.party_id);
    const buyer = order.buyer_party_id ? parties.find((p) => p.id === order.buyer_party_id) : null;
    const itemNames = (order.items || []).map((it) => it.description).join(' ').toLowerCase();

    const matchesSearch =
      order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.buyer_order_no && order.buyer_order_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (party && party.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (buyer && buyer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      itemNames.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && order.status !== 'invoiced') ||
      (statusFilter === 'invoiced' && order.status === 'invoiced');

    return matchesSearch && matchesStatus;
  });

  const pendingOrdersCount = saleOrders.filter((o) => o.status !== 'invoiced').length;
  const invoicedOrdersCount = saleOrders.filter((o) => o.status === 'invoiced').length;
  const totalValue = saleOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || lineItems.length === 0) return;

    createSaleOrder(
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

  const handleExecuteBillSingle = (order: SaleOrder) => {
    try {
      const inv = convertSaleOrderToInvoice(order.id, {
        date: billingDate || new Date().toISOString().split('T')[0],
      });
      setBillingOrder(null);
      setPreviewInvoice(inv);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBillSelectedOrders = () => {
    if (selectedOrderIds.length === 0) return;

    let lastInv: Invoice | null = null;
    let count = 0;

    try {
      selectedOrderIds.forEach((id) => {
        const ord = saleOrders.find((o) => o.id === id);
        if (ord && ord.status !== 'invoiced') {
          lastInv = convertSaleOrderToInvoice(id, {
            date: billingDate || new Date().toISOString().split('T')[0],
          });
          count++;
        }
      });

      setSelectedOrderIds([]);
      if (lastInv) {
        setPreviewInvoice(lastInv);
      } else {
        alert(`Successfully billed ${count} purchase order(s)!`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Are you sure you want to delete ${selectedOrderIds.length} selected purchase order(s)?`)) {
      selectedOrderIds.forEach((id) => deleteSaleOrder(id));
      setSelectedOrderIds([]);
    }
  };

  const toggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((i) => i !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleSendWhatsApp = (order: SaleOrder) => {
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
            Customer Purchase Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ingest, list, track, and 1-click bill all buyer purchase orders
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsPOUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Upload PO Document (PDF / Multi-Order)</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Manual Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Purchase Orders
          </span>
          <span className="text-2xl font-bold text-white mt-1 block font-mono">
            {saleOrders.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            All ingested buyer orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Pending Billing
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold text-amber-300 mt-1 block font-mono">
            {pendingOrdersCount}
          </span>
          <span className="text-[11px] text-amber-400/80 mt-0.5 block">
            Ready to generate Tax Invoices
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Billed (Invoiced)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-300 mt-1 block font-mono">
            {invoicedOrdersCount}
          </span>
          <span className="text-[11px] text-emerald-400/80 mt-0.5 block">
            Tax invoices generated
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/20">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
            Total Order Book
          </span>
          <span className="text-2xl font-bold text-blue-300 mt-1 block font-mono">
            {formatINR(totalValue)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across {saleOrders.length} purchase orders
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO #, buyer, party, or garment description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'all', label: `All (${saleOrders.length})` },
            { id: 'pending', label: `Pending Billing (${pendingOrdersCount})` },
            { id: 'invoiced', label: `Billed (${invoicedOrdersCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 border border-blue-600/40 flex items-center justify-between gap-4 animate-in fade-in shadow-xl">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-bold text-white">
              {selectedOrderIds.length} Purchase Order(s) Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBillSelectedOrders}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>⚡ Bill Selected ({selectedOrderIds.length})</span>
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
              title="Delete Selected POs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PO Listing Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">PO # & Date</th>
                <th className="py-3.5 px-4">Consignee & Buyer</th>
                <th className="py-3.5 px-4">Garment Items / Quantity</th>
                <th className="py-3.5 px-4">Order Value</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="h-8 w-8 text-slate-600" />
                      <span className="font-bold text-slate-300">No Purchase Orders Found</span>
                      <span className="text-xs text-slate-500">
                        Upload a multi-order PDF or drop files to list purchase orders here.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const party = parties.find((p) => p.id === order.party_id);
                  const buyer = order.buyer_party_id ? parties.find((p) => p.id === order.buyer_party_id) : null;
                  const totalPieces = (order.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isBilled = order.status === 'invoiced';

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* PO # & Date */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold text-blue-400">
                            {order.number}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            {order.date}
                          </span>
                        </div>
                      </td>

                      {/* Consignee & Buyer */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">
                            {party?.name || 'Customer Party'}
                          </span>
                          {order.is_through_buyer && buyer ? (
                            <span className="text-[10.5px] text-purple-400 font-semibold mt-0.5">
                              Via: {buyer.name} (Agency)
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 mt-0.5">
                              {party?.state} ({party?.state_code || '19'}) &bull; GST: {party?.gstin || 'None'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Garment Items */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-mono font-bold text-[11px]">
                            {totalPieces} Pcs
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {(order.items || []).length} style item(s)
                          </span>
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded transition"
                            title="View all items in this PO"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[10.5px] text-slate-400 truncate max-w-xs mt-0.5">
                          {(order.items || []).map((it) => it.description).join(' • ')}
                        </p>
                      </td>

                      {/* Order Value */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {formatINR(order.total_amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isBilled ? (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" />
                            Billed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Pending Billing
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isBilled ? (
                            <button
                              onClick={() => setBillingOrder(order)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                              title="Generate Tax Invoice for this PO"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Bill PO</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const inv = invoices.find((i) => i.sale_order_id === order.id || i.number === order.number);
                                if (inv) setPreviewInvoice(inv);
                                else router.push(`/sell/invoices?search=${encodeURIComponent(order.number)}`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                              title="View Generated Tax Invoice"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print Bill</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleSendWhatsApp(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                            title="Send WhatsApp PO Summary"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => deleteSaleOrder(order.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete PO"
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

      {/* ⚡ Quick Billing Modal for Individual PO */}
      {billingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Generate Tax Invoice</h3>
              </div>
              <button
                onClick={() => setBillingOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold block">Billing Order</span>
              <span className="font-mono text-base font-bold text-blue-400 block">
                {billingOrder.number}
              </span>
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-850">
                <span>{(billingOrder.items || []).reduce((s, it) => s + it.qty, 0)} Total Pieces</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatINR(billingOrder.total_amount)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-400" />
                Date of Billing
              </label>
              <input
                type="text"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                placeholder="e.g. 29-05-2026 or 2026-05-29"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBillingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteBillSingle(billingOrder)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Sparkles className="h-4 w-4" />
                <span>⚡ Generate & Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👁️ View Items Drawer Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-sm font-bold text-blue-400 block">
                  {viewingOrder.number}
                </span>
                <span className="text-xs text-slate-400">
                  {viewingOrder.date} &bull; {(viewingOrder.items || []).reduce((s, it) => s + it.qty, 0)} Total Pcs
                </span>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">HSN</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(viewingOrder.items || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="py-2.5 px-3 font-sans text-white font-medium">
                        {it.description}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{it.hsn_code}</td>
                      <td className="py-2.5 px-3 text-white font-bold">{it.qty} {it.unit_symbol || 'PCS'}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatINR(it.price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        {formatINR(it.qty * it.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-sm font-bold text-emerald-400">
                Net Value: {formatINR(viewingOrder.total_amount)}
              </span>
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Manual Sale Order Entry</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Customer Party *</label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {customerParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.state})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Buyer Order # (Optional)</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. PO/2026/001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Garment Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([
                        ...lineItems,
                        {
                          product_id: products[0]?.id || '',
                          description: 'Garment Item',
                          qty: 50,
                          price: 450,
                          gst_percent: 5,
                        },
                      ])
                    }
                    className="text-blue-400 hover:text-blue-300 font-bold"
                  >
                    + Add Item
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[idx].description = e.target.value;
                        setLineItems(updated);
                      }}
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[idx].qty = parseFloat(e.target.value) || 1;
                        setLineItems(updated);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.price}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[idx].price = parseFloat(e.target.value) || 0;
                        setLineItems(updated);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                      className="p-1.5 text-rose-400 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Upload Modal */}
      <POUploadModal
        isOpen={isPOUploadModalOpen}
        onClose={() => setIsPOUploadModalOpen(false)}
        onSuccess={(createdInv) => {
          setPreviewInvoice(createdInv);
        }}
      />

      {/* WhatsApp Modal */}
      {whatsAppModalData && (
        <WhatsAppModal
          isOpen={true}
          onClose={() => setWhatsAppModalData(null)}
          defaultPhone={whatsAppModalData.phone}
          defaultName={whatsAppModalData.name}
          defaultMessage={whatsAppModalData.message}
          refTable="sale_orders"
          refId={whatsAppModalData.orderId}
        />
      )}

      {/* Tax Invoice Print Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <span className="font-bold text-white text-sm">
                Generated Tax Invoice #{previewInvoice.number}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const party = parties.find((p) => p.id === previewInvoice.party_id) || previewInvoice.party;
                    const buyer = previewInvoice.buyer_party_id
                      ? parties.find((p) => p.id === previewInvoice.buyer_party_id)
                      : previewInvoice.buyer;
                    if (party) {
                      generateInvoicePDF(previewInvoice, factory, party, buyer);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto bg-slate-950/50">
              {(() => {
                const party = parties.find((p) => p.id === previewInvoice.party_id) || previewInvoice.party;
                const buyer = previewInvoice.buyer_party_id
                  ? parties.find((p) => p.id === previewInvoice.buyer_party_id)
                  : previewInvoice.buyer;
                if (!party) return null;
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
    </div>
  );
}
