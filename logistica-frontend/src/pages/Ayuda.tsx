import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Users, ClipboardList, CalendarDays,
  Smartphone, AlertCircle, CheckCircle2, ArrowRightCircle,
  Trash2, Archive, RotateCcw, ShieldCheck, Wrench
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function Ayuda() {
  const [openSection, setOpenSection] = useState<string | null>('flujo');

  const toggle = (id: string) => {
    setOpenSection(prev => (prev === id ? null : id));
  };

  const sections: Section[] = [
    {
      id: 'flujo',
      title: 'Flujo de Trabajo Completo',
      icon: <ArrowRightCircle className="w-5 h-5 text-primary" />,
      content: (
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Desde que se crea una orden hasta que se liquida el trabajo, el sistema sigue este flujo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { step: 1, title: 'Crear Orden', desc: 'El administrador crea una orden de trabajo desde el panel web con los datos del cliente, dirección y descripción.', icon: <ClipboardList className="w-5 h-5" /> },
              { step: 2, title: 'Asignar Trabajador', desc: 'Se asigna un técnico a la orden. El sistema le envía una notificación por Telegram o WhatsApp.', icon: <Users className="w-5 h-5" /> },
              { step: 3, title: 'Trabajar en Obra', desc: 'El técnico llega al domicilio, realiza la intervención y abre la orden en su móvil para reportar.', icon: <Wrench className="w-5 h-5" /> },
              { step: 4, title: 'Reportar Horas y Fotos', desc: 'Desde el móvil o el admin, se registran las horas trabajadas, materiales usados y se suben fotos.', icon: <Smartphone className="w-5 h-5" /> },
              { step: 5, title: 'Firma del Cliente', desc: 'El cliente firma digitalmente en el móvil del técnico para confirmar que el trabajo está realizado.', icon: <CheckCircle2 className="w-5 h-5" /> },
              { step: 6, title: 'Finalizar y Liquidar', desc: 'El administrador finaliza la orden. Las horas pasan a Liquidaciones donde se procesan los pagos.', icon: <CalendarDays className="w-5 h-5" /> },
            ].map(item => (
              <div key={item.step} className="flex gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {item.icon} {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Consejo
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Una orden puede tener varios reportes de trabajo (varios días o varios técnicos). Cada reporte registra sus propias horas y fotos.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'admin',
      title: 'Guía del Administrador',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <h4 className="font-bold text-slate-900 dark:text-white">Crear una Orden</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Ve a <strong>Órdenes de Trabajo</strong> y haz clic en <strong>Nueva Orden</strong>.</li>
            <li>Rellena los datos del cliente, dirección, descripción del trabajo y fecha programada.</li>
            <li>Guarda la orden. El sistema genera automáticamente un ID único tipo <code>OB-2026-XXXX</code>.</li>
            <li>En el detalle de la orden, haz clic en <strong>Asignar</strong> para enviarla a un técnico.</li>
          </ol>

          <h4 className="font-bold text-slate-900 dark:text-white mt-4">Gestionar Estados</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Pendiente</strong>: orden creada pero sin asignar.</li>
            <li><strong>En Curso</strong>: el técnico está trabajando en ella.</li>
            <li><strong>Pendiente de firma</strong>: trabajo hecho, falta la firma del cliente.</li>
            <li><strong>Finalizada</strong>: trabajo completado y firmado.</li>
            <li><strong>Archivado</strong>: orden cerrada, se guarda para consulta.</li>
            <li><strong>Papelera</strong>: orden "eliminada" pero recuperable.</li>
          </ul>

          <h4 className="font-bold text-slate-900 dark:text-white mt-4">Liquidaciones</h4>
          <p>Ve a <strong>Liquidaciones</strong> para ver las horas trabajadas por cada técnico. Puedes filtrar por fecha, trabajador y obra, y exportar a Excel.</p>
        </div>
      ),
    },
    {
      id: 'trabajador',
      title: 'Guía del Trabajador (Móvil)',
      icon: <Smartphone className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <h4 className="font-bold text-slate-900 dark:text-white">Acceder desde el Móvil</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Abre la app en tu móvil e inicia sesión con tu usuario y contraseña.</li>
            <li>Verás la lista de órdenes asignadas a ti. La más reciente aparece resaltada.</li>
            <li>Toca una orden para ver los detalles: dirección, descripción, contacto del cliente.</li>
          </ol>

          <h4 className="font-bold text-slate-900 dark:text-white mt-4">Reportar Trabajo</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Dentro de la orden, toca <strong>Crear Reporte</strong>.</li>
            <li>Indica las <strong>horas trabajadas</strong> y escribe qué hiciste y qué materiales usaste.</li>
            <li>Sube fotos de la intervención si es necesario.</li>
            <li>El cliente firma digitalmente en la pantalla.</li>
            <li>Guarda el reporte. La orden pasará a estado <em>Pendiente de firma</em> o <em>En Curso</em>.</li>
          </ol>

          <h4 className="font-bold text-slate-900 dark:text-white mt-4">Ver tus Horas</h4>
          <p>Los trabajadores con rol <strong>Técnico</strong>, <strong>Visualizador</strong> o <strong>Trabajador</strong> pueden entrar al panel web y ver <strong>Mis Liquidaciones</strong> para consultar las horas acumuladas.</p>
        </div>
      ),
    },
    {
      id: 'papelera',
      title: 'Papelera y Archivado',
      icon: <Archive className="w-5 h-5 text-amber-500" />,
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">Archivar</h4>
              </div>
              <p>La orden se cierra y desaparece de la lista principal, pero sigue visible en la pestaña <strong>Archivadas</strong>. Sirve para guardar órdenes finalizadas.</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">Mover a Papelera</h4>
              </div>
              <p>La orden desaparece de todas las vistas pero <strong>NO se borra</strong>. Puedes recuperarla desde la pestaña <strong>Papelera</strong> con el botón <strong>Restaurar</strong>.</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Importante
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Las órdenes en Papelera no aparecen en el Calendario ni en Liquidaciones. Los reportes y fotos siguen existiendo en la base de datos hasta que se borren definitivamente.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'roles',
      title: 'Roles y Permisos',
      icon: <Users className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Puede ver</th>
                  <th className="px-4 py-3">Puede editar</th>
                  <th className="px-4 py-3">Restricciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Administrador</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Todo</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Todo</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Editor</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Todo</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Crear y editar órdenes, reportes y asignaciones</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">No puede gestionar roles ni usuarios</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Trabajador / Técnico / Visualizador</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Sólo sus órdenes, calendario y liquidaciones</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Sólo reportes de sus órdenes</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">No puede crear órdenes ni asignar técnicos</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            El rol se asigna desde el panel <strong>Usuarios</strong>. Cada usuario debe tener un perfil vinculado en la tabla <strong>Perfiles</strong>.
          </p>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'Preguntas Frecuentes (FAQ)',
      icon: <BookOpen className="w-5 h-5 text-sky-500" />,
      content: (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              ¿Por qué no veo mi orden en el Calendario?
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              Si la orden está en estado <strong>Papelera</strong> o <strong>Archivado</strong>, no aparece en el Calendario. También verifica que estés en el mes correcto.
            </div>
          </details>

          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              ¿Cómo borro una foto subida por error?
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              Entra al detalle de la orden, busca el reporte con la foto, y haz clic en la <strong>X roja</strong> que aparece en la esquina de la imagen. Esto borra la foto de Cloudinary y de la base de datos.
            </div>
          </details>

          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              Un trabajador ve órdenes de otros compañeros
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              Verifica el <strong>rol</strong> del usuario en el panel <strong>Usuarios</strong>. Si tiene rol <strong>Administrador</strong> o <strong>Editor</strong>, verá todo. Debe ser <strong>Trabajador</strong>, <strong>Técnico</strong> o <strong>Visualizador</strong> para que el filtro funcione.
            </div>
          </details>

          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              El técnico no recibe la notificación de Telegram
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              Asegúrate de que el trabajador tenga el <strong>Chat ID de Telegram</strong> correcto en su ficha (página Trabajadores). También debe haber iniciado conversación con el bot de Fernaguez en Telegram.
            </div>
          </details>

          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              ¿Puedo recuperar una orden movida a la Papelera?
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              Sí. Ve a <strong>Órdenes de Trabajo → Papelera</strong>, abre la orden y haz clic en <strong>Restaurar</strong>. Volverá a estado <em>Pendiente</em> y reaparecerá en todas las vistas.
            </div>
          </details>

          <details className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-900 dark:text-white">
              ¿Qué hago si el sistema no se actualiza en el móvil?
              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4 text-slate-600 dark:text-slate-300">
              La app es una PWA (Progressive Web App) y el navegador puede tener versiones cacheadas. Fuerza la actualización: en Chrome, abre los 3 puntos → <strong>Actualizar</strong>, o cierra completamente el navegador y vuelve a entrar.
            </div>
          </details>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Manual de Usuario</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Cómo usar Logística Fernaguez
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map(section => (
            <div
              key={section.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{section.title}</span>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${openSection === section.id ? 'rotate-90' : ''}`}
                />
              </button>
              {openSection === section.id && (
                <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            ¿Necesitas más ayuda?
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Contacta con el soporte técnico de Vielha Computer
          </p>
          <a
            href="https://vielhacomputer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <RotateCcw className="w-4 h-4" />
            Soporte Técnico
          </a>
        </div>
      </div>
    </div>
  );
}
