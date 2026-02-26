import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Route, MapPin, Clock, Gauge, Activity } from 'lucide-react';
import { GoogleMapsLoader } from './GoogleMapsLoader';
import {
  ViagemTrackingMarkers,
  TrackingHistoryLoadingOverlay,
  TrackingHistoryEmptyOverlay,
  formatDuration,
  type TrackingStats,
} from './ViagemTrackingMarkers';
import type { ViagemStatus } from '@/lib/fetchAllTrackingHistorico';

interface ViagemTrackingMapDialogProps {
  viagemId: string | null;
  info: { motorista: string; placa: string; codigo: string } | null;
  onClose: () => void;
}

const statusBadgeStyles: Record<string, { bg: string; text: string; label: string }> = {
  aguardando: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Aguardando' },
  programada: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Programada' },
  em_andamento: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Em Andamento' },
  finalizada: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Finalizada' },
  concluida: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Concluída' },
  cancelada: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Cancelada' },
};

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ViagemTrackingMapDialog({ viagemId, info, onClose }: ViagemTrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [viagemStatus, setViagemStatus] = useState<ViagemStatus | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const pendingBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  useEffect(() => {
    if (viagemId) {
      setMapReady(false);
      pendingBoundsRef.current = null;
      setStats(null);
      setViagemStatus(null);
    }
  }, [viagemId]);

  useEffect(() => {
    if (mapReady && mapRef.current && pendingBoundsRef.current) {
      mapRef.current.fitBounds(pendingBoundsRef.current, { top: 50, bottom: 50, left: 50, right: 50 });
      pendingBoundsRef.current = null;
    }
  }, [mapReady]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setTimeout(() => setMapReady(true), 100);
  }, []);

  const handleBoundsReady = useCallback((bounds: google.maps.LatLngBounds | null) => {
    if (!bounds) return;
    pendingBoundsRef.current = bounds;
    if (mapRef.current && mapReady) {
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      pendingBoundsRef.current = null;
    }
  }, [mapReady]);

  const handleLoadingChange = useCallback((loading: boolean) => setIsLoading(loading), []);
  const handleEmptyChange = useCallback((empty: boolean) => setIsEmpty(empty), []);
  const handleStatsReady = useCallback((s: TrackingStats | null) => setStats(s), []);
  const handleViagemStatusReady = useCallback((s: ViagemStatus | null) => setViagemStatus(s), []);

  const badge = statusBadgeStyles[viagemStatus?.status || ''] || statusBadgeStyles.em_andamento;

  return (
    <Dialog open={!!viagemId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Route className="w-5 h-5 text-primary" />
              Histórico de Rastreamento
            </DialogTitle>
            {viagemStatus && (
              <Badge variant="outline" className={`${badge.bg} ${badge.text} border-0 text-xs font-medium`}>
                {badge.label}
              </Badge>
            )}
          </div>
          {info && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              <span className="font-medium text-foreground">{info.codigo}</span>
              <span>•</span>
              <span>{info.motorista}</span>
              <span>•</span>
              <span>{info.placa}</span>
            </div>
          )}
        </DialogHeader>

        {/* Stats Bar */}
        {!isLoading && stats && (
          <div className="px-5 py-2.5 border-b bg-muted/30 flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{stats.totalPoints.toLocaleString('pt-BR')}</span> pontos
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{formatDuration(stats.durationMinutes)}</span> duração
            </div>
            {stats.avgSpeed != null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{Math.round(stats.avgSpeed)}</span> km/h média
              </div>
            )}
            {stats.maxSpeed != null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{Math.round(stats.maxSpeed)}</span> km/h máx
              </div>
            )}
            <div className="ml-auto text-muted-foreground">
              {formatDateTime(stats.firstTimestamp)} → {formatDateTime(stats.lastTimestamp)}
            </div>
          </div>
        )}

        {/* Map */}
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
                onStatsReady={handleStatsReady}
                onViagemStatusReady={handleViagemStatusReady}
              />
            </GoogleMap>
          </GoogleMapsLoader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
