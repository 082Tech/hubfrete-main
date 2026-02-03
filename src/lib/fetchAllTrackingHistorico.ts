import { supabase } from '@/integrations/supabase/client';

export type TrackingHistoricoRow = {
  id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
  heading: number | null;
};

/**
 * Supabase/PostgREST pode impor max-rows=1000 por request.
 * Esta função pagina via range() para buscar todos os registros por viagem.
 */
export async function fetchAllTrackingHistoricoByViagemId(
  viagemId: string,
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
      .select('id, latitude, longitude, status, tracked_at, observacao, speed, heading')
      .eq('viagem_id', viagemId)
      .order('tracked_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as TrackingHistoricoRow[];
    rows.push(...batch);

    if (batch.length < pageSize) break; // acabou
    from += pageSize;
  }

  return rows;
}
