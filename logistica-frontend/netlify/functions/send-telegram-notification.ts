import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Esta función corre en el servidor de Netlify (nunca expuesta al navegador).
// Lee el token del bot desde una variable de entorno y envía el mensaje por Telegram.

interface TelegramPayload {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

const allowedProductionOrigins = new Set([
  'https://admin.appvielha.com',
  'https://app.appvielha.com',
]);

const deployPreviewOriginPattern =
  /^https:\/\/deploy-preview-\d+--logistica-fernaguez-(?:admin|mobile)\.netlify\.app$/;

const isAllowedOrigin = (origin: string | undefined): origin is string =>
  !!origin && (
    allowedProductionOrigins.has(origin)
    || deployPreviewOriginPattern.test(origin)
  );

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const origin = event.headers.origin;

  if (!isAllowedOrigin(origin)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }

  const responseHeaders = corsHeaders(origin);

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: responseHeaders, body: '' };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload: TelegramPayload = JSON.parse(event.body || '{}');
    const { chat_id, text, parse_mode = 'Markdown' } = payload;

    if (!chat_id || !text) {
      return { statusCode: 400, headers: responseHeaders, body: JSON.stringify({ error: 'Missing chat_id or text' }) };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('Telegram integration is not configured');
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: 'Internal server error' }),
      };
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
        headers: responseHeaders,
        body: JSON.stringify({ error: 'Telegram API error', details: telegramData }),
      };
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({ success: true, message_id: telegramData.result?.message_id }),
    };

  } catch (err: any) {
    console.error('Netlify Function error:', err);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};
