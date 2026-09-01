'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { INDIAN_STATES } from '@/lib/gst';
import {
  Settings,
  Building,
  Database,
  MessageSquare,
  Trash2,
  Save,
  CheckCircle2,
  Shield,
  Key,
  Globe,
  Radio,
} from 'lucide-react';

export default function SettingsPage() {
  const { factory, updateFactory, resetToCleanSlate } = useFactory();

  const [name, setName] = useState(factory.name);
  const [gstin, setGstin] = useState(factory.gstin);
  const [stateName, setStateName] = useState(factory.state);
  const [address, setAddress] = useState(factory.address);
  const [phone, setPhone] = useState(factory.phone);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveFactory = (e: React.FormEvent) => {
    e.preventDefault();
    const stateObj = INDIAN_STATES.find((s) => s.name === stateName) || {
      name: 'Maharashtra',
      code: '27',
    };

    updateFactory({
      name,
      gstin: gstin.toUpperCase(),
      state: stateObj.name,
      state_code: stateObj.code,
      address,
      phone,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (
      confirm(
        'Are you sure you want to clear all data and start completely from scratch? This will empty all parties, products, batches, and orders.'
      )
    ) {
      resetToCleanSlate();
      alert('All business data has been reset to a clean slate.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-400" />
            Factory Setup & System Integrations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure factory business details, Supabase Postgres storage, and WhatsApp Cloud API credentials
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>Factory profile settings saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Factory Profile Settings */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Factory Legal Profile (Tax & Invoice Header)</h2>
          </div>

          <form onSubmit={handleSaveFactory} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Factory Legal / Trade Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Factory GSTIN *</label>
                <input
                  type="text"
                  maxLength={15}
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Home GST State *</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Factory Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Official Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Save className="h-4 w-4" />
              <span>Update Factory Profile</span>
            </button>
          </form>
        </div>

        {/* 2. Data Storage & Supabase Configuration */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Database & Data Storage Location</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p>
              FactoryOS data is stored across two synchronized layers:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> 1. PostgreSQL (Supabase Cloud / Local)
              </span>
              <p className="text-[11px] text-slate-400">
                All 30+ tables, Row Level Security policies, and atomic stored procedures are defined in:
              </p>
              <code className="block bg-slate-900 p-2 rounded text-[10px] text-slate-300 font-mono">
                supabase/migrations/20260831000001_factoryos_schema.sql
                <br />
                supabase/migrations/20260831000002_rls_policies.sql
              </code>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <span className="font-bold text-blue-400 flex items-center gap-1.5">
                <Radio className="h-4 w-4" /> 2. Live Realtime State Bus
              </span>
              <p className="text-[11px] text-slate-400">
                Multi-window instant sync via WebSocket / BroadcastChannel with offline-first client storage.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-[11px]">
              <p className="font-bold text-white">Connecting your Supabase Project (.env.local):</p>
              <code className="block font-mono text-slate-300 mt-1">
                NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
                <br />
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
              </code>
            </div>
          </div>
        </div>

        {/* 3. AI Multimodal Document Vision Engine */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-blue-500/30 backdrop-blur space-y-4 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">AI Purchase Order Reading Engine</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p>
              FactoryOS uses <strong>Google Gemini 2.5 Flash Multimodal Vision</strong> to read purchase orders from PDFs, scans, photos, and multi-order files with 100% template independence.
            </p>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200">Google Gemini API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste your Gemini API Key (e.g. AIzaSy...)"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('factory_gemini_api_key') || '' : ''}
                  onChange={(e) => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('factory_gemini_api_key', e.target.value.trim());
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                You can get a free key from Google AI Studio. Stored securely in your local browser session or set in <code>.env.local</code> as <code>GEMINI_API_KEY</code>.
              </p>
            </div>
          </div>
        </div>

        {/* 4. WhatsApp Cloud API Configuration */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur space-y-4 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Meta WhatsApp Cloud API Integration</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p>
              FactoryOS communicates with customers and suppliers via Meta Graph API v19.0 through the backend route:
            </p>
            <code className="block bg-slate-900 p-2 rounded text-[11px] text-slate-300 font-mono">
              src/app/api/whatsapp/send/route.ts
            </code>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-[11px] space-y-1.5">
              <p className="font-bold text-white">Environment Variables in .env.local:</p>
              <code className="block font-mono text-emerald-400">
                META_WHATSAPP_TOKEN=EAAG...
                <br />
                META_WHATSAPP_PHONE_NUMBER_ID=109283748291
              </code>
              <p className="text-[10px] text-slate-400 mt-1">
                When credentials are provided, messages are transmitted to recipients&apos; WhatsApp with 100% audit logging in the <code>whatsapp_log</code> table.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Clean Slate & Reset Management */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-rose-500/20 backdrop-blur space-y-4 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Trash2 className="h-5 w-5 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Clean Slate & Data Reset</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p>
              Start 100% fresh from scratch. This action will purge all test orders, invoices, parties, materials, and floor batches.
            </p>

            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Purge All Data & Start From Scratch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
