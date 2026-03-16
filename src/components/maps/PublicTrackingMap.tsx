import { useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPinOff } from 'lucide-react';
import { getTruckIconHtml } from './TruckIcon';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PublicTrackingMapProps {
  latitude?: number;
  longitude?: number;
  lastUpdate?: string | null;
  origem?: { lat: number; lng: number } | null;
  destino?: { lat: number; lng: number } | null;
}

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

const createTruckIcon = (heading: number = 0, isOnline: boolean = true) => {
  const size = 48;
  return new L.DivIcon({
    className: 'truck-marker',
    html: getTruckIconHtml(heading, isOnline, false, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

function FitBoundsOnce({ points }: { points: [number, number][] }) {
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
  }, [map]);

  return null;
}

function MapContent({ latitude, longitude, lastUpdate, origem, destino }: PublicTrackingMapProps) {
  const hasLocation = latitude !== undefined && longitude !== undefined;

  const isOnline = useMemo(() => {
    if (!lastUpdate) return false;
    const diff = (Date.now() - new Date(lastUpdate).getTime()) / 1000;
    return diff <= 120; // 2 minutes
  }, [lastUpdate]);

  const center = useMemo((): [number, number] => {
    if (hasLocation) return [latitude, longitude];
    return [-15.7801, -47.9292];
  }, [latitude, longitude, hasLocation]);

  const boundsPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (origem && origem.lat && origem.lng) pts.push([origem.lat, origem.lng]);
    if (destino && destino.lat && destino.lng) pts.push([destino.lat, destino.lng]);
    if (hasLocation) pts.push([latitude, longitude]);
    return pts;
  }, [origem, destino, hasLocation, latitude, longitude]);

  const truckIcon = useMemo(() => createTruckIcon(0, isOnline), [isOnline]);
  const origemIcon = useMemo(() => createLocationIcon('origem'), []);
  const destinoIcon = useMemo(() => createLocationIcon('destino'), []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={hasLocation ? 14 : 4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {boundsPoints.length > 0 && <FitBoundsOnce points={boundsPoints} />}

        {origem && (
          <Marker position={[origem.lat, origem.lng]} icon={origemIcon} />
        )}
        {destino && (
          <Marker position={[destino.lat, destino.lng]} icon={destinoIcon} />
        )}
        {hasLocation && (
          <Marker position={[latitude, longitude]} icon={truckIcon} />
        )}
      </MapContainer>

      {hasLocation && lastUpdate && (
        <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur px-3 py-1 rounded-md shadow text-xs font-medium text-gray-700">
          Atualizado {formatDistanceToNow(new Date(lastUpdate), { locale: ptBR, addSuffix: true })}
        </div>
      )}

      {!hasLocation && !origem && !destino && (
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-white/90 p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center gap-2 text-center max-w-[250px]">
            <div className="p-3 bg-gray-100 rounded-full">
              <MapPinOff className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Localização não disponível</p>
              <p className="text-xs text-gray-500">O rastreamento do veículo não foi iniciado ou o sinal foi perdido.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublicTrackingMap(props: PublicTrackingMapProps) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
      <MapContent {...props} />
    </div>
  );
}
