import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that fetches which permission categories are enabled for a given escopo+cargo.
 * Returns a Set of allowed categories (e.g. 'financeiro', 'cargas', 'relatorios').
 * 
 * For full-access roles (super_admin, ADMIN), returns null meaning "all allowed".
 */
export function useCargoPermissions(escopo: string | null, cargo: string | null) {
  const [allowedCategories, setAllowedCategories] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escopo || !cargo) {
      setLoading(false);
      return;
    }

    // Full-access roles bypass permission checks
    const fullAccessRoles: Record<string, string[]> = {
      torre: ['super_admin'],
      embarcador: ['ADMIN'],
      transportadora: ['ADMIN'],
    };

    if ((fullAccessRoles[escopo] || []).includes(cargo)) {
      setAllowedCategories(null); // null = all allowed
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        const { data, error } = await (supabase as any).rpc('get_cargo_allowed_categories', {
          p_escopo: escopo,
          p_cargo: cargo,
        });

        if (!cancelled) {
          if (error) {
            console.error('useCargoPermissions error:', error);
            setAllowedCategories(new Set());
          } else {
            setAllowedCategories(new Set(data || []));
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('useCargoPermissions error:', err);
        if (!cancelled) {
          setAllowedCategories(new Set());
          setLoading(false);
        }
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [escopo, cargo]);

  /**
   * Check if the user has access to at least one permission in the given category.
   * If allowedCategories is null, user has full access (returns true).
   * Pass multiple categories with OR logic.
   */
  function hasCategoryAccess(...categories: string[]): boolean {
    if (allowedCategories === null) return true; // full access
    return categories.some(cat => allowedCategories.has(cat));
  }

  return { hasCategoryAccess, loading, allowedCategories };
}
