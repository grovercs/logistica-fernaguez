
/**
 * Servicio para envío de notificaciones vía WhatsApp utilizando UltraMsg.
 * Se recomienda configurar las variables de entorno VITE_WHATSAPP_INSTANCE_ID y VITE_WHATSAPP_TOKEN.
 */

const INSTANCE_ID = import.meta.env.VITE_WHATSAPP_INSTANCE_ID || '';
const TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || '';

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  if (!INSTANCE_ID || !TOKEN) {
    console.warn("WhatsApp: Credenciales no configuradas (INSTANCE_ID o TOKEN).");
    return { error: "Missing credentials" };
  }
  
  // Limpiar el teléfono y asegurar código de país (España +34 por defecto si no tiene)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 9) {
    cleanPhone = `34${cleanPhone}`;
  }

  try {
    const response = await fetch(`https://api.ultramsg.com/${INSTANCE_ID}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: TOKEN,
        to: cleanPhone,
        body: message
      })
    });
    
    const data = await response.json();
    console.log("WhatsApp: Mensaje enviado", data);
    return data;
  } catch (error) {
    console.error("WhatsApp: Error al enviar mensaje", error);
    return { error: "API connection failed" };
  }
};

/**
 * Genera un mensaje predefinido para una nueva orden.
 */
export const notifyNewOrder = async (phone: string, orden: any) => {
  const msg = `🚀 *NUEVA ORDEN ASIGNADA* \n\n` +
              `📍 *ID:* ${orden.id_legible}\n` +
              `👤 *Cliente:* ${orden.cliente}\n` +
              `🏠 *Dirección:* ${orden.direccion}\n` +
              `📝 *Trabajo:* ${orden.descripcion}\n\n` +
              `Por favor, revisa la app para más detalles: https://app.appvielha.com/m/ordenes/${orden.id}`;
  
  return sendWhatsAppMessage(phone, msg);
};
