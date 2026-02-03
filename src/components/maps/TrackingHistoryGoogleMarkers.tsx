import { useEffect, useState } from 'react';
import { OverlayView, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTrackingHistoricoByViagemId } from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, Loader2, MapPinOff } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
}

interface TrackingHistoryGoogleMarkersProps {
  entregaId: string | null;
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
  'aguardando': '#6b7280',
  'saiu_para_coleta': '#3b82f6',
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

export function TrackingHistoryGoogleMarkers({ entregaId, onBoundsReady, onLoadingChange, onEmptyChange }: TrackingHistoryGoogleMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!entregaId) {
      setTrackingPoints([]);
      onLoadingChange?.(false);
      onEmptyChange?.(true);
      return;
    }

    let isMounted = true;

    const fetchTrackingHistory = async () => {
      onLoadingChange?.(true);
      try {
        // First, find the viagem_id for this entrega
        const { data: viagemEntrega, error: veError } = await supabase
          .from('viagem_entregas')
          .select('viagem_id')
          .eq('entrega_id', entregaId)
          .maybeSingle();

        if (veError) throw veError;

        if (!viagemEntrega?.viagem_id) {
          // No viagem found for this entrega
          setTrackingPoints([]);
          onEmptyChange?.(true);
          onLoadingChange?.(false);
          onBoundsReady?.(null);
          return;
        }

        const data = await fetchAllTrackingHistoricoByViagemId(viagemEntrega.viagem_id, {
          pageSize: 1000,
          maxRows: 50000,
        });

        if (!isMounted) return;
        
        const validPoints: TrackingPoint[] = (data || [])
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
        
        setTrackingPoints(validPoints);
        onEmptyChange?.(validPoints.length === 0);
        onLoadingChange?.(false);
        
        // Calculate bounds and notify parent
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

    fetchTrackingHistory();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregaId]); // Only re-fetch when entregaId changes

  if (!entregaId || trackingPoints.length === 0) return null;

  const selectedPoint = selectedPointId ? trackingPoints.find(p => p.id === selectedPointId) : null;

  return (
    <>

      {/* Tracking point markers */}
      {trackingPoints.map((point, index) => {
        const color = statusColors[point.status || 'aguardando'] || '#6b7280';
        const label = statusLabels[point.status || 'aguardando'] || point.status || 'Em trânsito';
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
              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[140px]"
                  style={{ bottom: size + 8, left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div className="text-xs font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(point.tracked_at)}</div>
                  {point.speed != null && <div className="text-xs text-muted-foreground">{Math.round(point.speed)} km/h</div>}
                  {isFirst && <div className="text-xs text-green-600 font-medium mt-1">📍 Início</div>}
                  {isLast && trackingPoints.length > 1 && <div className="text-xs text-blue-600 font-medium mt-1">📍 Atual</div>}
                </div>
              )}
            </div>
          </OverlayView>
        );
      })}

      {/* InfoWindow for selected point */}
      {selectedPoint && (
        <InfoWindow
          position={{ lat: selectedPoint.latitude, lng: selectedPoint.longitude }}
          onCloseClick={() => setSelectedPointId(null)}
          options={{ pixelOffset: new google.maps.Size(0, -10) }}
        >
          <div className="min-w-[180px] p-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: statusColors[selectedPoint.status || 'aguardando'] || '#6b7280' }}
              >
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{statusLabels[selectedPoint.status || 'aguardando'] || selectedPoint.status || 'Em trânsito'}</p>
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
      )}
    </>
  );
}

// Export loading and empty overlay components for use in parents
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
          <p className="text-sm text-muted-foreground">Ainda não há registros de rastreamento para esta entrega</p>
        </div>
      </div>
    </div>
  );
}
