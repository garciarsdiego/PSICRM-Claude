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

    const token = authHeader.replace('Bearer ', '');
    
    // Use anon key for auth validation, service role for data operations
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      throw new Error('Invalid token - please reconnect your Google Calendar');
    }
    
    // Service role client for data operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

      // Sync sessions to Google Calendar with Meet links
      for (const session of sessions || []) {
        const startTime = new Date(session.scheduled_at);
        const endTime = new Date(startTime.getTime() + (session.duration || 50) * 60 * 1000);

        const event: any = {
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
          // Add Google Meet automatically
          conferenceData: {
            createRequest: {
              requestId: session.id,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        };

        try {
          let response;
          if (session.google_event_id) {
            // Update existing event
            response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${session.google_event_id}?conferenceDataVersion=1`,
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
            // Create new event with Meet link
            response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`,
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
              // Save Google event ID and Meet link
              const meetLink = createdEvent.conferenceData?.entryPoints?.find(
                (e: any) => e.entryPointType === 'video'
              )?.uri || null;
              
              await supabase
                .from('sessions')
                .update({ 
                  google_event_id: createdEvent.id,
                  meet_link: meetLink
                })
                .eq('id', session.id);
              
              console.log('Created event with Meet link:', meetLink);
            }
          }

          if (response.ok) synced++;
        } catch (err) {
          console.error('Error syncing session:', session.id, err);
        }
      }

      // Import events from Google Calendar
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.items || [];
        console.log(`Found ${events.length} events in Google Calendar`);

        // Get existing google_event_ids from sessions
        const { data: existingSessions } = await supabase
          .from('sessions')
          .select('google_event_id')
          .eq('professional_id', user.id);

        const sessionEventIds = new Set(existingSessions?.map(s => s.google_event_id).filter(Boolean));

        // Get existing imported events
        const { data: existingImported } = await supabase
          .from('google_calendar_events')
          .select('google_event_id')
          .eq('professional_id', user.id);

        const importedEventIds = new Set(existingImported?.map(e => e.google_event_id) || []);

        // Import events that aren't our sessions
        for (const event of events) {
          if (sessionEventIds.has(event.id)) continue; // Skip our own sessions
          if (!event.start) continue;

          const isAllDay = !event.start.dateTime;
          const startTime = isAllDay 
            ? new Date(event.start.date + 'T00:00:00') 
            : new Date(event.start.dateTime);
          const endTime = isAllDay 
            ? new Date(event.end.date + 'T23:59:59') 
            : new Date(event.end?.dateTime || startTime);

          // Determine event type based on title keywords
          const title = (event.summary || '').toLowerCase();
          let eventType = 'default';
          if (title.includes('reunião') || title.includes('meeting') || title.includes('call')) {
            eventType = 'meeting';
          } else if (title.includes('pessoal') || title.includes('personal') || title.includes('particular')) {
            eventType = 'personal';
          } else if (title.includes('foco') || title.includes('focus') || title.includes('trabalho') || title.includes('work')) {
            eventType = 'focus';
          } else if (title.includes('viagem') || title.includes('travel') || title.includes('fora')) {
            eventType = 'travel';
          }

          // Upsert the event
          const eventData = {
            professional_id: user.id,
            google_event_id: event.id,
            title: event.summary || 'Evento sem título',
            description: event.description || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            is_all_day: isAllDay,
            event_type: eventType,
            color_id: event.colorId || null,
          };

          const { error: upsertError } = await supabase
            .from('google_calendar_events')
            .upsert(eventData, { 
              onConflict: 'professional_id,google_event_id' 
            });

          if (!upsertError && !importedEventIds.has(event.id)) {
            imported++;
          }
        }

        // Remove events that no longer exist in Google Calendar
        const currentEventIds = new Set(events.map((e: any) => e.id));
        const eventsToDelete = (existingImported || [])
          .filter(e => !currentEventIds.has(e.google_event_id))
          .map(e => e.google_event_id);

        if (eventsToDelete.length > 0) {
          await supabase
            .from('google_calendar_events')
            .delete()
            .eq('professional_id', user.id)
            .in('google_event_id', eventsToDelete);
          console.log(`Removed ${eventsToDelete.length} deleted events`);
        }

        // Also create blocked slots for busy times (for patient booking)
        for (const event of events) {
          if (sessionEventIds.has(event.id)) continue;
          if (!event.start?.dateTime) continue; // Skip all-day events for blocked slots

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
