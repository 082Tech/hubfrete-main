import { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTruckIconHtml } from './TruckIcon';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  isOnline?: boolean;
}

interface DetailPanelLeafletMapProps {
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  driverLocation: DriverLocation | null;
  status: string;
  height?: number;
  entregaId?: string | null;
  onExpandClick?: () => void;
}

// Create location marker icon (origin/destination)
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

// Create truck icon
const createTruckIcon = (heading: number = 0, isOnline: boolean = false) => {
  const size = 48;
  return new L.DivIcon({
    className: 'truck-marker',
    html: getTruckIconHtml(heading, isOnline, false, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Component to fit bounds ONLY ONCE on initial mount
function FitBoundsOnce({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFitted.current) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    hasFitted.current = true;
  }, [map]); // Only map as dependency — don't react to point changes

  return null;
}

// Component to render route polyline with OSRM data
function OSRMRoutePolyline({
  origin,
  destination,
  color,
  dashArray,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  color: string;
  dashArray?: string;
}) {
  const { route } = useOSRMRoute(origin, destination);

  if (!route || route.length === 0) return null;

  return (
    <Polyline
      positions={route}
      pathOptions={{
        color,
        weight: 4,
        opacity: 0.9,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
}

/**
 * Mapa Leaflet do painel de detalhes da Operação Diária
 * - Mostra origem (verde), destino (vermelho) e motorista (TruckIcon)
 * - Rotas OSRM reais baseadas no status
 * - O zoom automático só acontece UMA VEZ ao abrir o mapa
 * - scrollWheelZoom habilitado para interação livre
 */
export function DetailPanelLeafletMap({
  origemCoords,
  destinoCoords,
  driverLocation,
  status,
  height = 300,
  entregaId,
  onExpandClick,
}: DetailPanelLeafletMapProps) {
  // Collect all points for bounds calculation
  const allPoints = useMemo(() => {
    const points: [number, number][] = [];
    if (origemCoords) points.push([origemCoords.lat, origemCoords.lng]);
    if (destinoCoords) points.push([destinoCoords.lat, destinoCoords.lng]);
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
    return points;
  }, [origemCoords, destinoCoords, driverLocation]);

  // Centro padrão se não houver coordenadas
  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (origemCoords) return [origemCoords.lat, origemCoords.lng];
    if (destinoCoords) return [destinoCoords.lat, destinoCoords.lng];
    return [-23.55, -46.63];
  }, [driverLocation, origemCoords, destinoCoords]);

  // Determinar quais rotas mostrar baseado no status
  const showRouteToOrigin = status === 'aguardando' || status === 'saiu_para_coleta';
  const showRouteOriginToDestino = status === 'aguardando' || status === 'saiu_para_coleta';
  const showRouteToDestino = status === 'em_transito' || status === 'saiu_para_entrega';

  const isDriverOnline = driverLocation?.isOnline ?? false;

  return (
    <div className="rounded-lg overflow-hidden border relative z-0" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundsOnce points={allPoints} />

        {/* Origem - Marcador verde */}
        {origemCoords && (
          <Marker
            position={[origemCoords.lat, origemCoords.lng]}
            icon={createLocationIcon('origem')}
          />
        )}

        {/* Destino - Marcador vermelho */}
        {destinoCoords && (
          <Marker
            position={[destinoCoords.lat, destinoCoords.lng]}
            icon={createLocationIcon('destino')}
          />
        )}

        {/* TruckIcon do motorista */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createTruckIcon(driverLocation.heading ?? 0, isDriverOnline)}
          />
        )}

        {/* Rota OSRM tracejada: Caminhão → Origem (quando aguardando ou saiu_para_coleta) */}
        {showRouteToOrigin && (
          <OSRMRoutePolyline
            origin={driverLocation}
            destination={origemCoords}
            color="#06b6d4"
            dashArray="8, 12"
          />
        )}

        {/* Rota OSRM sólida: Origem → Destino (quando aguardando ou saiu_para_coleta) */}
        {showRouteOriginToDestino && (
          <OSRMRoutePolyline
            origin={origemCoords}
            destination={destinoCoords}
            color="#a855f7"
          />
        )}

        {/* Histórico de rastreamento */}
        {entregaId && <TrackingHistoryMarkers entregaId={entregaId} />}

        {/* Rota OSRM tracejada: Caminhão → Destino (quando saiu_para_entrega) */}
        {showRouteToDestino && (
          <OSRMRoutePolyline
            origin={driverLocation}
            destination={destinoCoords}
            color="#22c55e"
            dashArray="8, 12"
          />
        )}
      </MapContainer>

      {/* Fullscreen / expand button */}
      {onExpandClick && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 z-[500] h-8 w-8 shadow-md bg-background/90 hover:bg-background border text-foreground"
          onClick={onExpandClick}
          title="Abrir visualização geral em mapa"
        >
          <Maximize2 className="w-4 h-4 text-foreground" />
        </Button>
      )}
    </div>
  );
}
