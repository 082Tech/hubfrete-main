import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Route, Loader2, MapPinOff, X } from 'lucide-react';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';
import 'leaflet/dist/leaflet.css';

interface TrackingMapDialogProps {
  entregaId: string | null;
  info: { motorista: string; placa: string } | null;
  onClose: () => void;
}

/** Fits map bounds to all markers once data is loaded */
function FitBoundsOnData({ shouldFit }: { shouldFit: boolean }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!shouldFit || hasFitted.current) return;

    const bounds = L.latLngBounds([]);
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        bounds.extend(layer.getLatLng());
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFitted.current = true;
    }
  }, [map, shouldFit]);

  return null;
}

export function TrackingMapDialog({ entregaId, info, onClose }: TrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (entregaId) {
      setIsLoading(true);
      setIsEmpty(false);
      setDataReady(false);
    }
  }, [entregaId]);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handlePointsLoaded = useCallback((points: any[], origin: any, destination: any) => {
    const hasAnyData = points.length > 0 || origin || destination;
    setIsEmpty(!hasAnyData);
    setNoTrackingPoints(points.length === 0);
    setTimeout(() => setDataReady(true), 200);
  }, []);

  return (
    <Dialog open={!!entregaId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Route className="w-5 h-5 text-primary" />
              Histórico de Rastreamento
            </DialogTitle>
            <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          {info && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{info.motorista}</span>
              <span>•</span>
              <span>{info.placa}</span>
            </div>
          )}
        </DialogHeader>

        {/* Map */}
        <div className="flex-1 relative min-h-0 rounded-b-lg overflow-hidden">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80" style={{ zIndex: 1000 }}>
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando histórico de rastreamento...</p>
              </div>
            </div>
          )}

          {/* Empty state overlay */}
          {!isLoading && isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center bg-background" style={{ zIndex: 1000 }}>
              <div className="flex flex-col items-center gap-3 p-6">
                <MapPinOff className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Nenhum histórico encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Ainda não há registros de rastreamento para esta carga</p>
                </div>
              </div>
            </div>
          )}

          {entregaId && (
            <MapContainer
              key={entregaId}
              center={[-15.78, -47.93]}
              zoom={4}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <TrackingHistoryMarkers
                entregaId={entregaId}
                onLoadingChange={handleLoadingChange}
                onPointsLoaded={handlePointsLoaded}
              />
              <FitBoundsOnData shouldFit={dataReady} />
            </MapContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
