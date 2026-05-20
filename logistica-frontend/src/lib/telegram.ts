/**
 * Servicio para envío de notificaciones vía Telegram Bot.
 * Reemplaza a UltraMsg/WhatsApp. El token del bot se lee de forma segura
 * desde Supabase a través de una Netlify Function (nunca expuesto al navegador).
 */

export const sendTelegramMessage = async (chatId: string, message: string) => {
  try {
    console.log(`Telegram: Enviando mensaje a chat_id ${chatId}...`);

    const response = await fetch('/.netlify/functions/send-telegram-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Telegram: Error del servidor', data);
      return { error: data.error || 'Server error', details: data };
    }

    console.log('Telegram: Mensaje enviado con éxito', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Telegram: Error crítico de conexión', error);
    return { error: 'Network error', details: error.message };
  }
};

/**
 * Genera un mensaje predefinido para una nueva orden y lo envía al trabajador.
 * El trabajador debe tener telegram_chat_id configurado.
 */
export const notifyNewOrder = async (trabajador: any, orden: any) => {
  if (!trabajador?.telegram_chat_id) {
    console.warn('Telegram: El trabajador no tiene chat_id configurado');
    return { error: 'No telegram_chat_id' };
  }

  const msg =
    `🚀 *NUEVA ORDEN ASIGNADA* \n\n` +
    `📍 *ID:* ${orden.id_legible || orden.id}\n` +
    `👤 *Cliente:* ${orden.cliente}\n` +
    `🏠 *Dirección:* ${orden.direccion}\n` +
    `📝 *Trabajo:* ${orden.descripcion}\n\n` +
    `🔗 [Abrir orden en la app](https://app.appvielha.com/m/ordenes/${orden.id})`;

  return sendTelegramMessage(trabajador.telegram_chat_id, msg);
};
