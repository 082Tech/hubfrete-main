import { useState, useCallback, useRef } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Route } from 'lucide-react';
import { GoogleMapsLoader } from './GoogleMapsLoader';
import { TrackingHistoryGoogleMarkers, TrackingHistoryLoadingOverlay, TrackingHistoryEmptyOverlay } from './TrackingHistoryGoogleMarkers';

const airbnbMapStyles = [
  { featureType: 'all', elementType: 'geometry.fill', stylers: [{ visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a3ccff' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

interface TrackingMapDialogProps {
  entregaId: string | null;
  info: { motorista: string; placa: string } | null;
  onClose: () => void;
}

export function TrackingMapDialog({ entregaId, info, onClose }: TrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  
  // Use refs to avoid callback dependency issues
  const mapRef = useRef<google.maps.Map | null>(null);
  const pendingBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  // Handle map load - apply pending bounds if available
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    // If bounds were already received, apply them now
    if (pendingBoundsRef.current) {
      map.fitBounds(pendingBoundsRef.current, { top: 50, bottom: 50, left: 50, right: 50 });
      pendingBoundsRef.current = null;
    }
  }, []);

  // Handle bounds ready - use ref to access map instance
  const handleBoundsReady = useCallback((bounds: google.maps.LatLngBounds | null) => {
    if (!bounds) return;
    
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else {
      // Store bounds to apply when map loads
      pendingBoundsRef.current = bounds;
    }
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleEmptyChange = useCallback((empty: boolean) => {
    setIsEmpty(empty);
  }, []);

  return (
    <Dialog open={!!entregaId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Histórico de Rastreamento
            {info && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                {info.motorista} • {info.placa}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative">
          {isLoading && <TrackingHistoryLoadingOverlay />}
          {!isLoading && isEmpty && <TrackingHistoryEmptyOverlay />}
          <GoogleMapsLoader>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: -23.55, lng: -46.63 }}
              zoom={10}
              options={{
                styles: airbnbMapStyles,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
              onLoad={handleMapLoad}
            >
              <TrackingHistoryGoogleMarkers
                entregaId={entregaId}
                onBoundsReady={handleBoundsReady}
                onLoadingChange={handleLoadingChange}
                onEmptyChange={handleEmptyChange}
              />
            </GoogleMap>
          </GoogleMapsLoader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
