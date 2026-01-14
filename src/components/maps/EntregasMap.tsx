import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Truck, MapPin, Navigation, Route } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers
const createColoredIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 32 : 24;
  const borderWidth = isSelected ? 4 : 3;
  return new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${isSelected ? '#fbbf24' : 'white'};
        box-shadow: ${isSelected ? '0 0 12px rgba(251, 191, 36, 0.8)' : '0 2px 5px rgba(0,0,0,0.3)'};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 16 : 12}" height="${isSelected ? 16 : 12}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Location marker icon (origin/destination)
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
  cargaId: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  codigo: string;
  descricao: string;
  motorista: string | null;
  telefone: string | null;
  placa: string | null;
  destino: string | null;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
}

interface EntregasMapProps {
  entregas: EntregaMapData[];
  selectedCargaId?: string | null;
  onSelectCarga?: (cargaId: string | null) => void;
}

// Component to fit bounds to markers
function FitBounds({ entregas, selectedEntrega }: { entregas: EntregaMapData[]; selectedEntrega: EntregaMapData | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedEntrega) {
      // If there's a selected entrega, fit bounds to show the route
      const points: [number, number][] = [];
      
      if (selectedEntrega.latitude && selectedEntrega.longitude) {
        points.push([selectedEntrega.latitude, selectedEntrega.longitude]);
      }
      if (selectedEntrega.origemCoords) {
        points.push([selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]);
      }
      if (selectedEntrega.destinoCoords) {
        points.push([selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]);
      }
      
      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
      } else if (points.length === 1) {
        map.setView(points[0], 10);
      }
    } else {
      const validEntregas = entregas.filter(e => e.latitude && e.longitude);
      if (validEntregas.length > 0) {
        const bounds = L.latLngBounds(
          validEntregas.map(e => [e.latitude!, e.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [entregas, selectedEntrega, map]);
  
  return null;
}

export function EntregasMap({ entregas, selectedCargaId, onSelectCarga }: EntregasMapProps) {
  // Entregas with truck location
  const validEntregas = entregas.filter(e => e.latitude && e.longitude);
  
  // Find selected entrega (can be any entrega, even without truck location)
  const selectedEntrega = selectedCargaId 
    ? entregas.find(e => e.cargaId === selectedCargaId) || null
    : null;
  
  // Default center (Brazil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  const defaultZoom = 4;
  
  // Calculate center based on all available points
  const allPoints: [number, number][] = [];
  entregas.forEach(e => {
    if (e.latitude && e.longitude) allPoints.push([e.latitude, e.longitude]);
    if (e.origemCoords) allPoints.push([e.origemCoords.lat, e.origemCoords.lng]);
    if (e.destinoCoords) allPoints.push([e.destinoCoords.lat, e.destinoCoords.lng]);
  });
  
  const center: [number, number] = allPoints.length > 0
    ? [
        allPoints.reduce((acc, p) => acc + p[0], 0) / allPoints.length,
        allPoints.reduce((acc, p) => acc + p[1], 0) / allPoints.length,
      ]
    : defaultCenter;

  const handleMarkerClick = (entrega: EntregaMapData) => {
    if (onSelectCarga) {
      // Toggle selection
      onSelectCarga(selectedCargaId === entrega.cargaId ? null : entrega.cargaId);
    }
  };

  // Check if we have any displayable content
  const hasContent = validEntregas.length > 0 || entregas.some(e => e.origemCoords || e.destinoCoords);

  if (!hasContent) {
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

  // Direct route line from origin to destination (always dashed)
  const directRouteLine: [number, number][] = [];
  if (selectedEntrega?.origemCoords && selectedEntrega?.destinoCoords) {
    directRouteLine.push([selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]);
    directRouteLine.push([selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]);
  }
  
  // Route showing progress: origin -> truck -> (remaining dashed to destination)
  const completedRoute: [number, number][] = [];
  if (selectedEntrega?.origemCoords && selectedEntrega?.latitude && selectedEntrega?.longitude) {
    completedRoute.push([selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]);
    completedRoute.push([selectedEntrega.latitude, selectedEntrega.longitude]);
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
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
        <FitBounds entregas={validEntregas} selectedEntrega={selectedEntrega} />
        
        {/* Full route line from origin to destination (dashed blue) */}
        {directRouteLine.length === 2 && (
          <Polyline
            positions={directRouteLine}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.7,
              dashArray: '15, 10',
            }}
          />
        )}
        
        {/* Completed portion of route: origin to truck (solid orange) */}
        {completedRoute.length === 2 && (
          <Polyline
            positions={completedRoute}
            pathOptions={{
              color: '#f97316',
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {/* Origin marker for selected entrega */}
        {selectedEntrega?.origemCoords && (
          <Marker
            position={[selectedEntrega.origemCoords.lat, selectedEntrega.origemCoords.lng]}
            icon={createLocationIcon('origem')}
          >
            <Popup>
              <div className="min-w-[150px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-green-600">Origem</span>
                </div>
                <p className="text-sm text-muted-foreground">Ponto de coleta</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker for selected entrega */}
        {selectedEntrega?.destinoCoords && (
          <Marker
            position={[selectedEntrega.destinoCoords.lat, selectedEntrega.destinoCoords.lng]}
            icon={createLocationIcon('destino')}
          >
            <Popup>
              <div className="min-w-[150px] p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-red-600">Destino</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedEntrega.destino || 'Ponto de entrega'}</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Truck markers */}
        {validEntregas.map((entrega) => {
          const status = entrega.status || 'aguardando_coleta';
          const color = statusColors[status] || statusColors['aguardando_coleta'];
          const label = statusLabels[status] || 'Desconhecido';
          const isSelected = selectedCargaId === entrega.cargaId;
          
          return (
            <Marker
              key={entrega.id}
              position={[entrega.latitude!, entrega.longitude!]}
              icon={createColoredIcon(color, isSelected)}
              eventHandlers={{
                click: () => handleMarkerClick(entrega),
              }}
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
                      className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
                    >
                      <Phone className="w-3 h-3" />
                      {entrega.telefone}
                    </a>
                  )}

                  {!isSelected && entrega.origemCoords && entrega.destinoCoords && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkerClick(entrega);
                      }}
                    >
                      <Route className="w-3 h-3" />
                      Ver rota
                    </Button>
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
        {selectedCargaId && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
                <span className="text-xs">Origem</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500 border border-white" />
                <span className="text-xs">Destino</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected info badge */}
      {selectedEntrega && (
        <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{selectedEntrega.codigo}</p>
              <p className="text-xs text-muted-foreground">Rota selecionada</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-2 h-6 w-6 p-0"
              onClick={() => onSelectCarga?.(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}