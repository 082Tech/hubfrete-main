import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useGoogleMaps, airbnbMapStyles, defaultCenter } from './GoogleMapsLoader';
import { useMapRoutes } from './hooks/useMapRoutes';
import { useMapFitBounds } from './hooks/useMapFitBounds';

import { DriverMarker } from './components/DriverMarker';
import { RouteMarker } from './components/RouteMarker';
import { SelectionPanel } from './components/SelectionPanel';
import { TrackingHistoryGoogleMarkers } from './TrackingHistoryGoogleMarkers';

/* ===================== TYPES ===================== */

export type EntregaMapItem = {
  id: string;
  cargaId?: string;
  entregaId?: string | null;
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
  heading?: number | null;
};

interface EntregasGoogleMapProps {
  entregas: EntregaMapItem[];
  selectedCargaId?: string | null;
  selectedEntregaId?: string | null;
  onSelectCarga?: (id: string | null) => void;
  onSelectEntrega?: (id: string | null) => void;
  height?: number | string;
}

/* ===================== MAP OPTIONS ===================== */

const mapOptions: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
  gestureHandling: 'greedy',
};

const ROUTE_STYLES = {
  toOrigin: {
    strokeColor: '#f97316', // orange
    strokeOpacity: 0.8,
    strokeWeight: 5,
  },
  toDestination: {
    strokeColor: '#3b82f6', // blue
    strokeOpacity: 0.9,
    strokeWeight: 5,
    icons: [
      {
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
        offset: '0',
        repeat: '16px',
      },
    ],
  },
};

/* ===================== MAIN COMPONENT ===================== */

export function EntregasGoogleMap({
  entregas,
  selectedCargaId,
  selectedEntregaId,
  onSelectCarga,
  onSelectEntrega,
  height = 500,
}: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Compute selected item
  const effectiveSelectedId = selectedCargaId || selectedEntregaId;

  const selected = useMemo(() => {
    if (!effectiveSelectedId) return null;
    return (
      entregas.find(
        (e) =>
          e.id === effectiveSelectedId ||
          e.cargaId === effectiveSelectedId ||
          e.entregaId === effectiveSelectedId
      ) ?? null
    );
  }, [entregas, effectiveSelectedId]);

  // Filter visible markers
  const visibleEntregas = useMemo(() => {
    if (!selected) return entregas;
    return entregas.filter(
      (e) =>
        e.id === selected.id ||
        e.cargaId === selected.id ||
        e.entregaId === selected.id
    );
  }, [entregas, selected]);

  // Map bounds management
  const { fitToRoute, panTo, setUserInteracted, resetInteraction } = useMapFitBounds(map);

  // Routing
  const truckPosition = useMemo(() => {
    if (!selected || selected.latitude == null || selected.longitude == null) return null;
    return { lat: selected.latitude, lng: selected.longitude };
  }, [selected]);

  const { routeToOrigin, routeToDestination, clearRoutes } = useMapRoutes({
    origin: selected?.origemCoords ?? null,
    destination: selected?.destinoCoords ?? null,
    truckPosition,
    status: selected?.status ?? null,
    isLoaded,
  });

  // Pan to selected truck when selection changes
  useEffect(() => {
    if (selected && truckPosition) {
      resetInteraction();
      panTo(truckPosition, 14);
    }
  }, [selected?.id]);

  // Fit to route when available
  useEffect(() => {
    if (routeToOrigin) fitToRoute(routeToOrigin);
    else if (routeToDestination) fitToRoute(routeToDestination);
  }, [routeToOrigin, routeToDestination, fitToRoute]);

  // Selection handler
  const handleSelect = useCallback(
    (id: string | null) => {
      if (!id) clearRoutes();
      onSelectCarga?.(id);
      onSelectEntrega?.(id);
    },
    [onSelectCarga, onSelectEntrega, clearRoutes]
  );

  // Map interaction handlers
  const handleMapDrag = useCallback(() => {
    setUserInteracted();
  }, [setUserInteracted]);

  /* ===================== RENDER ===================== */

  if (loadError) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-xl">
        <p className="text-destructive">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={defaultCenter}
        zoom={5}
        options={mapOptions}
        onLoad={setMap}
        onDragStart={handleMapDrag}
        onZoomChanged={handleMapDrag}
        onClick={() => handleSelect(null)}
      >
        {/* Tracking History (when selected) */}
        {selected && (
          <TrackingHistoryGoogleMarkers entregaId={selected.entregaId || selected.id} />
        )}

        {/* Origin Marker */}
        {selected?.origemCoords && (
          <RouteMarker position={selected.origemCoords} type="origin" label="Origem" />
        )}

        {/* Destination Marker */}
        {selected?.destinoCoords && (
          <RouteMarker position={selected.destinoCoords} type="destination" label="Destino" />
        )}

        {/* Route to Origin (orange solid) */}
        {routeToOrigin && (
          <DirectionsRenderer
            directions={routeToOrigin}
            options={{
              suppressMarkers: true,
              polylineOptions: ROUTE_STYLES.toOrigin,
            }}
          />
        )}

        {/* Route to Destination (blue dashed) */}
        {routeToDestination && (
          <DirectionsRenderer
            directions={routeToDestination}
            options={{
              suppressMarkers: true,
              polylineOptions: ROUTE_STYLES.toDestination,
            }}
          />
        )}

        {/* Driver Markers */}
        {visibleEntregas.map((entrega) => {
          const isSelected =
            selected &&
            (entrega.id === selected.id ||
              entrega.cargaId === selected.id ||
              entrega.entregaId === selected.id);

          return (
            <DriverMarker
              key={`${entrega.id}-${entrega.lastLocationUpdate}`}
              entrega={entrega}
              isHovered={hoveredId === entrega.id}
              isSelected={Boolean(isSelected)}
              onHover={() => setHoveredId(entrega.id)}
              onLeave={() => setHoveredId(null)}
              onSelect={() => handleSelect(entrega.cargaId || entrega.entregaId || entrega.id)}
            />
          );
        })}
      </GoogleMap>

      {/* Selection Panel (outside map for better styling) */}
      {selected && <SelectionPanel entrega={selected} onClose={() => handleSelect(null)} />}
    </div>
  );
}
