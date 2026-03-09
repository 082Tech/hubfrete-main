import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Route, Loader2, MapPinOff } from 'lucide-react';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';
import 'leaflet/dist/leaflet.css';

interface TrackingMapDialogProps {
  entregaId: string | null;
  info: { motorista: string; placa: string } | null;
  onClose: () => void;
}

/** Fits the map once to include all CircleMarkers after they render */
function useFitToMarkers(mapRef: React.RefObject<L.Map | null>, entregaId: string | null) {
  const fittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!entregaId) {
      fittedRef.current = null;
      return;
    }

    // Wait for markers to render
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map || fittedRef.current === entregaId) return;

      const bounds = L.latLngBounds([]);
      map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          bounds.extend(layer.getLatLng());
        }
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
        fittedRef.current = entregaId;
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [mapRef, entregaId]);
}

export function TrackingMapDialog({ entregaId, info, onClose }: TrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useFitToMarkers(mapRef, entregaId);

  // Track loading via a simple timer (markers load async inside TrackingHistoryMarkers)
  useEffect(() => {
    if (!entregaId) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [entregaId]);

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
        <div className="flex-1 relative z-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            </div>
          )}
          <MapContainer
            center={[-15.78, -47.93]}
            zoom={4}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {entregaId && <TrackingHistoryMarkers entregaId={entregaId} />}
          </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
