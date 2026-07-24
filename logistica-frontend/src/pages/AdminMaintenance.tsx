import { ShieldAlert } from 'lucide-react';

export default function AdminMaintenance() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Función temporalmente desactivada
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Las funciones de usuarios, contraseñas, roles, permisos y copias de
          seguridad están en mantenimiento de seguridad. Las operaciones de
          órdenes y reportes continúan disponibles.
        </p>
      </section>
    </div>
  );
}
