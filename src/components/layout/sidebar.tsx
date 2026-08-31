'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFactory } from '@/lib/store/factory-store';
import {
  LayoutDashboard,
  ShoppingCart,
  Factory as MakeIcon,
  Boxes,
  Truck,
  Bot,
  FileSpreadsheet,
  QrCode,
  Layers,
  FileText,
  CreditCard,
  Scissors,
  Calculator,
  MessageSquare,
  Mic,
  PackageCheck,
  ArrowDownToLine,
  Receipt,
  Users,
  Settings,
  Smartphone,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentProfile, batches, saleOrders, invoices } = useFactory();
  const role = currentProfile.role;

  // Real-time badge counts
  const pendingTransfersCount = batches
    .flatMap((b) => b.transfers || [])
    .filter((t) => t.status === 'awaiting_receive').length;
  
  const draftOrdersCount = saleOrders.filter((s) => s.status === 'draft').length;
  const unpaidInvoicesCount = invoices.filter((i) => i.payment_status === 'unpaid').length;

  const sections: NavSection[] = [
    {
      title: 'Operations',
      items: [
        {
          label: 'Dashboard',
          href: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Make (Production Floor)',
      items: [
        {
          label: 'Floor Batches & Trolleys',
          href: '/make/batches',
          icon: MakeIcon,
          badge: `${batches.length}`,
          roles: ['owner', 'master', 'helper', 'supervisor', 'operator', 'inventory_manager'],
        },
        {
          label: 'Stage Transfers & Recv',
          href: '/make/transfers',
          icon: Scissors,
          badge: pendingTransfersCount > 0 ? `${pendingTransfersCount} pending` : undefined,
          roles: ['owner', 'master', 'helper', 'supervisor', 'operator'],
        },
        {
          label: 'Make IQ Jobs',
          href: '/make/jobs',
          icon: Layers,
          roles: ['owner', 'master', 'supervisor'],
        },
        {
          label: 'Road Challans (Job Work)',
          href: '/make/challans',
          icon: Truck,
          roles: ['owner', 'master', 'helper', 'supervisor', 'inventory_manager'],
        },
        {
          label: 'Making & Printing Vendors',
          href: '/make/vendors',
          icon: Users,
          roles: ['owner', 'master', 'supervisor', 'inventory_manager'],
        },
        {
          label: 'Floor Kanban Board',
          href: '/make/kanban',
          icon: Boxes,
          roles: ['owner', 'master', 'helper', 'supervisor', 'operator'],
        },
      ],
    },
    {
      title: 'Sell (Sales & Billing)',
      items: [
        {
          label: 'Sale Orders',
          href: '/sell/orders',
          icon: ShoppingCart,
          badge: draftOrdersCount > 0 ? `${draftOrdersCount} draft` : undefined,
          roles: ['owner', 'master', 'accountant'],
        },
        {
          label: 'GST Invoices',
          href: '/sell/invoices',
          icon: FileText,
          badge: unpaidInvoicesCount > 0 ? `${unpaidInvoicesCount} unpaid` : undefined,
          roles: ['owner', 'accountant'],
        },
        {
          label: 'Payments In',
          href: '/sell/payments',
          icon: CreditCard,
          roles: ['owner', 'accountant'],
        },
        {
          label: 'Parties & Customers',
          href: '/sell/parties',
          icon: Users,
          roles: ['owner', 'master', 'accountant', 'purchase'],
        },
        {
          label: 'Products Catalog',
          href: '/sell/products',
          icon: PackageCheck,
          roles: ['owner', 'master', 'accountant', 'inventory_manager'],
        },
      ],
    },
    {
      title: 'Inventory & BOM',
      items: [
        {
          label: 'Raw Materials',
          href: '/inventory/materials',
          icon: Boxes,
          roles: ['owner', 'master', 'inventory_manager', 'purchase'],
        },
        {
          label: 'BOM Recipes',
          href: '/inventory/bom',
          icon: FileSpreadsheet,
          roles: ['owner', 'master', 'inventory_manager'],
        },
        {
          label: 'Fabric Estimator',
          href: '/inventory/estimator',
          icon: Calculator,
          roles: ['owner', 'master', 'inventory_manager', 'supervisor'],
        },
        {
          label: 'Stock Ledger',
          href: '/inventory/ledger',
          icon: ArrowDownToLine,
          roles: ['owner', 'master', 'inventory_manager', 'accountant'],
        },
      ],
    },
    {
      title: 'Buy (Purchasing)',
      items: [
        {
          label: 'Purchase Orders',
          href: '/buy/orders',
          icon: Truck,
          roles: ['owner', 'master', 'purchase'],
        },
        {
          label: 'Purchase Bills (Stock-In)',
          href: '/buy/bills',
          icon: Receipt,
          roles: ['owner', 'master', 'purchase', 'accountant'],
        },
        {
          label: 'Payments Out',
          href: '/buy/payments',
          icon: CreditCard,
          roles: ['owner', 'purchase', 'accountant'],
        },
      ],
    },
    {
      title: 'Agents & Automation',
      items: [
        {
          label: 'WhatsApp Logs & Alerts',
          href: '/agents/whatsapp',
          icon: MessageSquare,
          roles: ['owner', 'master', 'supervisor', 'accountant'],
        },
        {
          label: 'Voice Floor Assistant',
          href: '/agents/voice',
          icon: Mic,
          roles: ['owner', 'master', 'helper', 'supervisor', 'operator'],
        },
      ],
    },
    {
      title: 'Costing & Reports',
      items: [
        {
          label: 'Live Landed Costing',
          href: '/reports/costing',
          icon: Calculator,
          roles: ['owner', 'master', 'accountant', 'inventory_manager'],
        },
        {
          label: 'Packing Lists',
          href: '/reports/packing',
          icon: PackageCheck,
          roles: ['owner', 'master', 'helper', 'inventory_manager', 'supervisor'],
        },
        {
          label: 'Bulk CSV Importer',
          href: '/reports/import',
          icon: ArrowDownToLine,
          roles: ['owner', 'master', 'accountant', 'inventory_manager'],
        },
      ],
    },
    {
      title: 'Configuration',
      items: [
        {
          label: 'Download Mobile App',
          href: '/download',
          icon: Smartphone,
          roles: ['owner', 'master', 'helper'],
        },
        {
          label: 'Factory Setup & Integrations',
          href: '/settings',
          icon: Settings,
          roles: ['owner', 'master'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hidden md:flex">
      <div className="py-4 px-3 space-y-6 overflow-y-auto max-h-[calc(100vh-65px)]">
        {sections.map((section) => {
          // Filter items based on user role
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5 pt-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Department Status */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Role View</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
