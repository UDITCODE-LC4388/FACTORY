'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { ArrowDownToLine, FileSpreadsheet, CheckCircle2, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

export default function BulkImportPage() {
  const { importBulkEntities } = useFactory();
  const [entityType, setEntityType] = useState<'parties' | 'materials' | 'products'>('parties');
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const sampleTemplates = {
    parties: `name,type,phone,gstin,state,balance\nRaymond Lifestyle,customer,+919811100011,27AAACR1234A1Z5,Maharashtra,50000\nCentury Textiles,vendor,+919822200022,24AAACC5678B1Z9,Gujarat,-30000`,
    materials: `name,cost_per_unit,qty_on_hand,low_stock_threshold\n100% Cotton Rib 1x1 (Navy),160,500,100\nMetal Snap Fasteners 15mm,1.20,5000,500`,
    products: `name,sku,sale_price,hsn_code,gst_percent,stock_qty\nMen V-Neck Slim T-Shirt,TS-VNK-BLK,480,61091000,5,200\nKids Printed Romper,ROMP-KID-01,350,61112000,5,150`,
  };

  const handleLoadSample = () => {
    setCsvText(sampleTemplates[entityType]);
    setImportResult(null);
  };

  const handleProcessImport = () => {
    if (!csvText.trim()) return;

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const res = importBulkEntities(entityType, results.data as Array<Record<string, unknown>>);
        setImportResult(res);
      },
      error: (err: Error) => {
        setImportResult({
          successCount: 0,
          errors: [{ row: 0, error: err.message }],
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6 text-blue-400" />
            Bulk CSV / Data Importer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Import existing Excel/CSV sheets for Customers, Raw Materials, or Products with row-by-row validation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Input Panel */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-400" />
              Upload / Paste CSV Data
            </h2>

            <button
              onClick={handleLoadSample}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Load Sample Data
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Target Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any);
                  setImportResult(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="parties">Parties (Customers & Vendors)</option>
                <option value="materials">Raw Materials & Trims</option>
                <option value="products">Products & Finished Garments</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">CSV Content (Header row required)</label>
              <textarea
                rows={9}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleProcessImport}
              disabled={!csvText.trim()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Validate & Process Bulk Import</span>
            </button>
          </div>
        </div>

        {/* Results & Error Log Panel */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-400" />
              Import Execution Summary & Error Log
            </h2>
          </div>

          {importResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Successful Rows</span>
                  </div>
                  <p className="text-2xl font-black mt-1">{importResult.successCount}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Failed Rows</span>
                  </div>
                  <p className="text-2xl font-black mt-1">{importResult.errors.length}</p>
                </div>
              </div>

              {/* Error Table */}
              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-850/60 overflow-hidden">
                  <div className="p-2.5 bg-slate-800 text-[11px] font-bold uppercase text-slate-300">
                    Row-by-Row Error Log
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400 border-b border-slate-750">
                      <tr>
                        <th className="py-2 px-3">Row #</th>
                        <th className="py-2 px-3">Error Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-rose-400">
                            Row {err.row}
                          </td>
                          <td className="py-2 px-3 text-slate-300">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs space-y-2">
              <FileSpreadsheet className="h-10 w-10 text-slate-600 mx-auto" />
              <p>Paste CSV content on the left and click process to view validation results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
