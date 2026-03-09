import { useEffect, useState } from 'react';
import { CircleMarker, Tooltip, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTrackingHistoricoByViagemId } from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, Gauge, Navigation } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
  heading: number | null;
}

interface OriginDestination {
  latitude: number;
  longitude: number;
  label: string;
}

interface TrackingHistoryMarkersProps {
  entregaId?: string | null;
  viagemId?: string | null;
  hideOriginDestination?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  onPointsLoaded?: (points: TrackingPoint[], origin: OriginDestination | null, destination: OriginDestination | null) => void;
}

/** HubFrete primary green (HSL 161 93% 30%) ≈ #05924d */
const HUBFRETE_GREEN = '#05924d';

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Create a custom icon for O/D markers */
function createODIcon(letter: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        font-weight: 700; font-size: 13px; color: white;
        font-family: system-ui, sans-serif;
      ">${letter}</div>
      <div style="
        width: 0; height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${color};
        margin: -2px auto 0;
      "></div>
    `,
  });
}

const originIcon = createODIcon('O', '#16a34a');
const destinationIcon = createODIcon('D', '#dc2626');

export function TrackingHistoryMarkers({ entregaId, viagemId, onLoadingChange, onPointsLoaded }: TrackingHistoryMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [origin, setOrigin] = useState<OriginDestination | null>(null);
  const [destination, setDestination] = useState<OriginDestination | null>(null);

  useEffect(() => {
    if (!entregaId && !viagemId) {
      setTrackingPoints([]);
      setOrigin(null);
      setDestination(null);
      onLoadingChange?.(false);
      return;
    }

    let isMounted = true;
    onLoadingChange?.(true);

    const fetchTrackingHistory = async () => {
      try {
        let finalViagemId = viagemId;
        let resolvedEntregaId = entregaId;

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

        // Fetch origin/destination from the entrega's carga
        let fetchedOrigin: OriginDestination | null = null;
        let fetchedDestination: OriginDestination | null = null;

        // If we have entregaId, fetch O/D from its carga
        if (resolvedEntregaId) {
          const { data: entregaData } = await supabase
            .from('entregas')
            .select(`
              carga:cargas(
                endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(latitude, longitude, cidade, estado),
                endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(latitude, longitude, cidade, estado)
              )
            `)
            .eq('id', resolvedEntregaId)
            .maybeSingle();

          const carga = (entregaData as any)?.carga;
          if (carga?.endereco_origem?.latitude && carga?.endereco_origem?.longitude) {
            fetchedOrigin = {
              latitude: Number(carga.endereco_origem.latitude),
              longitude: Number(carga.endereco_origem.longitude),
              label: `${carga.endereco_origem.cidade || ''}/${carga.endereco_origem.estado || ''}`,
            };
          }
          if (carga?.endereco_destino?.latitude && carga?.endereco_destino?.longitude) {
            fetchedDestination = {
              latitude: Number(carga.endereco_destino.latitude),
              longitude: Number(carga.endereco_destino.longitude),
              label: `${carga.endereco_destino.cidade || ''}/${carga.endereco_destino.estado || ''}`,
            };
          }
        }
        // If only viagemId, try to get O/D from the first entrega of the viagem
        else if (finalViagemId) {
          const { data: veLinks } = await supabase
            .from('viagem_entregas')
            .select('entrega_id')
            .eq('viagem_id', finalViagemId)
            .limit(1);

          if (veLinks && veLinks.length > 0) {
            const { data: entregaData } = await supabase
              .from('entregas')
              .select(`
                carga:cargas(
                  endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(latitude, longitude, cidade, estado),
                  endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(latitude, longitude, cidade, estado)
                )
              `)
              .eq('id', veLinks[0].entrega_id)
              .maybeSingle();

            const carga = (entregaData as any)?.carga;
            if (carga?.endereco_origem?.latitude && carga?.endereco_origem?.longitude) {
              fetchedOrigin = {
                latitude: Number(carga.endereco_origem.latitude),
                longitude: Number(carga.endereco_origem.longitude),
                label: `${carga.endereco_origem.cidade || ''}/${carga.endereco_origem.estado || ''}`,
              };
            }
            if (carga?.endereco_destino?.latitude && carga?.endereco_destino?.longitude) {
              fetchedDestination = {
                latitude: Number(carga.endereco_destino.latitude),
                longitude: Number(carga.endereco_destino.longitude),
                label: `${carga.endereco_destino.cidade || ''}/${carga.endereco_destino.estado || ''}`,
              };
            }
          }
        }

        if (!finalViagemId) {
          if (!isMounted) return;
          setTrackingPoints([]);
          setOrigin(fetchedOrigin);
          setDestination(fetchedDestination);
          onLoadingChange?.(false);
          onPointsLoaded?.([], fetchedOrigin, fetchedDestination);
          return;
        }

        const data = await fetchAllTrackingHistoricoByViagemId(finalViagemId, {
          pageSize: 1000,
          maxRows: 50000,
        });

        if (!isMounted) return;

        let validPoints: TrackingPoint[] = (data || [])
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            id: p.id,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            tracked_at: p.tracked_at,
            observacao: p.observacao,
            speed: p.speed,
            heading: p.heading,
          }));

        // Per-delivery filtering: if entregaId is provided, filter by time window
        if (entregaId && validPoints.length > 0) {
          const { data: eventos, error: evError } = await supabase
            .from('entrega_eventos')
            .select('tipo, timestamp')
            .eq('entrega_id', entregaId)
            .order('timestamp', { ascending: true });

          const terminalEventos = new Set(['entregue', 'finalizada', 'cancelada']);

          if (!evError && eventos && eventos.length > 0) {
            const windowStart = new Date(eventos[0].timestamp).getTime();
            const terminalEvent = eventos.find(e => terminalEventos.has(e.tipo));
            const windowEnd = terminalEvent
              ? new Date(terminalEvent.timestamp).getTime()
              : Date.now();

            validPoints = validPoints.filter(p => {
              const t = new Date(p.tracked_at).getTime();
              return t >= windowStart && t <= windowEnd;
            });
          }
        }

        setTrackingPoints(validPoints);
        setOrigin(fetchedOrigin);
        setDestination(fetchedDestination);
        onLoadingChange?.(false);
        onPointsLoaded?.(validPoints, fetchedOrigin, fetchedDestination);
      } catch (error) {
        if (!isMounted) return;
        console.error(error);
        setTrackingPoints([]);
        setOrigin(null);
        setDestination(null);
        onLoadingChange?.(false);
        onPointsLoaded?.([], null, null);
      }
    };

    fetchTrackingHistory();

    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregaId, viagemId]);

  return (
    <>
      {/* Origin marker */}
      {origin && (
        <Marker position={[origin.latitude, origin.longitude]} icon={originIcon}>
          <Tooltip direction="top" offset={[0, -36]} opacity={0.95} permanent={false}>
            <div className="text-xs font-medium">
              <span className="text-green-600">Origem</span>
              {origin.label && <span className="text-muted-foreground ml-1">• {origin.label}</span>}
            </div>
          </Tooltip>
        </Marker>
      )}

      {/* Destination marker */}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
          <Tooltip direction="top" offset={[0, -36]} opacity={0.95} permanent={false}>
            <div className="text-xs font-medium">
              <span className="text-red-600">Destino</span>
              {destination.label && <span className="text-muted-foreground ml-1">• {destination.label}</span>}
            </div>
          </Tooltip>
        </Marker>
      )}

      {/* Tracking points */}
      {trackingPoints.map((point, index) => {
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
              fillColor: HUBFRETE_GREEN,
              fillOpacity: isFirst || isLast ? 1 : 0.8,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div className="text-xs min-w-[130px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(point.tracked_at)}</span>
                </div>
                {point.speed != null && (
                  <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                    <Gauge className="w-3 h-3" />
                    <span>{Math.round(point.speed)} km/h</span>
                  </div>
                )}
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
                    style={{ backgroundColor: HUBFRETE_GREEN }}
                  >
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Ponto de rastreamento</p>
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
                  {point.speed != null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Gauge className="w-3 h-3" />
                      <span>{Math.round(point.speed)} km/h</span>
                    </div>
                  )}
                  {point.heading != null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Navigation className="w-3 h-3" style={{ transform: `rotate(${point.heading}deg)` }} />
                      <span>Direção: {Math.round(point.heading)}°</span>
                    </div>
                  )}
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
