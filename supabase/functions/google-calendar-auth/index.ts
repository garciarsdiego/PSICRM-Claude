import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri } = await req.json();
    console.log('Action:', action);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid token');
    }

    console.log('User ID:', user.id);

    if (action === 'get_auth_url') {
      // Generate OAuth URL for Google Calendar
      const baseRedirectUri = redirect_uri || `${req.headers.get('origin')}/schedule`;
      
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: baseRedirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'select_account consent',
        state: user.id,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      console.log('Generated auth URL');

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      if (!code || !redirect_uri) {
        throw new Error('Missing code or redirect_uri');
      }

      console.log('Exchanging code for tokens');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error('Token exchange error:', tokenData);
        throw new Error(tokenData.error_description || 'Failed to exchange code');
      }

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Save tokens to database
      const { error: upsertError } = await supabaseClient
        .from('google_calendar_tokens')
        .upsert({
          professional_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          sync_enabled: true,
        }, { onConflict: 'professional_id' });

      if (upsertError) {
        console.error('Database error:', upsertError);
        throw new Error('Failed to save tokens');
      }

      console.log('Tokens saved successfully');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
