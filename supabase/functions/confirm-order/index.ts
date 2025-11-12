import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { order_id } = await req.json();

    // Update order status
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order_id)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create notification for customer
    await supabaseClient.from('notifications').insert({
      user_id: order.user_id,
      title: 'تم تأكيد الطلب',
      message: `تم تأكيد طلبك برقم ${order.order_number}`,
      type: 'order',
    });

    return new Response(
      JSON.stringify({ order }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

