'use client';

import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Send, X, Phone, User, CheckCircle2 } from 'lucide-react';
import { openWhatsAppInstant, formatWhatsAppPhone } from '@/lib/whatsapp';
import { useFactory } from '@/lib/store/factory-store';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone: string;
  defaultName: string;
  defaultMessage: string;
  refTable?: string;
  refId?: string;
}

export function WhatsAppModal({
  isOpen,
  onClose,
  defaultPhone,
  defaultName,
  defaultMessage,
  refTable,
  refId,
}: WhatsAppModalProps) {
  const { sendWhatsAppNotification } = useFactory();

  const [phone, setPhone] = useState(defaultPhone || '');
  const [name, setName] = useState(defaultName || '');
  const [message, setMessage] = useState(defaultMessage || '');
  const [isSendingCloud, setIsSendingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedPhone = formatWhatsAppPhone(phone);

  const handleOpenDirect = () => {
    openWhatsAppInstant(phone, message);
    sendWhatsAppNotification(phone, name, message, refTable, refId);
    onClose();
  };

  const handleSendCloudApi = async () => {
    setIsSendingCloud(true);
    setCloudStatus(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: formattedPhone,
          recipientName: name,
          message,
          refTable,
          refId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCloudStatus('Message dispatched successfully via Cloud API!');
        sendWhatsAppNotification(phone, name, message, refTable, refId);
        setTimeout(() => onClose(), 1200);
      } else {
        setCloudStatus(data.error || 'Meta API error. Please use 1-Click WhatsApp.');
      }
    } catch {
      setCloudStatus('Unable to reach server. Please use 1-Click WhatsApp.');
    } finally {
      setIsSendingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Send WhatsApp Notification</h3>
              <p className="text-[11px] text-slate-400">1-Click Instant Dispatch &bull; No API required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Recipient details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" /> Recipient Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" /> WhatsApp Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98000 00000"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview Bubble */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Message Preview (Editable)</label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {cloudStatus && (
            <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 text-slate-200 text-xs">
              {cloudStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleOpenDirect}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in WhatsApp (Instant 1-Click &bull; Free)</span>
            </button>

            <button
              onClick={handleSendCloudApi}
              disabled={isSendingCloud}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Send className="h-3.5 w-3.5 text-blue-400" />
              <span>{isSendingCloud ? 'Dispatching...' : 'Send via Meta WhatsApp Cloud API (Automated)'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            * <strong>1-Click WhatsApp</strong> opens directly on your phone app or WhatsApp Web with prefilled message. No API key required.<br />
            * <strong>Meta Cloud API</strong> requires `META_WHATSAPP_TOKEN` in `.env.local` for automated server delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
