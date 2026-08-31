'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Search,
  Phone,
  History,
  ExternalLink,
  Sparkles,
  Key,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { openWhatsAppInstant, WhatsAppTemplates } from '@/lib/whatsapp';

export default function WhatsAppHubPage() {
  const { whatsAppLogs, sendWhatsAppNotification, parties, factory } = useFactory();
  const [recipientPhone, setRecipientPhone] = useState('+91 98111 22334');
  const [recipientName, setRecipientName] = useState('FabIndia Overseas');
  const [message, setMessage] = useState(
    'Namaste! Your batch of 250 Classic Crew Neck T-Shirts has completed QC and is packed for dispatch.'
  );
  const [activeTemplate, setActiveTemplate] = useState('custom');
  const [isSendingCloud, setIsSendingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);

  const handleApplyTemplate = (type: string) => {
    setActiveTemplate(type);
    if (type === 'invoice') {
      setMessage(
        WhatsAppTemplates.invoice({
          customerName: recipientName || 'Valued Customer',
          invoiceNo: 'INV-2026-001',
          totalAmount: '45,000',
          factoryName: factory.name || 'Manisha Garments',
          date: new Date().toISOString().split('T')[0],
          paymentStatus: 'unpaid',
        })
      );
    } else if (type === 'challan') {
      setMessage(
        WhatsAppTemplates.roadChallan({
          vendorName: recipientName || 'Apex Screen Printers',
          challanNo: 'CH-2601',
          processType: 'screen_printing',
          totalPcs: 200,
          factoryName: factory.name || 'Manisha Garments',
          date: new Date().toISOString().split('T')[0],
        })
      );
    } else if (type === 'order') {
      setMessage(
        WhatsAppTemplates.saleOrder({
          customerName: recipientName || 'Customer',
          orderNo: 'SO-2026-012',
          itemCount: 4,
          totalAmount: '84,000',
          factoryName: factory.name || 'Manisha Garments',
        })
      );
    } else if (type === 'payment') {
      setMessage(
        WhatsAppTemplates.paymentReceipt({
          customerName: recipientName || 'Customer',
          amount: '25,000',
          paymentMode: 'UPI',
          refNo: 'UPI918237192',
          factoryName: factory.name || 'Manisha Garments',
        })
      );
    }
  };

  const handleOpenDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone || !message) return;
    openWhatsAppInstant(recipientPhone, message);
    sendWhatsAppNotification(recipientPhone, recipientName, message, 'manual');
  };

  const handleSendCloudApi = async () => {
    if (!recipientPhone || !message) return;
    setIsSendingCloud(true);
    setCloudStatus(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          recipientName,
          message,
          refTable: 'manual',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCloudStatus('Message dispatched via Meta Cloud API!');
        sendWhatsAppNotification(recipientPhone, recipientName, message, 'manual');
      } else {
        setCloudStatus(data.error || 'Meta API error. Use 1-Click WhatsApp to send directly.');
      }
    } catch {
      setCloudStatus('Server error. Use 1-Click WhatsApp to send directly.');
    } finally {
      setIsSendingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-400" />
            WhatsApp Notification & Dispatch Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Instant 1-Click WhatsApp Chat (Zero API needed) + Optional Meta Cloud API automated background engine
          </p>
        </div>
      </div>

      {/* API Explainer Info Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-400" />
            Option 1: 1-Click WhatsApp (No API Key Required &bull; Free)
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Opens WhatsApp Web or mobile app instantly with the prefilled customer message. Works 100% out of the box with zero setup, no Meta approvals, and no cost.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
          <span className="font-bold text-blue-300 flex items-center gap-1.5">
            <Key className="h-4 w-4 text-blue-400" />
            Option 2: Meta Cloud API (Automated Server Bot)
          </span>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            To send automated background WhatsApp messages without opening the app, add <code className="text-amber-300">META_WHATSAPP_TOKEN</code> and <code className="text-amber-300">META_WHATSAPP_PHONE_NUMBER_ID</code> to your <code className="text-white">.env.local</code>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trigger / Send Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Send className="h-4 w-4 text-emerald-400" />
            Dispatch WhatsApp Message
          </h2>

          {/* Quick Preset Templates */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 text-[11px]">Pre-Formatted Templates</label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'custom', label: 'Custom' },
                { id: 'invoice', label: 'Tax Invoice' },
                { id: 'challan', label: 'Road Challan' },
                { id: 'order', label: 'Order Confirmed' },
                { id: 'payment', label: 'Payment Receipt' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                    activeTemplate === t.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleOpenDirect} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Select Contact</label>
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
                <option value="">-- Choose Party --</option>
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
                placeholder="+91 98000 00000"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="font-semibold text-slate-300">Message Text *</label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>

            {cloudStatus && (
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-750 text-slate-200 text-xs">
                {cloudStatus}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open in WhatsApp (1-Click &bull; Free)</span>
              </button>

              <button
                type="button"
                onClick={handleSendCloudApi}
                disabled={isSendingCloud}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-blue-400" />
                <span>{isSendingCloud ? 'Sending...' : 'Send via Meta Cloud API'}</span>
              </button>
            </div>
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
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {whatsAppLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No WhatsApp logs dispatched yet. Dispatch an invoice or challan to see logs here.
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
                          {log.ref_table || 'manual'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => openWhatsAppInstant(log.recipient_phone, log.message)}
                            className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-[10px] border border-emerald-500/30 transition"
                          >
                            Resend
                          </button>
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
