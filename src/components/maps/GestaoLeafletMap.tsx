import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
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

interface EntregaInfo {
  id: string;
  codigo: string;
  status: string;
  origemCidade: string;
  destinoCidade: string;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
}

interface MotoristaLocation {
  motorista_id: string;
  latitude: number | null;
  longitude: number | null;
  heading?: number | null;
  isOnline?: boolean;
}

interface MotoristaInfo {
  nome: string;
  entregas: EntregaInfo[];
  isOnline: boolean;
}

interface GestaoLeafletMapProps {
  localizacoes: MotoristaLocation[];
  selectedMotoristaId: string | null;
  selectedEntregaId: string | null;
  onMotoristaClick: (motoristaId: string) => void;
  motoristaNames: Record<string, string>;
  motoristaInfo?: Record<string, MotoristaInfo>;
  statusCounts?: { aguardando: number; emRota: number; entregue: number; cancelada: number };
}

// Create truck icon
const createTruckIcon = (heading: number = 0, isOnline: boolean = false, isSelected: boolean = false) => {
  const size = isSelected ? 56 : 48;
  return new L.DivIcon({
    className: 'truck-marker',
    html: getTruckIconHtml(heading, isOnline, isSelected, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Create location marker icon (origin/destination)
const createLocationIcon = (type: 'origem' | 'destino') => {
  const color = type === 'origem' ? '#22c55e' : '#ef4444';
  const letter = type === 'origem' ? 'O' : 'D';
  return new L.DivIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        ${letter}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to fit bounds to all points - ONLY ONCE
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFitted.current) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    hasFitted.current = true;
  }, [points, map]);

  return null;
}

// Controller component for map operations - pan to selected driver
function MapController({
  selectedMotoristaId,
  localizacoes,
}: {
  selectedMotoristaId: string | null;
  localizacoes: MotoristaLocation[];
}) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedMotoristaId && selectedMotoristaId !== prevSelectedRef.current) {
      const loc = localizacoes.find(l => l.motorista_id === selectedMotoristaId);
      if (loc?.latitude && loc?.longitude) {
        map.setView([loc.latitude, loc.longitude], 13);
      }
    }
    prevSelectedRef.current = selectedMotoristaId;
  }, [selectedMotoristaId, localizacoes, map]);

  return null;
}

