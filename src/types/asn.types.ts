export interface ASNFormData {
  // Table 1: Vendor & Bill Details
  vendorName: string;
  vendorCity: string;
  bookingLocation: string;
  vendorMobileNo: string;
  asnNumber: string; // "ASN Number (to be allotted by Primart)" or custom
  asnDate: string; // e.g. "31/08/2026" or "31/8/26"
  dispatchLocation: string; // Consignee / Delivery Address
  poNo: string; // e.g. "3472"
  poDate: string; // e.g. "10/06/2026"
  vendorBillNo: string; // e.g. "GST/MG/201/26-27"
  vendorBillDate: string; // e.g. "31/8/26"
  vendorBillValue: string | number; // e.g. "27783" or "27783.00"
  vendorBillQuantity: string | number; // e.g. "196"

  // Table 2: Material Booking Details
  transporterName?: string;
  transporterLrNo?: string;
  dateOfLr?: string;
  wayBillNo?: string; // Way Bill No If Applicable
  noOfCartons?: string | number; // No of Cartons/Bales
  identificationMark?: string; // Identification mark on Cartons
  totalWeight?: string; // Total Weight (e.g. "45 KG")
  expectedLeadTimeDays?: string | number; // Expected Lead Time in Days

  // Document Config
  buyerName?: string; // e.g. "PRIMART"
  emailRecipient?: string; // e.g. "sdr@primart.co.in"
  contactPhone?: string; // e.g. "7777777777"
  notes?: string;
}

export interface ParsedBillResult {
  asnData: ASNFormData;
  rawText?: string;
  parsedWith?: string;
}
