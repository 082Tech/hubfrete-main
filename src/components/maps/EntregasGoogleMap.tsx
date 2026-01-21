import { GoogleMap, MarkerF, DirectionsRenderer, OverlayView, InfoWindow } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGoogleMaps, airbnbMapStyles, defaultMapContainerStyle, defaultCenter } from './GoogleMapsLoader';
import { Loader2, Truck, Clock, Phone, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TrackingHistoryGoogleMarkers } from './TrackingHistoryGoogleMarkers';

export type EntregaMapItem = {
  id: string;
  cargaId?: string;
  entregaId?: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  codigo: string | null;
  descricao: string | null;
  motorista: string | null;
  motoristaFotoUrl: string | null;
  motoristaOnline?: boolean | null;
  telefone: string | null;
  placa: string | null;
  destino: string | null;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  lastLocationUpdate?: number | null;
  isIdleDriver?: boolean;
};

// Format timestamp for display
function formatLocationTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return '-';
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
}

function isRecentUpdate(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const diffMs = Date.now() - timestamp;
  return diffMs < 2 * 60 * 1000; // 2 minutes - only pulse green when truly recent
}

interface EntregasGoogleMapProps {
  entregas: EntregaMapItem[];
  selectedCargaId: string | null;
  onSelectCarga: (id: string | null) => void;
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
};

// Statuses that indicate the truck has already left the origin
const showRouteToOriginStatuses = ['aguardando_coleta', 'em_coleta'];

