import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if the current admin user has a specific permission.
 * Queries the cargo_permissoes table based on the user's torre role.
 */
export function useAdminPermission(permissao: string) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }

        // Get the user's torre role
        const { data: torreUser } = await (supabase as any)
          .from('torre_users')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('ativo', true)
          .single();

        if (!torreUser) {
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }

        // super_admin always has access
        if (torreUser.role === 'super_admin') {
          if (!cancelled) { setAllowed(true); setLoading(false); }
          return;
        }

        // Check cargo_permissoes - use RPC to avoid RLS issues (non-super_admin can't read the table)
        const { data: permData } = await (supabase as any)
          .rpc('has_cargo_permission', {
            p_escopo: 'torre',
            p_cargo: torreUser.role,
            p_permissao: permissao,
          });

        if (!cancelled) {
          setAllowed(permData === true);
          setLoading(false);
        }
      } catch (err) {
        console.error('useAdminPermission error:', err);
        if (!cancelled) { setAllowed(false); setLoading(false); }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [permissao]);

  return { allowed, loading };
}
