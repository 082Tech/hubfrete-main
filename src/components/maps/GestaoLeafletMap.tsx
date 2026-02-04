import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
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

interface MotoristaLocation {
  motorista_id: string;
  latitude: number | null;
  longitude: number | null;
  heading?: number | null;
  isOnline?: boolean;
}

interface GestaoLeafletMapProps {
  localizacoes: MotoristaLocation[];
  selectedMotoristaId: string | null;
  onMotoristaClick: (motoristaId: string) => void;
  motoristaNames: Record<string, string>;
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

// Component to fit bounds to all points
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

// Controller component for map operations
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

/**
 * Mapa Leaflet para o Dialog de Gestão de Entregas
 * - Mostra todos os motoristas com seus ícones de caminhão
 * - Permite clicar para selecionar um motorista
 */
export function GestaoLeafletMap({
  localizacoes,
  selectedMotoristaId,
  onMotoristaClick,
  motoristaNames,
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

  return (
    <div className="w-full h-full">
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

        {localizacoes.map(loc => {
          if (!loc.latitude || !loc.longitude) return null;

          const isSelected = selectedMotoristaId === loc.motorista_id;
          const isOnline = loc.isOnline ?? true; // Default to online if not specified

          return (
            <Marker
              key={loc.motorista_id}
              position={[loc.latitude, loc.longitude]}
              icon={createTruckIcon(loc.heading ?? 0, isOnline, isSelected)}
              eventHandlers={{
                click: () => onMotoristaClick(loc.motorista_id),
              }}
              title={motoristaNames[loc.motorista_id] || 'Motorista'}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
