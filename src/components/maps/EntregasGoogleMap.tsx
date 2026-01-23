import {
  GoogleMap,
  MarkerF,
  DirectionsRenderer,
  OverlayView,
} from '@react-google-maps/api';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  memo,
} from 'react';
import {
  useGoogleMaps,
  airbnbMapStyles,
  defaultCenter,
} from './GoogleMapsLoader';
import { Loader2, Clock, Phone, MapPin, Package, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrackingHistoryGoogleMarkers } from './TrackingHistoryGoogleMarkers';
import { TruckIcon } from './TruckIcon';
import { SelectedEntregaPanel } from './SelectedEntregaPanel';
import { DriverHoverCard } from './DriveHoveredCard';

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
}

/* ===================== HELPERS ===================== */

function formatLocationTimestamp(ts?: number | null) {
  if (!ts) return '-';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins} min atrás`;
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function focusMapOnTruck(
  map: google.maps.Map | null,
  lat: number,
  lng: number
) {
  if (!map) return;

  map.panTo({ lat, lng });
  map.setZoom(Math.max(map.getZoom() ?? 12, 14));
}

function isRecentUpdate(ts?: number | null) {
  if (!ts) return false;
  return Date.now() - ts < 2 * 60 * 1000;
}

function fitMapToRoute(
  map: google.maps.Map | null,
  route: google.maps.DirectionsResult
) {
  if (!map) return;

  const bounds = new google.maps.LatLngBounds();

  route.routes[0].overview_path.forEach((p) => bounds.extend(p));

  map.fitBounds(bounds, {
    top: 80,
    right: 80,
    bottom: 80,
    left: 80,
  });
}

/* ===================== MAP OPTIONS ===================== */

const mapOptions: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
};

const showRouteToOriginStatuses = ['aguardando_coleta', 'em_coleta'];

const statusLabels: Record<string, { label: string; color: string }> = {
  aguardando_coleta: { label: 'Aguardando Coleta', color: 'bg-amber-500' },
  em_coleta: { label: 'Em Coleta', color: 'bg-amber-500' },
  coletado: { label: 'Coletado', color: 'bg-blue-500' },
  em_transito: { label: 'Em Trânsito', color: 'bg-orange-500' },
  em_entrega: { label: 'Em Entrega', color: 'bg-purple-500' },
  entregue: { label: 'Entregue', color: 'bg-green-500' },
  problema: { label: 'Problema', color: 'bg-red-500' },
};

/* ===================== DRIVER MARKER ===================== */

const DriverMarker = memo(
  ({
    entrega,
    isHovered,
    isSelected,
    onHover,
    onLeave,
    onSelect,
  }: {
    entrega: EntregaMapItem;
    isHovered: boolean;
    isSelected: boolean;
    onHover: () => void;
    onLeave: () => void;
    onSelect: () => void;
  }) => {
    const lat =
      entrega.latitude != null
        ? entrega.latitude
        : entrega.origemCoords?.lat ?? null;

    const lng =
      entrega.longitude != null
        ? entrega.longitude
        : entrega.origemCoords?.lng ?? null;

    if (lat == null || lng == null) return null;

    const isRecent = isRecentUpdate(entrega.lastLocationUpdate);
    const isOnline = entrega.motoristaOnline && isRecent;
    const size = 56;

    return (
      <OverlayView
        position={{ lat, lng }}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={() => ({
          x: -size / 2,
          y: -size / 2,
        })}
      >
        <div
          className={`relative cursor-pointer transition-all duration-200
          ${isSelected ? 'z-50 scale-125' : 'z-10'}
          ${isHovered && !isSelected ? 'scale-110' : ''}
        `}
          style={{ width: size, height: size }}
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <TruckIcon
            size={size}
            heading={entrega.heading ?? 0}
            isOnline={isOnline}
          />

          {isHovered && (
            <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2">
              <DriverHoverCard entrega={entrega} formattedTimestamp={formatLocationTimestamp(entrega.lastLocationUpdate)} />
            </div>
          )}
        </div>
      </OverlayView>
    );
  }
);

/* ===================== OD MARKERS ===================== */

function OriginMarker({ position }: { position: google.maps.LatLngLiteral }) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
        O
      </div>
    </OverlayView>
  );
}

function DestinationMarker({ position }: { position: google.maps.LatLngLiteral }) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
        D
      </div>
    </OverlayView>
  );
}

/* ===================== MAIN MAP ===================== */

export function EntregasGoogleMap({
  entregas,
  selectedCargaId,
  selectedEntregaId,
  onSelectCarga,
  onSelectEntrega,
}: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routeToOrigin, setRouteToOrigin] =
    useState<google.maps.DirectionsResult | null>(null);

  const [routeToDestination, setRouteToDestination] =
    useState<google.maps.DirectionsResult | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const effectiveSelectedId = selectedCargaId || selectedEntregaId;

  const selected = useMemo(
    () =>
      entregas.find(
        (e) =>
          e.id === effectiveSelectedId ||
          e.cargaId === effectiveSelectedId ||
          e.entregaId === effectiveSelectedId
      ) ?? null,
    [entregas, effectiveSelectedId]
  );

  const visibleEntregas = useMemo(() => {
    if (!selected) return entregas;
    return entregas.filter(
      (e) =>
        e.id === selected.id ||
        e.cargaId === selected.id ||
        e.entregaId === selected.id
    );
  }, [entregas, selected]);

  /* ===== CLEAR ROUTES ON DESELECT ===== */

  const clearRoutes = () => {
    setRouteToOrigin(null);
    setRouteToDestination(null);
  };

  const handleSelect = useCallback(
    (id: string | null) => {
      if (!id) clearRoutes();
      onSelectCarga?.(id);
      onSelectEntrega?.(id);
    },
    [onSelectCarga, onSelectEntrega]
  );

  /* ===== ROUTES ===== */

  useEffect(() => {
    clearRoutes();

    if (!isLoaded || !selected) return;

    if (selected.latitude != null && selected.longitude != null) {
      focusMapOnTruck(map, selected.latitude, selected.longitude);
    }

    const service = new google.maps.DirectionsService();

    const hasTruckPos =
      selected.latitude != null && selected.longitude != null;

    const truckPosition = hasTruckPos
      ? { lat: selected.latitude!, lng: selected.longitude! }
      : null;

    const shouldGoToOrigin =
      showRouteToOriginStatuses.includes(selected.status ?? '');

    /**
     * 1️⃣ ORIGEM → CAMINHÃO (quando aguardando coleta)
     */
    if (shouldGoToOrigin && selected.origemCoords && truckPosition) {
      service.route(
        {
          origin: selected.origemCoords,
          destination: truckPosition,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res) {
            setRouteToOrigin(res);
            fitMapToRoute(map, res);
          }
        }
      );
    }

    /**
     * 2️⃣ CAMINHÃO → DESTINO (quando não está mais em coleta)
     */
    if (!shouldGoToOrigin && truckPosition && selected.destinoCoords) {
      service.route(
        {
          origin: truckPosition,
          destination: selected.destinoCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res) {
            setRouteToDestination(res);
            fitMapToRoute(map, res);
          }
        }
      );
    }
  }, [isLoaded, selected]);


  /* ===== RENDER ===== */

  if (loadError)
    return <div className="h-[500px] flex items-center justify-center">Erro</div>;

  if (!isLoaded)
    return (
      <div className="h-[500px] flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: 500 }}
      center={defaultCenter}
      zoom={5}
      options={mapOptions}
      onLoad={setMap}
      onClick={() => handleSelect(null)}
    >
      {selected && (
        <TrackingHistoryGoogleMarkers
          entregaId={selected.entregaId || selected.id}
        />
      )}

      {selected?.origemCoords && (
        <OriginMarker position={selected.origemCoords} />
      )}

      {selected?.destinoCoords && (
        <DestinationMarker position={selected.destinoCoords} />
      )}

      {selected && (
        <SelectedEntregaPanel
          entrega={selected}
          onClose={() => handleSelect(null)}
        />
      )}

      {routeToOrigin && (
        <DirectionsRenderer
          directions={routeToOrigin}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#ef4444', // vermelho (origem)
              strokeOpacity: 0.9,
              strokeWeight: 4,
            },
          }}
        />
      )}

      {routeToDestination && (
        <DirectionsRenderer
          directions={routeToDestination}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#22c55e', // verde (destino)
              strokeOpacity: 0.9,
              strokeWeight: 4,
            },
          }}
        />
      )}

      {visibleEntregas.map((e) => {
        const isSelected =
          selected &&
          (e.id === selected.id ||
            e.cargaId === selected.id ||
            e.entregaId === selected.id);

        return (
          <DriverMarker
            key={`${e.id}-${e.lastLocationUpdate}`}
            entrega={e}
            isHovered={hoveredId === e.id}
            isSelected={isSelected}
            onHover={() => setHoveredId(e.id)}
            onLeave={() => setHoveredId(null)}
            onSelect={() =>
              handleSelect(e.cargaId || e.entregaId || e.id)
            }
          />
        );
      })}
    </GoogleMap>
  );
}