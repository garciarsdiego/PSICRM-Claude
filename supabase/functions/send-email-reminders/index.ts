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

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('professional_id', userId)
    .maybeSingle();

  if (error || !tokenData) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.token_expires_at);

  let accessToken = tokenData.access_token;

  if (now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    try {
      accessToken = await refreshAccessToken(tokenData.refresh_token);
      const newExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      await supabase
        .from('google_calendar_tokens')
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq('professional_id', userId);
    } catch (err) {
      console.error('Failed to refresh token for user:', userId);
      return null;
    }
  }

  return accessToken;
}

function createEmailBody(to: string, from: string, subject: string, htmlContent: string): string {
  const boundary = 'boundary_' + Date.now();
  
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlContent))),
    `--${boundary}--`,
  ].join('\r\n');

  return btoa(email)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automatic email reminders job...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get all professionals with reminders enabled
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('reminder_enabled', true);

    if (settingsError) {
      throw new Error('Failed to fetch email settings');
    }

    console.log(`Found ${emailSettings?.length || 0} professionals with reminders enabled`);

    let totalSent = 0;
    let totalErrors = 0;

    for (const settings of emailSettings || []) {
      const professionalId = settings.professional_id;
      const daysBefore = settings.reminder_days_before || 1;
      
      // Get professional profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', professionalId)
        .single();

      if (profileError || !profile) {
        console.error('Profile not found for:', professionalId);
        continue;
      }

      // Get access token for Gmail
      const accessToken = await getValidAccessToken(supabase, professionalId);
      if (!accessToken) {
        console.log('No Google token for professional:', professionalId);
        continue;
      }

      // Calculate target date for reminders
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Get sessions scheduled for the target date
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, patients(full_name, email)')
        .eq('professional_id', professionalId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', `${targetDateStr}T00:00:00`)
        .lt('scheduled_at', `${targetDateStr}T23:59:59`);

      if (sessionsError) {
        console.error('Failed to fetch sessions for:', professionalId);
        continue;
      }

      console.log(`Found ${sessions?.length || 0} sessions for ${profile.full_name} on ${targetDateStr}`);

      for (const session of sessions || []) {
        if (!session.patients?.email) {
          console.log('No email for patient:', session.patients?.full_name);
          continue;
        }

        const scheduledAt = new Date(session.scheduled_at);
        const templateContent = settings.session_reminder_template || 
          'Olá {{nome}}, lembrete: sua sessão está agendada para {{data}} às {{hora}}.';

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6, #A78BFA); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🧠 Lembrete de Sessão</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #374151;">
                ${templateContent
                  .replace('{{nome}}', session.patients.full_name)
                  .replace('{{data}}', scheduledAt.toLocaleDateString('pt-BR'))
                  .replace('{{hora}}', scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}
              </p>
              ${session.meet_link ? `
                <div style="background: #EDE9FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #5B21B6;">
                    <strong>📹 Link do Google Meet:</strong><br>
                    <a href="${session.meet_link}" style="color: #7C3AED;">${session.meet_link}</a>
                  </p>
                </div>
              ` : ''}
              <p style="color: #6B7280; font-size: 14px;">
                ${profile.full_name}<br>
                ${profile.specialty || 'Psicólogo(a)'}<br>
                ${profile.crp ? `CRP: ${profile.crp}` : ''}
              </p>
            </div>
          </div>
        `;

        const emailSubject = `Lembrete: Sessão agendada para ${scheduledAt.toLocaleDateString('pt-BR')}`;
        const rawMessage = createEmailBody(session.patients.email, profile.email, emailSubject, emailHtml);

        try {
          const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: rawMessage }),
          });

          if (sendResponse.ok) {
            console.log(`Reminder sent to ${session.patients.email} for session on ${targetDateStr}`);
            totalSent++;
          } else {
            const errorData = await sendResponse.json();
            console.error('Gmail API error:', errorData);
            totalErrors++;
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          totalErrors++;
        }
      }
    }

    console.log(`Email reminders job completed: ${totalSent} sent, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: totalSent, 
        errors: totalErrors,
        message: `${totalSent} lembretes enviados, ${totalErrors} erros`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email reminders job error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
