'use client';

import React from 'react';
import { Invoice, Factory, Party } from '@/types/database.types';
import { formatINR, formatIndianNumber, numberToIndianWords } from '@/lib/gst';

interface TaxInvoiceTemplateProps {
  invoice: Invoice;
  factory: Factory;
  party: Party; // Consignee
  buyer?: Party; // Buyer (if through buyer, otherwise defaults to party)
}

export function TaxInvoiceTemplate({
  invoice,
  factory,
  party,
  buyer,
}: TaxInvoiceTemplateProps) {
  // Consignee & Buyer party logic
  const consigneeParty = party;
  const buyerParty = (invoice.is_through_buyer && (buyer || invoice.buyer))
    ? (buyer || invoice.buyer!)
    : party;

  // Determine interstate from factory and destination (buyer's state or consignee's)
  const isInterstate = invoice.igst > 0 || (
    factory.state_code.trim() !== (buyerParty.state_code || consigneeParty.state_code).trim() &&
    Boolean(buyerParty.state_code || consigneeParty.state_code)
  );

  const totalQty = (invoice.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const unitSymbol = invoice.items?.[0]?.unit_symbol || 'PCS';

  // Group items by HSN for Tax Summary Table
  const hsnMap = new Map<
    string,
    {
      hsn: string;
      taxable: number;
      cgstRate: number;
      cgstAmt: number;
      sgstRate: number;
      sgstAmt: number;
      igstRate: number;
      igstAmt: number;
      totalTax: number;
    }
  >();

  (invoice.items || []).forEach((it) => {
    const hsn = it.hsn_code || '610990';
    const existing = hsnMap.get(hsn) || {
      hsn,
      taxable: 0,
      cgstRate: isInterstate ? 0 : it.gst_percent / 2,
      cgstAmt: 0,
      sgstRate: isInterstate ? 0 : it.gst_percent / 2,
      sgstAmt: 0,
      igstRate: isInterstate ? it.gst_percent : 0,
      igstAmt: 0,
      totalTax: 0,
    };

    existing.taxable += it.taxable_value || 0;
    existing.cgstAmt += it.cgst || 0;
    existing.sgstAmt += it.sgst || 0;
    existing.igstAmt += it.igst || 0;
    existing.totalTax += (it.cgst || 0) + (it.sgst || 0) + (it.igst || 0);

    hsnMap.set(hsn, existing);
  });

  const hsnSummaryList = Array.from(hsnMap.values());
  const totalTaxAmount = invoice.cgst + invoice.sgst + invoice.igst;
  const amountInWords = numberToIndianWords(invoice.total);
  const taxInWords = numberToIndianWords(totalTaxAmount);

  // Bank Details Snapshot
  const bankName = invoice.bank_name || factory.bank_name || 'UNION BANK OF INDIA C/A';
  const bankAccount = invoice.bank_account_no || factory.bank_account_no || '397001010230872';
  const bankBranchIfsc = invoice.bank_branch_ifsc || factory.bank_branch_ifsc || 'M.G.ROAD KOLKTA & UBIN0539708';
  const companyPan = factory.pan || 'AGGPB3696R';

  return (
    <div
      id="tax-invoice-printable"
      className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans text-[11px] leading-[1.3] border border-black shadow-sm print:border-black print:shadow-none print:w-full print:max-w-none print:m-0"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Title */}
      <div className="text-center font-bold text-sm sm:text-base border-b border-black py-1 tracking-wide">
        Tax Invoice
      </div>

      {/* Top 2-Column Grid: Left (Seller) & Right (Metadata Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-black">
        {/* Left Column: Seller / Factory */}
        <div className="sm:col-span-6 p-2 sm:p-3 border-b sm:border-b-0 sm:border-r border-black flex flex-col justify-start">
          <div className="font-extrabold text-sm sm:text-[13px] uppercase tracking-tight text-black mb-1">
            {factory.name || 'MANISHA GARMENTS'}
          </div>
          <div className="whitespace-pre-line text-[10.5px] leading-tight text-neutral-800">
            {factory.address || 'NA,34-35/2/1 SITA RAM SUPER MARKET\nSRI AUROBINDRA ROAD ,SALKIA\nHOWRAH-711106'}
          </div>
          <div className="mt-2 text-[11px]">
            <span className="font-bold">GSTIN/UIN: </span>
            <span className="font-mono font-semibold">{factory.gstin || '19AGGPB3696R1ZM'}</span>
          </div>
          <div className="text-[11px]">
            <span className="font-bold">State Name : </span>
            <span>{factory.state || 'West Bengal'}</span>
            <span>, Code : </span>
            <span className="font-mono font-semibold">{factory.state_code || '19'}</span>
          </div>
        </div>

        {/* Right Column: Metadata Grid */}
        <div className="sm:col-span-6 grid grid-cols-2 text-[10.5px]">
          {/* Row 1 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Invoice No.</div>
            <div className="font-bold font-mono text-[11.5px]">{invoice.number}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Dated</div>
            <div className="font-bold">{invoice.date}</div>
          </div>

          {/* Row 2 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Delivery Note</div>
            <div>{invoice.delivery_note || ''}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Mode/Terms of Payment</div>
            <div className="capitalize">{invoice.sale_type || 'Credit'}</div>
          </div>

          {/* Row 3 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Supplier’s Ref.</div>
            <div className="font-mono">{invoice.supplier_ref || invoice.number}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Other Reference(s)</div>
            <div>{invoice.other_references || ''}</div>
          </div>

          {/* Row 4 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Buyer’s Order No.</div>
            <div className="font-semibold">{invoice.buyer_order_no || ''}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Dated</div>
            <div>{invoice.buyer_order_date || ''}</div>
          </div>

          {/* Row 5 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Despatch Document No.</div>
            <div>{invoice.despatch_doc_no || ''}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Delivery Note Date</div>
            <div>{invoice.delivery_note_date || ''}</div>
          </div>

          {/* Row 6 */}
          <div className="p-1.5 border-b border-r border-black">
            <div className="text-[9.5px] text-neutral-600">Despatched through</div>
            <div>{invoice.despatched_through || ''}</div>
          </div>
          <div className="p-1.5 border-b border-black">
            <div className="text-[9.5px] text-neutral-600">Destination</div>
            <div>{invoice.destination || consigneeParty.state || ''}</div>
          </div>

          {/* Row 7: Terms of Delivery */}
          <div className="col-span-2 p-1.5">
            <div className="text-[9.5px] text-neutral-600">Terms of Delivery</div>
            <div className="font-semibold whitespace-pre-line text-[10.5px]">
              {invoice.terms_of_delivery || (isInterstate ? `PLACE OF SUPPLY\n${buyerParty.state?.toUpperCase() || ''}` : '')}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Consignee & Buyer */}
      <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-black">
        {/* Consignee (Ship To) */}
        <div className="sm:col-span-6 p-2 sm:p-3 border-b sm:border-b-0 sm:border-r border-black">
          <div className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider mb-0.5">
            Consignee
          </div>
          <div className="font-extrabold text-[12px] uppercase">
            {consigneeParty.name}
          </div>
          <div className="whitespace-pre-line text-[10.5px] text-neutral-800 mt-0.5 leading-tight">
            {consigneeParty.address || 'Address on file'}
          </div>
          <div className="mt-1 text-[10.5px]">
            <span className="font-bold">GSTIN/UIN : </span>
            <span className="font-mono font-semibold">{consigneeParty.gstin || 'UNREGISTERED'}</span>
          </div>
          <div className="text-[10.5px]">
            <span className="font-bold">State Name : </span>
            <span>{consigneeParty.state}</span>
            <span>, Code : </span>
            <span className="font-mono font-semibold">{consigneeParty.state_code}</span>
          </div>
        </div>

        {/* Buyer (if other than consignee) */}
        <div className="sm:col-span-6 p-2 sm:p-3">
          <div className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider mb-0.5">
            Buyer (if other than consignee)
          </div>
          <div className="font-extrabold text-[12px] uppercase">
            {buyerParty.name}
          </div>
          <div className="whitespace-pre-line text-[10.5px] text-neutral-800 mt-0.5 leading-tight">
            {buyerParty.address || consigneeParty.address || 'Address on file'}
          </div>
          <div className="mt-1 text-[10.5px]">
            <span className="font-bold">GSTIN/UIN : </span>
            <span className="font-mono font-semibold">{buyerParty.gstin || consigneeParty.gstin || 'UNREGISTERED'}</span>
          </div>
          <div className="text-[10.5px]">
            <span className="font-bold">State Name : </span>
            <span>{buyerParty.state || consigneeParty.state}</span>
            <span>, Code : </span>
            <span className="font-mono font-semibold">{buyerParty.state_code || consigneeParty.state_code}</span>
          </div>
        </div>
      </div>

      {/* Main Goods & Items Table */}
      <div className="border-b border-black">
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b border-black font-bold text-center">
              <th className="border-r border-black p-1.5 w-8">Sl<br />No.</th>
              <th className="border-r border-black p-1.5 text-left">Description of Goods</th>
              <th className="border-r border-black p-1.5 w-16">HSN/SAC</th>
              <th className="border-r border-black p-1.5 w-20">Quantity</th>
              <th className="border-r border-black p-1.5 w-16 text-right">Rate</th>
              <th className="border-r border-black p-1.5 w-12">per</th>
              <th className="border-r border-black p-1.5 w-12">Disc. %</th>
              <th className="p-1.5 w-24 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent">
            {/* Line Items */}
            {(invoice.items || []).map((item, idx) => (
              <tr key={item.id || idx} className="align-top">
                <td className="border-r border-black p-1.5 text-center font-bold">{idx + 1}</td>
                <td className="border-r border-black p-1.5 font-bold uppercase whitespace-pre-line leading-tight">
                  <div>{item.description}</div>
                </td>
                <td className="border-r border-black p-1.5 text-center font-mono">{item.hsn_code}</td>
                <td className="border-r border-black p-1.5 text-right font-bold font-mono">
                  {formatIndianNumber(item.qty, 3)} {item.unit_symbol || 'PCS'}
                </td>
                <td className="border-r border-black p-1.5 text-right font-mono">
                  {formatIndianNumber(item.price, 2)}
                </td>
                <td className="border-r border-black p-1.5 text-center">{item.unit_symbol || 'PCS'}</td>
                <td className="border-r border-black p-1.5 text-center font-mono">
                  {item.discount_percent && item.discount_percent > 0 ? `${item.discount_percent} %` : ''}
                </td>
                <td className="p-1.5 text-right font-bold font-mono">
                  {formatIndianNumber(item.taxable_value, 2)}
                </td>
              </tr>
            ))}

            {/* Sub-Rows: GST Taxes & Round Off (Displayed inside the table body as in the sample bills) */}
            {isInterstate ? (
              <tr className="align-top">
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5 font-bold text-right pr-4 italic">
                  OUTPUT IGST 5%
                </td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5 text-right font-mono">5 %</td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="p-1.5 text-right font-mono font-bold">
                  {formatIndianNumber(invoice.igst, 2)}
                </td>
              </tr>
            ) : (
              <>
                <tr className="align-top">
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5 font-bold text-right pr-4 italic">
                    OUTPUT CGST 2.5%
                  </td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5 text-right font-mono">2.50 %</td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="p-1.5 text-right font-mono font-bold">
                    {formatIndianNumber(invoice.cgst, 2)}
                  </td>
                </tr>
                <tr className="align-top">
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5 font-bold text-right pr-4 italic">
                    OUTPUT SGST 2.5%
                  </td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5 text-right font-mono">2.50 %</td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="border-r border-black p-1.5"></td>
                  <td className="p-1.5 text-right font-mono font-bold">
                    {formatIndianNumber(invoice.sgst, 2)}
                  </td>
                </tr>
              </>
            )}

            {/* Round Off sub-row if present */}
            {typeof invoice.round_off === 'number' && invoice.round_off !== 0 && (
              <tr className="align-top">
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5 text-neutral-800">
                  <span className="text-[10px]">Less : </span>
                  <span className="font-bold">R/OFF</span>
                </td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="border-r border-black p-1.5"></td>
                <td className="p-1.5 text-right font-mono font-semibold">
                  {invoice.round_off < 0 ? `(-)${Math.abs(invoice.round_off).toFixed(2)}` : `(+)${invoice.round_off.toFixed(2)}`}
                </td>
              </tr>
            )}

            {/* Spacer for realistic paper invoice height */}
            <tr className="h-16">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td></td>
            </tr>

            {/* Total Row */}
            <tr className="border-t border-black font-bold text-[11.5px]">
              <td className="border-r border-black p-1.5"></td>
              <td className="border-r border-black p-1.5 text-right pr-4 uppercase">Total</td>
              <td className="border-r border-black p-1.5"></td>
              <td className="border-r border-black p-1.5 text-right font-mono">
                {formatIndianNumber(totalQty, 3)} {unitSymbol}
              </td>
              <td className="border-r border-black p-1.5"></td>
              <td className="border-r border-black p-1.5"></td>
              <td className="border-r border-black p-1.5"></td>
              <td className="p-1.5 text-right font-mono text-[12px]">
                ₹ {formatIndianNumber(invoice.total, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words & E. & O.E */}
      <div className="p-2 border-b border-black flex justify-between items-start text-[11px]">
        <div>
          <div className="text-[10px] text-neutral-600">Amount Chargeable (in words)</div>
          <div className="font-extrabold text-[11.5px] uppercase tracking-tight mt-0.5">
            {amountInWords}
          </div>
        </div>
        <div className="font-bold text-[10.5px]">E. & O.E</div>
      </div>

      {/* Tax Analysis / HSN Breakdown Table */}
      <div className="border-b border-black">
        {isInterstate ? (
          // Inter-State (IGST) Tax Table
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black font-bold text-center">
                <th className="border-r border-black p-1 text-left w-32">HSN/SAC</th>
                <th className="border-r border-black p-1 text-right w-28">Taxable<br />Value</th>
                <th className="border-r border-black p-1" colSpan={2}>
                  Integrated Tax
                  <div className="grid grid-cols-2 border-t border-black mt-0.5 pt-0.5">
                    <span className="border-r border-black">Rate</span>
                    <span>Amount</span>
                  </div>
                </th>
                <th className="p-1 text-right w-28">Total<br />Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummaryList.map((row, idx) => (
                <tr key={idx} className="border-b border-black/40 font-mono text-center">
                  <td className="border-r border-black p-1 text-left">{row.hsn}</td>
                  <td className="border-r border-black p-1 text-right">{formatIndianNumber(row.taxable, 2)}</td>
                  <td className="border-r border-black p-1">{row.igstRate}%</td>
                  <td className="border-r border-black p-1 text-right">{formatIndianNumber(row.igstAmt, 2)}</td>
                  <td className="p-1 text-right font-bold">{formatIndianNumber(row.totalTax, 2)}</td>
                </tr>
              ))}
              <tr className="font-bold font-mono text-[10.5px] border-t border-black">
                <td className="border-r border-black p-1 text-right font-sans uppercase">Total</td>
                <td className="border-r border-black p-1 text-right">{formatIndianNumber(invoice.taxable_amount, 2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1 text-right">{formatIndianNumber(invoice.igst, 2)}</td>
                <td className="p-1 text-right">{formatIndianNumber(invoice.igst, 2)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          // Intra-State (CGST + SGST) Tax Table
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-black font-bold text-center">
                <th className="border-r border-black p-1 text-left w-24">HSN/SAC</th>
                <th className="border-r border-black p-1 text-right w-24">Taxable<br />Value</th>
                <th className="border-r border-black p-1" colSpan={2}>
                  Central Tax
                  <div className="grid grid-cols-2 border-t border-black mt-0.5 pt-0.5">
                    <span className="border-r border-black">Rate</span>
                    <span>Amount</span>
                  </div>
                </th>
                <th className="border-r border-black p-1" colSpan={2}>
                  State Tax
                  <div className="grid grid-cols-2 border-t border-black mt-0.5 pt-0.5">
                    <span className="border-r border-black">Rate</span>
                    <span>Amount</span>
                  </div>
                </th>
                <th className="p-1 text-right w-24">Total<br />Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummaryList.map((row, idx) => (
                <tr key={idx} className="border-b border-black/40 font-mono text-center">
                  <td className="border-r border-black p-1 text-left">{row.hsn}</td>
                  <td className="border-r border-black p-1 text-right">{formatIndianNumber(row.taxable, 2)}</td>
                  <td className="border-r border-black p-1">{row.cgstRate.toFixed(2)}%</td>
                  <td className="border-r border-black p-1 text-right">{formatIndianNumber(row.cgstAmt, 2)}</td>
                  <td className="border-r border-black p-1">{row.sgstRate.toFixed(2)}%</td>
                  <td className="border-r border-black p-1 text-right">{formatIndianNumber(row.sgstAmt, 2)}</td>
                  <td className="p-1 text-right font-bold">{formatIndianNumber(row.totalTax, 2)}</td>
                </tr>
              ))}
              <tr className="font-bold font-mono text-[10.5px] border-t border-black">
                <td className="border-r border-black p-1 text-right font-sans uppercase">Total</td>
                <td className="border-r border-black p-1 text-right">{formatIndianNumber(invoice.taxable_amount, 2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1 text-right">{formatIndianNumber(invoice.cgst, 2)}</td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1 text-right">{formatIndianNumber(invoice.sgst, 2)}</td>
                <td className="p-1 text-right">{formatIndianNumber(totalTaxAmount, 2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Tax Amount in words */}
      <div className="p-1.5 border-b border-black text-[10.5px]">
        <span className="font-bold">Tax Amount (in words) : </span>
        <span className="font-semibold">{taxInWords}</span>
      </div>

      {/* Footer Block: Company PAN, Declaration, Bank Details, and Authorised Signatory */}
      <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-black">
        {/* Left Footer: PAN, Declaration, Bank Details */}
        <div className="sm:col-span-7 p-2 border-b sm:border-b-0 sm:border-r border-black space-y-2 text-[10px]">
          <div>
            <span className="font-bold">Company’s PAN : </span>
            <span className="font-mono font-semibold">{companyPan}</span>
          </div>

          <div>
            <div className="font-bold underline text-[9.5px]">Declaration</div>
            <div className="text-[9.5px] text-neutral-700 leading-tight">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>

          {/* Bank Details */}
          <div className="pt-1 border-t border-black/30">
            <div className="font-bold text-[9.5px]">Company’s Bank Details</div>
            <div className="grid grid-cols-12 gap-1 text-[9.5px]">
              <span className="col-span-4 text-neutral-600">Bank Name</span>
              <span className="col-span-8 font-semibold">: {bankName}</span>
              <span className="col-span-4 text-neutral-600">A/c No.</span>
              <span className="col-span-8 font-mono font-bold">: {bankAccount}</span>
              <span className="col-span-4 text-neutral-600">Branch & IFS Code</span>
              <span className="col-span-8 font-mono font-semibold">: {bankBranchIfsc}</span>
            </div>
          </div>
        </div>

        {/* Right Footer: Signatory Box */}
        <div className="sm:col-span-5 p-2 flex flex-col justify-between text-right text-[10.5px]">
          <div className="font-bold uppercase text-[11px]">
            for {factory.name || 'MANISHA GARMENTS'}
          </div>
          <div className="h-16"></div>
          <div className="font-bold text-[10.5px]">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bottom Sub-tag */}
      <div className="p-1 text-center text-[9px] text-neutral-600 tracking-wider">
        This is a Computer Generated Invoice
      </div>
    </div>
  );
}
