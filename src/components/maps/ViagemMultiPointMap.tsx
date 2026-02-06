import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup, CircleMarker, Tooltip } from 'react-leaflet';
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

// Ícone de origem (círculo com "O")
const createOrigemIcon = () => {
  return L.divIcon({
    className: 'custom-origin-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #22c55e;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4);
        border: 2px solid white;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Ícone de destino (círculo com bandeira)
const createDestinoIcon = () => {
  return L.divIcon({
    className: 'custom-destination-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #ef4444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        border: 2px solid white;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Ícone do caminhão usando o mesmo padrão do TruckIcon
const createTruckLeafletIcon = (heading: number, isOnline: boolean) => {
  const truckHtml = getTruckIconHtml(heading, isOnline, false, 48);
  return L.divIcon({
    className: 'truck-marker',
    html: truckHtml,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Componente para ajustar bounds automaticamente
function FitBoundsToPoints({ points }: { points: Coordinate[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, points]);

  return null;
}

/**
 * Mapa de viagem multi-ponto para visualização de todas as origens/destinos
 * Versão com Leaflet/OpenStreetMap
 */
export function ViagemMultiPointMap({
  entregas,
  driverLocation,
  height = 280,
  trackingPoints = [],
}: ViagemMultiPointMapProps) {
  // Coletar todos os pontos para calcular bounds
  const allPoints = useMemo(() => {
    const points: Coordinate[] = [];
    entregas.forEach(e => {
      if (e.origem) points.push(e.origem);
      if (e.destino) points.push(e.destino);
    });
    if (driverLocation) {
      points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    }
    return points;
  }, [entregas, driverLocation]);

  // Centro padrão se não houver coordenadas
  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (allPoints.length > 0) return [allPoints[0].lat, allPoints[0].lng];
    return [-23.55, -46.63];
  }, [driverLocation, allPoints]);

  const isDriverOnline = driverLocation?.isOnline ?? false;

  // Gerar linhas de rota para cada entrega
  const routeLines = useMemo(() => {
    const lines: Array<{ path: [number, number][]; color: string; dashed: boolean; key: string }> = [];

    entregas.forEach(entrega => {
      // Linha origem → destino (sempre visível)
      if (entrega.origem && entrega.destino) {
        lines.push({
          key: `route-${entrega.id}`,
          path: [[entrega.origem.lat, entrega.origem.lng], [entrega.destino.lat, entrega.destino.lng]],
          color: '#6366f1', // roxo
          dashed: false,
        });
      }

      // Linha motorista → próximo ponto (baseado no status)
      if (driverLocation) {
        const truckPos: [number, number] = [driverLocation.lat, driverLocation.lng];

        if (entrega.status === 'aguardando' || entrega.status === 'saiu_para_coleta') {
          // Motorista indo para origem
          if (entrega.origem) {
            lines.push({
              key: `truck-origem-${entrega.id}`,
              path: [truckPos, [entrega.origem.lat, entrega.origem.lng]],
              color: '#3b82f6', // azul
              dashed: true,
            });
          }
        } else if (entrega.status === 'saiu_para_entrega') {
          // Motorista indo para destino
          if (entrega.destino) {
            lines.push({
              key: `truck-destino-${entrega.id}`,
              path: [truckPos, [entrega.destino.lat, entrega.destino.lng]],
              color: '#22c55e', // verde
              dashed: true,
            });
          }
        }
      }
    });

    return lines;
  }, [entregas, driverLocation]);

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundsToPoints points={allPoints} />

        {/* Origens - Marcadores verdes */}
        {entregas.map((entrega) => (
          entrega.origem && (
            <Marker
              key={`origem-${entrega.id}`}
              position={[entrega.origem.lat, entrega.origem.lng]}
              icon={createOrigemIcon()}
            >
              <Popup>
                <div className="text-xs font-medium">Origem: {entrega.codigo}</div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Destinos - Marcadores vermelhos */}
        {entregas.map((entrega) => (
          entrega.destino && (
            <Marker
              key={`destino-${entrega.id}`}
              position={[entrega.destino.lat, entrega.destino.lng]}
              icon={createDestinoIcon()}
            >
              <Popup>
                <div className="text-xs font-medium">Destino: {entrega.codigo}</div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Ícone do motorista */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createTruckLeafletIcon(driverLocation.heading ?? 0, isDriverOnline)}
          />
        )}

        {/* Linhas de rota */}
        {routeLines.map(line => (
          <Polyline
            key={line.key}
            positions={line.path}
            pathOptions={{
              color: line.color,
              weight: 3,
              opacity: 0.8,
              dashArray: line.dashed ? '10, 10' : undefined,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
