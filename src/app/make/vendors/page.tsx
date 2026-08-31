'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import {
  Users,
  Plus,
  Search,
  Truck,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  X,
  CreditCard,
  Building,
  Trash2,
} from 'lucide-react';
import { JobWorkerProcess, OutsideJobWork } from '@/types/database.types';
import Link from 'next/link';

export default function OutsideVendorsPage() {
  const { outsideJobWorks, addOutsideJobWork, updateOutsideJobWork, deleteOutsideJobWork, sendWhatsAppNotification } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for New Allotment
  const [vendorName, setVendorName] = useState('');
  const [phone, setPhone] = useState('');
  const [process, setProcess] = useState<JobWorkerProcess>('screen_printing');
  const [batchNo, setBatchNo] = useState('');
  const [article, setArticle] = useState('');
  const [piecesSent, setPiecesSent] = useState('');
  const [ratePerPiece, setRatePerPiece] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredJobs = outsideJobWorks.filter((job) => {
    const matchesSearch =
      job.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.article.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProcess = processFilter === 'all' || job.process === processFilter;
    return matchesSearch && matchesProcess;
  });

  const handleCreateAllotment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !batchNo || !piecesSent) return;

    addOutsideJobWork({
      vendor_name: vendorName,
      phone,
      process,
      batch_no: batchNo,
      article: article || 'Garment Style',
      pieces_sent: Number(piecesSent),
      rate_per_piece: Number(ratePerPiece) || 15,
      dispatch_date: dispatchDate,
      expected_return_date: expectedReturnDate,
      notes,
    });

    setIsModalOpen(false);
    setVendorName('');
    setBatchNo('');
    setArticle('');
    setPiecesSent('');
    setRatePerPiece('');
  };

  const handleWhatsAppCheckIn = async (job: OutsideJobWork) => {
    if (!job.phone) {
      alert('No phone number recorded for this vendor.');
      return;
    }
    const msg = `Namaste ${job.vendor_name}, following up regarding Lot #${job.batch_no} (${job.pieces_sent} pcs of ${job.article} for ${job.process.replace(/_/g, ' ')}). Please update expected delivery date.`;
    const res = await sendWhatsAppNotification(job.phone, job.vendor_name, msg, 'outside_job_work', job.id);
    window.open(res.directUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" />
            Making & Printing Vendors (Outside Job-Work Manager)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Dedicated tracking table for Making/Stitching, Screen/Digital Printing, Embroidery, and Ironing vendors with piece rates and return status
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/make/challans"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Truck className="h-4 w-4 text-blue-400" />
            <span>View Road Challans</span>
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Allot Job Work</span>
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, allotted batch #, garment style..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          {['all', 'making', 'screen_printing', 'digital_printing', 'embroidery', 'ironing'].map((p) => (
            <button
              key={p}
              onClick={() => setProcessFilter(p)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold whitespace-nowrap transition ${
                processFilter === p
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Vendor Allotment Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Vendor / Job Worker</th>
                <th className="py-3.5 px-4">Process</th>
                <th className="py-3.5 px-4">Allotted Batch #</th>
                <th className="py-3.5 px-4">Article / Style</th>
                <th className="py-3.5 px-4 text-right">Pieces Sent</th>
                <th className="py-3.5 px-4 text-right">Rate/Pc</th>
                <th className="py-3.5 px-4 text-right">Approx Cost</th>
                <th className="py-3.5 px-4">Dispatch & Return Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No vendor jobwork entries found. Click &ldquo;Allot Job Work&rdquo; or create a Road Challan to populate this table.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>
                        <span>{job.vendor_name}</span>
                        {job.phone && <p className="text-[10px] text-slate-400 font-normal">{job.phone}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {job.process.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {job.batch_no}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      {job.article}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-white text-sm">
                      {job.pieces_sent}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                      ₹{job.rate_per_piece}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {formatINR(job.total_approx_cost)}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-400">Sent:</span> {job.dispatch_date}
                        {job.expected_return_date && (
                          <p className="text-slate-400">
                            <span className="text-amber-400 font-semibold">Exp:</span> {job.expected_return_date}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : job.status === 'partially_received'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleWhatsAppCheckIn(job)}
                          title="WhatsApp Vendor for Status"
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>

                        {job.status !== 'completed' && (
                          <button
                            onClick={() => {
                              const ret = prompt(`Enter pieces returned for ${job.batch_no} (Sent: ${job.pieces_sent}):`, String(job.pieces_sent));
                              if (ret !== null) {
                                const retQty = Number(ret) || 0;
                                updateOutsideJobWork(job.id, {
                                  pieces_returned: retQty,
                                  variance: job.pieces_sent - retQty,
                                  status: retQty >= job.pieces_sent ? 'completed' : 'partially_received',
                                  actual_return_date: new Date().toISOString().split('T')[0],
                                });
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700"
                          >
                            Receive
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Delete vendor record for ${job.vendor_name} (${job.batch_no})?`)) {
                              deleteOutsideJobWork(job.id);
                            }
                          }}
                          title="Delete Record"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Allot Job Work */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Allot Job Work to Outside Vendor
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAllotment} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Vendor / Job Worker Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Screen Printers"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Vendor Phone #</label>
                  <input
                    type="text"
                    placeholder="+91 98..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Process Type</label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="screen_printing">Screen Printing</option>
                    <option value="digital_printing">Digital Printing</option>
                    <option value="making">Making / Stitching</option>
                    <option value="embroidery">Embroidery</option>
                    <option value="dyeing">Dyeing</option>
                    <option value="ironing">Ironing & Finishing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Batch / Lot # Allotted *</label>
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
                  <label className="font-semibold text-slate-300">Article / Garment Style</label>
                  <input
                    type="text"
                    placeholder="Round Neck Tee"
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Pieces Sent *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="100"
                    value={piecesSent}
                    onChange={(e) => setPiecesSent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Rate / Piece (₹)</label>
                  <input
                    type="number"
                    placeholder="15.00"
                    value={ratePerPiece}
                    onChange={(e) => setRatePerPiece(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Dispatch Date</label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Expected Return Date</label>
                  <input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30"
                >
                  Record Vendor Allotment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
