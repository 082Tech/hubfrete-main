import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useGoogleMaps, defaultMapContainerStyle, airbnbMapStyles } from './GoogleMapsLoader';
import { Badge } from '@/components/ui/badge';

interface RouteGoogleMapProps {
  origem: {
    lat: number;
    lng: number;
    label?: string;
  };
  destino: {
    lat: number;
    lng: number;
    label?: string;
  };
  onRouteCalculated?: (distance: number, duration: number) => void;
}

export default function RouteGoogleMap({
  origem,
  destino,
  onRouteCalculated,
}: RouteGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Calculate route when origins change
  useEffect(() => {
    if (!isLoaded || !origem || !destino) return;

    const directionsService = new google.maps.DirectionsService();
    setIsLoadingRoute(true);

    directionsService.route(
      {
        origin: { lat: origem.lat, lng: origem.lng },
        destination: { lat: destino.lat, lng: destino.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setIsLoadingRoute(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          
          const route = result.routes[0];
          if (route && route.legs[0]) {
            const leg = route.legs[0];
            setRouteInfo({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });
            
            if (onRouteCalculated && leg.distance?.value && leg.duration?.value) {
              onRouteCalculated(leg.distance.value / 1000, leg.duration.value / 60);
            }
          }
        } else {
          console.error('Error fetching directions:', status);
        }
      }
    );
  }, [isLoaded, origem.lat, origem.lng, destino.lat, destino.lng, onRouteCalculated]);

  // Fit bounds to show both points
  useEffect(() => {
    if (!map || !origem || !destino) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: origem.lat, lng: origem.lng });
    bounds.extend({ lat: destino.lat, lng: destino.lng });
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
  }, [map, origem, destino]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-muted-foreground text-sm">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={{ lat: (origem.lat + destino.lat) / 2, lng: (origem.lng + destino.lng) / 2 }}
        zoom={6}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: airbnbMapStyles,
        }}
      >
        {directions ? (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: 'hsl(142.1, 76.2%, 36.3%)',
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
            }}
          />
        ) : (
          <>
            {/* Origin Marker */}
            <Marker
              position={{ lat: origem.lat, lng: origem.lng }}
              label={{
                text: 'O',
                color: 'white',
                fontWeight: 'bold',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: 'hsl(142.1, 76.2%, 36.3%)',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
            {/* Destination Marker */}
            <Marker
              position={{ lat: destino.lat, lng: destino.lng }}
              label={{
                text: 'D',
                color: 'white',
                fontWeight: 'bold',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: 'hsl(0, 84.2%, 60.2%)',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
          </>
        )}
      </GoogleMap>

      {/* Route Info Badge */}
      {(isLoadingRoute || routeInfo) && (
        <div className="absolute bottom-2 right-2 flex gap-2">
          {isLoadingRoute ? (
            <Badge variant="outline" className="gap-1 bg-background/90 backdrop-blur-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Calculando rota...
            </Badge>
          ) : routeInfo && (
            <>
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                {routeInfo.distance}
              </Badge>
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                {routeInfo.duration}
              </Badge>
            </>
          )}
        </div>
      )}
    </div>
  );
}
