import { generateASNDocxBuffer } from '../src/lib/asn-doc-generator';
import { ASNFormData } from '../src/types/asn.types';
import * as fs from 'fs';

async function testSampleASN() {
  const sampleData: ASNFormData = {
    vendorName: 'MANISHA GARMENTS',
    vendorCity: 'KOLKATA',
    bookingLocation: 'KOLKATA',
    vendorMobileNo: '9007157204',
    asnNumber: '',
    asnDate: '31/08/2026',
    dispatchLocation:
      'LOHARUKA INFRASTRUCTURE PRIVATE LIMITED\nKHATIAN NO 871 MOUZA-PANDIT SATHGHARA\nVILLAGE-SIMLA P.S -SHRIRAMPUR\nDIST HOOGHLY',
    poNo: '3472',
    poDate: '10/06/2026',
    vendorBillNo: 'GST/MG/201/26-27',
    vendorBillDate: '31/8/26',
    vendorBillValue: '27783',
    vendorBillQuantity: '196',
    transporterName: '',
    transporterLrNo: '',
    dateOfLr: '',
    wayBillNo: '',
    noOfCartons: '',
    identificationMark: '',
    totalWeight: '',
    expectedLeadTimeDays: '',
    buyerName: 'PRIMART',
    emailRecipient: 'sdr@primart.co.in',
    contactPhone: '7777777777',
  };

  const buffer = await generateASNDocxBuffer(sampleData);
  fs.writeFileSync('./scripts/sample-output-asn.docx', buffer);
  console.log('Sample ASN DOCX created successfully! Size:', buffer.length, 'bytes');
}

testSampleASN().catch(console.error);
