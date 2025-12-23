import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: Use environment variable or restrict to known origins
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://psicrm.app';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return data.access_token;
}

async function syncUserCalendar(supabase: any, userId: string, tokenData: any) {
  console.log(`Syncing calendar for user: ${userId}`);
  
  try {
    const now = new Date();
    const expiresAt = new Date(tokenData.token_expires_at);

    let accessToken = tokenData.access_token;

    // Refresh token if expired
    if (now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      console.log('Refreshing access token');
      accessToken = await refreshAccessToken(tokenData.refresh_token);

      const newExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      await supabase
        .from('google_calendar_tokens')
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq('professional_id', userId);
    }

    const calendarId = tokenData.calendar_id || 'primary';

    // Import events from Google Calendar
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!eventsResponse.ok) {
      console.error(`Failed to fetch events for user ${userId}:`, await eventsResponse.text());
      return { synced: 0, imported: 0 };
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];
    console.log(`Found ${events.length} events for user ${userId}`);

    // Get existing google_event_ids from sessions
    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('google_event_id')
      .eq('professional_id', userId);

    const sessionEventIds = new Set(existingSessions?.map((s: any) => s.google_event_id).filter(Boolean));

    // Get existing imported events
    const { data: existingImported } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('professional_id', userId);

    const importedEventIds = new Set(existingImported?.map((e: any) => e.google_event_id) || []);

    let imported = 0;

    // Import events that aren't our sessions
    for (const event of events) {
      if (sessionEventIds.has(event.id)) continue;
      if (!event.start) continue;

      const isAllDay = !event.start.dateTime;
      const startTime = isAllDay 
        ? new Date(event.start.date + 'T00:00:00') 
        : new Date(event.start.dateTime);
      const endTime = isAllDay 
        ? new Date(event.end.date + 'T23:59:59') 
        : new Date(event.end?.dateTime || startTime);

      // Determine event type
      const title = (event.summary || '').toLowerCase();
      let eventType = 'default';
      if (title.includes('reunião') || title.includes('meeting') || title.includes('call')) {
        eventType = 'meeting';
      } else if (title.includes('pessoal') || title.includes('personal')) {
        eventType = 'personal';
      } else if (title.includes('foco') || title.includes('focus') || title.includes('trabalho')) {
        eventType = 'focus';
      } else if (title.includes('viagem') || title.includes('travel')) {
        eventType = 'travel';
      }

      const eventData = {
        professional_id: userId,
        google_event_id: event.id,
        title: event.summary || 'Evento sem título',
        description: event.description || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_all_day: isAllDay,
        event_type: eventType,
        color_id: event.colorId || null,
      };

      const { error } = await supabase
        .from('google_calendar_events')
        .upsert(eventData, { onConflict: 'professional_id,google_event_id' });

      if (!error && !importedEventIds.has(event.id)) {
        imported++;
      }
    }

    // Remove deleted events
    const currentEventIds = new Set(events.map((e: any) => e.id));
    const eventsToDelete = (existingImported || [])
      .filter((e: any) => !currentEventIds.has(e.google_event_id))
      .map((e: any) => e.google_event_id);

    if (eventsToDelete.length > 0) {
      await supabase
        .from('google_calendar_events')
        .delete()
        .eq('professional_id', userId)
        .in('google_event_id', eventsToDelete);
    }

    // Update last sync time
    await supabase
      .from('google_calendar_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('professional_id', userId);

    return { synced: 0, imported };
  } catch (error) {
    console.error(`Error syncing user ${userId}:`, error);
    return { synced: 0, imported: 0 };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic calendar sync for all users...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with Google Calendar connected and sync enabled
    const { data: tokens, error: tokensError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('sync_enabled', true);

    if (tokensError) {
      throw tokensError;
    }

    console.log(`Found ${tokens?.length || 0} users to sync`);

    let totalImported = 0;
    let usersProcessed = 0;

    for (const token of tokens || []) {
      const result = await syncUserCalendar(supabase, token.professional_id, token);
      totalImported += result.imported;
      usersProcessed++;
    }

    console.log(`Sync complete: ${usersProcessed} users, ${totalImported} events imported`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        usersProcessed,
        totalImported,
        message: `Sincronização automática concluída: ${usersProcessed} usuários, ${totalImported} eventos importados`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto sync error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
