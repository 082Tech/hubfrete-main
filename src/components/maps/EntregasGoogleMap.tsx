import {
  GoogleMap,
  MarkerF,
  DirectionsRenderer,
  OverlayView,
} from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useGoogleMaps,
  airbnbMapStyles,
  defaultMapContainerStyle,
} from './GoogleMapsLoader';
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

/* -------------------------------------------------------------------------- */
/*                              DRIVER MARKER                                 */
/* -------------------------------------------------------------------------- */

function DriverMarker({
  entrega,
  isSelected,
  onClick,
}: {
  entrega: EntregaMapItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasLiveLocation =
    Number.isFinite(entrega.latitude) &&
    Number.isFinite(entrega.longitude);

  const lat = hasLiveLocation
    ? entrega.latitude!
    : entrega.origemCoords?.lat;

  const lng = hasLiveLocation
    ? entrega.longitude!
    : entrega.origemCoords?.lng;

  if (lat == null || lng == null) {
    console.warn('Sem coordenadas para entrega', entrega.id);
    return null;
  }

  return (
    <>
      {/* Marker base (garante renderização) */}
      <MarkerF
        position={{ lat, lng }}
        zIndex={isSelected ? 1000 : 100}
        onClick={onClick}
        opacity={0} // invisível
      />

      {/* Avatar visual */}
      <OverlayView
        position={{ lat, lng }}
        mapPaneName={OverlayView.FLOAT_PANE}
        getPixelPositionOffset={(w, h) => ({
          x: -w / 2,
          y: -h / 2,
        })}
      >
        <div
          className="cursor-pointer"
          style={{
            transform: isSelected ? 'scale(1.25)' : 'scale(1)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div className="w-10 h-10 rounded-full shadow-lg border-2 bg-background overflow-hidden">
            {entrega.motoristaFotoUrl ? (
              <img
                src={entrega.motoristaFotoUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        </div>
      </OverlayView>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAP COMPONENT                                 */
/* -------------------------------------------------------------------------- */

export function EntregasGoogleMap({
  entregas,
  selectedCargaId,
  onSelectCarga,
}: EntregasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const selected = useMemo(
    () => entregas.find((e) => e.id === selectedCargaId) ?? null,
    [entregas, selectedCargaId]
  );

  /* ------------------------------ FIT BOUNDS ------------------------------ */

  useEffect(() => {
    if (!map || entregas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let hasAny = false;

    if (selected) {
      if (
        typeof selected.latitude === 'number' &&
        typeof selected.longitude === 'number'
      ) {
        bounds.extend({
          lat: selected.latitude,
          lng: selected.longitude,
        });
        hasAny = true;
      }

      if (selected.origemCoords) {
        bounds.extend(selected.origemCoords);
        hasAny = true;
      }

      if (selected.destinoCoords) {
        bounds.extend(selected.destinoCoords);
        hasAny = true;
      }
    } else {
      entregas.forEach((e) => {
        if (
          typeof e.latitude === 'number' &&
          typeof e.longitude === 'number'
        ) {
          bounds.extend({ lat: e.latitude, lng: e.longitude });
          hasAny = true;
        } else if (e.origemCoords) {
          bounds.extend(e.origemCoords);
          hasAny = true;
        }
      });
    }

    if (hasAny) {
      map.fitBounds(bounds, {
        top: 60,
        right: 40,
        bottom: 40,
        left: 40,
      });
    }
  }, [map, entregas, selected]);

  /* ------------------------------ DIRECTIONS ------------------------------ */

  useEffect(() => {
    if (
      !isLoaded ||
      !selected?.origemCoords ||
      !selected?.destinoCoords
    ) {
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
        if (
          status === google.maps.DirectionsStatus.OK &&
          result
        ) {
          setDirections(result);
        }
      }
    );
  }, [isLoaded, selected]);

  const handleLoad = useCallback(
    (m: google.maps.Map) => setMap(m),
    []
  );

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted">
        Erro ao carregar o mapa
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        options={mapOptions}
        onLoad={handleLoad}
        onClick={() => onSelectCarga(null)}
      >
        {selected && directions && (
          <DirectionsRenderer
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

        {entregas.map((e) => (
          <DriverMarker
            key={e.id}
            entrega={e}
            isSelected={e.id === selectedCargaId}
            onClick={() => onSelectCarga(e.id)}
          />
        ))}

        {selected?.destinoCoords && (
          <MarkerF position={selected.destinoCoords} />
        )}
      </GoogleMap>
    </div>
  );
}