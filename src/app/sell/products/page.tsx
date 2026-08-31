'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { PackageCheck, Plus, Search, Tag, Layers, X } from 'lucide-react';

export default function ProductsPage() {
  const { products, addProduct, categories, units, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [hsnCode, setHsnCode] = useState('61091000');
  const [gstPercent, setGstPercent] = useState('5');
  const [stockQty, setStockQty] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsn_code.includes(searchTerm)
  );

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProduct({
      name,
      sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      sale_price: Number(salePrice) || 0,
      hsn_code: hsnCode,
      gst_percent: Number(gstPercent) || 5,
      stock_qty: Number(stockQty) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 10,
    });

    setIsModalOpen(false);
    setName('');
    setSku('');
    setSalePrice('');
    setStockQty('');
  };

  const canEdit = ['owner', 'master', 'accountant', 'inventory_manager'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-blue-400" />
            Product Catalog & Finished Goods
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Finished apparel products with HSN tax codes, sale rates, and finished goods inventory
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search products by name, SKU, or HSN code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Garment / Product</th>
                <th className="py-3.5 px-4">SKU / Code</th>
                <th className="py-3.5 px-4">HSN & GST Rate</th>
                <th className="py-3.5 px-4">Sale Price (Rate)</th>
                <th className="py-3.5 px-4 text-right">Finished Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{p.name}</span>
                        <p className="text-[11px] text-slate-400 font-normal">
                          Threshold: {p.low_stock_threshold} pcs
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                    {p.sku}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                        HSN: {p.hsn_code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">
                        {p.gst_percent}% GST
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {formatINR(p.sale_price)} <span className="text-[10px] text-slate-500 font-normal">/ piece</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold text-sm ${
                        p.stock_qty <= (p.low_stock_threshold || 10)
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {p.stock_qty.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-xs ml-1">Pcs</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-400" />
                Add New Garment Product
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Product Title / Style *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Pique Polo Shirt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">SKU Code</label>
                  <input
                    type="text"
                    placeholder="POLO-PIQ-BLK"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Sale Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="450.00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">GST Rate (%)</label>
                  <select
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="5">5% (Apparel &lt; ₹1000)</option>
                    <option value="12">12% (Apparel &gt; ₹1000)</option>
                    <option value="18">18%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Initial Stock (Pcs)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Low Stock Alert</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
