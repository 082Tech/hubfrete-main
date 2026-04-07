import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpresaCargo {
  id: string;
  nome: string;
  descricao: string | null;
  editavel: boolean;
}

/**
 * Fetches company-specific roles from empresa_cargos_config via SECURITY DEFINER RPC.
 */
export function useEmpresaCargos(empresaId: number | null) {
  return useQuery<EmpresaCargo[]>({
    queryKey: ['empresa_cargos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await (supabase as any).rpc('get_empresa_cargos', {
        p_empresa_id: empresaId,
      });
      if (error) {
        console.error('useEmpresaCargos error:', error);
        return [];
      }
      return (data || []) as EmpresaCargo[];
    },
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });
}
