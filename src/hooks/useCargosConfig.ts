import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CargoInfo {
  nome: string;
  descricao: string;
}

/**
 * Fetches cargo names + descriptions for a given scope via SECURITY DEFINER RPC.
 * Usable by any authenticated user (bypasses super_admin-only RLS on cargos_config).
 */
export function useCargosConfig(escopo: string | null) {
  return useQuery<CargoInfo[]>({
    queryKey: ['cargos_for_scope', escopo],
    queryFn: async () => {
      if (!escopo) return [];
      const { data, error } = await (supabase as any).rpc('get_cargos_for_scope', {
        p_escopo: escopo,
      });
      if (error) {
        console.error('useCargosConfig error:', error);
        return [];
      }
      return (data || []) as CargoInfo[];
    },
    enabled: !!escopo,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
