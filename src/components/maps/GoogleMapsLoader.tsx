import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  return { isLoaded, loadError };
}

export const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

export const defaultCenter = {
  lat: -15.7801,
  lng: -47.9292,
};

export const defaultOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};
