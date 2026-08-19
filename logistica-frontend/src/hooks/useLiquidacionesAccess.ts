import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Lightweight in-memory cache to avoid duplicate access checks on the same page
// load (e.g. Layout + RequireLiquidacionesAccess both using the hook).
const cache = new Map<string, { isAllowed: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

export function useLiquidacionesAccess() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setIsAllowed(false);
        setLoading(false);
        return;
      }

      const cached = cache.get(session.user.id);
      if (cached && cached.expiresAt > Date.now()) {
        setIsAllowed(cached.isAllowed);
        setLoading(false);
        return;
      }

      const { error } = await supabase.rpc('admin_get_liquidaciones', {
        p_trabajador_id: null,
        p_periodo: null,
        p_estado: null,
        p_limit: 1,
        p_offset: 0,
      });

      let allowed = true;
      if (error) {
        const code = (error.message || '').trim();
        if (code === 'FORBIDDEN' || code === 'AUTH_REQUIRED') {
          allowed = false;
        } else {
          console.error('Liquidaciones access check failed:', error);
          allowed = false;
        }
      }

      cache.set(session.user.id, { isAllowed: allowed, expiresAt: Date.now() + CACHE_TTL_MS });
      setIsAllowed(allowed);
      setLoading(false);
    };

    checkAccess();
  }, []);

  return { isAllowed, loading };
}
