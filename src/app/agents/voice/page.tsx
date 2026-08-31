'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { Mic, Sparkles, CheckCircle2, AlertCircle, History, Terminal } from 'lucide-react';
import { VoiceModal } from '@/components/modals/voice-modal';

export default function VoiceConsolePage() {
  const { voiceLogs } = useFactory();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mic className="h-6 w-6 text-rose-400" />
            Floor Voice Assistant & AI Intent Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Mobile-first voice interface executing transactional Move &rarr; Receive &rarr; Scrap commands through identical server RLS functions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition self-start sm:self-auto"
        >
          <Mic className="h-4 w-4" />
          <span>Launch Voice Mic</span>
        </button>
      </div>

      {/* Info Card on Supported Phrases */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/20 backdrop-blur space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white">Supported Voice Commands (English & Hinglish)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
            <span className="font-bold text-blue-400 block mb-1">1. Stage Move Transfers:</span>
            <p className="text-slate-300 font-mono text-[11px]">&ldquo;Move batch 2601 to washing 248 pieces&rdquo;</p>
            <p className="text-slate-400 text-[10px] mt-1">Initiates transfer with awaiting_receive state</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">2. Destination Receive:</span>
            <p className="text-slate-300 font-mono text-[11px]">&ldquo;Receive incoming transfer at Stitching&rdquo;</p>
            <p className="text-slate-400 text-[10px] mt-1">Confirms physical receipt & advances batch stage</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
            <span className="font-bold text-rose-400 block mb-1">3. Scrap / Write-Offs:</span>
            <p className="text-slate-300 font-mono text-[11px]">&ldquo;Write off 2 pieces in cutting for hole defect&rdquo;</p>
            <p className="text-slate-400 text-[10px] mt-1">Logs defect reason & deducts on-hand quantity</p>
          </div>
        </div>
      </div>

      {/* Voice Execution Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-850/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-rose-400" />
            Voice Command Execution History
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {voiceLogs.length} total commands
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Spoken Voice Transcript</th>
                <th className="py-3.5 px-4">Action Taken by Backend</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {voiceLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                    No voice commands executed yet. Click &ldquo;Launch Voice Mic&rdquo; to test natural speech input.
                  </td>
                </tr>
              ) : (
                voiceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white max-w-sm">
                      &ldquo;{log.transcript}&rdquo;
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {log.action_taken}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          log.status === 'executed'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : log.status === 'needs_review'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
