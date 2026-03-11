import { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTruckIconHtml } from './TruckIcon';

interface Coordinate {
  lat: number;
  lng: number;
}

interface EntregaPoint {
  id: string;
  codigo: string;
  origem: Coordinate | null;
  destino: Coordinate | null;
  status: string;
}

interface TrackingPoint {
  lat: number;
  lng: number;
  tracked_at: string;
  speed: number | null;
  status: string | null;
}

interface ViagemMultiPointMapProps {
  entregas: EntregaPoint[];
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  height?: number;
  trackingPoints?: TrackingPoint[];
}

// Ícone de origem - círculo verde com "O" (mesmo estilo do DetailPanelLeafletMap)
const createOrigemIcon = () => {
  return L.divIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: #22c55e;
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
        O
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Ícone de destino - círculo vermelho com "D" (mesmo estilo do DetailPanelLeafletMap)
const createDestinoIcon = () => {
  return L.divIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: #ef4444;
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
        D
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Ícone do caminhão
const createTruckLeafletIcon = (heading: number, isOnline: boolean) => {
  const truckHtml = getTruckIconHtml(heading, isOnline, false, 48);
  return L.divIcon({
    className: 'truck-marker',
    html: truckHtml,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

/** HubFrete primary green – unified tracking color */
const HUBFRETE_GREEN = '#05924d';


function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Componente para ajustar bounds automaticamente
function FitBoundsOnce({ points }: { points: Coordinate[] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFitted.current) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
    hasFitted.current = true;
  }, [map, points]);

  return null;
}

/**
 * Mapa de viagem multi-ponto para visualização de todas as origens/destinos
 * Estilo visual idêntico ao DetailPanelLeafletMap (marcadores O/D, dots por status)
 * Sem linhas de rota (múltiplas origens/destinos)
 */
export function ViagemMultiPointMap({
  entregas,
  driverLocation,
  height = 280,
  trackingPoints = [],
}: ViagemMultiPointMapProps) {
  const allPoints = useMemo(() => {
    const points: Coordinate[] = [];
    entregas.forEach(e => {
      if (e.origem) points.push(e.origem);
      if (e.destino) points.push(e.destino);
    });
    if (driverLocation) {
      points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    }
    trackingPoints.forEach(tp => {
      points.push({ lat: tp.lat, lng: tp.lng });
    });
    return points;
  }, [entregas, driverLocation, trackingPoints]);

  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (allPoints.length > 0) return [allPoints[0].lat, allPoints[0].lng];
    return [-23.55, -46.63];
  }, [driverLocation, allPoints]);

  const isDriverOnline = driverLocation?.isOnline ?? false;

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundsOnce points={allPoints} />

        {/* Origens - Marcadores verdes com "O" */}
        {entregas.map((entrega) => (
          entrega.origem && (
            <Marker
              key={`origem-${entrega.id}`}
              position={[entrega.origem.lat, entrega.origem.lng]}
              icon={createOrigemIcon()}
            />
          )
        ))}

        {/* Destinos - Marcadores vermelhos com "D" */}
        {entregas.map((entrega) => (
          entrega.destino && (
            <Marker
              key={`destino-${entrega.id}`}
              position={[entrega.destino.lat, entrega.destino.lng]}
              icon={createDestinoIcon()}
            />
          )
        ))}

        {/* Ícone do motorista */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createTruckLeafletIcon(driverLocation.heading ?? 0, isDriverOnline)}
          />
        )}

        {/* Tracking history dots - unified HubFrete green */}
        {trackingPoints.map((point, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === trackingPoints.length - 1;

          return (
            <CircleMarker
              key={`track-${idx}`}
              center={[point.lat, point.lng]}
              radius={isFirst || isLast ? 8 : 5}
              pathOptions={{
                color: 'white',
                weight: 2,
                fillColor: HUBFRETE_GREEN,
                fillOpacity: isFirst || isLast ? 1 : 0.8,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs min-w-[120px]">
                  <div className="font-medium">Ponto de rastreamento</div>
                  <div className="text-gray-500 mt-0.5">{formatDateTime(point.tracked_at)}</div>
                  {point.speed != null && <div className="text-gray-500">{Math.round(point.speed)} km/h</div>}
                  {isFirst && <div className="mt-1 text-green-600 font-medium">📍 Início</div>}
                  {isLast && trackingPoints.length > 1 && <div className="mt-1 text-blue-600 font-medium">📍 Atual</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
