import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Truck, MapPin, Navigation, Route, Loader2, Clock } from 'lucide-react';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';

// Helper function to format timestamp to readable date/time
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  return date.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Check if location is recent (within 2 minutes)
const isRecentLocation = (timestamp: number | null | undefined): boolean => {
  if (!timestamp) return false;
  const diffMs = Date.now() - timestamp;
  return diffMs < 2 * 60 * 1000; // 2 minutes
};

// Import 3D truck icon generator from shared component
import { getTruckIconHtml } from './TruckIcon';

// Create 3D truck icon with rotation based on heading - always shows truck with avatar badge
const createTruckIcon = (
  heading: number = 0,
  isOnline: boolean = false,
  isSelected: boolean = false,
  avatarUrl?: string | null
) => {
  const size = isSelected ? 56 : 48;
  
  // Pulse animation for online drivers
  const pulseStyle = isOnline ? `
    <style>
      @keyframes truck-pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.4); opacity: 0; }
      }
    </style>
    <div style="
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background-color: #22c55e;
      opacity: 0.4;
      animation: truck-pulse 2s ease-in-out infinite;
    "></div>
  ` : '';

  const grayFilter = !isOnline ? 'filter: grayscale(100%); opacity: 0.6;' : '';

  return new L.DivIcon({
    className: 'truck-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        ${pulseStyle}
        <div style="${grayFilter}">
          ${getTruckIconHtml(heading, isOnline, isSelected, size, avatarUrl)}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Location marker icon (origin/destination)
const createLocationIcon = (type: 'origem' | 'destino') => {
  const color = type === 'origem' ? '#22c55e' : '#ef4444';
  const letter = type === 'origem' ? 'O' : 'D';
  return new L.DivIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">
        ${letter}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
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

interface EntregaMapData {
  id: string;
  entregaId?: string;
  cargaId?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  codigo: string | null;
  descricao: string | null;
  motorista: string | null;
  motoristaFotoUrl?: string | null;
  motoristaOnline?: boolean | null;
  telefone: string | null;
  placa: string | null;
  destino: string | null;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  isIdleDriver?: boolean;
  lastLocationUpdate?: number | null;
  heading?: number | null; // Compass heading in degrees (0-360)
}

interface EntregasMapProps {
  entregas: EntregaMapData[];
  selectedEntregaId?: string | null;
  selectedCargaId?: string | null;
  onSelectEntrega?: (entregaId: string | null) => void;
  onSelectCarga?: (cargaId: string | null) => void;
}

// Fetch route from OSRM
async function fetchRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // OSRM returns [lng, lat], we need [lat, lng] for Leaflet
      return data.routes[0].geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
    }
  } catch (error) {
    console.error('Error fetching route:', error);
  }
  
  // Fallback to straight line
  return [[start.lat, start.lng], [end.lat, end.lng]];
}

// Component to fit bounds to markers
function FitBounds({ entregas, selectedEntrega }: { entregas: EntregaMapData[]; selectedEntrega: EntregaMapData | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedEntrega) {
      // If there's a selected entrega, fit bounds to show the route
      const points: [number, number][] = [];
      
      if (selectedEntrega.latitude && selectedEntrega.longitude) {
        points.push([selectedEntrega.latitude, selectedEntrega.longitude]);
      }
      if (selectedEntrega.origemCoords) {
        points.push([selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]);
      }
      if (selectedEntrega.destinoCoords) {
        points.push([selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]);
      }
      
      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
      } else if (points.length === 1) {
        map.setView(points[0], 10);
      }
    } else {
      const validEntregas = entregas.filter(e => e.latitude && e.longitude);
      if (validEntregas.length > 0) {
        const bounds = L.latLngBounds(
          validEntregas.map(e => [e.latitude!, e.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [entregas, selectedEntrega, map]);
  
  return null;
}

// Statuses that indicate the truck has already left the origin
const showRouteToOriginStatuses = ['aguardando_coleta', 'em_coleta'];

// Route display component with OSRM integration
// Now only shows truck-to-destination when status indicates origin was already visited
function RouteDisplay({ 
  selectedEntrega,
  hasTrackingHistory 
}: { 
  selectedEntrega: EntregaMapData | null;
  hasTrackingHistory: boolean;
}) {
  const [truckToDestinationRoute, setTruckToDestinationRoute] = useState<[number, number][]>([]);
  const [truckToOriginRoute, setTruckToOriginRoute] = useState<[number, number][]>([]);
  const [fallbackOriginToDestinationRoute, setFallbackOriginToDestinationRoute] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedEntrega?.destinoCoords) {
      setTruckToDestinationRoute([]);
      setTruckToOriginRoute([]);
      setFallbackOriginToDestinationRoute([]);
      return;
    }

    const loadRoutes = async () => {
      setIsLoading(true);
      
      try {
        const status = selectedEntrega.status || '';

        const hasTruckPos = !!(selectedEntrega.latitude && selectedEntrega.longitude);

        // Blue dashed: prefer truck -> destination; fallback to origin -> destination when no truck position
        if (hasTruckPos) {
          const remainingRoute = await fetchRoute(
            { lat: selectedEntrega.latitude!, lng: selectedEntrega.longitude! },
            selectedEntrega.destinoCoords!
          );
          setTruckToDestinationRoute(remainingRoute);
          setFallbackOriginToDestinationRoute([]);
        } else if (selectedEntrega.origemCoords) {
          const fallback = await fetchRoute(selectedEntrega.origemCoords!, selectedEntrega.destinoCoords!);
          setFallbackOriginToDestinationRoute(fallback);
          setTruckToDestinationRoute([]);
        } else {
          setTruckToDestinationRoute([]);
          setFallbackOriginToDestinationRoute([]);
        }

        // Orange dashed: ONLY when awaiting/collecting (aguardando_coleta/em_coleta) and we have truck pos + origin
        if (
          showRouteToOriginStatuses.includes(status) &&
          hasTruckPos &&
          selectedEntrega.origemCoords
        ) {
          const toOrigin = await fetchRoute(
            { lat: selectedEntrega.latitude!, lng: selectedEntrega.longitude! },
            selectedEntrega.origemCoords
          );
          setTruckToOriginRoute(toOrigin);
        } else {
          setTruckToOriginRoute([]);
        }
      } catch (error) {
        console.error('Error loading routes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutes();
  }, [selectedEntrega]);

  if (!selectedEntrega) return null;

  return (
    <>
      {/* Fallback suggested route: origin to destination (dashed blue) - only when no truck position */}
      {fallbackOriginToDestinationRoute.length > 1 && (
        <Polyline
          positions={fallbackOriginToDestinationRoute}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.6,
            dashArray: '12, 8',
          }}
        />
      )}
      
      {/* Suggested route: truck to destination (dashed blue) */}
      {truckToDestinationRoute.length > 1 && (
        <Polyline
          positions={truckToDestinationRoute}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.6,
            dashArray: '12, 8',
          }}
        />
      )}

      {/* Distance to origin (dashed orange) - only when awaiting/collecting */}
      {truckToOriginRoute.length > 1 && (
        <Polyline
          positions={truckToOriginRoute}
          pathOptions={{
            color: '#f97316',
            weight: 4,
            opacity: 0.55,
            dashArray: '10, 10',
          }}
        />
      )}
    </>
  );
}

