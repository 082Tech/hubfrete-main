import { GoogleMap, MarkerF, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGoogleMaps, airbnbMapStyles, defaultMapContainerStyle, defaultCenter } from './GoogleMapsLoader';
import { Loader2, Truck } from 'lucide-react';

export type EntregaMapItem = {
  id: string;
  cargaId: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  codigo: string;
  descricao: string;
  motorista: string | null;
  motoristaFotoUrl: string | null;
  motoristaOnline?: boolean | null;
  telefone: string | null;
  placa: string | null;
  destino: string | null;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
};

interface EntregasGoogleMapProps {
  entregas: EntregaMapItem[];
  selectedCargaId: string | null;
  onSelectCarga: (id: string | null) => void;
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
};

// Driver marker component - shows avatar or truck icon
function DriverMarker({ 
  entrega, 
  isSelected, 
  onClick 
}: { 
  entrega: EntregaMapItem; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const lat = entrega.latitude ?? entrega.origemCoords?.lat ?? null;
  const lng = entrega.longitude ?? entrega.origemCoords?.lng ?? null;
  const isOnline = entrega.motoristaOnline ?? true;

  if (lat == null || lng == null) return null;

  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -(height / 2),
      })}
    >
      <div
        className={`cursor-pointer transition-all duration-200 ${isSelected ? 'z-50' : 'z-10'}`}
        style={{
          transform: isSelected ? 'scale(1.25)' : 'scale(1)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        }}
      >
        {/* Pulse animation for active deliveries - placed behind */}
        {entrega.status === 'em_transito' && (
          <div
            className="absolute rounded-full bg-primary/30 animate-ping"
            style={{ width: 40, height: 40, top: 0, left: 0 }}
          />
        )}

        {/* Avatar or Truck icon */}
        <div
          className={
            `relative w-10 h-10 rounded-full shadow-lg border-2 overflow-hidden ` +
            (isSelected
              ? 'border-primary bg-primary'
              : 'border-border bg-background')
          }
        >
          {/* Offline indicator */}
          {!isOnline && (
            <div className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}

          {entrega.motoristaFotoUrl ? (
            <img
              src={entrega.motoristaFotoUrl}
              alt={entrega.motorista || 'Motorista'}
              className={
                'w-full h-full object-cover ' +
                (!isOnline ? 'grayscale opacity-70' : '')
              }
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className={
                `w-full h-full flex items-center justify-center ` +
                (!isOnline ? 'opacity-70' : '')
              }
            >
              <Truck className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
          )}
        </div>

        {/* Label badge */}
        {isSelected && (
          <div
            className="absolute whitespace-nowrap bg-foreground text-background text-[10px] px-2 py-0.5 rounded-full font-medium shadow-md"
            style={{ top: 46, left: '50%', transform: 'translateX(-50%)' }}
          >
            {entrega.codigo}
          </div>
        )}
      </div>
    </OverlayView>
  );
}

export function EntregasGoogleMap({ entregas, selectedCargaId, onSelectCarga }: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const selected = useMemo(
    () => entregas.find((e) => e.id === selectedCargaId) ?? null,
    [entregas, selectedCargaId]
  );

  // Fit bounds to markers (or selected route)
  useEffect(() => {
    if (!map) return;

    if (selected?.origemCoords && selected?.destinoCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(selected.origemCoords);
      bounds.extend(selected.destinoCoords);
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
      return;
    }

    if (entregas.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    let hasAny = false;

    entregas.forEach((e) => {
      if (e.latitude != null && e.longitude != null) {
        bounds.extend({ lat: e.latitude, lng: e.longitude });
        hasAny = true;
      } else if (e.origemCoords) {
        bounds.extend(e.origemCoords);
        hasAny = true;
      }
    });

    if (hasAny) map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
  }, [map, entregas, selected]);

  // Route for selected entrega
  useEffect(() => {
    let cancelled = false;

    if (!isLoaded || !selected?.origemCoords || !selected?.destinoCoords) {
      setDirections(null);
      return;
    }

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: selected.origemCoords,
        destination: selected.destinoCoords,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === google.maps.DirectionsStatus.OK && result) setDirections(result);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isLoaded, selected]);

  const handleLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const handleUnmount = useCallback(() => setMap(null), []);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted">
        <p className="text-muted-foreground">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultCenter}
        zoom={5}
        options={mapOptions}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
        onClick={() => onSelectCarga(null)}
      >
        {selected && directions && (
          <DirectionsRenderer
            key={selected.id}
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#10b981',
                strokeOpacity: 0.85,
                strokeWeight: 5,
              },
            }}
          />
        )}

        {/* Driver markers with avatar/truck */}
        {entregas.map((e) => (
          <DriverMarker
            key={e.id}
            entrega={e}
            isSelected={e.id === selectedCargaId}
            onClick={() => onSelectCarga(e.id)}
          />
        ))}

        {/* Destination marker (default red pin) */}
        {selected?.destinoCoords && (
          <MarkerF
            key={`dest-${selected.id}`}
            position={selected.destinoCoords}
            zIndex={999}
          />
        )}
      </GoogleMap>
    </div>
  );
}
