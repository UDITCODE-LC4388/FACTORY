'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Download, QrCode, CheckCircle2, Share2, PlusSquare, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

export default function DownloadAppPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [networkUrl, setNetworkUrl] = useState('http://192.168.0.221:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const url = origin.includes('localhost') ? 'http://192.168.0.221:3000' : origin;
      setNetworkUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0f172a',
        },
      }).then(setQrDataUrl);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install on Android Chrome: Tap the three dots (⋮) at the top right and tap "Install app" or "Add to Home screen".\n\nTo install on iPhone Safari: Tap the Share icon (↑) at the bottom and select "Add to Home Screen".'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          FactoryOS Mobile Suite
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Download & Install FactoryOS on Mobile
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Scan the QR code with your phone or tap below to install the native standalone mobile app with QR scanning and voice commands
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="FactoryOS Mobile Install QR Code"
                className="w-52 h-52 rounded-xl"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-600">
                <QrCode className="h-16 w-16 animate-pulse" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Scan with Phone Camera
            </span>
            <p className="font-mono text-xs text-blue-400 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              {networkUrl}
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition transform active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{isInstalled ? 'App Already Installed' : '1-Click Direct Install (PWA APK)'}</span>
          </button>
        </div>

        {/* Installation Instructions */}
        <div className="space-y-4">
          {/* Android Installation */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Smartphone className="h-4 w-4" />
              <span>Android (Instant APK / Chrome PWA)</span>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open <strong className="text-white font-mono">{networkUrl}</strong> in Google Chrome.</li>
              <li>Tap the <strong className="text-white">Three Dots (⋮)</strong> at the top right.</li>
              <li>Select <strong className="text-emerald-400">&ldquo;Install App&rdquo;</strong> or <strong className="text-emerald-400">&ldquo;Add to Home screen&rdquo;</strong>.</li>
              <li>The app icon will install immediately onto your Android home screen and app drawer.</li>
            </ol>
          </div>

          {/* iPhone Installation */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Smartphone className="h-4 w-4" />
              <span>Apple iPhone (iOS Safari)</span>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open <strong className="text-white font-mono">{networkUrl}</strong> in Safari.</li>
              <li>Tap the <strong className="text-white">Share button (↑)</strong> in the bottom bar.</li>
              <li>Scroll down and tap <strong className="text-blue-400">&ldquo;Add to Home Screen&rdquo;</strong> (➕).</li>
              <li>Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> in the top-right corner.</li>
            </ol>
          </div>

          {/* Key Advantages Card */}
          <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p>
              Installed app runs in full-screen standalone mode with offline support, camera QR barcode scanning, and microphone voice commands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
