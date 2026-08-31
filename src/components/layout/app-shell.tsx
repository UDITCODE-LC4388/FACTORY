'use client';

import React, { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { VoiceModal } from '../modals/voice-modal';
import { QRScannerModal } from '../modals/qr-scanner-modal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Factory, ShoppingCart, Boxes, Mic, QrCode } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const pathname = usePathname();

  const mobileTabs = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Floor', href: '/make/batches', icon: Factory },
    { label: 'Sales', href: '/sell/orders', icon: ShoppingCart },
    { label: 'Stock', href: '/inventory/materials', icon: Boxes },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header onOpenVoice={() => setIsVoiceOpen(true)} onOpenQR={() => setIsQROpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile Operator Bottom Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 backdrop-blur px-4 py-2 flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {/* Quick Voice mic button for mobile operators */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400"
        >
          <div className="p-1.5 rounded-full bg-rose-500/15">
            <Mic className="h-4 w-4" />
          </div>
          <span>Voice</span>
        </button>
      </div>

      {/* Universal Modals */}
      <VoiceModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      <QRScannerModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />
    </div>
  );
}
