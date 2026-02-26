import { useEffect, useState } from 'react';
import { OverlayView, InfoWindow } from '@react-google-maps/api';
import {
  fetchAllTrackingHistoricoByViagemId,
  fetchDeliveryEventsForViagem,
  getEffectiveStatusAtTime,
  type DeliveryEvent,
} from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, Loader2, MapPinOff } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  effectiveStatus: string | null;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
}

interface ViagemTrackingMarkersProps {
  viagemId: string | null;
  onBoundsReady?: (bounds: google.maps.LatLngBounds | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
}

const statusLabels: Record<string, string> = {
  'aguardando': 'Aguardando',
  'saiu_para_coleta': 'Saiu para Coleta',
  'saiu_para_entrega': 'Saiu para Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
  'cancelada': 'Cancelada',
};

const statusColors: Record<string, string> = {
  'aguardando': '#f59e0b',
  'saiu_para_coleta': '#06b6d4',
  'saiu_para_entrega': '#a855f7',
  'entregue': '#22c55e',
  'problema': '#ef4444',
  'cancelada': '#6b7280',
};

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ViagemTrackingMarkers({ viagemId, onBoundsReady, onLoadingChange, onEmptyChange }: ViagemTrackingMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!viagemId) {
      setTrackingPoints([]);
      onLoadingChange?.(false);
      onEmptyChange?.(true);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      onLoadingChange?.(true);
      try {
        // Fetch tracking points and delivery events in parallel
        const [rawPoints, deliveryEvents] = await Promise.all([
          fetchAllTrackingHistoricoByViagemId(viagemId, {
            pageSize: 1000,
            maxRows: 50000,
          }),
          fetchDeliveryEventsForViagem(viagemId),
        ]);

        if (!isMounted) return;
        
        const validPoints: TrackingPoint[] = (rawPoints || [])
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            id: p.id,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            status: p.status,
            effectiveStatus: getEffectiveStatusAtTime(deliveryEvents, p.tracked_at),
            tracked_at: p.tracked_at,
            observacao: p.observacao,
            speed: p.speed,
          }));
        
        setTrackingPoints(validPoints);
        onEmptyChange?.(validPoints.length === 0);
        onLoadingChange?.(false);
        
        if (validPoints.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          validPoints.forEach(p => {
            bounds.extend({ lat: p.latitude, lng: p.longitude });
          });
          onBoundsReady?.(bounds);
        } else {
          onBoundsReady?.(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching tracking history:', error);
        setTrackingPoints([]);
        onEmptyChange?.(true);
        onLoadingChange?.(false);
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

  const selectedPoint = selectedPointId ? trackingPoints.find(p => p.id === selectedPointId) : null;

  return (
    <>
      {trackingPoints.map((point, index) => {
        // Use effectiveStatus (from delivery events) first, then raw status, then fallback
        const resolvedStatus = point.effectiveStatus || point.status || 'aguardando';
        const color = statusColors[resolvedStatus] || '#6b7280';
        const label = statusLabels[resolvedStatus] || resolvedStatus || 'Em trânsito';
        const isFirst = index === 0;
        const isLast = index === trackingPoints.length - 1;
        const isHovered = point.id === hoveredPointId;
        const size = isFirst || isLast ? 16 : 12;
        
        return (
          <OverlayView
            key={point.id}
            position={{ lat: point.latitude, lng: point.longitude }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: -size / 2, y: -size / 2 })}
          >
            <div
              className="cursor-pointer transition-transform"
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid white',
                boxShadow: isHovered ? '0 0 8px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
                transform: isHovered ? 'scale(1.3)' : 'scale(1)',
              }}
              onClick={() => setSelectedPointId(point.id === selectedPointId ? null : point.id)}
              onMouseEnter={() => setHoveredPointId(point.id)}
              onMouseLeave={() => setHoveredPointId(null)}
            >
              {isHovered && (
                <div
                  className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[140px]"
                  style={{ bottom: size + 8, left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="text-xs font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(point.tracked_at)}</div>
                  {point.speed != null && <div className="text-xs text-muted-foreground">{Math.round(point.speed)} km/h</div>}
                  {isFirst && <div className="text-xs text-green-600 font-medium mt-1">📍 Início da viagem</div>}
                  {isLast && trackingPoints.length > 1 && <div className="text-xs text-blue-600 font-medium mt-1">📍 Posição atual</div>}
                </div>
              )}
            </div>
          </OverlayView>
        );
      })}

      {selectedPoint && (() => {
        const resolvedStatus = selectedPoint.effectiveStatus || selectedPoint.status || 'aguardando';
        return (
          <InfoWindow
            position={{ lat: selectedPoint.latitude, lng: selectedPoint.longitude }}
            onCloseClick={() => setSelectedPointId(null)}
            options={{ pixelOffset: new google.maps.Size(0, -10) }}
          >
            <div className="min-w-[180px] p-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: statusColors[resolvedStatus] || '#6b7280' }}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{statusLabels[resolvedStatus] || resolvedStatus || 'Em trânsito'}</p>
                  <p className="text-xs text-muted-foreground">
                    Ponto #{trackingPoints.findIndex(p => p.id === selectedPoint.id) + 1} de {trackingPoints.length}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(selectedPoint.tracked_at)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
                  </span>
                </div>
                
                {selectedPoint.observacao && (
                  <div className="mt-2 p-2 bg-muted rounded text-foreground">
                    {selectedPoint.observacao}
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        );
      })()}
    </>
  );
}

export function TrackingHistoryLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
      <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
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
