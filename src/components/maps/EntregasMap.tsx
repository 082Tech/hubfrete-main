import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Truck, MapPin, Navigation } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers
const createColoredIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const statusColors: Record<string, string> = {
  'aguardando_coleta': '#6b7280',
  'em_coleta': '#3b82f6',
  'coletado': '#06b6d4',
  'em_transito': '#f97316',
  'em_entrega': '#a855f7',
  'entregue': '#22c55e',
  'problema': '#ef4444',
  'devolvida': '#ef4444',
};

const statusLabels: Record<string, string> = {
  'aguardando_coleta': 'Aguardando Coleta',
  'em_coleta': 'Em Coleta',
  'coletado': 'Coletado',
  'em_transito': 'Em Trânsito',
  'em_entrega': 'Em Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
  'devolvida': 'Devolvida',
};

interface EntregaMapData {
  id: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  codigo: string;
  descricao: string;
  motorista: string | null;
  telefone: string | null;
  placa: string | null;
  destino: string | null;
}

interface EntregasMapProps {
  entregas: EntregaMapData[];
}

// Component to fit bounds to markers
function FitBounds({ entregas }: { entregas: EntregaMapData[] }) {
  const map = useMap();
  
  useEffect(() => {
    const validEntregas = entregas.filter(e => e.latitude && e.longitude);
    if (validEntregas.length > 0) {
      const bounds = L.latLngBounds(
        validEntregas.map(e => [e.latitude!, e.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [entregas, map]);
  
  return null;
}

export function EntregasMap({ entregas }: EntregasMapProps) {
  const validEntregas = entregas.filter(e => e.latitude && e.longitude);
  
  // Default center (Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  const defaultZoom = 4;
  
  // Calculate center based on entregas
  const center: [number, number] = validEntregas.length > 0
    ? [
        validEntregas.reduce((acc, e) => acc + e.latitude!, 0) / validEntregas.length,
        validEntregas.reduce((acc, e) => acc + e.longitude!, 0) / validEntregas.length,
      ]
    : defaultCenter;

  if (validEntregas.length === 0) {
    return (
      <div className="w-full h-[500px] bg-muted/30 rounded-lg flex flex-col items-center justify-center text-center p-6">
        <div className="p-4 bg-primary/10 rounded-full mb-4">
          <MapPin className="w-12 h-12 text-primary" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Sem localização disponível</h3>
        <p className="text-muted-foreground max-w-md">
          Nenhuma entrega possui coordenadas de localização no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds entregas={validEntregas} />
        
        {validEntregas.map((entrega) => {
          const status = entrega.status || 'aguardando_coleta';
          const color = statusColors[status] || statusColors['aguardando_coleta'];
          const label = statusLabels[status] || 'Desconhecido';
          
          return (
            <Marker
              key={entrega.id}
              position={[entrega.latitude!, entrega.longitude!]}
              icon={createColoredIcon(color)}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-foreground">{entrega.codigo}</span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      {label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {entrega.descricao}
                  </p>
                  
                  {entrega.destino && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      <span className="text-foreground">{entrega.destino}</span>
                    </div>
                  )}
                  
                  {entrega.motorista && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Truck className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{entrega.motorista}</span>
                      {entrega.placa && (
                        <span className="text-muted-foreground">({entrega.placa})</span>
                      )}
                    </div>
                  )}
                  
                  {entrega.telefone && (
                    <a 
                      href={`tel:${entrega.telefone}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {entrega.telefone}
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">Legenda</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(statusLabels).slice(0, 6).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: statusColors[key] }}
              />
              <span className="text-xs text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
