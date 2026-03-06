import { useEffect, useState } from 'react';
import { OverlayView, InfoWindow } from '@react-google-maps/api';
import {
  fetchAllTrackingHistoricoByViagemId,
  fetchViagemStatus,
  type ViagemStatus,
} from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, Loader2, MapPinOff, Gauge, Navigation } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
  heading: number | null;
}

interface ViagemTrackingMarkersProps {
  viagemId: string | null;
  onBoundsReady?: (bounds: google.maps.LatLngBounds | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  onStatsReady?: (stats: TrackingStats | null) => void;
  onViagemStatusReady?: (status: ViagemStatus | null) => void;
}

export interface TrackingStats {
  totalPoints: number;
  firstTimestamp: string;
  lastTimestamp: string;
  durationMinutes: number;
  avgSpeed: number | null;
  maxSpeed: number | null;
}

/** HubFrete primary green (HSL 161 93% 30%) ≈ #05924d */
const HUBFRETE_GREEN = '#05924d';

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ViagemTrackingMarkers({
  viagemId,
  onBoundsReady,
  onLoadingChange,
  onEmptyChange,
  onStatsReady,
  onViagemStatusReady,
}: ViagemTrackingMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!viagemId) {
      setTrackingPoints([]);
      onLoadingChange?.(false);
      onEmptyChange?.(true);
      onStatsReady?.(null);
      onViagemStatusReady?.(null);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      onLoadingChange?.(true);
      try {
        const [rawPoints, vStatus] = await Promise.all([
          fetchAllTrackingHistoricoByViagemId(viagemId, {
            pageSize: 1000,
            maxRows: 50000,
          }),
          fetchViagemStatus(viagemId),
        ]);

        if (!isMounted) return;

        onViagemStatusReady?.(vStatus);

        const validPoints: TrackingPoint[] = (rawPoints || [])
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

        setTrackingPoints(validPoints);
        onEmptyChange?.(validPoints.length === 0);
        onLoadingChange?.(false);

        if (validPoints.length > 0) {
          const speeds = validPoints
            .map((p) => p.speed)
            .filter((s): s is number => s != null && s > 0);
          const firstTs = validPoints[0].tracked_at;
          const lastTs = validPoints[validPoints.length - 1].tracked_at;
          const durationMs = new Date(lastTs).getTime() - new Date(firstTs).getTime();

          onStatsReady?.({
            totalPoints: validPoints.length,
            firstTimestamp: firstTs,
            lastTimestamp: lastTs,
            durationMinutes: durationMs / 60000,
            avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
            maxSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
          });

          const bounds = new google.maps.LatLngBounds();
          validPoints.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
          onBoundsReady?.(bounds);
        } else {
          onStatsReady?.(null);
          onBoundsReady?.(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching tracking history:', error);
        setTrackingPoints([]);
        onEmptyChange?.(true);
        onLoadingChange?.(false);
        onStatsReady?.(null);
        onBoundsReady?.(null);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viagemId]);

  if (!viagemId || trackingPoints.length === 0) return null;

  const selectedPoint = selectedPointId ? trackingPoints.find((p) => p.id === selectedPointId) : null;

  return (
    <>
      {trackingPoints.map((point, index) => {
        const isFirst = index === 0;
        const isLast = index === trackingPoints.length - 1;
        const isHovered = point.id === hoveredPointId;
        const isSelected = point.id === selectedPointId;
        const size = isFirst || isLast ? 16 : isHovered || isSelected ? 14 : 10;

        return (
          <OverlayView
            key={point.id}
            position={{ lat: point.latitude, lng: point.longitude }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: -size / 2, y: -size / 2 })}
          >
            <div
              className="cursor-pointer transition-all duration-150"
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: HUBFRETE_GREEN,
                border: `2px solid ${isFirst || isLast ? 'white' : 'rgba(255,255,255,0.7)'}`,
                boxShadow: isHovered || isSelected
                  ? `0 0 10px ${HUBFRETE_GREEN}80`
                  : '0 1px 3px rgba(0,0,0,0.3)',
                transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                opacity: isFirst || isLast ? 1 : 0.85,
              }}
              onClick={() => setSelectedPointId(point.id === selectedPointId ? null : point.id)}
              onMouseEnter={() => setHoveredPointId(point.id)}
              onMouseLeave={() => setHoveredPointId(null)}
            >
              {isHovered && (
                <div
                  className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-2.5 min-w-[160px] pointer-events-none"
                  style={{ bottom: size + 8, left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="text-xs text-foreground font-medium">{formatDateTime(point.tracked_at)}</div>
                  {point.speed != null && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Gauge className="w-3 h-3" /> {Math.round(point.speed)} km/h
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                  </div>
                  {isFirst && <div className="text-xs text-green-600 font-medium mt-1">📍 Início da viagem</div>}
                  {isLast && trackingPoints.length > 1 && (
                    <div className="text-xs text-blue-600 font-medium mt-1">📍 Última posição</div>
                  )}
                </div>
              )}
            </div>
          </OverlayView>
        );
      })}

      {selectedPoint && (() => (
        <InfoWindow
          position={{ lat: selectedPoint.latitude, lng: selectedPoint.longitude }}
          onCloseClick={() => setSelectedPointId(null)}
          options={{ pixelOffset: new google.maps.Size(0, -10) }}
        >
          <div className="min-w-[200px] p-1.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: HUBFRETE_GREEN }}
              >
                <MapPin className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Ponto de rastreamento</p>
                <p className="text-xs text-muted-foreground">
                  Ponto #{trackingPoints.findIndex((p) => p.id === selectedPoint.id) + 1} de{' '}
                  {trackingPoints.length}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{formatDateTime(selectedPoint.tracked_at)}</span>
              </div>

              {selectedPoint.speed != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="w-3 h-3 flex-shrink-0" />
                  <span>{Math.round(selectedPoint.speed)} km/h</span>
                </div>
              )}

              {selectedPoint.heading != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="w-3 h-3 flex-shrink-0" style={{ transform: `rotate(${selectedPoint.heading}deg)` }} />
                  <span>Direção: {Math.round(selectedPoint.heading)}°</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>
                  {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
                </span>
              </div>

              {selectedPoint.observacao && (
                <div className="mt-2 p-2 bg-muted rounded text-foreground">{selectedPoint.observacao}</div>
              )}
            </div>
          </div>
        </InfoWindow>
      ))()}
    </>
  );
}

export { formatDuration };

export function TrackingHistoryLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
      <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando histórico de rastreamento...</p>
      </div>
    </div>
  );
}

export function TrackingHistoryEmptyOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
      <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
        <MapPinOff className="w-10 h-10 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium text-foreground">Nenhum histórico encontrado</p>
          <p className="text-sm text-muted-foreground">Ainda não há registros de rastreamento para esta viagem</p>
        </div>
      </div>
    </div>
  );
}
