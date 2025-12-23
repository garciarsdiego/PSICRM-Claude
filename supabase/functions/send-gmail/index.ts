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

async function getValidAccessToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('professional_id', userId)
    .single();

  if (error || !tokenData) {
    throw new Error('Google não conectado. Conecte sua conta Google primeiro.');
  }

  const now = new Date();
  const expiresAt = new Date(tokenData.token_expires_at);

  let accessToken = tokenData.access_token;

  if (now >= new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    console.log('Refreshing access token');
    accessToken = await refreshAccessToken(tokenData.refresh_token);

    const newExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase
      .from('google_calendar_tokens')
      .update({ access_token: accessToken, token_expires_at: newExpiresAt })
      .eq('professional_id', userId);
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

  // Base64 URL-safe encoding
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
    const { action, to, subject, html, professional_id, template, data } = await req.json();
    console.log('Send Gmail action:', action);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get professional info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', professional_id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profissional não encontrado');
    }

    const accessToken = await getValidAccessToken(supabase, professional_id);

    // Get email settings
    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('professional_id', professional_id)
      .maybeSingle();

    let emailHtml = html;
    let emailSubject = subject;

    // Generate email based on template
    if (template === 'session_reminder') {
      const templateContent = emailSettings?.session_reminder_template || 
        'Olá {{nome}}, lembrete: sua sessão está agendada para {{data}} às {{hora}}.';
      
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #A78BFA); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🧠 Lembrete de Sessão</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              ${templateContent
                .replace('{{nome}}', data.patient_name)
                .replace('{{data}}', data.date)
                .replace('{{hora}}', data.time)}
            </p>
            ${data.meet_link ? `
              <div style="background: #EDE9FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #5B21B6;">
                  <strong>📹 Link do Google Meet:</strong><br>
                  <a href="${data.meet_link}" style="color: #7C3AED;">${data.meet_link}</a>
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
      emailSubject = `Lembrete: Sessão agendada para ${data.date}`;
    } else if (template === 'session_confirmation') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981, #34D399); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Sessão Confirmada</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Olá ${data.patient_name},
            </p>
            <p style="font-size: 16px; color: #374151;">
              Sua sessão foi agendada com sucesso!
            </p>
            <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #065F46;">
                <strong>📅 Data:</strong> ${data.date}
              </p>
              <p style="margin: 0 0 10px 0; color: #065F46;">
                <strong>🕐 Horário:</strong> ${data.time}
              </p>
              <p style="margin: 0; color: #065F46;">
                <strong>⏱️ Duração:</strong> ${data.duration || 50} minutos
              </p>
            </div>
            ${data.meet_link ? `
              <div style="background: #EDE9FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #5B21B6;">
                  <strong>📹 Link do Google Meet:</strong><br>
                  <a href="${data.meet_link}" style="color: #7C3AED;">${data.meet_link}</a>
                </p>
              </div>
            ` : ''}
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              Atenciosamente,<br>
              ${profile.full_name}<br>
              ${profile.specialty || 'Psicólogo(a)'}<br>
              ${profile.crp ? `CRP: ${profile.crp}` : ''}
            </p>
          </div>
        </div>
      `;
      emailSubject = `Sessão confirmada para ${data.date} às ${data.time}`;
    } else if (template === 'payment_reminder') {
      const templateContent = emailSettings?.payment_reminder_template || 
        'Olá {{nome}}, você tem {{sessoes}} sessão(ões) pendente(s) no valor de R$ {{valor}}.';
      
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F59E0B, #FBBF24); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">💳 Lembrete de Pagamento</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              ${templateContent
                .replace('{{nome}}', data.patient_name)
                .replace('{{sessoes}}', data.sessions_count)
                .replace('{{valor}}', data.total_amount)}
            </p>
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #92400E;">
                <strong>Sessões pendentes:</strong> ${data.sessions_count}
              </p>
              <p style="margin: 0; color: #92400E;">
                <strong>Valor total:</strong> R$ ${data.total_amount}
              </p>
            </div>
            <p style="color: #6B7280; font-size: 14px;">
              ${profile.full_name}<br>
              ${profile.specialty || 'Psicólogo(a)'}
            </p>
          </div>
        </div>
      `;
      emailSubject = `Lembrete: Pagamento pendente - R$ ${data.total_amount}`;
    } else if (template === 'welcome') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #A78BFA); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">👋 Bem-vindo(a)!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151;">
              Olá ${data.patient_name},
            </p>
            <p style="font-size: 16px; color: #374151;">
              É um prazer recebê-lo(a) como novo paciente! A partir de agora, você faz parte do nosso consultório.
            </p>
            <div style="background: #EDE9FE; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #5B21B6;">
                <strong>Sobre seu atendimento:</strong>
              </p>
              ${data.first_session_date ? `
                <p style="margin: 0 0 10px 0; color: #5B21B6;">
                  📅 Primeira sessão: ${data.first_session_date} às ${data.first_session_time}
                </p>
              ` : ''}
              ${data.meet_link ? `
                <p style="margin: 0 0 10px 0; color: #5B21B6;">
                  📹 Link da reunião: <a href="${data.meet_link}" style="color: #7C3AED;">${data.meet_link}</a>
                </p>
              ` : ''}
              <p style="margin: 0; color: #5B21B6;">
                ⏱️ Duração: ${data.session_duration || 50} minutos
              </p>
            </div>
            <p style="font-size: 16px; color: #374151;">
              Caso tenha dúvidas, sinta-se à vontade para entrar em contato.
            </p>
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              Atenciosamente,<br>
              ${profile.full_name}<br>
              ${profile.specialty || 'Psicólogo(a)'}<br>
              ${profile.crp ? `CRP: ${profile.crp}` : ''}<br>
              ${profile.phone ? `📞 ${profile.phone}` : ''}<br>
              ${profile.email ? `✉️ ${profile.email}` : ''}
            </p>
          </div>
        </div>
      `;
      emailSubject = `Bem-vindo(a) ao consultório de ${profile.full_name}`;
    }

    // Send email via Gmail API
    const fromEmail = profile.email;
    const rawMessage = createEmailBody(to, fromEmail, emailSubject, emailHtml);

    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      console.error('Gmail API error:', errorData);
      throw new Error(errorData.error?.message || 'Falha ao enviar email');
    }

    const result = await sendResponse.json();
    console.log('Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send Gmail error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
