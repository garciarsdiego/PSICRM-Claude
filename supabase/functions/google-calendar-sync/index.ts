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

async function getValidAccessToken(supabase: any, userId: string): Promise<{ accessToken: string; calendarId: string }> {
  const { data: tokenData, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('professional_id', userId)
    .single();

  if (error || !tokenData) {
    throw new Error('Google Calendar not connected');
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.token_expires_at);

  let accessToken = tokenData.access_token;

  // Refresh token if expired or expiring soon (5 minutes buffer)
  if (now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    console.log('Refreshing access token');
    accessToken = await refreshAccessToken(tokenData.refresh_token);

    // Update token in database
    const newExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase
      .from('google_calendar_tokens')
      .update({ access_token: accessToken, token_expires_at: newExpiresAt })
      .eq('professional_id', userId);
  }

  return { accessToken, calendarId: tokenData.calendar_id || 'primary' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    console.log('Sync action:', action);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { accessToken, calendarId } = await getValidAccessToken(supabase, user.id);

    if (action === 'sync') {
      // Get sessions that need syncing (no google_event_id or updated recently)
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, patients(full_name, email)')
        .eq('professional_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString());

      if (sessionsError) throw sessionsError;

      console.log(`Found ${sessions?.length || 0} sessions to sync`);

      let synced = 0;
      let imported = 0;

      // Sync sessions to Google Calendar
      for (const session of sessions || []) {
        const startTime = new Date(session.scheduled_at);
        const endTime = new Date(startTime.getTime() + (session.duration || 50) * 60 * 1000);

        const event = {
          summary: session.title || `Sessão - ${session.patients?.full_name || 'Paciente'}`,
          description: session.notes || '',
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          attendees: session.patients?.email ? [{ email: session.patients.email }] : undefined,
        };

        try {
          let response;
          if (session.google_event_id) {
            // Update existing event
            response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${session.google_event_id}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
              }
            );
          } else {
            // Create new event
            response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
              }
            );

            if (response.ok) {
              const createdEvent = await response.json();
              // Save Google event ID
              await supabase
                .from('sessions')
                .update({ google_event_id: createdEvent.id })
                .eq('id', session.id);
            }
          }

          if (response.ok) synced++;
        } catch (err) {
          console.error('Error syncing session:', session.id, err);
        }
      }

      // Import events from Google Calendar as blocked slots
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.items || [];

        // Get existing google_event_ids from sessions
        const { data: existingSessions } = await supabase
          .from('sessions')
          .select('google_event_id')
          .eq('professional_id', user.id);

        const sessionEventIds = new Set(existingSessions?.map(s => s.google_event_id).filter(Boolean));

        // Import events that aren't our sessions as blocked slots
        for (const event of events) {
          if (sessionEventIds.has(event.id)) continue;
          if (!event.start?.dateTime) continue; // Skip all-day events for now

          const eventDate = new Date(event.start.dateTime);
          const eventEndDate = new Date(event.end?.dateTime || eventDate);

          // Check if blocked slot already exists
          const { data: existing } = await supabase
            .from('blocked_slots')
            .select('id')
            .eq('professional_id', user.id)
            .eq('blocked_date', eventDate.toISOString().split('T')[0])
            .eq('start_time', eventDate.toTimeString().slice(0, 5))
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('blocked_slots')
              .insert({
                professional_id: user.id,
                blocked_date: eventDate.toISOString().split('T')[0],
                start_time: eventDate.toTimeString().slice(0, 5),
                end_time: eventEndDate.toTimeString().slice(0, 5),
                reason: event.summary || 'Google Calendar',
              });
            imported++;
          }
        }
      }

      // Update last sync time
      await supabase
        .from('google_calendar_tokens')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('professional_id', user.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          synced, 
          imported,
          message: `${synced} sessões sincronizadas, ${imported} eventos importados`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
