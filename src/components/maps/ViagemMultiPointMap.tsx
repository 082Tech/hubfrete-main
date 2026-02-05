import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface ViagemMultiPointMapProps {
  entregas: EntregaPoint[];
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  height?: number;
}

// Ícone de origem (círculo verde)
const createOrigemIcon = (index: number) => {
  const colors = ['#22c55e', '#10b981', '#059669', '#047857'];
  const color = colors[index % colors.length];
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 20px; height: 20px; background: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Ícone de destino (seta vermelha)
const createDestinoIcon = (index: number) => {
  const colors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'];
  const color = colors[index % colors.length];
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 16px solid ${color}; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>`,
    iconSize: [20, 16],
    iconAnchor: [10, 8],
  });
};

// Ícone do caminhão
const createTruckIcon = (heading: number, isOnline: boolean) => {
  const color = isOnline ? '#3b82f6' : '#6b7280';
  return L.divIcon({
    className: 'truck-marker',
    html: `
      <div style="transform: rotate(${heading}deg); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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
        {entregas.map((entrega, index) => (
          entrega.origem && (
            <Marker
              key={`origem-${entrega.id}`}
              position={[entrega.origem.lat, entrega.origem.lng]}
              icon={createOrigemIcon(index)}
              title={`Origem: ${entrega.codigo}`}
            />
          )
        ))}

        {/* Destinos - Marcadores vermelhos */}
        {entregas.map((entrega, index) => (
          entrega.destino && (
            <Marker
              key={`destino-${entrega.id}`}
              position={[entrega.destino.lat, entrega.destino.lng]}
              icon={createDestinoIcon(index)}
              title={`Destino: ${entrega.codigo}`}
            />
          )
        ))}

        {/* Ícone do motorista */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={createTruckIcon(driverLocation.heading ?? 0, isDriverOnline)}
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
