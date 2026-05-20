import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Save, Bot, MessageCircle, Smartphone } from 'lucide-react';

export default function Configuracion() {
  const [botToken, setBotToken] = useState('');
  const [metodoNotificacion, setMetodoNotificacion] = useState('telegram');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Hola desde Logística Fernaguez. Esta es una notificación de prueba.');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data: tokenData } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'telegram_bot_token')
      .single();

    if (tokenData?.valor) {
      setBotToken(tokenData.valor);
    }

    const { data: methodData } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'metodo_notificacion')
      .single();

    if (methodData?.valor) {
      setMetodoNotificacion(methodData.valor);
    }
  };

  const handleSaveToken = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('configuracion_sistema')
      .update({ valor: botToken, actualizado_en: new Date().toISOString() })
      .eq('clave', 'telegram_bot_token');

    setLoading(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('Error al guardar el token: ' + error.message);
    }
  };

  const handleSaveMethod = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('configuracion_sistema')
      .update({ valor: metodoNotificacion, actualizado_en: new Date().toISOString() })
      .eq('clave', 'metodo_notificacion');

    setLoading(false);
    if (!error) {
      alert(`✅ Método de notificación guardado: ${metodoNotificacion === 'whatsapp' ? 'WhatsApp (UltraMsg)' : 'Telegram (Gratis)'}`);
    } else {
      alert('Error al guardar el método: ' + error.message);
    }
  };

  const handleTestNotification = async () => {
    if (!testChatId) {
      alert('Introduce un Chat ID para probar.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/send-telegram-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: testChatId,
          text: `🔧 *Logística Fernaguez*\n\n${testMessage}`,
          parse_mode: 'Markdown',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✅ Mensaje de prueba enviado correctamente a Telegram.');
      } else {
        alert('❌ Error: ' + (data.error || 'No se pudo enviar'));
      }
    } catch (err: any) {
      alert('❌ Error de conexión: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 h-full">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 gap-4">
          <h2 className="text-xl font-black tracking-tight">Configuración del Sistema</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">

        {/* Selector de Método de Notificación */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Método de Notificación</h3>
              <p className="text-sm text-slate-500">Elige cómo se enviarán las notificaciones a los trabajadores.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opción Telegram */}
              <div
                onClick={() => setMetodoNotificacion('telegram')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  metodoNotificacion === 'telegram'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-sky-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    metodoNotificacion === 'telegram' ? 'border-sky-500' : 'border-slate-300'
                  }`}>
                    {metodoNotificacion === 'telegram' && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-sky-600" />
                    <span className="font-bold text-slate-900 dark:text-white">Telegram (Gratis)</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  Bot de Telegram gratuito. Las notificaciones saltan como mensajes de Telegram. No hay costo mensual.
                </p>
              </div>

              {/* Opción WhatsApp */}
              <div
                onClick={() => setMetodoNotificacion('whatsapp')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  metodoNotificacion === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    metodoNotificacion === 'whatsapp' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {metodoNotificacion === 'whatsapp' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900 dark:text-white">WhatsApp (UltraMsg)</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 ml-8">
                  Servicio UltraMsg de pago (~39€/mes). Las notificaciones llegan como mensajes de WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveMethod}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar Método'}
              </button>
            </div>
          </div>
        </div>

        {/* Telegram Section (solo visible si se elige Telegram) */}
        {metodoNotificacion === 'telegram' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configuración Telegram</h3>
                <p className="text-sm text-slate-500">Configura el bot que enviará mensajes a los trabajadores.</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30 rounded-xl p-4 text-sm text-sky-700 dark:text-sky-400">
                <p className="font-bold mb-1">¿Cómo conseguir el token del bot?</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Abre Telegram y busca <strong>@BotFather</strong>.</li>
                  <li>Envía <code>/newbot</code> y sigue las instrucciones.</li>
                  <li>Copia el token que te dará (parece: <code>123456:ABC...</code>).</li>
                  <li>Pégalo aquí y guarda los cambios.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Token del Bot de Telegram</label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Pega aquí el token de BotFather..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-sm font-mono"
                />
                <p className="text-xs text-slate-400">El token se guarda de forma segura en la base de datos. Nunca se expone al navegador.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveToken}
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 ${
                    saved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-sky-500 text-white hover:bg-sky-600'
                  } disabled:opacity-50`}
                >
                  <Save className="w-4 h-4" />
                  {saved ? '✅ Guardado' : loading ? 'Guardando...' : 'Guardar Token'}
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Probar Notificación</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Chat ID de Prueba</label>
                    <input
                      type="text"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Ej: 8751170701"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Mensaje de Prueba</label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Escribe un mensaje de prueba..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleTestNotification}
                  disabled={loading || !botToken}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
