'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { Layers, Plus, Calendar, UserCheck, X } from 'lucide-react';
import { ProductionJob } from '@/types/database.types';

export default function JobsPage() {
  const { productionJobs, parties, createProductionJob, batches, currentProfile } = useFactory();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [jobNo, setJobNo] = useState('');
  const [partyId, setPartyId] = useState('');
  const [targetQty, setTargetQty] = useState('500');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const customerParties = parties.filter((p) => p.type === 'customer' || p.type === 'both');

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    createProductionJob({
      number: jobNo || undefined,
      party_id: partyId || undefined,
      target_qty: Number(targetQty),
      due_date: dueDate,
      notes,
    });

    setIsModalOpen(false);
    setJobNo('');
    setNotes('');
  };

  const canManage = ['owner', 'master', 'supervisor'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-400" />
            Production Jobs (&ldquo;Make IQ&rdquo;)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Internal factory stock runs and client contract manufacturing job orders
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Production Job</span>
          </button>
        )}
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {productionJobs.map((job) => {
          const party = parties.find((p) => p.id === job.party_id);
          const jobBatches = batches.filter((b) => b.production_job_id === job.id);
          const currentPieces = jobBatches.reduce((sum, b) => sum + b.current_qty, 0);

          return (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-sm font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {job.number}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-2">
                    {party ? party.name : 'Internal Factory Stock (Make IQ)'}
                  </h3>
                  {job.due_date && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-slate-500" /> Due: {job.due_date}
                    </p>
                  )}
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    job.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {job.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Target: {job.target_qty} pcs</span>
                  <span className="text-white">Active in Batches: {currentPieces} pcs</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (currentPieces / job.target_qty) * 100)}%` }}
                  />
                </div>
              </div>

              {job.notes && (
                <p className="text-[11px] text-slate-400 italic pt-1">
                  &ldquo;{job.notes}&rdquo;
                </p>
              )}

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
                <span>{jobBatches.length} associated trolleys</span>
                <span className="font-semibold text-blue-400">Manage Job &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                Create New Production Job
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Customer Buyer (Optional)</label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Internal Stock Run (Make IQ — No Client Yet)</option>
                  {customerParties.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Job Reference #</label>
                  <input
                    type="text"
                    placeholder="Auto (e.g. JOB-2026-002)"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Pieces *</label>
                  <input
                    type="number"
                    required
                    value={targetQty}
                    onChange={(e) => setTargetQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Target Delivery Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Job Description & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Seasonal style requirements or specifications..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
