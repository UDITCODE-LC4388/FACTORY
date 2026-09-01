import { parseBillTextToASN } from '../src/lib/bill-asn-parser';

const sampleBillOCR = `
Tax Invoice
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
Despatched through
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
Company’s PAN : AGGPB3696R
`;

const result = parseBillTextToASN(sampleBillOCR);
console.log('Parsed ASN Output:', JSON.stringify(result, null, 2));

// Assertions
if (result.vendorName !== 'MANISHA GARMENTS') console.error('FAIL: vendorName');
if (result.vendorBillNo !== 'GST/MG/201/26-27') console.error('FAIL: vendorBillNo');
if (result.poNo !== '3472') console.error('FAIL: poNo');
if (Number(result.vendorBillQuantity) !== 196) console.error('FAIL: vendorBillQuantity');
if (Number(result.vendorBillValue) !== 27783) console.error('FAIL: vendorBillValue');
console.log('ALL TESTS PASSED SUCCESSFULLY!');
