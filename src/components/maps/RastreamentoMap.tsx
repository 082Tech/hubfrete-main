import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { User, Truck, Clock } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom truck icon for drivers
const createDriverIcon = (isOnline: boolean) => {
  const color = isOnline ? '#22c55e' : '#6b7280';
  return new L.DivIcon({
    className: 'driver-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface DriverLocation {
  id: string;
  nome: string;
  placa: string | null;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastUpdate: string | null;
}

interface RastreamentoMapProps {
  drivers: DriverLocation[];
  selectedDriverId?: string | null;
}

// Component to auto-fit bounds
function FitBounds({ drivers }: { drivers: DriverLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (drivers.length === 0) return;
    
    if (drivers.length === 1) {
      map.setView([drivers[0].latitude, drivers[0].longitude], 14);
    } else {
      const bounds = L.latLngBounds(
        drivers.map((d) => [d.latitude, d.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [drivers, map]);
  
  return null;
}

export function RastreamentoMap({ drivers, selectedDriverId }: RastreamentoMapProps) {
  const mapRef = useRef<L.Map>(null);

  // Default center (Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  const defaultZoom = 4;

  return (
    <MapContainer
      ref={mapRef}
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full"
      style={{ background: '#f0f0f0' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <FitBounds drivers={drivers} />
      
      {drivers.map((driver) => (
        <Marker
          key={driver.id}
          position={[driver.latitude, driver.longitude]}
          icon={createDriverIcon(driver.isOnline)}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{driver.nome}</p>
                  {driver.placa && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      {driver.placa}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={driver.isOnline 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'text-muted-foreground'
                  }
                >
                  {driver.isOnline ? 'Online' : 'Offline'}
                </Badge>
                
                {driver.lastUpdate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {driver.lastUpdate}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
