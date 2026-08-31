'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { MessageSquare, Send, CheckCircle2, Search, Phone, History } from 'lucide-react';

export default function WhatsAppHubPage() {
  const { whatsAppLogs, sendWhatsAppNotification, parties } = useFactory();
  const [recipientPhone, setRecipientPhone] = useState('+91 98111 22334');
  const [recipientName, setRecipientName] = useState('FabIndia Overseas');
  const [message, setMessage] = useState(
    'Namaste! Your batch of 250 Classic Crew Neck T-Shirts has completed QC and is packed for dispatch.'
  );

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone || !message) return;

    sendWhatsAppNotification(recipientPhone, recipientName, message, 'manual');
    alert(`WhatsApp message queued and sent to ${recipientName} (${recipientPhone})!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-400" />
            WhatsApp Cloud API Notification Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated event triggers for invoice deliveries, order confirmations, vendor POs, and floor delay alerts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trigger / Send Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Send className="h-4 w-4 text-emerald-400" />
            Send Direct WhatsApp Alert
          </h2>

          <form onSubmit={handleSendCustom} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Quick Select Party</label>
              <select
                onChange={(e) => {
                  const party = parties.find((p) => p.id === e.target.value);
                  if (party) {
                    setRecipientName(party.name);
                    setRecipientPhone(party.phone);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select contact...</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Recipient Phone *</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Message Content *</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
            >
              <Send className="h-4 w-4" />
              <span>Send WhatsApp Message</span>
            </button>
          </form>
        </div>

        {/* Live Notification Audit Log Table */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 lg:col-span-2 shadow">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              WhatsApp Message Dispatch Logs
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {whatsAppLogs.length} total logged
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-850/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-750">
                  <tr>
                    <th className="py-2.5 px-3">Sent Time</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Message Snippet</th>
                    <th className="py-2.5 px-3">Trigger Table</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {whatsAppLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No WhatsApp logs dispatched yet. Convert an invoice or order to trigger automated WhatsApps.
                      </td>
                    </tr>
                  ) : (
                    whatsAppLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div>
                            <span>{log.recipient_name || 'Contact'}</span>
                            <p className="text-[10px] text-slate-400 font-normal">{log.recipient_phone}</p>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                          {log.message}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                          {log.ref_table || 'direct'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Sent &bull; 200 OK
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
