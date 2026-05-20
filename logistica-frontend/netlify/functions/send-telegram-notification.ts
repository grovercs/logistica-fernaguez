import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Esta función corre en el servidor de Netlify (nunca expuesta al navegador).
// Lee el token del bot desde Supabase y envía el mensaje por Telegram.

interface TelegramPayload {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload: TelegramPayload = JSON.parse(event.body || '{}');
    const { chat_id, text, parse_mode = 'Markdown' } = payload;

    if (!chat_id || !text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing chat_id or text' }) };
    }

    // Leer token desde Supabase (variable de entorno del servidor)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase credentials not configured in server' }) };
    }

    // Obtener token del bot desde Supabase vía REST API
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

    if (!configRes.ok) {
      const errText = await configRes.text();
      console.error('Error fetching config from Supabase:', errText);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to read bot token from database', details: errText }) };
    }

    const configData = await configRes.json();
    const botToken = configData?.[0]?.valor;

    if (!botToken) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Telegram bot token not configured. Go to Configuración panel to set it.' }) };
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
        body: JSON.stringify({ error: 'Telegram API error', details: telegramData }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ success: true, message_id: telegramData.result?.message_id }),
    };

  } catch (err: any) {
    console.error('Netlify Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error', details: err.message }) };
  }
};
