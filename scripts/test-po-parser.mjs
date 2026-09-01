import { extractText } from 'unpdf';
import fs from 'fs';
import { parseMultiOrderPOText } from '../src/lib/po-parser.ts';

async function test() {
  const files = [
    '/Users/uditsinghi/.gemini/antigravity-ide/brain/09b460f8-c349-4dea-8c8e-1e2f432916cb/.user_uploaded/media_1788264504236.pdf',
    '/Users/uditsinghi/.gemini/antigravity-ide/brain/09b460f8-c349-4dea-8c8e-1e2f432916cb/.user_uploaded/media_1788264506713.pdf',
    '/Users/uditsinghi/.gemini/antigravity-ide/brain/09b460f8-c349-4dea-8c8e-1e2f432916cb/.user_uploaded/media_1788264514227.pdf',
  ];

  for (const f of files) {
    if (fs.existsSync(f)) {
      console.log(`=== Testing PO Parser on ${f} ===`);
      const buffer = fs.readFileSync(f);
      const { text, totalPages } = await extractText(new Uint8Array(buffer));
      const orders = parseMultiOrderPOText(text);
      console.log(`Extracted ${orders.length} order(s):`);
      orders.forEach((o, i) => {
        console.log(`Order ${i + 1}:`);
        console.log(`  PO Number: ${o.orderNumber}`);
        console.log(`  PO Date: ${o.orderDate}`);
        console.log(`  Consignee: ${o.consigneeName} (GST: ${o.consigneeGstin}, ${o.consigneeState})`);
        console.log(`  Through Buyer: ${o.isThroughBuyer} -> Buyer: ${o.buyerName || 'None'} (GST: ${o.buyerGstin || 'None'})`);
        console.log(`  Terms: ${o.termsOfDelivery || 'None'}`);
        console.log(`  Items (${o.items.length}):`, o.items);
      });
      console.log('\n----------------------------------------\n');
    }
  }
}

test().catch(console.error);
