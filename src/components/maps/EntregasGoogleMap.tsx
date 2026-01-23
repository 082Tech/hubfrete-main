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
  motoristaId?: string | null; // Added for grouping
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

// Represents a unique driver on the map (may have multiple deliveries)
type DriverMapItem = EntregaMapItem & {
  deliveryCount: number;
  deliveryIds: string[];
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

  // Group entregas by driver - only one truck per driver on the map
  const uniqueDrivers = useMemo((): DriverMapItem[] => {
    const driverMap = new Map<string, DriverMapItem>();

    entregas.forEach((entrega) => {
      // Use motoristaId if available, otherwise fallback to motorista name or a unique key
      const driverKey = entrega.motoristaId || entrega.motorista || entrega.id;

      if (!driverMap.has(driverKey)) {
        driverMap.set(driverKey, {
          ...entrega,
          deliveryCount: 1,
          deliveryIds: [entrega.entregaId || entrega.id],
        });
      } else {
        const existing = driverMap.get(driverKey)!;
        existing.deliveryCount += 1;
        existing.deliveryIds.push(entrega.entregaId || entrega.id);
        
        // Update position to latest if this entrega has more recent location
        if (
          entrega.lastLocationUpdate &&
          (!existing.lastLocationUpdate || entrega.lastLocationUpdate > existing.lastLocationUpdate)
        ) {
          existing.latitude = entrega.latitude;
          existing.longitude = entrega.longitude;
          existing.heading = entrega.heading;
          existing.lastLocationUpdate = entrega.lastLocationUpdate;
          existing.motoristaOnline = entrega.motoristaOnline;
        }
      }
    });

    return Array.from(driverMap.values());
  }, [entregas]);

  // Filter visible drivers - show all when nothing selected, or just the selected driver
  const visibleDrivers = useMemo((): DriverMapItem[] => {
    if (!selected) return uniqueDrivers;
    
    // Find the driver that owns the selected entrega
    const selectedDriverKey = selected.motoristaId || selected.motorista || selected.id;
    return uniqueDrivers.filter((d) => {
      const driverKey = d.motoristaId || d.motorista || d.id;
      return driverKey === selectedDriverKey;
    });
  }, [uniqueDrivers, selected]);

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

        {/* Driver Markers - One per driver */}
        {visibleDrivers.map((driver) => {
          // Check if this driver owns the selected entrega
          const isSelected = Boolean(
            selected &&
            driver.deliveryIds.includes(selected.entregaId || selected.id)
          );

          const driverKey = driver.motoristaId || driver.motorista || driver.id;

          return (
            <DriverMarker
              key={`driver-${driverKey}-${driver.lastLocationUpdate}`}
              entrega={driver}
              isHovered={hoveredId === driverKey}
              isSelected={isSelected}
              onHover={() => setHoveredId(driverKey)}
              onLeave={() => setHoveredId(null)}
              onSelect={() => {
                // If clicking on already selected driver's truck, keep selection
                // Otherwise select the first delivery of this driver
                if (!isSelected) {
                  const firstDeliveryId = driver.deliveryIds[0];
                  // Find the actual entrega to get the cargaId
                  const firstEntrega = entregas.find(
                    (e) => (e.entregaId || e.id) === firstDeliveryId
                  );
                  handleSelect(firstEntrega?.cargaId || firstEntrega?.entregaId || firstDeliveryId);
                }
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Selection Panel (outside map for better styling) */}
      {selected && <SelectionPanel entrega={selected} onClose={() => handleSelect(null)} />}
    </div>
  );
}
