import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN');
const META_WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { record, type, table } = await req.json();

    let recipientPhone = '';
    let messageBody = '';
    const factoryId = record.factory_id;

    // Fetch factory details
    const { data: factory } = await supabase
      .from('factories')
      .select('name')
      .eq('id', factoryId)
      .single();

    const factoryName = factory?.name || 'FactoryOS';

    // 1. Invoice Created Notification
    if (table === 'invoices' && type === 'INSERT') {
      const { data: party } = await supabase
        .from('parties')
        .select('name, phone')
        .eq('id', record.party_id)
        .single();

      if (party?.phone) {
        recipientPhone = party.phone.replace(/\D/g, '');
        messageBody = `Namaste ${party.name}, Tax Invoice #${record.number} for Rs. ${record.total} has been issued by ${factoryName}.`;
      }
    }
    // 2. Purchase Order Sent Notification
    else if (table === 'purchase_orders' && type === 'INSERT') {
      const { data: party } = await supabase
        .from('parties')
        .select('name, phone')
        .eq('id', record.party_id)
        .single();

      if (party?.phone) {
        recipientPhone = party.phone.replace(/\D/g, '');
        messageBody = `Namaste ${party.name}, Purchase Order #${record.number} for Rs. ${record.total_amount} has been raised by ${factoryName}.`;
      }
    }

    if (recipientPhone && messageBody && META_WHATSAPP_TOKEN && META_WHATSAPP_PHONE_NUMBER_ID) {
      // Call Meta Graph API v19.0
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${META_WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'text',
            text: { body: messageBody },
          }),
        }
      );

      const resJson = await res.json();

      // Log in whatsapp_log table
      await supabase.from('whatsapp_log').insert({
        factory_id: factoryId,
        recipient_phone: recipientPhone,
        message: messageBody,
        ref_table: table,
        ref_id: record.id,
        status: res.ok ? 'sent' : 'failed',
        response_payload: resJson,
      });

      return new Response(JSON.stringify({ success: true, resJson }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'No phone or credentials' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
