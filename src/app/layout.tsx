import type { Metadata } from 'next';
import './globals.css';
import { FactoryProvider } from '@/lib/store/factory-store';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'FactoryOS — Integrated Textile & Garment ERP',
  description:
    'Real-time textile and garment production tracking, GST billing, inventory with BOM, and voice floor assistant.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
        <FactoryProvider>
          <AppShell>{children}</AppShell>
        </FactoryProvider>
      </body>
    </html>
  );
}
