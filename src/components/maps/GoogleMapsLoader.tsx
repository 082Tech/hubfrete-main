import { useJsApiLoader } from '@react-google-maps/api';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  return { isLoaded, loadError };
}

interface GoogleMapsLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function GoogleMapsLoader({ children, fallback }: GoogleMapsLoaderProps) {
  const { isLoaded, loadError } = useGoogleMaps();

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
        <p className="text-sm text-destructive">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return fallback || (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

export const defaultCenter = {
  lat: -15.7801,
  lng: -47.9292,
};

// Airbnb-style map with soft natural colors - shared across all maps
export const airbnbMapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#f9fafb' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#e8f5e9' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c8e6c9' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#fef3c7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#fcd34d' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#bfdbfe' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3b82f6' }],
  },
];

export const defaultOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
};
