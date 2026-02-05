import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Route } from 'lucide-react';
import { GoogleMapsLoader } from './GoogleMapsLoader';
import { ViagemTrackingMarkers, TrackingHistoryLoadingOverlay, TrackingHistoryEmptyOverlay } from './ViagemTrackingMarkers';

interface ViagemTrackingMapDialogProps {
  viagemId: string | null;
  info: { motorista: string; placa: string; codigo: string } | null;
  onClose: () => void;
}

export function ViagemTrackingMapDialog({ viagemId, info, onClose }: ViagemTrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  // Use refs to avoid callback dependency issues
  const mapRef = useRef<google.maps.Map | null>(null);
  const pendingBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  // Reset state when dialog opens with new viagemId
  useEffect(() => {
    if (viagemId) {
      setMapReady(false);
      pendingBoundsRef.current = null;
    }
  }, [viagemId]);

  // Apply pending bounds when map becomes ready
  useEffect(() => {
    if (mapReady && mapRef.current && pendingBoundsRef.current) {
      mapRef.current.fitBounds(pendingBoundsRef.current, { top: 50, bottom: 50, left: 50, right: 50 });
      pendingBoundsRef.current = null;
    }
  }, [mapReady]);

  // Handle map load
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Small delay to ensure map is fully initialized
    setTimeout(() => setMapReady(true), 100);
  }, []);

  // Handle bounds ready - use ref to access map instance
  const handleBoundsReady = useCallback((bounds: google.maps.LatLngBounds | null) => {
    if (!bounds) return;
    
    // Store bounds
    pendingBoundsRef.current = bounds;
    
    // If map is already ready, apply immediately
    if (mapRef.current && mapReady) {
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      pendingBoundsRef.current = null;
    }
  }, [mapReady]);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleEmptyChange = useCallback((empty: boolean) => {
    setIsEmpty(empty);
  }, []);

  return (
    <Dialog open={!!viagemId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Histórico de Rastreamento
            {info && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                {info.codigo} • {info.motorista} • {info.placa}
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
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
              onLoad={handleMapLoad}
            >
              <ViagemTrackingMarkers
                viagemId={viagemId}
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