// Cria caminho curvo entre dois pontos
function createCurvedPath(
  start: [number, number],
  end: [number, number],
  numPoints: number = 10
): [number, number][] {
  const points: [number, number][] = [];
  
  const latDiff = end[0] - start[0];
  const lngDiff = end[1] - start[1];
  
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  const curveIntensity = Math.min(distance * 0.12, 0.4);
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    let lat = start[0] + latDiff * t;
    let lng = start[1] + lngDiff * t;
    
    const curveFactor = Math.sin(t * Math.PI) * curveIntensity;
    
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

// Custom Marker component with hover tooltip
function DriverMarkerWithTooltip({
  loc,
  isSelected,
  motoristaName,
  motoristaInfo,
  onMotoristaClick,
}: {
  loc: MotoristaLocation;
  isSelected: boolean;
  motoristaName: string;
  motoristaInfo?: MotoristaInfo;
  onMotoristaClick: (motoristaId: string) => void;
}) {
  if (!loc.latitude || !loc.longitude) return null;

  const isOnline = loc.isOnline ?? motoristaInfo?.isOnline ?? true;
  const entregasCount = motoristaInfo?.entregas?.length ?? 0;

  return (
    <Marker
      position={[loc.latitude, loc.longitude]}
      icon={createTruckIcon(loc.heading ?? 0, isOnline, isSelected)}
      eventHandlers={{
        click: () => onMotoristaClick(loc.motorista_id),
      }}
    >
      <Tooltip 
        direction="top" 
        offset={[0, -30]} 
        opacity={1}
        className="driver-tooltip"
      >
        <div className="px-2 py-1.5 min-w-[120px]">
          <p className="font-semibold text-sm mb-0.5">{motoristaName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center gap-1 ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {entregasCount > 0 && (
              <span>• {entregasCount} entrega{entregasCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

// Status indicator badges no topo do mapa
function StatusIndicators({ statusCounts }: { statusCounts: GestaoLeafletMapProps['statusCounts'] }) {
  if (!statusCounts) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-amber-500" />
        <span className="text-xs font-medium">{statusCounts.aguardando}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-blue-500" />
        <span className="text-xs font-medium">{statusCounts.emRota}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-xs font-medium">{statusCounts.entregue}</span>
      </div>
      {statusCounts.cancelada > 0 && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-medium">{statusCounts.cancelada}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mapa Leaflet para o Dialog de Gestão de Entregas
 * - Mostra todos os motoristas com seus ícones de caminhão
 * - Permite clicar para selecionar um motorista
 * - Tooltip no hover mostrando nome e status
 * - Mostra rota da entrega selecionada (origem + destino)
 */
export function GestaoLeafletMap({
  localizacoes,
  selectedMotoristaId,
  selectedEntregaId,
  onMotoristaClick,
  motoristaNames,
  motoristaInfo,
  statusCounts,
}: GestaoLeafletMapProps) {
  // Collect all valid points
  const allPoints = useMemo(() => {
    return localizacoes
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude!, l.longitude!] as [number, number]);
  }, [localizacoes]);

  // Default center (Brazil)
  const mapCenter: [number, number] = useMemo(() => {
    if (allPoints.length > 0) {
      const lat = allPoints.reduce((acc, p) => acc + p[0], 0) / allPoints.length;
      const lng = allPoints.reduce((acc, p) => acc + p[1], 0) / allPoints.length;
      return [lat, lng];
    }
    return [-14.24, -51.93];
  }, [allPoints]);

  // Encontrar a entrega selecionada para mostrar a rota
  const selectedEntrega = useMemo(() => {
    if (!selectedMotoristaId || !selectedEntregaId || !motoristaInfo) return null;
    const info = motoristaInfo[selectedMotoristaId];
    if (!info) return null;
    return info.entregas.find(e => e.id === selectedEntregaId) || null;
  }, [selectedMotoristaId, selectedEntregaId, motoristaInfo]);

  // Coordenadas da rota selecionada
  const driverLocation = useMemo(() => {
    if (!selectedMotoristaId) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedMotoristaId);
    if (loc?.latitude && loc?.longitude) {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    return null;
  }, [selectedMotoristaId, localizacoes]);

  // Rotas curvas
  const routeToOrigin = useMemo(() => {
    if (!driverLocation || !selectedEntrega?.origemCoords) return null;
    return createCurvedPath(
      [driverLocation.lat, driverLocation.lng],
      [selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]
    );
  }, [driverLocation, selectedEntrega]);

  const routeOriginToDest = useMemo(() => {
    if (!selectedEntrega?.origemCoords || !selectedEntrega?.destinoCoords) return null;
    return createCurvedPath(
      [selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng],
      [selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]
    );
  }, [selectedEntrega]);

  return (
    <div className="w-full h-full relative">
      {/* Status indicators no topo */}
      <StatusIndicators statusCounts={statusCounts} />

      <MapContainer
        center={mapCenter}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds points={allPoints} />
        <MapController selectedMotoristaId={selectedMotoristaId} localizacoes={localizacoes} />

        {/* Marcadores de origem e destino da entrega selecionada */}
        {selectedEntrega?.origemCoords && (
          <Marker
            position={[selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]}
            icon={createLocationIcon('origem')}
          />
        )}
        {selectedEntrega?.destinoCoords && (
          <Marker
            position={[selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]}
            icon={createLocationIcon('destino')}
          />
        )}

        {/* Rota tracejada: Caminhão → Origem */}
        {routeToOrigin && (
          <Polyline
            positions={routeToOrigin}
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

        {/* Rota sólida: Origem → Destino */}
        {routeOriginToDest && (
          <Polyline
            positions={routeOriginToDest}
            pathOptions={{
              color: '#6366f1',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {localizacoes.map(loc => {
          if (!loc.latitude || !loc.longitude) return null;

          const isSelected = selectedMotoristaId === loc.motorista_id;
          const name = motoristaNames[loc.motorista_id] || 'Motorista';
          const info = motoristaInfo?.[loc.motorista_id];

          return (
            <DriverMarkerWithTooltip
              key={loc.motorista_id}
              loc={loc}
              isSelected={isSelected}
              motoristaName={name}
              motoristaInfo={info}
              onMotoristaClick={onMotoristaClick}
            />
          );
        })}
      </MapContainer>
      
      {/* Custom tooltip styles */}
      <style>{`
        .driver-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          padding: 0 !important;
        }
        .driver-tooltip::before {
          border-top-color: #e2e8f0 !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: white !important;
        }
      `}</style>
    </div>
  );
}