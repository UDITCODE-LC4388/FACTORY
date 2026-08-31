'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { QrCode, X, ArrowRight, CheckCircle2, ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QRScannerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { batches } = useFactory();
  const [scannedBatchNo, setScannedBatchNo] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!isOpen) {
      setScannedBatchNo('');
      setCameraActive(false);
      return;
    }

    let isMounted = true;

    // Dynamically initialize html5-qrcode
    import('html5-qrcode')
      .then(({ Html5QrcodeScanner }) => {
        if (!isMounted) return;
        try {
          const scanner = new Html5QrcodeScanner(
            'reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          scannerRef.current = scanner;
          setCameraActive(true);

          scanner.render(
            (decodedText) => {
              // Extract batch number if it is a URL or raw text
              const match = decodedText.match(/BATCH-[0-9a-zA-Z]+/i) || [decodedText];
              const batchCode = match[0].toUpperCase();
              setScannedBatchNo(batchCode);
              scanner.clear().catch(() => {});
            },
            () => {
              // scan error / waiting for QR
            }
          );
        } catch {
          setCameraActive(false);
        }
      })
      .catch(() => {
        setCameraActive(false);
      });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          (scannerRef.current as { clear: () => Promise<void> }).clear().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  const handleOpenBatch = (batchNo: string) => {
    onClose();
    router.push(`/make/batches?search=${encodeURIComponent(batchNo)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Floor Trolley QR Scanner
              </h3>
              <p className="text-xs text-slate-500">Scan Job Card on Floor Trolley</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center">
          {/* QR Camera Reader Container */}
          <div id="reader" className="w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" />

          {/* Scanned Badge Banner */}
          {scannedBatchNo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Scanned Batch:
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {scannedBatchNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenBatch(scannedBatchNo)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick Select Trolley from Active Batches */}
          <div className="space-y-2 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Or Select Active Trolley:
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {batches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleOpenBatch(b.batch_no)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {b.batch_no}
                    </span>
                    <span className="text-slate-400 ml-2">
                      ({b.current_stage.toUpperCase()}) &bull; {b.current_qty} pcs
                    </span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                    Transfer <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
