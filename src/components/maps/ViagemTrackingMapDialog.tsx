import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Route, MapPin, Clock, Gauge, Activity, Loader2, MapPinOff } from 'lucide-react';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';
import {
  fetchAllTrackingHistoricoByViagemId,
  fetchViagemStatus,
  type ViagemStatus,
} from '@/lib/fetchAllTrackingHistorico';
import 'leaflet/dist/leaflet.css';

interface ViagemTrackingMapDialogProps {
  viagemId: string | null;
  info: { motorista: string; placa: string; codigo: string } | null;
  onClose: () => void;
}

interface TrackingStats {
  totalPoints: number;
  firstTimestamp: string;
  lastTimestamp: string;
  durationMinutes: number;
  avgSpeed: number | null;
  maxSpeed: number | null;
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
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ViagemTrackingMapDialog({ viagemId, info, onClose }: ViagemTrackingMapDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [viagemStatus, setViagemStatus] = useState<ViagemStatus | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch tracking data, compute stats, and fit bounds
  useEffect(() => {
    if (!viagemId) {
      setStats(null);
      setViagemStatus(null);
      setIsEmpty(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const [rawPoints, vStatus] = await Promise.all([
          fetchAllTrackingHistoricoByViagemId(viagemId, { pageSize: 1000, maxRows: 50000 }),
          fetchViagemStatus(viagemId),
        ]);

        if (!isMounted) return;

        setViagemStatus(vStatus);

        const validPoints = (rawPoints || []).filter(
          (p) => p.latitude != null && p.longitude != null
        );

        setIsEmpty(validPoints.length === 0);

        if (validPoints.length > 0) {
          const speeds = validPoints
            .map((p) => p.speed)
            .filter((s): s is number => s != null && s > 0);
          const firstTs = validPoints[0].tracked_at;
          const lastTs = validPoints[validPoints.length - 1].tracked_at;
          const durationMs = new Date(lastTs).getTime() - new Date(firstTs).getTime();

          setStats({
            totalPoints: validPoints.length,
            firstTimestamp: firstTs,
            lastTimestamp: lastTs,
            durationMinutes: durationMs / 60000,
            avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
            maxSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
          });

          // Fit map bounds
          setTimeout(() => {
            const map = mapRef.current;
            if (!map) return;
            const bounds = L.latLngBounds(
              validPoints.map((p) => [Number(p.latitude), Number(p.longitude)] as L.LatLngTuple)
            );
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          }, 300);
        } else {
          setStats(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching tracking history:', error);
        setIsEmpty(true);
        setStats(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [viagemId]);

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
        <div className="flex-1 relative z-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando histórico de rastreamento...</p>
              </div>
            </div>
          )}
          {!isLoading && isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg">
                <MapPinOff className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Nenhum histórico encontrado</p>
                  <p className="text-sm text-muted-foreground">Ainda não há registros de rastreamento para esta viagem</p>
                </div>
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
            {viagemId && <TrackingHistoryMarkers viagemId={viagemId} />}
          </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
