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

    const { shipment_id, status, cost, estimated_delivery_days } = await req.json();

    const updateData: any = { status };

    // Update timestamps based on status
    if (status === 'received_in_uae') {
      updateData.received_in_uae_at = new Date().toISOString();
    } else if (status === 'shipped_from_uae') {
      updateData.shipped_from_uae_at = new Date().toISOString();
    } else if (status === 'received_in_egypt') {
      updateData.received_in_egypt_at = new Date().toISOString();
    } else if (status === 'in_warehouse') {
      updateData.entered_warehouse_at = new Date().toISOString();
      
      // Update all orders in this shipment
      const { data: shipmentOrders } = await supabaseClient
        .from('shipment_orders')
        .select('order_id')
        .eq('shipment_id', shipment_id);

      if (shipmentOrders) {
        const orderIds = shipmentOrders.map((so) => so.order_id);
        
        // Update orders status
        await supabaseClient
          .from('orders')
          .update({ 
            status: 'in_warehouse',
            estimated_delivery_days: estimated_delivery_days || 3
          })
          .in('id', orderIds);

        // Create notifications for customers
        const { data: orders } = await supabaseClient
          .from('orders')
          .select('user_id, order_number')
          .in('id', orderIds);

        if (orders) {
          const notifications = orders.map((order) => ({
            user_id: order.user_id,
            title: 'تم استلام طلبك',
            message: `تم استلام طلبك ${order.order_number} في المخزن. سيتم التوصيل خلال ${estimated_delivery_days || 3} أيام`,
            type: 'delivery',
          }));

          await supabaseClient.from('notifications').insert(notifications);
        }
      }
    }

    if (cost) {
      updateData.cost = cost;
    }

    const { data: shipment, error } = await supabaseClient
      .from('shipments')
      .update(updateData)
      .eq('id', shipment_id)
      .select()
      .single();

    if (error) throw error;

    // Create notification for manager
    const { data: managers } = await supabaseClient
      .from('users')
      .select('id')
      .eq('role', 'manager');

    if (managers) {
      const notifications = managers.map((manager) => ({
        user_id: manager.id,
        title: 'تحديث حالة الشحنة',
        message: `تم تحديث حالة الشحنة ${shipment.shipment_number} إلى ${status}`,
        type: 'shipment',
      }));

      await supabaseClient.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({ shipment }),
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