export function EntregasMap({ 
  entregas, 
  selectedEntregaId, 
  selectedCargaId,
  onSelectEntrega,
  onSelectCarga 
}: EntregasMapProps) {
  // Entregas with truck location
  const validEntregas = entregas.filter(e => e.latitude && e.longitude);
  
  // Support both entregaId and cargaId for selection
  const effectiveSelectedId = selectedEntregaId || selectedCargaId;
  
  // Find selected entrega (can be any entrega, even without truck location)
  const selectedEntrega = effectiveSelectedId 
    ? entregas.find(e => 
        (e.entregaId && e.entregaId === effectiveSelectedId) || 
        (e.cargaId && e.cargaId === effectiveSelectedId) ||
        e.id === effectiveSelectedId
      ) || null
    : null;
  
  // Default center (Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  const defaultZoom = 4;
  
  // Calculate center based on all available points
  const allPoints: [number, number][] = [];
  entregas.forEach(e => {
    if (e.latitude && e.longitude) allPoints.push([e.latitude, e.longitude]);
    if (e.origemCoords) allPoints.push([e.origemCoords.lat, e.origemCoords.lng]);
    if (e.destinoCoords) allPoints.push([e.destinoCoords.lat, e.destinoCoords.lng]);
  });
  
  const center: [number, number] = allPoints.length > 0
    ? [
        allPoints.reduce((acc, p) => acc + p[0], 0) / allPoints.length,
        allPoints.reduce((acc, p) => acc + p[1], 0) / allPoints.length,
      ]
    : defaultCenter;

  const handleMarkerClick = (entrega: EntregaMapData) => {
    const entregaKey = entrega.entregaId || entrega.cargaId || entrega.id;
    const isCurrentlySelected = entregaKey === effectiveSelectedId;
    
    if (onSelectEntrega) {
      onSelectEntrega(isCurrentlySelected ? null : (entrega.entregaId || entrega.id));
    }
    if (onSelectCarga) {
      onSelectCarga(isCurrentlySelected ? null : (entrega.cargaId || null));
    }
  };

  // Check if we have any displayable content
  const hasContent = validEntregas.length > 0 || entregas.some(e => e.origemCoords || e.destinoCoords);

  if (!hasContent) {
    return (
      <div className="w-full h-[360px] bg-muted/30 rounded-lg flex flex-col items-center justify-center text-center p-6">
        <div className="p-4 bg-primary/10 rounded-full mb-4">
          <MapPin className="w-12 h-12 text-primary" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Sem localização disponível</h3>
        <p className="text-muted-foreground max-w-md">
          Nenhuma entrega possui coordenadas de localização no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-0 w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds entregas={validEntregas} selectedEntrega={selectedEntrega} />
        
        {/* Tracking history points when entrega is selected */}
        {selectedEntrega && (
          <TrackingHistoryMarkers entregaId={selectedEntrega.entregaId || selectedEntrega.id} />
        )}
        
        {/* Suggested route: only shows remaining route when already collected */}
        <RouteDisplay selectedEntrega={selectedEntrega} hasTrackingHistory={false} />

        {/* Origin marker for selected entrega */}
        {selectedEntrega?.origemCoords && (
          <Marker
            position={[selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]}
            icon={createLocationIcon('origem')}
          >
            <Popup>
              <div className="min-w-[150px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-green-600">Origem</span>
                </div>
                <p className="text-sm text-muted-foreground">Ponto de coleta</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker for selected entrega */}
        {selectedEntrega?.destinoCoords && (
          <Marker
            position={[selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]}
            icon={createLocationIcon('destino')}
          >
            <Popup>
              <div className="min-w-[150px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-red-600">Destino</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedEntrega.destino || 'Ponto de entrega'}</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Driver avatar markers - hide others when one is selected */}
        {validEntregas
          .filter((entrega) => {
            if (!effectiveSelectedId) return true;
            const entregaKey = entrega.entregaId || entrega.cargaId || entrega.id;
            return entregaKey === effectiveSelectedId;
          })
          .map((entrega) => {
            const isIdle = entrega.isIdleDriver || !entrega.status;
            const status = entrega.status || 'idle';
            const color = isIdle ? '#6b7280' : (statusColors[status] || statusColors['aguardando_coleta']);
            const label = isIdle ? 'Sem Entrega' : (statusLabels[status] || 'Desconhecido');
            const entregaKey = entrega.entregaId || entrega.cargaId || entrega.id;
            const isSelected = entregaKey === effectiveSelectedId;
            const isRecent = isRecentLocation(entrega.lastLocationUpdate);
            
            return (
              <Marker
                key={entrega.id}
                position={[entrega.latitude!, entrega.longitude!]}
                icon={createTruckIcon(entrega.heading ?? 0, isRecent, isSelected, entrega.motoristaFotoUrl)}
                eventHandlers={{
                  click: () => !isIdle && handleMarkerClick(entrega),
                }}
              >
                {/* Tooltip on hover */}
                <Tooltip 
                  direction="top" 
                  offset={[0, -12]} 
                  opacity={0.95}
                  permanent={false}
                >
                  <div className="text-xs min-w-[140px]">
                    {entrega.codigo && (
                      <div className="font-bold mb-1">{entrega.codigo}</div>
                    )}
                    {entrega.motorista && (
                      <div className="text-gray-600">{entrega.motorista}</div>
                    )}
                    {entrega.placa && (
                      <div className="text-gray-500">{entrega.placa}</div>
                    )}
                    <div 
                      className="mt-1 px-1.5 py-0.5 rounded text-white text-center"
                      style={{ backgroundColor: color }}
                    >
                      {label}
                    </div>
                    {entrega.lastLocationUpdate && (
                      <div className="mt-1 text-gray-500 text-center">
                        Atualizado: {formatTimestamp(entrega.lastLocationUpdate)}
                      </div>
                    )}
                  </div>
                </Tooltip>
                
                {/* Popup on click - more details */}
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-foreground">{entrega.codigo}</span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {entrega.descricao}
                    </p>
                    
                    {entrega.destino && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-foreground">{entrega.destino}</span>
                      </div>
                    )}
                    
                    {entrega.motorista && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{entrega.motorista}</span>
                        {entrega.placa && (
                          <span className="text-muted-foreground">({entrega.placa})</span>
                        )}
                      </div>
                    )}
                    
                    {entrega.telefone && (
                      <a 
                        href={`tel:${entrega.telefone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                      >
                        <Phone className="w-3 h-3" />
                        {entrega.telefone}
                      </a>
                    )}
                    
                    {entrega.lastLocationUpdate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 pt-1 border-t border-border">
                        <Clock className="w-3 h-3" />
                        <span>Última atualização: {formatTimestamp(entrega.lastLocationUpdate)}</span>
                      </div>
                    )}

                    {!isSelected && entrega.origemCoords && entrega.destinoCoords && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkerClick(entrega);
                        }}
                      >
                        <Route className="w-3 h-3" />
                        Ver rota
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
      
      {/* Legend - simplified for active deliveries */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">Legenda</p>
        <div className="flex flex-col gap-1">
          {['em_coleta', 'em_transito', 'em_entrega'].map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: statusColors[key] }}
              />
              <span className="text-xs text-foreground">{statusLabels[key]}</span>
            </div>
          ))}
        </div>
        {effectiveSelectedId && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-xs">Origem</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-xs">Destino</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: '#f97316' }} />
              <span className="text-xs">Pontos do histórico</span>
              <div className="w-6 h-0" style={{ borderTop: '2px dashed #3b82f6' }} />
              <span className="text-xs">Rota sugerida</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected info badge */}
      {selectedEntrega && (
        <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{selectedEntrega.codigo}</p>
              <p className="text-xs text-muted-foreground">Histórico de rastreamento</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-2 h-6 w-6 p-0"
              onClick={() => {
                onSelectEntrega?.(null);
                onSelectCarga?.(null);
              }}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
