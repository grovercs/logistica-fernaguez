import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Esta función corre en el servidor de Netlify (nunca expuesta al navegador).
// Lee el token del bot desde Supabase y envía el mensaje por Telegram.

interface TelegramPayload {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

const FALLBACK_BOT_TOKEN = '8966002039:AAEm3NQZVRYtobSZ5q1c7CWBJaaTbxnJhI4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload: TelegramPayload = JSON.parse(event.body || '{}');
    const { chat_id, text, parse_mode = 'Markdown' } = payload;

    if (!chat_id || !text) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing chat_id or text' }) };
    }

    // Leer token desde Supabase (variable de entorno del servidor)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

    console.log('Netlify env check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      keyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
    });

    let botToken: string | null = null;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const configRes = await fetch(
          `${supabaseUrl}/rest/v1/configuracion_sistema?clave=eq.telegram_bot_token&select=valor`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (configRes.ok) {
          const configData = await configRes.json();
          botToken = configData?.[0]?.valor || null;
          console.log('Bot token fetched from Supabase:', !!botToken);
        } else {
          console.warn('Supabase config fetch failed:', await configRes.text());
        }
      } catch (supaErr) {
        console.warn('Error fetching from Supabase:', supaErr);
      }
    } else {
      console.warn('Supabase credentials not configured in Netlify env vars');
    }

    // Fallback al token hardcodeado si no se pudo leer de Supabase
    if (!botToken) {
      console.log('Using fallback bot token');
      botToken = FALLBACK_BOT_TOKEN;
    }

    // Enviar mensaje vía Telegram Bot API
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode,
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok || !telegramData.ok) {
      console.error('Telegram API error:', telegramData);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Telegram API error', details: telegramData }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message_id: telegramData.result?.message_id }),
    };

  } catch (err: any) {
    console.error('Netlify Function error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};
