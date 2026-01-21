import { useEffect, useState } from 'react';
import { OverlayView, Polyline, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, AlertCircle, CheckCircle, Package, Truck, Route } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  observacao: string | null;
}

interface TrackingHistoryGoogleMarkersProps {
  entregaId: string | null;
}

const statusLabels: Record<string, string> = {
  'aguardando_coleta': 'Aguardando Coleta',
  'em_coleta': 'Em Coleta',
  'coletado': 'Coletado',
  'em_transito': 'Em Trânsito',
  'em_entrega': 'Em Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
  'devolvida': 'Devolvida',
};

const statusColors: Record<string, string> = {
  'aguardando_coleta': '#6b7280',
  'em_coleta': '#3b82f6',
  'coletado': '#06b6d4',
  'em_transito': '#f97316',
  'em_entrega': '#a855f7',
  'entregue': '#22c55e',
  'problema': '#ef4444',
  'devolvida': '#ef4444',
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

export function TrackingHistoryGoogleMarkers({ entregaId }: TrackingHistoryGoogleMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!entregaId) {
      setTrackingPoints([]);
      return;
    }

    const fetchTrackingHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('tracking_historico')
          .select('id, latitude, longitude, status, created_at, observacao')
          .eq('entrega_id', entregaId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const validPoints: TrackingPoint[] = (data || [])
          .filter((p) => p.latitude != null && p.longitude != null)
          .map((p) => ({
            id: p.id,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            status: p.status as string,
            created_at: p.created_at,
            observacao: p.observacao,
          }));
        
        setTrackingPoints(validPoints);
      } catch (error) {
        console.error('Error fetching tracking history:', error);
        setTrackingPoints([]);
      }
    };

    fetchTrackingHistory();
  }, [entregaId]);

  if (!entregaId || trackingPoints.length === 0) return null;

  // Helper to calculate distance between two points (in km)
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Split path into segments to avoid drawing lines between distant points (GPS jumps)
  const MAX_DISTANCE_KM = 10; // Max distance between consecutive points before breaking the line
  const pathSegments: { lat: number; lng: number }[][] = [];
  let currentSegment: { lat: number; lng: number }[] = [];

  trackingPoints.forEach((point, index) => {
    if (index === 0) {
      currentSegment.push({ lat: point.latitude, lng: point.longitude });
    } else {
      const prevPoint = trackingPoints[index - 1];
      const distance = getDistanceKm(prevPoint.latitude, prevPoint.longitude, point.latitude, point.longitude);
      
      if (distance > MAX_DISTANCE_KM) {
        // Start a new segment (GPS jump detected)
        if (currentSegment.length > 1) {
          pathSegments.push(currentSegment);
        }
        currentSegment = [{ lat: point.latitude, lng: point.longitude }];
      } else {
        currentSegment.push({ lat: point.latitude, lng: point.longitude });
      }
    }
  });

  // Don't forget the last segment
  if (currentSegment.length > 1) {
    pathSegments.push(currentSegment);
  }

  const selectedPoint = selectedPointId ? trackingPoints.find(p => p.id === selectedPointId) : null;

  return (
    <>
      {/* Real path taken (split into segments to avoid GPS jump lines) */}
      {pathSegments.map((segment, idx) => (
        <Polyline
          key={`segment-${idx}`}
          path={segment}
          options={{
            strokeColor: '#f97316',
            strokeWeight: 4,
            strokeOpacity: 0.9,
          }}
        />
      ))}

      {/* Tracking point markers */}
      {trackingPoints.map((point, index) => {
        const color = statusColors[point.status] || '#6b7280';
        const label = statusLabels[point.status] || point.status;
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
                  <div className="text-xs text-muted-foreground">{formatDateTime(point.created_at)}</div>
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
                style={{ backgroundColor: statusColors[selectedPoint.status] || '#6b7280' }}
              >
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{statusLabels[selectedPoint.status] || selectedPoint.status}</p>
                <p className="text-xs text-muted-foreground">
                  Ponto #{trackingPoints.findIndex(p => p.id === selectedPoint.id) + 1} de {trackingPoints.length}
                </p>
              </div>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatDateTime(selectedPoint.created_at)}</span>
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