// Driver marker component - shows avatar or truck icon with hover tooltip
function DriverMarker({ 
  entrega, 
  isSelected,
  isHovered,
  onClick,
  onHover,
  onLeave,
}: { 
  entrega: EntregaMapItem; 
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const lat = entrega.latitude ?? entrega.origemCoords?.lat ?? null;
  const lng = entrega.longitude ?? entrega.origemCoords?.lng ?? null;
  const isOnline = entrega.motoristaOnline ?? false;
  const isRecent = isRecentUpdate(entrega.lastLocationUpdate);

  if (lat == null || lng == null) return null;

  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({
        x: -20,
        y: -20,
      })}
    >
      <div
        className={`relative cursor-pointer transition-all duration-200 ${isSelected ? 'z-50' : 'z-10'}`}
        style={{
          width: 40,
          height: 40,
          transform: isSelected ? 'scale(1.25)' : isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {/* Pulse animation when ONLINE and recent update */}
        {isOnline && isRecent && (
          <div
            className="absolute rounded-full bg-green-500/40 animate-ping"
            style={{ width: 40, height: 40, top: 0, left: 0 }}
          />
        )}

        {/* Avatar or Truck icon */}
        <div
          className={
            `w-10 h-10 rounded-full shadow-lg border-[3px] overflow-hidden ` +
            (isSelected 
              ? 'border-primary bg-primary' 
              : isOnline && isRecent 
                ? 'border-green-500 bg-background' 
                : 'border-border bg-background')
          }
        >
          {entrega.motoristaFotoUrl ? (
            <img
              src={entrega.motoristaFotoUrl}
              alt={entrega.motorista || 'Motorista'}
              className={'w-full h-full object-cover ' + (!(isOnline && isRecent) ? 'grayscale opacity-60' : '')}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={'w-full h-full flex items-center justify-center ' + (!(isOnline && isRecent) ? 'grayscale opacity-60' : '')}>
              <Truck className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
          )}
        </div>

        {/* Label badge when selected */}
        {isSelected && entrega.codigo && (
          <div
            className="absolute whitespace-nowrap bg-foreground text-background text-[10px] px-2 py-0.5 rounded-full font-medium shadow-md"
            style={{ top: 46, left: '50%', transform: 'translateX(-50%)' }}
          >
            {entrega.codigo}
          </div>
        )}

        {/* Hover tooltip */}
        {isHovered && !isSelected && (
          <div
            className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[180px]"
            style={{ bottom: 50, left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="text-sm font-medium text-foreground truncate">
              {entrega.motorista || 'Motorista'}
            </div>
            {entrega.placa && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Truck className="w-3 h-3" />
                {entrega.placa}
              </div>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Clock className={`w-3 h-3 ${isRecent ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${isRecent ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                {formatLocationTimestamp(entrega.lastLocationUpdate)}
              </span>
            </div>
          </div>
        )}
      </div>
    </OverlayView>
  );
}

export function EntregasGoogleMap({ entregas, selectedCargaId, onSelectCarga }: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [toOriginDirections, setToOriginDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selected = useMemo(
    () => entregas.find((e) => e.id === selectedCargaId) ?? null,
    [entregas, selectedCargaId]
  );

  // Fit bounds to markers (or selected route)
  useEffect(() => {
    if (!map) return;

    if (selected?.origemCoords && selected?.destinoCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(selected.origemCoords);
      bounds.extend(selected.destinoCoords);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (entregas.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    let hasAny = false;

    entregas.forEach((e) => {
      if (e.latitude != null && e.longitude != null) {
        bounds.extend({ lat: e.latitude, lng: e.longitude });
        hasAny = true;
      } else if (e.origemCoords) {
        bounds.extend(e.origemCoords);
        hasAny = true;
      }
    });

    if (hasAny) map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
  }, [map, entregas, selected]);

  // Route for selected entrega - show remaining route when already collected
  useEffect(() => {
    let cancelled = false;

    if (!isLoaded || !selected?.destinoCoords) {
      setDirections(null);
      setToOriginDirections(null);
      return;
    }

    const statusValue = selected.status || '';
    const hasTruckPos = !!(selected.latitude && selected.longitude);

    // Blue dashed: prefer truck -> destination; fallback to origin -> destination when no truck position
    const mainOrigin = hasTruckPos
      ? { lat: selected.latitude!, lng: selected.longitude! }
      : selected.origemCoords;

    if (!mainOrigin) {
      setDirections(null);
      setToOriginDirections(null);
      return;
    }

    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin: mainOrigin,
        destination: selected.destinoCoords,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === google.maps.DirectionsStatus.OK && result) setDirections(result);
      }
    );

    // Orange dashed: ONLY when awaiting/collecting and we have truck pos + origin
    if (
      showRouteToOriginStatuses.includes(statusValue) &&
      hasTruckPos &&
      selected.origemCoords
    ) {
      service.route(
        {
          origin: { lat: selected.latitude!, lng: selected.longitude! },
          destination: selected.origemCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (cancelled) return;
          if (status === google.maps.DirectionsStatus.OK && result) setToOriginDirections(result);
          else setToOriginDirections(null);
        }
      );
    } else {
      setToOriginDirections(null);
    }

    return () => {
      cancelled = true;
    };
  }, [isLoaded, selected]);

  const handleLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const handleUnmount = useCallback(() => setMap(null), []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted">
        <p className="text-muted-foreground">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultCenter}
        zoom={5}
        options={mapOptions}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onClick={() => onSelectCarga(null)}
      >
        {/* Tracking history points when entrega is selected */}
        {selected && (
          <TrackingHistoryGoogleMarkers entregaId={selected.entregaId || selected.id} />
        )}

        {/* Suggested route (dashed blue) */}
        {selected && directions && (
          <DirectionsRenderer
            key={selected.id}
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#3b82f6',
                strokeOpacity: 0.6,
                strokeWeight: 4,
                icons: [
                  {
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 3,
                    },
                    offset: '0',
                    repeat: '16px',
                  },
                ],
              },
            }}
          />
        )}

        {/* Distance to origin (dashed orange) - only when awaiting/collecting */}
        {selected && toOriginDirections && (
          <DirectionsRenderer
            key={`${selected.id}-to-origin`}
            directions={toOriginDirections}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#f97316',
                strokeOpacity: 0.55,
                strokeWeight: 4,
                icons: [
                  {
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 3,
                    },
                    offset: '0',
                    repeat: '18px',
                  },
                ],
              },
            }}
          />
        )}

        {/* Driver markers with avatar/truck */}
        {entregas.map((e) => (
          <DriverMarker
            key={e.id}
            entrega={e}
            isSelected={e.id === selectedCargaId}
            isHovered={e.id === hoveredId}
            onClick={() => onSelectCarga(e.id)}
            onHover={() => setHoveredId(e.id)}
            onLeave={() => setHoveredId(null)}
          />
        ))}

        {/* Info Window when selected */}
        {selected && selected.latitude && selected.longitude && (
          <InfoWindow
            position={{ lat: selected.latitude, lng: selected.longitude }}
            onCloseClick={() => onSelectCarga(null)}
            options={{ pixelOffset: new google.maps.Size(0, -30) }}
          >
            <div className="p-2 min-w-[220px] max-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                {selected.motoristaFotoUrl ? (
                  <img
                    src={selected.motoristaFotoUrl}
                    alt={selected.motorista || ''}
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selected.motorista || 'Motorista'}</p>
                  {selected.placa && (
                    <p className="text-xs text-muted-foreground">{selected.placa}</p>
                  )}
                </div>
              </div>

              {selected.codigo && (
                <div className="text-xs text-muted-foreground mb-2">
                  Carga: <span className="font-medium text-foreground">{selected.codigo}</span>
                </div>
              )}

              {selected.destino && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{selected.destino}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <Clock className={`w-3 h-3 ${isRecentUpdate(selected.lastLocationUpdate) ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${isRecentUpdate(selected.lastLocationUpdate) ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                    {formatLocationTimestamp(selected.lastLocationUpdate)}
                  </span>
                </div>
                {selected.telefone && (
                  <a
                    href={`tel:${selected.telefone}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    Ligar
                  </a>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Destination marker (default red pin) */}
        {selected?.destinoCoords && (
          <MarkerF
            key={`dest-${selected.id}`}
            position={selected.destinoCoords}
            zIndex={999}
          />
        )}
      </GoogleMap>
    </div>
  );
}
