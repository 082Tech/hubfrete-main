import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Truck, MapPin, Clock, Phone, Building } from 'lucide-react';
import { useGoogleMaps, airbnbMapStyles, defaultCenter } from '@/components/maps/GoogleMapsLoader';
import { Loader2 } from 'lucide-react';
import { GeofenceOverlay, Geofence } from './GeofenceOverlay';
import { RoutePlayback, TrackingPoint } from './RoutePlayback';
import { DriverWithLocation } from './DriverListPanel';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface MonitoringMapProps {
  drivers: DriverWithLocation[];
  geofences: Geofence[];
  selectedDriverId: string | null;
  onSelectDriver: (id: string | null) => void;
  trackingHistory: TrackingPoint[];
  showPlayback: boolean;
  onTogglePlayback: () => void;
  height?: string | number;
}

const mapOptions: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
  gestureHandling: 'greedy',
};

export function MonitoringMap({
  drivers,
  geofences,
  selectedDriverId,
  onSelectDriver,
  trackingHistory,
  showPlayback,
  onTogglePlayback,
  height = '100%',
}: MonitoringMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.motorista_id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  // Filter only online drivers (with location)
  const onlineDrivers = useMemo(
    () => drivers.filter((d) => d.latitude !== null && d.longitude !== null),
    [drivers]
  );

  // Pan to selected driver
  useEffect(() => {
    if (map && selectedDriver && selectedDriver.latitude && selectedDriver.longitude) {
      map.panTo({ lat: selectedDriver.latitude, lng: selectedDriver.longitude });
      map.setZoom(14);
    }
  }, [map, selectedDriver]);

  // Fit bounds to show all drivers when no selection
  useEffect(() => {
    if (map && !selectedDriverId && onlineDrivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      onlineDrivers.forEach((d) => {
        if (d.latitude && d.longitude) {
          bounds.extend({ lat: d.latitude, lng: d.longitude });
        }
      });
      map.fitBounds(bounds, 50);
    }
  }, [map, selectedDriverId, onlineDrivers]);

  const isOnline = useCallback((timestamp: number | null) => {
    if (!timestamp) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return timestamp > fiveMinutesAgo;
  }, []);

  const handleMapClick = useCallback(() => {
    onSelectDriver(null);
  }, [onSelectDriver]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-xl">
        <p className="text-destructive">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={defaultCenter}
        zoom={5}
        options={mapOptions}
        onLoad={setMap}
        onClick={handleMapClick}
      >
        {/* Geofences */}
        <GeofenceOverlay geofences={geofences} />

        {/* Route Playback */}
        <RoutePlayback
          points={trackingHistory}
          isVisible={showPlayback}
          onClose={onTogglePlayback}
        />

        {/* Driver Markers */}
        {onlineDrivers.map((driver) => {
          if (!driver.latitude || !driver.longitude) return null;
          
          const online = isOnline(driver.timestamp);
          const isSelected = selectedDriverId === driver.motorista_id;
          const isHovered = hoveredDriverId === driver.motorista_id;

          return (
            <Marker
              key={driver.motorista_id}
              position={{ lat: driver.latitude, lng: driver.longitude }}
              icon={{
                url: `data:image/svg+xml,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="${isSelected ? '#f97316' : online ? '#22c55e' : '#6b7280'}" stroke="white" stroke-width="3"/>
                    <path d="M14 20h12M14 20l4 4M14 20l4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0, 0)"/>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(isSelected || isHovered ? 48 : 40, isSelected || isHovered ? 48 : 40),
                anchor: new google.maps.Point(isSelected || isHovered ? 24 : 20, isSelected || isHovered ? 24 : 20),
              }}
              onClick={() => onSelectDriver(driver.motorista_id)}
              onMouseOver={() => setHoveredDriverId(driver.motorista_id)}
              onMouseOut={() => setHoveredDriverId(null)}
              zIndex={isSelected ? 100 : isHovered ? 50 : 10}
            />
          );
        })}

        {/* Info Window for selected driver */}
        {selectedDriver && selectedDriver.latitude && selectedDriver.longitude && (
          <InfoWindow
            position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
            onCloseClick={() => onSelectDriver(null)}
            options={{ pixelOffset: new google.maps.Size(0, -30) }}
          >
            <div className="p-3 min-w-[220px] max-w-[280px]">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                {selectedDriver.foto_url ? (
                  <img
                    src={selectedDriver.foto_url}
                    alt={selectedDriver.nome}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{selectedDriver.nome}</p>
                  {selectedDriver.entrega_codigo && (
                    <p className="text-xs text-primary font-medium">
                      {selectedDriver.entrega_codigo}
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {selectedDriver.empresa_nome && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span>{selectedDriver.empresa_nome}</span>
                  </div>
                )}
                {selectedDriver.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{selectedDriver.telefone}</span>
                  </div>
                )}
                {selectedDriver.timestamp && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatDistanceToNow(new Date(selectedDriver.timestamp), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
                {selectedDriver.velocidade !== null && selectedDriver.velocidade > 0 && (
                  <div className="flex items-center gap-2 text-chart-2">
                    <MapPin className="w-4 h-4" />
                    <span>{Math.round(selectedDriver.velocidade)} km/h</span>
                  </div>
                )}
              </div>

              {/* Playback button */}
              {trackingHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePlayback();
                  }}
                >
                  {showPlayback ? 'Ocultar Histórico' : 'Ver Histórico de Rota'}
                </Button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
