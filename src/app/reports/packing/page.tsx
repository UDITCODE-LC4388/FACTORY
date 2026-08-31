'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { PackageCheck, Plus, Search, Truck, CheckCircle2, Box, X } from 'lucide-react';
import { PackingList } from '@/types/database.types';

export default function PackingPage() {
  const { packingLists, products, invoices, currentProfile } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock list items if empty
  const defaultPacking: PackingList[] = [
    {
      id: 'pack-1',
      factory_id: '11111111-1111-1111-1111-111111111111',
      number: 'PL-2026-001',
      status: 'draft',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 'pi-1',
          factory_id: '11111111-1111-1111-1111-111111111111',
          packing_list_id: 'pack-1',
          product_id: products[0]?.id || '',
          carton_no: 'Carton 01',
          size: 'M',
          colour: 'Navy',
          qty: 50,
        },
        {
          id: 'pi-2',
          factory_id: '11111111-1111-1111-1111-111111111111',
          packing_list_id: 'pack-1',
          product_id: products[0]?.id || '',
          carton_no: 'Carton 02',
          size: 'L',
          colour: 'Navy',
          qty: 50,
        },
      ],
    },
  ];

  const listsToDisplay = packingLists.length > 0 ? packingLists : defaultPacking;

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
      </div>

      {/* Packing Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listsToDisplay.map((pl) => {
          const totalCartons = new Set((pl.items || []).map((i) => i.carton_no)).size;
          const totalPieces = (pl.items || []).reduce((sum, i) => sum + i.qty, 0);

          return (
            <div
              key={pl.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {pl.number}
                  </span>
                  <h3 className="text-xs font-bold text-slate-200 mt-1.5">
                    Total Volume: <span className="text-white font-bold">{totalPieces} Pcs</span> across {totalCartons} Cartons
                  </h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    pl.status === 'dispatched'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {pl.status}
                </span>
              </div>

              {/* Carton Breakdown */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Carton Line Breakdown:
                </p>
                <div className="space-y-1.5 text-xs">
                  {(pl.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-slate-300 py-0.5"
                    >
                      <div className="flex items-center gap-2">
                        <Box className="h-3.5 w-3.5 text-blue-400" />
                        <span className="font-mono font-bold text-white">{item.carton_no}:</span>
                        <span>Size {item.size} ({item.colour})</span>
                      </div>
                      <span className="font-bold text-slate-200">{item.qty} pcs</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Created: {new Date(pl.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => alert(`Packing slip ${pl.number} printed!`)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  Print Packing Slip
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
