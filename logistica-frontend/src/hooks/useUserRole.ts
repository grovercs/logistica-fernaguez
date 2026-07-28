import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useUserRole() {
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

  const isAdmin = role === 'Administrador';
  const isEditor = role === 'Editor' || isAdmin;
  const isTecnico = role === 'Técnico';
  const isVisualizador = role === 'Visualizador';
  const isTrabajador = role === 'Trabajador';
  const isWorker = isTrabajador;

  return { role, loading, isAdmin, isEditor, isTecnico, isVisualizador, isTrabajador, isWorker };
}
