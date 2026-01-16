import { GoogleMap, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGoogleMaps, airbnbMapStyles, defaultMapContainerStyle, defaultCenter } from './GoogleMapsLoader';
import { Loader2 } from 'lucide-react';

export type EntregaMapItem = {
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

        {entregas.map((e) => {
          const lat = e.latitude ?? e.origemCoords?.lat ?? null;
          const lng = e.longitude ?? e.origemCoords?.lng ?? null;
          if (lat == null || lng == null) return null;

          const isSelected = e.id === selectedCargaId;
          return (
            <MarkerF
              key={e.id}
              position={{ lat, lng }}
              onClick={() => onSelectCarga(e.id)}
              zIndex={isSelected ? 1000 : 1}
              label={
                isSelected
                  ? {
                      text: e.codigo,
                      className: 'text-[12px] font-semibold',
                    }
                  : undefined
              }
            />
          );
        })}

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
