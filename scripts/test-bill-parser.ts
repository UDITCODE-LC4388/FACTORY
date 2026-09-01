import { parseBillTextToASN } from '../src/lib/bill-asn-parser';

// Bill 1: Manisha Garments Sample
const bill1 = `Tax Invoice
MANISHA GARMENTS
NA,34-35/2/1 SITA RAM SUPER MARKET
SRI AUROBINDRA ROAD ,SALKIA
HOWRAH-711106
GSTIN/UIN: 19AGGPB3696R1ZM
State Name : West Bengal, Code : 19
Consignee
PRIMART
LOHARUKA ,INFRASTRUCTURE PRIVATE LIMITED
KHATIAN NO 871 MOUZA-PANDIT SATHGHARA
VILLAGE-SIMLA P.S -SHRIRAMPUR
DIST HOOGHLY
GSTIN/UIN : 19AABCG6822C2ZT
State Name : West Bengal, Code : 19
Buyer (if other than consignee)
PRIMART
LOHARUKA ,INFRASTRUCTURE PRIVATE LIMITED
KHATIAN NO 871 MOUZA-PANDIT SATHGHARA
VILLAGE-SIMLA P.S -SHRIRAMPUR
DIST HOOGHLY
GSTIN/UIN : 19AABCG6822C2ZT
State Name : West Bengal, Code : 19
Invoice No.
GST/MG/201/26-27
Delivery Note
Supplier’s Ref.
Buyer’s Order No.
PO NO.3472
Despatch Document No.
LR-88219
Despatched through
VRL Logistics
Dated
31-Aug-2026
Mode/Terms of Payment
Other Reference(s)
Dated
10-Jun-2026
Delivery Note Date
Destination
Terms of Delivery
Sl Description of HSN/SAC Quantity Rate per Disc. % Amount
No. Goods
1 STYLE NO.3079(0X20)CREAM 61101120 196.000 PCS 135.00 PCS 26,460.00
INFANT F/S T-SHIRT MG 191
OUTPUT CGST 2.5% 2.50 % 661.50
OUTPUT SGST 2.5% 2.50 % 661.50
Total 196.000 PCS ₹ 27,783.00
Amount Chargeable (in words) E. & O.E
INR Twenty Seven Thousand Seven Hundred Eighty Three Only
Company’s PAN : AGGPB3696R`;

// Bill 2: Completely different company, city, buyer, numbers
const bill2 = `TAX INVOICE
KAPOOR APPARELS PRIVATE LIMITED
Plot 44, Sector 18, Udyog Vihar
GURUGRAM - 122015 HARYANA
GSTIN: 06AABCU9603R1ZM
Phone: 9811223344
Email: billing@kapoorapparels.com

Consignee (Ship to):
RELIANCE RETAIL LIMITED
Logistics Park, Building C-4, Bhiwandi
Thane, Maharashtra - 421302
GSTIN: 27AABCR5511A1ZZ

Buyer (Bill to):
RELIANCE RETAIL LIMITED
3rd Floor, Court House, Lokmanya Tilak Marg, Dhobi Talao, Mumbai - 400002

Invoice No: KP/2026/088
Dated: 25-Aug-2026
Buyer's Order No: REL/PO/90881
Dated: 12-Jul-2026
Despatched through: Blue Dart Express
Despatch Document No: BLU-992144
E-Way Bill No: 541098231456

Sl Description of Goods | HSN | Quantity | Rate | Amount
1 Men's Polo T-Shirt Navy Blue L | 61091000 | 500.00 PCS | 250.00 | 125000.00
2 Men's Polo T-Shirt Olive Green XL | 61091000 | 300.00 PCS | 250.00 | 75000.00
IGST 5.0% 10000.00

Total 800.00 PCS ₹ 2,10,000.00
Amount Chargeable (in words): INR Two Lakh Ten Thousand Only`;

// Bill 3: Minimal format bill
const bill3 = `INVOICE
V-TEX CREATIONS
12 Ring Road, Surat, Gujarat 395002
Mobile: 9988776655
GSTIN: 24AAGCV1122D1Z4

Bill To / Ship To:
TRENDS APPAREL MART
Shop 10, MG Road, Bengaluru - 560001
Karnataka

Bill No: VT-552
Bill Date: 15/09/2026
PO#: PO-7712
PO Date: 01/09/2026
Transport: SafeXpress
LR No: SFX-0044
Total Qty: 350 PCS
Grand Total: 85,500.00`;

console.log('--- Testing Bill 1 ---');
const r1 = parseBillTextToASN(bill1);
console.log('Bill 1:', {
  vendorName: r1.vendorName,
  vendorCity: r1.vendorCity,
  vendorBillNo: r1.vendorBillNo,
  poNo: r1.poNo,
  qty: r1.vendorBillQuantity,
  val: r1.vendorBillValue,
  buyer: r1.buyerName,
  transporter: r1.transporterName,
  lr: r1.transporterLrNo,
});

console.log('\n--- Testing Bill 2 ---');
const r2 = parseBillTextToASN(bill2);
console.log('Bill 2:', {
  vendorName: r2.vendorName,
  vendorCity: r2.vendorCity,
  vendorBillNo: r2.vendorBillNo,
  poNo: r2.poNo,
  qty: r2.vendorBillQuantity,
  val: r2.vendorBillValue,
  buyer: r2.buyerName,
  transporter: r2.transporterName,
  lr: r2.transporterLrNo,
  wayBill: r2.wayBillNo,
});

console.log('\n--- Testing Bill 3 ---');
const r3 = parseBillTextToASN(bill3);
console.log('Bill 3:', {
  vendorName: r3.vendorName,
  vendorCity: r3.vendorCity,
  vendorBillNo: r3.vendorBillNo,
  poNo: r3.poNo,
  qty: r3.vendorBillQuantity,
  val: r3.vendorBillValue,
  buyer: r3.buyerName,
  transporter: r3.transporterName,
  lr: r3.transporterLrNo,
});
