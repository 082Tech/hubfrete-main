import { GoogleMap, MarkerF, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useGoogleMaps, airbnbMapStyles, defaultCenter } from './GoogleMapsLoader';
import { Loader2, Clock, Phone, MapPin, Package } from 'lucide-react';
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
  heading?: number | null; // Compass heading in degrees (0-360)
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
  selectedCargaId?: string | null;
  selectedEntregaId?: string | null;
  onSelectCarga?: (id: string | null) => void;
  onSelectEntrega?: (id: string | null) => void;
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

// Import truck icon HTML generator
import { getTruckIconHtml } from './TruckIcon';

// Status labels for display
const statusLabels: Record<string, { label: string; color: string }> = {
  aguardando_coleta: { label: 'Aguardando Coleta', color: 'bg-amber-500' },
  em_coleta: { label: 'Em Coleta', color: 'bg-amber-500' },
  coletado: { label: 'Coletado', color: 'bg-blue-500' },
  em_transito: { label: 'Em Trânsito', color: 'bg-orange-500' },
  em_entrega: { label: 'Em Entrega', color: 'bg-purple-500' },
  entregue: { label: 'Entregue', color: 'bg-green-500' },
  problema: { label: 'Problema', color: 'bg-red-500' },
  devolvida: { label: 'Devolvida', color: 'bg-gray-500' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500' },
};

// Driver marker component - shows 3D truck icon with rotation based on heading
function DriverMarker({ 
  entrega, 
  isHovered,
  onHover,
  onLeave,
  onSelect,
}: { 
  entrega: EntregaMapItem; 
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const lat = entrega.latitude ?? entrega.origemCoords?.lat ?? null;
  const lng = entrega.longitude ?? entrega.origemCoords?.lng ?? null;
  const isOnline = entrega.motoristaOnline ?? false;
  const isRecent = isRecentUpdate(entrega.lastLocationUpdate);
  const heading = entrega.heading ?? 0;
  const truckSize = 48;

  if (lat == null || lng == null) return null;

  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({
        x: -truckSize / 2,
        y: -truckSize / 2,
      })}
    >
      <div
        className={`relative cursor-pointer transition-all duration-200 ${isHovered ? 'z-50' : 'z-10'}`}
        style={{
          width: truckSize,
          height: truckSize,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {/* 3D Truck Icon - always shown */}
        <div
          style={{
            width: truckSize,
            height: truckSize,
            filter: !(isOnline && isRecent) ? 'grayscale(80%) opacity(0.75)' : 'none',
          }}
          dangerouslySetInnerHTML={{ 
            __html: getTruckIconHtml(
              heading, 
              isOnline && isRecent, 
              false, 
              truckSize
            ) 
          }}
        />

        {/* Detailed hover tooltip */}
        {isHovered && (
          <div
            className="absolute z-50 bg-popover border border-border rounded-xl shadow-2xl p-4 min-w-[280px] max-w-[320px]"
            style={{ bottom: 56, left: '50%', transform: 'translateX(-50%)' }}
          >
            {/* Close button hint */}
            <div className="absolute top-2 right-2 text-muted-foreground/50 text-xs">×</div>
            
            {/* Header with avatar and name */}
            <div className="flex items-start gap-3 mb-3">
              {entrega.motoristaFotoUrl ? (
                <img
                  src={entrega.motoristaFotoUrl}
                  alt={entrega.motorista || 'Motorista'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border-2 border-border">
                  <span className="text-base font-bold text-muted-foreground">
                    {(entrega.motorista || 'M').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {entrega.motorista || 'Motorista'}
                </div>
                {entrega.placa && (
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    {entrega.placa}
                  </div>
                )}
                {/* Status badge */}
                {entrega.status && statusLabels[entrega.status] && (
                  <Badge 
                    className={`mt-1.5 text-[10px] px-2 py-0.5 ${statusLabels[entrega.status].color} text-white border-0`}
                  >
                    {statusLabels[entrega.status].label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Cargo info section */}
            <div className="space-y-2 mb-3 pb-3 border-b border-border">
              {/* Cargo code */}
              {entrega.codigo && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Código: </span>
                  <span className="font-semibold text-foreground">{entrega.codigo}</span>
                </div>
              )}
              
              {/* Cargo description */}
              {entrega.descricao && (
                <div className="flex items-start gap-1.5 text-xs">
                  <Package className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-foreground line-clamp-2">{entrega.descricao}</span>
                </div>
              )}
            </div>

            {/* Destination */}
            {entrega.destino && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span className="line-clamp-2 text-foreground">{entrega.destino}</span>
              </div>
            )}

            {/* Phone (not clickable) */}
            {entrega.telefone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Phone className="w-3.5 h-3.5" />
                {entrega.telefone}
              </div>
            )}

            {/* Last update footer */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-border">
              <Clock className={`w-3.5 h-3.5 ${isRecent ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${isRecent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Última atualização: {formatLocationTimestamp(entrega.lastLocationUpdate)}
              </span>
            </div>
          </div>
        )}
      </div>
    </OverlayView>
  );
}

export function EntregasGoogleMap({ 
  entregas, 
  selectedCargaId, 
  selectedEntregaId,
  onSelectCarga,
  onSelectEntrega 
}: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [toOriginDirections, setToOriginDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Track user interaction to prevent auto-centering on realtime updates
  const [userInteracted, setUserInteracted] = useState(false);
  const initialBoundsFitRef = useRef(false);
  const previousSelectedRef = useRef<string | null>(null);

  // Support both carga and entrega selection modes
  const effectiveSelectedId = selectedCargaId || selectedEntregaId;

  const selected = useMemo(
    () => entregas.find((e) => 
      e.id === effectiveSelectedId || 
      e.cargaId === effectiveSelectedId || 
      e.entregaId === effectiveSelectedId
    ) ?? null,
    [entregas, effectiveSelectedId]
  );

  // Reset user interaction when selection changes
  useEffect(() => {
    if (effectiveSelectedId !== previousSelectedRef.current) {
      previousSelectedRef.current = effectiveSelectedId ?? null;
      if (effectiveSelectedId) {
        setUserInteracted(false);
      }
    }
  }, [effectiveSelectedId]);

  // Handle user interaction detection
  const handleDragStart = useCallback(() => {
    setUserInteracted(true);
  }, []);

  const handleZoomChanged = useCallback(() => {
    // Only mark as user interaction after initial fit
    if (initialBoundsFitRef.current) {
      setUserInteracted(true);
    }
  }, []);

  // Handle selection for both modes
  const handleSelect = useCallback((id: string | null) => {
    if (onSelectCarga) onSelectCarga(id);
    if (onSelectEntrega) onSelectEntrega(id);
  }, [onSelectCarga, onSelectEntrega]);

  const handleMarkerSelect = useCallback((e: EntregaMapItem) => {
    // Use the most specific ID available for selection
    const selectId = e.cargaId || e.entregaId || e.id;
    handleSelect(selectId);
  }, [handleSelect]);

  const handleLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const handleUnmount = useCallback(() => setMap(null), []);

  // Fit bounds - only on initial load or selection change, NOT on realtime updates
  useEffect(() => {
    if (!map) return;

    // If user interacted with the map, don't auto-fit (unless there's a new selection)
    if (userInteracted && !effectiveSelectedId) return;

    // If we already did initial fit and there's no selection change, don't re-fit
    if (initialBoundsFitRef.current && !effectiveSelectedId) return;

    if (selected?.origemCoords && selected?.destinoCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(selected.origemCoords);
      bounds.extend(selected.destinoCoords);
      if (selected.latitude != null && selected.longitude != null) {
        bounds.extend({ lat: selected.latitude, lng: selected.longitude });
      }
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      initialBoundsFitRef.current = true;
      return;
    }

    // Initial bounds fit for all markers
    if (!initialBoundsFitRef.current && entregas.length > 0) {
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

      if (hasAny) {
        map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
        initialBoundsFitRef.current = true;
      }
    }
  }, [map, selected, effectiveSelectedId, userInteracted]);

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

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted rounded-lg border border-border">
        <p className="text-muted-foreground">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg border border-border">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={defaultCenter}
        zoom={5}
        options={mapOptions}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onDragStart={handleDragStart}
        onZoomChanged={handleZoomChanged}
        onClick={() => handleSelect(null)}
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

        {/* Driver markers - hover only */}
        {entregas.map((e) => (
          <DriverMarker
            key={e.id}
            entrega={e}
            isHovered={e.id === hoveredId}
            onHover={() => setHoveredId(e.id)}
            onLeave={() => setHoveredId(null)}
            onSelect={() => handleMarkerSelect(e)}
          />
        ))}

        {/* Origin marker */}
        {selected?.origemCoords && (
          <MarkerF
            key={`orig-${selected.id}`}
            position={selected.origemCoords}
            zIndex={998}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            label={{
              text: 'O',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          />
        )}

        {/* Destination marker */}
        {selected?.destinoCoords && (
          <MarkerF
            key={`dest-${selected.id}`}
            position={selected.destinoCoords}
            zIndex={999}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            label={{
              text: 'D',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
