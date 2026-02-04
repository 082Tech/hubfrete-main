import { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTruckIconHtml } from './TruckIcon';

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
    // Só faz o fit uma vez, no primeiro render quando temos pontos
    if (points.length === 0 || hasFitted.current) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    hasFitted.current = true;
  }, [map]); // Apenas map como dependência - não reagir a mudanças de points

  return null;
}

/**
 * Mapa Leaflet do painel de detalhes da Operação Diária
 * - Mostra origem (verde), destino (vermelho) e motorista (TruckIcon)
 * - Rotas tracejadas baseadas no status:
 *   - aguardando/saiu_para_coleta: caminhão → origem (tracejado) + origem → destino (sólido)
 *   - saiu_para_entrega: caminhão → destino (tracejado)
 * - O zoom automático só acontece UMA VEZ ao abrir o mapa
 */
export function DetailPanelLeafletMap({
  origemCoords,
  destinoCoords,
  driverLocation,
  status,
  height = 300,
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
  const showRouteToDestino = status === 'saiu_para_entrega';

  // Rotas com estilo de curva (simular rota real com pontos intermediários)
  const truckToOriginPath = useMemo((): [number, number][] | null => {
    if (!showRouteToOrigin || !driverLocation || !origemCoords) return null;
    return createCurvedPath(
      [driverLocation.lat, driverLocation.lng],
      [origemCoords.lat, origemCoords.lng]
    );
  }, [showRouteToOrigin, driverLocation, origemCoords]);

  const originToDestinoPath = useMemo((): [number, number][] | null => {
    if (!showRouteOriginToDestino || !origemCoords || !destinoCoords) return null;
    return createCurvedPath(
      [origemCoords.lat, origemCoords.lng],
      [destinoCoords.lat, destinoCoords.lng]
    );
  }, [showRouteOriginToDestino, origemCoords, destinoCoords]);

  const truckToDestinoPath = useMemo((): [number, number][] | null => {
    if (!showRouteToDestino || !driverLocation || !destinoCoords) return null;
    return createCurvedPath(
      [driverLocation.lat, driverLocation.lng],
      [destinoCoords.lat, destinoCoords.lng]
    );
  }, [showRouteToDestino, driverLocation, destinoCoords]);

  const isDriverOnline = driverLocation?.isOnline ?? false;

  return (
    <div className="rounded-lg overflow-hidden border relative z-0" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
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

        {/* Rota tracejada: Caminhão → Origem (quando aguardando ou saiu_para_coleta) */}
        {truckToOriginPath && (
          <Polyline
            positions={truckToOriginPath}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.8,
              dashArray: '8, 12',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Rota sólida: Origem → Destino (quando aguardando ou saiu_para_coleta) */}
        {originToDestinoPath && (
          <Polyline
            positions={originToDestinoPath}
            pathOptions={{
              color: '#6366f1',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Rota tracejada: Caminhão → Destino (quando saiu_para_entrega) */}
        {truckToDestinoPath && (
          <Polyline
            positions={truckToDestinoPath}
            pathOptions={{
              color: '#22c55e',
              weight: 4,
              opacity: 0.8,
              dashArray: '8, 12',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

/**
 * Cria um caminho curvo entre dois pontos para simular uma rota real
 * Adiciona pontos intermediários com leve desvio para criar uma curva natural
 */
function createCurvedPath(
  start: [number, number],
  end: [number, number],
  numPoints: number = 10
): [number, number][] {
  const points: [number, number][] = [];
  
  const latDiff = end[0] - start[0];
  const lngDiff = end[1] - start[1];
  
  // Calcular a distância para determinar a intensidade da curva
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const curveIntensity = Math.min(distance * 0.15, 0.5); // Limitar a curva máxima
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    
    // Interpolação linear base
    let lat = start[0] + latDiff * t;
    let lng = start[1] + lngDiff * t;
    
    // Adicionar curva usando uma função senoidal
    // A curva é mais pronunciada no meio do caminho
    const curveFactor = Math.sin(t * Math.PI) * curveIntensity;
    
    // Perpendicular à direção da rota
    const perpLat = -lngDiff;
    const perpLng = latDiff;
    const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
    
    if (perpLength > 0) {
      lat += (perpLat / perpLength) * curveFactor;
      lng += (perpLng / perpLength) * curveFactor;
    }
    
    points.push([lat, lng]);
  }
  
  return points;
}
