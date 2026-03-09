import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
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

  // Reset state when entregaId changes
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
    const hasData = points.length > 0 || origin || destination;
    setIsEmpty(!hasData);
    // Delay slightly to let markers render before fitting bounds
    setTimeout(() => setDataReady(true), 200);
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
        <div className="flex-1 relative z-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            </div>
          )}
          {!isLoading && isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <MapPinOff className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Nenhum histórico encontrado</p>
                  <p className="text-sm text-muted-foreground">Ainda não há registros de rastreamento para esta entrega</p>
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
