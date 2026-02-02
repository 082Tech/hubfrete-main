import { supabase } from '@/integrations/supabase/client';

export type TrackingHistoricoRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  observacao: string | null;
};

/**
 * Supabase/PostgREST pode impor max-rows=1000 por request.
 * Esta função pagina via range() para buscar todos os registros.
 */
export async function fetchAllTrackingHistoricoByEntregaId(
  entregaId: string,
  opts?: {
    pageSize?: number;
    maxRows?: number;
  },
): Promise<TrackingHistoricoRow[]> {
  const pageSize = opts?.pageSize ?? 1000;
  const maxRows = opts?.maxRows ?? 50000;

  const rows: TrackingHistoricoRow[] = [];
  let from = 0;

  while (rows.length < maxRows) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('tracking_historico')
      .select('id, latitude, longitude, status, created_at, observacao')
      .eq('entrega_id', entregaId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as TrackingHistoricoRow[];
    rows.push(...batch);

    if (batch.length < pageSize) break; // acabou
    from += pageSize;
  }

  return rows;
}
