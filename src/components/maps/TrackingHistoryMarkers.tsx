import { useEffect, useState } from 'react';
import { CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTrackingHistoricoByViagemId } from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, AlertCircle, CheckCircle, Package, Truck } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
}

interface EntregaEvento {
  tipo: string;
  timestamp: string;
}

interface TrackingHistoryMarkersProps {
  entregaId?: string | null;
  viagemId?: string | null;
}

const statusLabels: Record<string, string> = {
  'aguardando': 'Aguardando',
  'saiu_para_coleta': 'Saiu para Coleta',
  'saiu_para_entrega': 'Em Rota',
  'entregue': 'Concluída',
  'problema': 'Problema',
  'cancelada': 'Cancelada',
};

const statusColors: Record<string, string> = {
  'aguardando': '#f59e0b',
  'saiu_para_coleta': '#06b6d4',
  'saiu_para_entrega': '#a855f7',
  'entregue': '#22c55e',
  'problema': '#ef4444',
  'cancelada': '#ef4444',
};

/** Maps entrega_eventos.tipo to a delivery status for dot coloring */
const eventoToStatus: Record<string, string> = {
  'criado': 'aguardando',
  'aceite': 'aguardando',
  'aguardando': 'aguardando',
  'saiu_para_coleta': 'saiu_para_coleta',
  'coletado': 'saiu_para_coleta',
  'saiu_para_entrega': 'saiu_para_entrega',
  'em_transito': 'saiu_para_entrega',
  'entregue': 'entregue',
  'finalizada': 'entregue',
  'problema': 'problema',
  'cancelada': 'cancelada',
};

const terminalEventos = new Set(['entregue', 'finalizada', 'cancelada']);

const StatusIcon = ({ status }: { status: string | null }) => {
  const iconClass = "w-3 h-3";
  switch (status) {
    case 'aguardando':
      return <Clock className={iconClass} />;
    case 'saiu_para_coleta':
      return <Package className={iconClass} />;
    case 'saiu_para_entrega':
      return <Truck className={iconClass} />;
    case 'entregue':
      return <CheckCircle className={iconClass} />;
    case 'problema':
    case 'cancelada':
      return <AlertCircle className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
};

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Given a sorted list of events and a timestamp, find the delivery status
 * at that point in time via binary search.
 */
function getStatusAtTimestamp(events: EntregaEvento[], trackedAt: string): string {
  if (events.length === 0) return 'aguardando';
  const t = new Date(trackedAt).getTime();
  let activeStatus = 'aguardando';
  for (const ev of events) {
    if (new Date(ev.timestamp).getTime() <= t) {
      activeStatus = eventoToStatus[ev.tipo] ?? activeStatus;
    } else {
      break;
    }
  }
  return activeStatus;
}

export function TrackingHistoryMarkers({ entregaId, viagemId }: TrackingHistoryMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);

  useEffect(() => {
    if (!entregaId && !viagemId) {
      setTrackingPoints([]);
      return;
    }

    const fetchTrackingHistory = async () => {
      try {
        let finalViagemId = viagemId;

        // If no viagemId, look it up from the entrega
        if (!finalViagemId && entregaId) {
          const { data: viagemEntrega, error: veError } = await supabase
            .from('viagem_entregas')
            .select('viagem_id')
            .eq('entrega_id', entregaId)
            .limit(1)
            .maybeSingle();
          if (veError) throw veError;
          finalViagemId = viagemEntrega?.viagem_id;
        }

        if (!finalViagemId) {
          setTrackingPoints([]);
          return;
        }

        // Fetch all tracking points for the trip
        const data = await fetchAllTrackingHistoricoByViagemId(finalViagemId, {
          pageSize: 1000,
          maxRows: 50000,
        });

        let validPoints: TrackingPoint[] = (data || [])
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            id: p.id,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            status: p.status,
            tracked_at: p.tracked_at,
            observacao: p.observacao,
            speed: p.speed,
          }));

        // Per-delivery filtering: if entregaId is provided, fetch events and filter
        if (entregaId && validPoints.length > 0) {
          const { data: eventos, error: evError } = await supabase
            .from('entrega_eventos')
            .select('tipo, timestamp')
            .eq('entrega_id', entregaId)
            .order('timestamp', { ascending: true });

          if (!evError && eventos && eventos.length > 0) {
            const sortedEvents: EntregaEvento[] = eventos;

            // Time window: first event -> terminal event (or now)
            const windowStart = new Date(sortedEvents[0].timestamp).getTime();
            const terminalEvent = sortedEvents.find(e => terminalEventos.has(e.tipo));
            const windowEnd = terminalEvent
              ? new Date(terminalEvent.timestamp).getTime()
              : Date.now();

            // Filter points to delivery's time window
            validPoints = validPoints.filter(p => {
              const t = new Date(p.tracked_at).getTime();
              return t >= windowStart && t <= windowEnd;
            });

            // Override status color based on delivery events timeline
            validPoints = validPoints.map(p => ({
              ...p,
              status: getStatusAtTimestamp(sortedEvents, p.tracked_at),
            }));
          }
        }

        setTrackingPoints(validPoints);
      } catch (error) {
        console.error(error);
        setTrackingPoints([]);
      }
    };

    fetchTrackingHistory();
  }, [entregaId, viagemId]);

  if ((!entregaId && !viagemId) || trackingPoints.length === 0) return null;

  return (
    <>
      {trackingPoints.map((point, index) => {
        const color = statusColors[point.status || 'aguardando'] || '#6b7280';
        const label = statusLabels[point.status || 'aguardando'] || point.status || 'Em trânsito';
        const isFirst = index === 0;
        const isLast = index === trackingPoints.length - 1;

        return (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={isFirst || isLast ? 8 : 5}
            pathOptions={{
              color: 'white',
              weight: 2,
              fillColor: color,
              fillOpacity: isFirst || isLast ? 1 : 0.8,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs min-w-[120px]">
                <div className="flex items-center gap-1 font-medium">
                  <StatusIcon status={point.status} />
                  <span>{label}</span>
                </div>
                <div className="text-gray-500 mt-0.5">
                  {formatDateTime(point.tracked_at)}
                </div>
                {isFirst && (
                  <div className="mt-1 text-green-600 font-medium">📍 Início</div>
                )}
                {isLast && trackingPoints.length > 1 && (
                  <div className="mt-1 text-blue-600 font-medium">📍 Atual</div>
                )}
              </div>
            </Tooltip>

            <Popup>
              <div className="min-w-[180px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: color }}
                  >
                    <StatusIcon status={point.status} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-500">
                      Ponto #{index + 1} de {trackingPoints.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(point.tracked_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span>
                  </div>
                  {point.observacao && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">
                      {point.observacao}
                    </div>
                  )}
                </div>

                {isFirst && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Ponto inicial do rastreamento
                    </span>
                  </div>
                )}
                {isLast && trackingPoints.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-blue-600 font-medium">
                      ⬤ Posição mais recente
                    </span>
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
