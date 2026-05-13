import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CargaPrecoEixo {
  carga_id: string;
  numero_eixos: number;
  valor_por_tonelada: number;
  piso_antt_calculado: number;
  distancia_km: number | null;
}

/**
 * Busca todos os preços por eixo de uma lista de cargas em uma única query.
 * Retorna um Map<carga_id, CargaPrecoEixo[]>.
 */
export function useCargaPrecosEixoBatch(cargaIds: string[]) {
  return useQuery({
    queryKey: ['carga_precos_eixo_batch', cargaIds.sort().join(',')],
    queryFn: async () => {
      if (cargaIds.length === 0) return new Map<string, CargaPrecoEixo[]>();
      const { data, error } = await (supabase as any)
        .from('carga_precos_eixo')
        .select('carga_id, numero_eixos, valor_por_tonelada, piso_antt_calculado, distancia_km')
        .in('carga_id', cargaIds as any);
      if (error) throw error;
      const map = new Map<string, CargaPrecoEixo[]>();
      for (const row of (data || []) as any[]) {
        const list = map.get(row.carga_id) ?? [];
        list.push(row as CargaPrecoEixo);
        map.set(row.carga_id, list);
      }
      // ordena por nº de eixos
      for (const list of map.values()) list.sort((a, b) => a.numero_eixos - b.numero_eixos);
      return map;
    },
    enabled: cargaIds.length > 0,
    staleTime: 60_000,
  });
}
