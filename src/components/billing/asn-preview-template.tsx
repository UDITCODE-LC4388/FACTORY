'use client';

import React from 'react';
import { ASNFormData } from '@/types/asn.types';

interface ASNPreviewTemplateProps {
  data: ASNFormData;
  className?: string;
}

export function ASNPreviewTemplate({ data, className = '' }: ASNPreviewTemplateProps) {
  const emailRecipient = data.emailRecipient || '';
  const contactPhone = data.contactPhone || '';

  return (
    <div
      className={`bg-white text-black font-sans shadow-xl border border-slate-300 print:border-none print:shadow-none print:m-0 w-full max-w-[800px] p-6 sm:p-8 text-[11px] leading-tight select-text ${className}`}
      style={{ minHeight: '842px', boxSizing: 'border-box' }}
    >
      {/* Outer Bordered Container */}
      <div className="border-2 border-black">
        {/* Title Header Banner */}
        <div className="border-b-2 border-black py-2 text-center bg-white">
          <h1 className="font-extrabold text-[15px] uppercase tracking-wider text-black">
            ADVANCE SHIPING NOTIFICATION
          </h1>
        </div>

        {/* Section 1 Subheader Note */}
        <div className="border-b border-black bg-neutral-100 px-2.5 py-1.5 text-[9.5px] italic text-slate-800">
          Information to be filled by Vendor for taking ASN number and Waybill before booking of shipment and to be emailed at:{' '}
          <span className="font-bold underline text-blue-900 not-italic">{emailRecipient}</span>
        </div>

        {/* Table 1: Vendor and Bill Details */}
        <table className="w-full border-collapse text-[10.5px]">
          <tbody>
            {/* Row 1 */}
            <tr className="border-b border-black">
              <td className="w-1/4 border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Name</td>
              <td className="w-1/4 border-r border-black p-1.5 font-semibold text-black uppercase">{data.vendorName || ''}</td>
              <td className="w-1/4 border-r border-black p-1.5 font-bold bg-neutral-50/50">ASN Number (to be allotted by Primart)</td>
              <td className="w-1/4 p-1.5 font-mono font-bold text-blue-900">{data.asnNumber || ''}</td>
            </tr>

            {/* Row 2 */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor City</td>
              <td className="border-r border-black p-1.5 uppercase">{data.vendorCity || ''}</td>
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">ASN Date</td>
              <td className="p-1.5 font-mono">{data.asnDate || ''}</td>
            </tr>

            {/* Row 3 */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50 align-top">Booking Location</td>
              <td className="border-r border-black p-1.5 align-top uppercase">{data.bookingLocation || data.vendorCity || ''}</td>
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50 align-top">Dispatch Location</td>
              <td className="p-1.5 whitespace-pre-line text-[9.5px] leading-tight align-top uppercase font-medium">
                {data.dispatchLocation || ''}
              </td>
            </tr>

            {/* Row 4 */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Mobile No</td>
              <td className="border-r border-black p-1.5 font-mono">{data.vendorMobileNo || ''}</td>
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">PO DATE</td>
              <td className="p-1.5 font-mono">{data.poDate || ''}</td>
            </tr>

            {/* Row 5 */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">PO NO</td>
              <td className="border-r border-black p-1.5 font-mono font-bold">{data.poNo || ''}</td>
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Bill Date</td>
              <td className="p-1.5 font-mono">{data.vendorBillDate || ''}</td>
            </tr>

            {/* Row 6 */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Bill No</td>
              <td className="border-r border-black p-1.5 font-mono font-bold">{data.vendorBillNo || ''}</td>
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Bill Value</td>
              <td className="p-1.5 font-mono font-bold text-black">{data.vendorBillValue ? String(data.vendorBillValue) : ''}</td>
            </tr>

            {/* Row 7 */}
            <tr className="border-b-2 border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Vendor Bill Quantity</td>
              <td className="border-r border-black p-1.5 font-mono font-bold">{data.vendorBillQuantity ? String(data.vendorBillQuantity) : ''}</td>
              <td className="border-r border-black p-1.5 bg-neutral-50/20"></td>
              <td className="p-1.5 bg-neutral-50/20"></td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 Subheader Note */}
        <div className="border-b border-black bg-neutral-100 px-2.5 py-1.5 text-[9.5px] italic text-slate-800">
          Information to be filled by Vendor after getting waybill number and booking of goods and email to be send at:{' '}
          <span className="font-bold underline text-blue-900 not-italic">{emailRecipient}</span> within 1 day of despatch of goods.{' '}
          <span className="font-extrabold not-italic text-black uppercase">MATERIAL BOOKING DETAILS</span>
        </div>

        {/* Table 2: Material Booking Details */}
        <table className="w-full border-collapse text-[10.5px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-1/2 border-r border-black p-1.5 font-bold bg-neutral-50/50">Transporter Name</td>
              <td className="w-1/2 p-1.5 font-medium uppercase">{data.transporterName || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Transporter LR NO</td>
              <td className="p-1.5 font-mono">{data.transporterLrNo || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Date of LR</td>
              <td className="p-1.5 font-mono">{data.dateOfLr || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Way Bill No If Applicable</td>
              <td className="p-1.5 font-mono">{data.wayBillNo || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">No of Cartons/Bales</td>
              <td className="p-1.5 font-mono">{data.noOfCartons ? String(data.noOfCartons) : ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Identification mark on Cartons</td>
              <td className="p-1.5">{data.identificationMark || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Total Weight</td>
              <td className="p-1.5 font-mono">{data.totalWeight || ''}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-bold bg-neutral-50/50">Expected Lead Time in Days</td>
              <td className="p-1.5 font-mono">{data.expectedLeadTimeDays ? String(data.expectedLeadTimeDays) : ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer Note */}
        <div className="px-2.5 py-2 text-[9px] italic text-slate-700 bg-white">
          * Copy of Bill , LR , PO hard copies to be attached while booking shipment/ For any clarification contact on -{' '}
          <span className="font-bold not-italic text-black">{contactPhone}</span>
        </div>
      </div>
    </div>
  );
}
