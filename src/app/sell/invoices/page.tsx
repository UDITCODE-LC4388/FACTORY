'use client';

import React, { useState } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { formatINR } from '@/lib/gst';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  FileCheck,
  Eye,
  X,
  Trash2,
  Printer,
  Plus,
  Edit,
  Truck,
  Building,
  UserCheck,
  Upload,
} from 'lucide-react';
import { Invoice } from '@/types/database.types';
import { WhatsAppModal } from '@/components/common/whatsapp-modal';
import { WhatsAppTemplates } from '@/lib/whatsapp';
import { TaxInvoiceTemplate } from '@/components/billing/tax-invoice-template';
import { CreateInvoiceModal } from '@/components/billing/create-invoice-modal';
import { POUploadModal } from '@/components/billing/po-upload-modal';
import { ASNGeneratorModal } from '@/components/billing/asn-generator-modal';
import Link from 'next/link';

export default function InvoicesPage() {
  const {
    factory,
    invoices,
    parties,
    recordPaymentIn,
    sendWhatsAppNotification,
    deleteInvoice,
    currentProfile,
  } = useFactory();

  const [searchTerm, setSearchTerm] = useState('');
  const [supplyFilter, setSupplyFilter] = useState<'all' | 'direct' | 'through_buyer'>('all');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [asnModalInvoice, setAsnModalInvoice] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPOUploadModalOpen, setIsPOUploadModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    phone: string;
    name: string;
    message: string;
    invoiceId: string;
  } | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.party?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.items?.some((it) => it.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSupply =
      supplyFilter === 'all' ||
      (supplyFilter === 'through_buyer' && inv.is_through_buyer) ||
      (supplyFilter === 'direct' && !inv.is_through_buyer);

    return matchSearch && matchSupply;
  });

  const handleDownloadPDF = async (invoice: Invoice) => {
    const party = parties.find((p) => p.id === invoice.party_id) || invoice.party;
    const buyer = invoice.buyer_party_id ? parties.find((p) => p.id === invoice.buyer_party_id) : invoice.buyer;
    if (!party) return;
    await generateInvoicePDF(invoice, factory, party, buyer);
  };

  const handleOpenWhatsAppModal = (inv: Invoice) => {
    const party = parties.find((p) => p.id === inv.party_id) || inv.party;
    const phone = party?.phone || '+91 98000 00000';
    const partyName = party?.name || 'Valued Customer';
    const msg = WhatsAppTemplates.invoice({
      customerName: partyName,
      invoiceNo: inv.number,
      totalAmount: formatINR(inv.total),
      factoryName: factory.name || 'MANISHA GARMENTS',
      date: inv.date,
    });

    setWhatsAppModalData({
      phone,
      name: partyName,
      message: msg,
      invoiceId: inv.id,
    });
  };

  const canEdit = ['owner', 'master', 'accountant'].includes(currentProfile.role);
  const canRecordPayment = ['owner', 'master', 'accountant'].includes(currentProfile.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-400" />
            GST Tax Invoices & Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Compliant B2B / B2C tax invoices, Direct & Buyer supply modes, and seamless printable templates
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Link
              href="/asn"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
            >
              <Truck className="h-4 w-4" />
              <span>ASN Generator (.DOCX)</span>
            </Link>
            <button
              onClick={() => setIsPOUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Upload PO & Bill (PDF / Image)</span>
            </button>
            <button
              onClick={() => {
                setEditingInvoice(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Manual Bill</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Consignee, Buyer or Item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Supply Filter */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Bills' },
            { id: 'direct', label: 'Direct Supply' },
            { id: 'through_buyer', label: 'Through Buyer' },
          ].map((sf) => (
            <button
              key={sf.id}
              onClick={() => setSupplyFilter(sf.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                supplyFilter === sf.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850/50 text-slate-400 font-semibold">
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Supply Mode</th>
                <th className="py-3 px-4">Consignee & Buyer</th>
                <th className="py-3 px-4">Taxable</th>
                <th className="py-3 px-4">GST Tax</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No tax invoices found. Click &ldquo;Create Tax Invoice&rdquo; or convert orders to create invoices.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const party = parties.find((p) => p.id === inv.party_id) || inv.party;
                  const buyer = inv.buyer_party_id ? parties.find((p) => p.id === inv.buyer_party_id) : inv.buyer;
                  const isThroughBuyer = inv.is_through_buyer;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        <div className="flex flex-col">
                          <span>{inv.number}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{inv.date}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isThroughBuyer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Building className="h-3 w-3" />
                            Through Buyer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <UserCheck className="h-3 w-3" />
                            Direct Supply
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Ship:</span>
                            <span>{party?.name || 'Consignee'}</span>
                            <span className="text-[10.5px] font-mono text-slate-400 font-normal">({party?.state})</span>
                          </div>
                          {isThroughBuyer && buyer && (
                            <div className="flex items-center gap-1 text-[11px] text-purple-300 font-normal mt-0.5">
                              <span className="text-[10px] text-purple-400 font-bold uppercase">Bill:</span>
                              <span>{buyer.name}</span>
                              <span className="text-[10.5px] font-mono text-slate-400 font-normal">({buyer.state})</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatINR(inv.taxable_amount)}
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.cgst > 0 || inv.sgst > 0 ? (
                          <div className="flex flex-col text-[10px] font-mono text-slate-400">
                            <span>CGST: {formatINR(inv.cgst)}</span>
                            <span>SGST: {formatINR(inv.sgst)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-cyan-400 font-bold">
                            IGST: {formatINR(inv.igst)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-emerald-400 text-sm">
                        {formatINR(inv.total)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAsnModalInvoice(inv)}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 transition"
                            title="Generate ASN (.DOCX Shipping Document)"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewInvoice(inv)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition"
                            title="Print / Preview Tax Invoice (Exact Template)"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Download Vector PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingInvoice(inv);
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700 transition"
                              title="Edit Tax Invoice"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenWhatsAppModal(inv)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition"
                            title="Send WhatsApp Invoice Copy"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                            title="Delete Tax Invoice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create / Edit Advanced Tax Invoice Modal */}
      {isCreateModalOpen && (
        <CreateInvoiceModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingInvoice(null);
          }}
          editInvoice={editingInvoice}
          onSuccess={(createdInv, shouldPrint) => {
            if (shouldPrint) {
              setPreviewInvoice(createdInv);
            }
          }}
        />
      )}

      {/* Modal 2: Exact Tax Invoice Print Preview */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[96vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-850/90 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Tax Invoice — {previewInvoice.number} ({previewInvoice.is_through_buyer ? 'Through Buyer' : 'Direct Supply'})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewInvoice)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Exact Paper Invoice Preview Content */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-neutral-900 flex justify-center print:p-0 print:bg-white">
              {(() => {
                const party = parties.find((p) => p.id === previewInvoice.party_id) || previewInvoice.party || parties[0];
                const buyer = previewInvoice.buyer_party_id ? (parties.find((p) => p.id === previewInvoice.buyer_party_id) || previewInvoice.buyer) : undefined;
                return (
                  <TaxInvoiceTemplate
                    invoice={previewInvoice}
                    factory={factory}
                    party={party}
                    buyer={buyer}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: PO Document (PDF / Image) Upload & Instant Billing Modal */}
      {isPOUploadModalOpen && (
        <POUploadModal
          isOpen={isPOUploadModalOpen}
          onClose={() => setIsPOUploadModalOpen(false)}
          onSuccess={(createdInv, shouldPrint) => {
            setIsPOUploadModalOpen(false);
            if (shouldPrint) {
              setPreviewInvoice(createdInv);
            }
          }}
        />
      )}

      {/* Modal 5: WhatsApp Dispatcher */}
      {whatsAppModalData && (
        <WhatsAppModal
          isOpen={!!whatsAppModalData}
          onClose={() => setWhatsAppModalData(null)}
          defaultPhone={whatsAppModalData.phone}
          defaultName={whatsAppModalData.name}
          defaultMessage={whatsAppModalData.message}
          refTable="invoices"
          refId={whatsAppModalData.invoiceId}
        />
      )}

      {/* Modal 6: ASN (.DOCX) Generator Modal */}
      {asnModalInvoice && (
        <ASNGeneratorModal
          isOpen={!!asnModalInvoice}
          onClose={() => setAsnModalInvoice(null)}
          invoice={asnModalInvoice}
          factory={factory}
          parties={parties}
        />
      )}
    </div>
  );
}
