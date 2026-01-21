import { useEffect, useState } from 'react';
import { CircleMarker, Tooltip, Popup, Polyline } from 'react-leaflet';
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

interface TrackingHistoryMarkersProps {
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

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = "w-3 h-3";
  switch (status) {
    case 'aguardando_coleta':
      return <Clock className={iconClass} />;
    case 'em_coleta':
    case 'coletado':
      return <Package className={iconClass} />;
    case 'em_transito':
      return <Route className={iconClass} />;
    case 'em_entrega':
      return <Truck className={iconClass} />;
    case 'entregue':
      return <CheckCircle className={iconClass} />;
    case 'problema':
    case 'devolvida':
      return <AlertCircle className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
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

export function TrackingHistoryMarkers({ entregaId }: TrackingHistoryMarkersProps) {
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!entregaId) {
      setTrackingPoints([]);
      return;
    }

    const fetchTrackingHistory = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
  const pathSegments: [number, number][][] = [];
  let currentSegment: [number, number][] = [];

  trackingPoints.forEach((point, index) => {
    if (index === 0) {
      currentSegment.push([point.latitude, point.longitude]);
    } else {
      const prevPoint = trackingPoints[index - 1];
      const distance = getDistanceKm(prevPoint.latitude, prevPoint.longitude, point.latitude, point.longitude);
      
      if (distance > MAX_DISTANCE_KM) {
        // Start a new segment (GPS jump detected)
        if (currentSegment.length > 1) {
          pathSegments.push(currentSegment);
        }
        currentSegment = [[point.latitude, point.longitude]];
      } else {
        currentSegment.push([point.latitude, point.longitude]);
      }
    }
  });

  // Don't forget the last segment
  if (currentSegment.length > 1) {
    pathSegments.push(currentSegment);
  }

  return (
    <>
      {/* Lines connecting tracking points (split into segments to avoid GPS jump lines) */}
      {pathSegments.map((segment, idx) => (
        <Polyline
          key={`segment-${idx}`}
          positions={segment}
          pathOptions={{
            color: '#f97316',
            weight: 4,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Tracking point markers */}
      {trackingPoints.map((point, index) => {
        const color = statusColors[point.status] || '#6b7280';
        const label = statusLabels[point.status] || point.status;
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
            <Tooltip 
              direction="top" 
              offset={[0, -8]} 
              opacity={0.95}
            >
              <div className="text-xs min-w-[120px]">
                <div className="flex items-center gap-1 font-medium">
                  <StatusIcon status={point.status} />
                  <span>{label}</span>
                </div>
                <div className="text-gray-500 mt-0.5">
                  {formatDateTime(point.created_at)}
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
                    <span>{formatDateTime(point.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </span>
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
