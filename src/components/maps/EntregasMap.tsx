import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Navigation, Route, Loader2, Clock, Package } from 'lucide-react';
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

// Create 3D truck icon with rotation based on heading
// No transparency/grayscale - all trucks are fully visible
// Wi-Fi indicator shows connection status (green=online, red=offline)
const createTruckIcon = (
  heading: number = 0,
  isOnline: boolean = false,
  isSelected: boolean = false
) => {
  const size = isSelected ? 56 : 48;

  return new L.DivIcon({
    className: 'truck-marker',
    html: getTruckIconHtml(heading, isOnline, isSelected, size),
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

// Updated status colors to match the correct visual design
const statusColors: Record<string, string> = {
  'aguardando': '#f97316',        // Orange - waiting
  'saiu_para_coleta': '#3b82f6',  // Blue - left for pickup
  'saiu_para_entrega': '#8b5cf6', // Purple - left for delivery
  'entregue': '#22c55e',          // Green - delivered
  'problema': '#ef4444',          // Red - problem
  'cancelada': '#991b1b',         // Dark red - cancelled
};

const statusLabels: Record<string, string> = {
  'aguardando': 'Aguardando',
  'saiu_para_coleta': 'Saiu p/ Coleta',
  'saiu_para_entrega': 'Saiu p/ Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
  'cancelada': 'Cancelada',
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
  heading?: number | null;
  // Additional delivery info
  entregasCount?: number;
  pesoTotal?: number;
  statusCounts?: Record<string, number>;
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

// Component to fit bounds to markers - only triggers on selection change, not location updates
function FitBounds({ 
  entregas, 
  selectedEntrega,
  selectedId 
}: { 
  entregas: EntregaMapData[]; 
  selectedEntrega: EntregaMapData | null;
  selectedId: string | null;
}) {
  const map = useMap();
  const prevSelectedIdRef = useRef<string | null | undefined>(undefined);
  const hasInitialFit = useRef(false);
  
  useEffect(() => {
    // Only fit bounds when selection actually changes (ID change), not on location updates
    const selectionChanged = prevSelectedIdRef.current !== selectedId;
    
    // Initial fit on mount (when no selection)
    const needsInitialFit = !hasInitialFit.current && !selectedId && entregas.length > 0;
    
    if (!selectionChanged && !needsInitialFit) {
      return;
    }
    
    prevSelectedIdRef.current = selectedId;
    
    if (selectedEntrega) {
      // Fit bounds to show the route when selecting a delivery
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
    } else if (needsInitialFit || selectionChanged) {
      // Only fit all entregas on initial load or when deselecting
      const validEntregas = entregas.filter(e => e.latitude && e.longitude);
      if (validEntregas.length > 0) {
        const bounds = L.latLngBounds(
          validEntregas.map(e => [e.latitude!, e.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        hasInitialFit.current = true;
      }
    }
  }, [selectedId, entregas.length, map]); // Only depend on selectedId, not the full objects
  
  return null;
}

// Statuses where we show route to origin (truck hasn't picked up cargo yet)
// aguardando = waiting, saiu_para_coleta = left for pickup
const showRouteToOriginStatuses = ['aguardando', 'saiu_para_coleta'];

// Route display component with OSRM integration
// - aguardando/saiu_para_coleta: dashed lines truck->origin->destination
// - saiu_para_entrega: solid line truck->destination only
function RouteDisplay({ 
  selectedEntrega,
  hasTrackingHistory 
}: { 
  selectedEntrega: EntregaMapData | null;
  hasTrackingHistory: boolean;
}) {
  const [truckToOriginRoute, setTruckToOriginRoute] = useState<[number, number][]>([]);
  const [originToDestinationRoute, setOriginToDestinationRoute] = useState<[number, number][]>([]);
  const [truckToDestinationRoute, setTruckToDestinationRoute] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedEntrega?.destinoCoords) {
      setTruckToOriginRoute([]);
      setOriginToDestinationRoute([]);
      setTruckToDestinationRoute([]);
      return;
    }

    const loadRoutes = async () => {
      setIsLoading(true);
      
      try {
        const status = selectedEntrega.status || '';
        const hasTruckPos = !!(selectedEntrega.latitude && selectedEntrega.longitude);
        const hasOrigin = !!selectedEntrega.origemCoords;
        const hasDestination = !!selectedEntrega.destinoCoords;
        
        // Check if status is before delivery (aguardando or saiu_para_coleta)
        const isBeforeDelivery = showRouteToOriginStatuses.includes(status);
        
        if (isBeforeDelivery) {
          // DASHED routes: truck -> origin -> destination
          if (hasTruckPos && hasOrigin) {
            const toOrigin = await fetchRoute(
              { lat: selectedEntrega.latitude!, lng: selectedEntrega.longitude! },
              selectedEntrega.origemCoords!
            );
            setTruckToOriginRoute(toOrigin);
          } else {
            setTruckToOriginRoute([]);
          }
          
          if (hasOrigin && hasDestination) {
            const originToDest = await fetchRoute(
              selectedEntrega.origemCoords!,
              selectedEntrega.destinoCoords!
            );
            setOriginToDestinationRoute(originToDest);
          } else {
            setOriginToDestinationRoute([]);
          }
          
          setTruckToDestinationRoute([]);
        } else {
          // SOLID route: truck -> destination directly (saiu_para_entrega)
          setTruckToOriginRoute([]);
          setOriginToDestinationRoute([]);
          
          if (hasTruckPos && hasDestination) {
            const toDest = await fetchRoute(
              { lat: selectedEntrega.latitude!, lng: selectedEntrega.longitude! },
              selectedEntrega.destinoCoords!
            );
            setTruckToDestinationRoute(toDest);
          } else if (hasOrigin && hasDestination) {
            // Fallback if no truck position
            const fallback = await fetchRoute(
              selectedEntrega.origemCoords!,
              selectedEntrega.destinoCoords!
            );
            setTruckToDestinationRoute(fallback);
          } else {
            setTruckToDestinationRoute([]);
          }
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

  const status = selectedEntrega.status || '';
  const isBeforeDelivery = showRouteToOriginStatuses.includes(status);

  return (
    <>
      {/* Dashed routes for aguardando/saiu_para_coleta */}
      {isBeforeDelivery && (
        <>
          {/* Dashed orange: truck to origin */}
          {truckToOriginRoute.length > 1 && (
            <Polyline
              positions={truckToOriginRoute}
              pathOptions={{
                color: '#f97316',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10',
              }}
            />
          )}
          
          {/* Dashed blue: origin to destination */}
          {originToDestinationRoute.length > 1 && (
            <Polyline
              positions={originToDestinationRoute}
              pathOptions={{
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '12, 8',
              }}
            />
          )}
        </>
      )}

      {/* Solid route for saiu_para_entrega: truck to destination */}
      {!isBeforeDelivery && truckToDestinationRoute.length > 1 && (
        <Polyline
          positions={truckToDestinationRoute}
          pathOptions={{
            color: '#3b82f6',
            weight: 5,
            opacity: 0.9,
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
        <FitBounds entregas={validEntregas} selectedEntrega={selectedEntrega} selectedId={effectiveSelectedId} />
        
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
            
            // Include heading and online status in key to force icon recreation on updates
            const headingKey = Math.round((entrega.heading ?? 0) / 5) * 5; // Round to 5-degree increments
            
            return (
              <Marker
                key={`${entrega.id}-${headingKey}-${isRecent}`}
                position={[entrega.latitude!, entrega.longitude!]}
                icon={createTruckIcon(entrega.heading ?? 0, isRecent, isSelected)}
                eventHandlers={{
                  click: () => !isIdle && handleMarkerClick(entrega),
                }}
              >
                {/* Detailed tooltip on hover - no popup on click */}
                <Tooltip 
                  direction="top" 
                  offset={[0, -20]} 
                  opacity={1}
                  permanent={false}
                  className="!bg-white !border !border-gray-200 !rounded-xl !shadow-2xl !p-0"
                >
                  <div className="p-4 min-w-[260px] max-w-[300px]">
                    {/* Header with avatar and name */}
                    <div className="flex items-start gap-3 mb-3">
                      {entrega.motoristaFotoUrl ? (
                        <img
                          src={entrega.motoristaFotoUrl}
                          alt={entrega.motorista || 'Motorista'}
                          className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                          <span className="text-sm font-bold text-gray-500">
                            {(entrega.motorista || 'M').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {entrega.motorista || 'Motorista'}
                        </div>
                        {entrega.placa && (
                          <div className="text-xs text-gray-500 font-medium mt-0.5">
                            {entrega.placa}
                          </div>
                        )}
                        {/* Status badge */}
                        <span 
                          className="inline-block text-[10px] px-2 py-0.5 rounded-full text-white mt-1.5 font-medium"
                          style={{ backgroundColor: color }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>

                    {/* Delivery count info - priority display */}
                    {(entrega.entregasCount ?? 0) > 0 && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">
                            {entrega.entregasCount} {entrega.entregasCount === 1 ? 'entrega' : 'entregas'}
                          </span>
                        </div>
                        {(entrega.pesoTotal ?? 0) > 0 && (
                          <span className="text-xs text-gray-500">
                            {(entrega.pesoTotal! / 1000).toFixed(1)}t
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status counts if multiple deliveries */}
                    {entrega.statusCounts && Object.keys(entrega.statusCounts).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.entries(entrega.statusCounts).map(([st, count]) => (
                          <span 
                            key={st}
                            className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium"
                            style={{ backgroundColor: statusColors[st] || '#6b7280' }}
                          >
                            {count} {statusLabels[st] || st}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Cargo info section - only show if no delivery count */}
                    {!entrega.entregasCount && (
                      <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                        {entrega.codigo && (
                          <div className="text-xs">
                            <span className="text-gray-500">Código: </span>
                            <span className="font-semibold text-gray-900">{entrega.codigo}</span>
                          </div>
                        )}
                        
                        {entrega.descricao && (
                          <div className="flex items-start gap-1.5 text-xs">
                            <Package className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-800 line-clamp-2">{entrega.descricao}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Destination */}
                    {entrega.destino && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
                        <span className="text-gray-800 line-clamp-2">{entrega.destino}</span>
                      </div>
                    )}

                    {/* Last update footer */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200">
                      <Clock className={`w-3.5 h-3.5 ${isRecent ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className={`text-xs ${isRecent ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        Última atualização: {formatTimestamp(entrega.lastLocationUpdate || Date.now())}
                      </span>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
      </MapContainer>
      
      {/* Legend - using correct database status values */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
        <div className="flex flex-col gap-1">
          {['aguardando', 'saiu_para_coleta', 'saiu_para_entrega', 'problema'].map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: statusColors[key] }}
              />
              <span className="text-xs text-foreground">{statusLabels[key]}</span>
            </div>
          ))}
        </div>
        
        {/* Wi-Fi indicator legend */}
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Conexão</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs">Online</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs">Offline</span>
            </div>
          </div>
        </div>
        
        {effectiveSelectedId && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Rota</p>
            <div className="flex flex-col gap-1">
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
              <div className="flex items-center gap-2">
                <div className="w-6 h-0" style={{ borderTop: '2px dashed #f97316' }} />
                <span className="text-xs">p/ Coleta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0" style={{ borderTop: '2px dashed #3b82f6' }} />
                <span className="text-xs">p/ Entrega (tracejado)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0" style={{ borderTop: '3px solid #3b82f6' }} />
                <span className="text-xs">p/ Entrega (sólido)</span>
              </div>
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

// Default export for lazy loading compatibility
export default EntregasMap;
