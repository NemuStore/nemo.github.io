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

    const { user_id, items, shipping_address, latitude, longitude } = await req.json();

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabaseClient.rpc('generate_order_number');
    const order_number = orderNumberData || `ORD-${Date.now()}`;
    
    if (orderNumberError) {
      console.error('Error generating order number:', orderNumberError);
    }

    // Calculate total
    let total_amount = 0;
    for (const item of items) {
      const { data: product } = await supabaseClient
        .from('products')
        .select('price')
        .eq('id', item.product_id)
        .single();
      
      if (product) {
        total_amount += product.price * item.quantity;
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id,
        order_number,
        status: 'pending',
        total_amount,
        shipping_address,
        latitude,
        longitude,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Create notification for admin
    const { data: admins } = await supabaseClient
      .from('users')
      .select('id')
      .in('role', ['admin', 'manager']);

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        title: 'طلب جديد',
        message: `تم إنشاء طلب جديد برقم ${order_number}`,
        type: 'order',
      }));

      await supabaseClient.from('notifications').insert(notifications);
    }

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

