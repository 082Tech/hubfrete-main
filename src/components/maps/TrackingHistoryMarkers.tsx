import { useEffect, useState } from 'react';
import { CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllTrackingHistoricoByViagemId } from '@/lib/fetchAllTrackingHistorico';
import { Clock, MapPin, AlertCircle, CheckCircle, Package, Truck, Route } from 'lucide-react';

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: string | null;
  tracked_at: string;
  observacao: string | null;
  speed: number | null;
}

interface TrackingHistoryMarkersProps {
  entregaId: string | null;
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
        // First, find the viagem_id for this entrega
        const { data: viagemEntrega, error: veError } = await supabase
          .from('viagem_entregas')
          .select('viagem_id')
          .eq('entrega_id', entregaId)
          .maybeSingle();

        if (veError) throw veError;

        if (!viagemEntrega?.viagem_id) {
          setTrackingPoints([]);
          return;
        }

        const data = await fetchAllTrackingHistoricoByViagemId(viagemEntrega.viagem_id, {
          pageSize: 1000,
          maxRows: 50000,
        });
        
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

  return (
    <>

      {/* Tracking point markers */}
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
