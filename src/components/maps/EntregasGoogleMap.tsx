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

function isRecentUpdate(ts?: number | null) {
  if (!ts) return false;
  return Date.now() - ts < 2 * 60 * 1000;
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
    onHover,
    onLeave,
    onSelect,
  }: {
    entrega: EntregaMapItem;
    isHovered: boolean;
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
          className={`relative cursor-pointer ${isHovered ? 'z-50 scale-110' : 'z-10'
            }`}
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
            <div className="absolute bottom-[64px] left-1/2 -translate-x-1/2 bg-popover border rounded-xl shadow-xl p-3 min-w-[260px] z-50">
              <div className="font-semibold text-sm">
                {entrega.motorista || 'Motorista'}
              </div>
              {entrega.status && (
                <Badge
                  className={`mt-1 text-[10px] ${statusLabels[entrega.status]?.color
                    } text-white`}
                >
                  {statusLabels[entrega.status]?.label}
                </Badge>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Última atualização:{' '}
                {formatLocationTimestamp(entrega.lastLocationUpdate)}
              </div>
            </div>
          )}
        </div>
      </OverlayView>
    );
  }
);

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
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [toOriginDirections, setToOriginDirections] =
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

  /* ===== CLEAR ROUTES ON DESELECT ===== */

  const handleSelect = useCallback(
    (id: string | null) => {
      if (!id) {
        setDirections(null);
        setToOriginDirections(null);
      }
      onSelectCarga?.(id);
      onSelectEntrega?.(id);
    },
    [onSelectCarga, onSelectEntrega]
  );

  /* ===== ROUTES ===== */

  useEffect(() => {
    if (!isLoaded || !selected || !selected.destinoCoords) {
      setDirections(null);
      setToOriginDirections(null);
      return;
    }

    const service = new google.maps.DirectionsService();

    const hasTruckPos =
      selected.latitude != null && selected.longitude != null;

    const origin = hasTruckPos
      ? { lat: selected.latitude!, lng: selected.longitude! }
      : selected.origemCoords;

    if (!origin) return;

    service.route(
      {
        origin,
        destination: selected.destinoCoords,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (res, status) => {
        if (status === google.maps.DirectionsStatus.OK && res)
          setDirections(res);
      }
    );

    if (
      showRouteToOriginStatuses.includes(selected.status ?? '') &&
      hasTruckPos &&
      selected.origemCoords
    ) {
      service.route(
        {
          origin,
          destination: selected.origemCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res)
            setToOriginDirections(res);
        }
      );
    } else {
      setToOriginDirections(null);
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

      {selected && directions && (
        <DirectionsRenderer
          key={`route-${selected.id}`}
          directions={directions}
          options={{ suppressMarkers: true }}
        />
      )}

      {selected && toOriginDirections && (
        <DirectionsRenderer
          key={`route-origin-${selected.id}`}
          directions={toOriginDirections}
          options={{ suppressMarkers: true }}
        />
      )}

      {entregas.map((e) => (
        <DriverMarker
          key={`${e.id}-${e.lastLocationUpdate}`}
          entrega={e}
          isHovered={hoveredId === e.id}
          onHover={() => setHoveredId(e.id)}
          onLeave={() => setHoveredId(null)}
          onSelect={() =>
            handleSelect(e.cargaId || e.entregaId || e.id)
          }
        />
      ))}
    </GoogleMap>
  );
}