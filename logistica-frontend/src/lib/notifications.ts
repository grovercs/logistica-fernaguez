/**
 * Servicio unificado de notificaciones.
 * Soporta WhatsApp (UltraMsg) y Telegram (Bot API).
 * El método se elige desde el panel de Configuración.
 */

import { supabase } from './supabase';
import { notifyNewOrder as notifyWhatsApp } from './whatsapp';
import { notifyNewOrder as notifyTelegram } from './telegram';

let cachedMethod: string | null = null;
let cacheTime = 0;

/**
 * Lee el método de notificación configurado en Supabase.
 * Valida: 'whatsapp' | 'telegram'. Default: 'telegram'.
 */
export const getNotificationMethod = async (): Promise<'whatsapp' | 'telegram'> => {
  // Cache simple de 30 segundos para evitar consultas repetidas
  if (cachedMethod && Date.now() - cacheTime < 30000) {
    return cachedMethod as 'whatsapp' | 'telegram';
  }

  try {
    const { data } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'metodo_notificacion')
      .single();

    const method = data?.valor === 'whatsapp' ? 'whatsapp' : 'telegram';
    cachedMethod = method;
    cacheTime = Date.now();
    return method;
  } catch {
    return 'telegram';
  }
};

/**
 * Envía notificación de nueva orden usando el método configurado.
 * Decide automáticamente si usar WhatsApp o Telegram.
 */
export const notifyNewOrder = async (trabajador: any, orden: any) => {
  const method = await getNotificationMethod();

  if (method === 'whatsapp') {
    // WhatsApp usa el número de teléfono directamente
    if (!trabajador?.telefono) {
      console.warn('WhatsApp: El trabajador no tiene teléfono configurado');
      return { error: 'No telefono' };
    }
    return notifyWhatsApp(trabajador.telefono, {
      id: orden.id,
      id_legible: orden.id_legible,
      cliente: orden.cliente,
      direccion: orden.direccion,
      descripcion: orden.descripcion,
    });
  }

  // Telegram usa telegram_chat_id
  return notifyTelegram(trabajador, orden);
};

/**
 * Envía notificación manual (desde el botón "Re-notificar").
 * Usa el mismo método configurado globalmente.
 */
export const sendNotification = async (trabajador: any, orden: any) => {
  return notifyNewOrder(trabajador, orden);
};
