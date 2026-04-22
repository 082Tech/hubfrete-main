import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AnttPisoRow } from '@/lib/antt';

let cache: AnttPisoRow[] | null = null;
let cachePromise: Promise<AnttPisoRow[]> | null = null;

async function fetchPisos(): Promise<AnttPisoRow[]> {
  const { data, error } = await supabase
    .from('antt_pisos' as any)
    .select('id, categoria_carga, numero_eixos, valor_por_km, valor_por_km_carga_lotacao, vigente_desde, ativo')
    .eq('ativo', true)
    .order('vigente_desde', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as AnttPisoRow[];
}

/**
 * Hook que carrega a tabela ANTT vigente (cache em memória por sessão).
 */
export function useAnttPisos() {
  const [pisos, setPisos] = useState<AnttPisoRow[]>(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    let mounted = true;
    if (!cachePromise) {
      cachePromise = fetchPisos();
    }
    cachePromise
      .then((data) => {
        cache = data;
        if (mounted) {
          setPisos(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        cachePromise = null;
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { pisos, loading, error, refetch: () => {
    cache = null;
    cachePromise = null;
    setLoading(true);
    fetchPisos().then((data) => {
      cache = data;
      setPisos(data);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  } };
}
