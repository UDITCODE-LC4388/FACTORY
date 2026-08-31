'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import {
  Factory as FactoryIcon,
  UserCheck,
  Radio,
  Mic,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
  QrCode,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

export function Header({ onOpenVoice, onOpenQR }: { onOpenVoice?: () => void; onOpenQR?: () => void }) {
  const { factory, profiles, currentProfile, switchProfile } = useFactory();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'master':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'helper':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'accountant':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'purchase':
        return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
      case 'supervisor':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'operator':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'inventory_manager':
        return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Factory Brand & Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FactoryIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
                FactoryOS
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-500" />
                Live Realtime
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-xs">
              {factory.name} &bull; GST: {factory.gstin}
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* QR Scan Quick Button */}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Scan Floor QR Code"
          >
            <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">QR Scan</span>
          </button>

          {/* Voice Assistant Trigger */}
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 transition-colors"
            title="Voice Floor Command"
          >
            <Mic className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Voice Floor</span>
          </button>

          {/* Settings / Factory Config */}
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Factory Setup & Integrations"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition"
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[160px]">
                    {currentProfile.full_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] uppercase font-bold rounded border ${getRoleBadgeColor(
                      currentProfile.role
                    )}`}
                  >
                    {currentProfile.role}
                  </span>
                </div>
                {currentProfile.assigned_department && (
                  <p className="text-[10px] text-slate-400">
                    Dept: {currentProfile.assigned_department}
                  </p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Role & Permission Switcher
                  </p>
                  <p className="text-xs text-slate-500">
                    Switch context to test RLS and department views
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchProfile(p.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        p.id === currentProfile.id
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : ''
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {p.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {p.phone} {p.assigned_department ? `• ${p.assigned_department}` : ''}
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] uppercase font-bold rounded border ${getRoleBadgeColor(
                          p.role
                        )}`}
                      >
                        {p.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
