import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function RequireRole({ children, allowedRoles = ['Administrador'] }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('perfiles')
        .select('roles(nombre)')
        .eq('id', session.user.id)
        .single();

      const roleName = (data?.roles as any)?.nombre || 'Sin rol';
      setRole(roleName);
      setLoading(false);
    };
    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-slate-600 font-bold">
        Verificando permisos...
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
