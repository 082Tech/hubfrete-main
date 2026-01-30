import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push library for Deno
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // Simplified push - using fetch to push endpoint
  // For production, consider using a proper web-push library
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload,
  });

  return response.ok;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Return VAPID public key (public endpoint)
    if (action === 'get-vapid-key') {
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      if (!publicKey) {
        return new Response(
          JSON.stringify({ error: 'VAPID key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ publicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification - REQUIRES AUTHENTICATION
    if (req.method === 'POST') {
      // Check for service role key (internal system calls only)
      const authHeader = req.headers.get('Authorization');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      // Only allow calls with service role key (from database triggers or internal systems)
      // This prevents arbitrary users from sending push notifications to anyone
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract the token from the Authorization header
      const token = authHeader.replace('Bearer ', '');
      
      // Check if this is a service role call (trusted internal call)
      const isServiceRole = token === serviceRoleKey;
      
      if (!isServiceRole) {
        // For non-service-role calls, verify the user and restrict what they can do
        const supabaseClient = createClient(supabaseUrl, token);
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !userData.user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized: Invalid token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Non-service calls can only send to themselves (for testing purposes)
        // In production, you may want to completely block non-service calls
        return new Response(
          JSON.stringify({ error: 'Forbidden: Only internal system calls can send push notifications' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { userId, userIds, title, body, url: notificationUrl, data } = await req.json();

      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

      if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(
          JSON.stringify({ error: 'VAPID keys not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Get subscriptions for user(s)
      let query = supabase.from('push_subscriptions').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (userIds && Array.isArray(userIds)) {
        query = query.in('user_id', userIds);
      } else {
        return new Response(
          JSON.stringify({ error: 'userId or userIds required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: subscriptions, error } = await query;

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch subscriptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = JSON.stringify({
        title: title || 'HubFrete',
        body: body || 'Nova notificação',
        url: notificationUrl || '/',
        ...data,
      });

      let sentCount = 0;
      const failedEndpoints: string[] = [];

      for (const sub of subscriptions) {
        try {
          // Simple POST to push endpoint
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
              'TTL': '86400',
            },
            body: payload,
          });

          if (response.ok || response.status === 201) {
            sentCount++;
          } else if (response.status === 410 || response.status === 404) {
            // Subscription expired or invalid - remove it
            failedEndpoints.push(sub.endpoint);
          }
        } catch (pushError) {
          console.error('Push error for endpoint:', sub.endpoint, pushError);
        }
      }

      // Clean up expired subscriptions
      if (failedEndpoints.length > 0) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', failedEndpoints);
      }

      return new Response(
        JSON.stringify({ 
          message: 'Push notifications processed',
          sent: sentCount,
          failed: failedEndpoints.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
