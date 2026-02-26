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

export type DeliveryEvent = {
  tipo: string;
  timestamp: string;
  entrega_id: string;
};

/** Map event types to effective delivery status */
const eventToStatus: Record<string, string> = {
  'criado': 'aguardando',
  'aceite': 'aguardando',
  'inicio_coleta': 'saiu_para_coleta',
  'inicio_rota': 'saiu_para_entrega',
  'finalizado': 'entregue',
  'cancelado': 'cancelada',
};

/**
 * Given a sorted list of delivery events and a timestamp,
 * determine the effective status at that moment.
 */
export function getEffectiveStatusAtTime(
  events: DeliveryEvent[],
  trackedAt: string,
): string | null {
  const trackedTime = new Date(trackedAt).getTime();
  let effectiveStatus: string | null = null;

  for (const ev of events) {
    if (new Date(ev.timestamp).getTime() > trackedTime) break;
    const mapped = eventToStatus[ev.tipo];
    if (mapped) effectiveStatus = mapped;
  }

  return effectiveStatus;
}

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

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

/**
 * Fetch all entrega_eventos for deliveries belonging to a viagem,
 * sorted by timestamp ascending.
 */
export async function fetchDeliveryEventsForViagem(
  viagemId: string,
): Promise<DeliveryEvent[]> {
  // First get entrega IDs for this viagem
  const { data: links, error: linksError } = await supabase
    .from('viagem_entregas')
    .select('entrega_id')
    .eq('viagem_id', viagemId);

  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const entregaIds = links.map(l => l.entrega_id);

  // Fetch events for all entregas
  const { data: events, error: eventsError } = await supabase
    .from('entrega_eventos')
    .select('tipo, timestamp, entrega_id')
    .in('entrega_id', entregaIds)
    .order('timestamp', { ascending: true });

  if (eventsError) throw eventsError;

  return (events ?? []) as DeliveryEvent[];
}
