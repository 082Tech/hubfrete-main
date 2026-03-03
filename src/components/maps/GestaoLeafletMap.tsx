import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { formatWeight } from '@/lib/utils';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTruckIconHtml } from './TruckIcon';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { TrackingHistoryMarkers } from './TrackingHistoryMarkers';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, MapPin, ArrowRight, Package, Weight, DollarSign, FileText, Building2 } from 'lucide-react';
// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface EntregaInfo {
  id: string;
  codigo: string;
  status: string;
  origemCidade: string;
  destinoCidade: string;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
}

interface MotoristaLocation {
  motorista_id: string;
  latitude: number | null;
  longitude: number | null;
  heading?: number | null;
  isOnline?: boolean;
  updated_at?: string | null;
}

interface MotoristaInfo {
  nome: string;
  entregas: EntregaInfo[];
  isOnline: boolean;
  lastSeenAt?: string | null;
}

interface SelectedEntregaData {
  id: string;
  codigo: string;
  status: string;
  motoristaNome: string;
  motoristaFoto?: string | null;
  carga: {
    descricao: string;
    peso: number;
    tipo: string;
    remetente?: string | null;
    destinatario?: string | null;
    origemCidade?: string;
    origemEstado?: string;
    destinoCidade?: string;
    destinoEstado?: string;
  };
  pesoAlocado?: number | null;
  valorFrete?: number | null;
  numeroCte?: string | null;
}

interface GestaoLeafletMapProps {
  localizacoes: MotoristaLocation[];
  selectedMotoristaId: string | null;
  selectedViagemId?: string | null;
  selectedEntregaId: string | null;
  onMotoristaClick: (motoristaId: string) => void;
  onEntregaDeselect?: () => void;
  motoristaNames: Record<string, string>;
  motoristaInfo?: Record<string, MotoristaInfo>;
  statusCounts?: { aguardando: number; coleta: number; entrega: number; entregue: number; cancelada: number };
  selectedEntregaData?: SelectedEntregaData | null;
}

// Create truck icon
const createTruckIcon = (heading: number = 0, isOnline: boolean = false, isSelected: boolean = false) => {
  const size = isSelected ? 56 : 48;
  return new L.DivIcon({
    className: 'truck-marker',
    html: getTruckIconHtml(heading, isOnline, isSelected, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Create location marker icon (origin/destination)
const createLocationIcon = (type: 'origem' | 'destino') => {
  const color = type === 'origem' ? '#22c55e' : '#ef4444';
  const letter = type === 'origem' ? 'O' : 'D';
  return new L.DivIcon({
    className: 'location-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        ${letter}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to fit bounds to all points - ONLY ONCE
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFitted.current) return;

    if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    hasFitted.current = true;
  }, [points, map]);

  return null;
}

// Controller component for map operations - pan to selected driver
function MapController({
  selectedMotoristaId,
  localizacoes,
}: {
  selectedMotoristaId: string | null;
  localizacoes: MotoristaLocation[];
}) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedMotoristaId && selectedMotoristaId !== prevSelectedRef.current) {
      const loc = localizacoes.find(l => l.motorista_id === selectedMotoristaId);
      if (loc?.latitude && loc?.longitude) {
        map.setView([loc.latitude, loc.longitude], 13);
      }
    }
    prevSelectedRef.current = selectedMotoristaId;
  }, [selectedMotoristaId, localizacoes, map]);

  return null;
}

// Component to render route polyline with OSRM data
function OSRMRoutePolyline({
  origin,
  destination,
  color,
  dashArray,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  color: string;
  dashArray?: string;
}) {
  const { route } = useOSRMRoute(origin, destination);

  if (!route || route.length === 0) return null;

  return (
    <Polyline
      positions={route}
      pathOptions={{
        color,
        weight: 4,
        opacity: 0.9,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
}

// Status colors for tooltip
const statusColors: Record<string, string> = {
  aguardando: 'bg-amber-500',
  saiu_para_coleta: 'bg-cyan-500',
  saiu_para_entrega: 'bg-purple-500',
  entregue: 'bg-emerald-500',
  cancelada: 'bg-destructive',
};

const statusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  saiu_para_coleta: 'Em Coleta',
  saiu_para_entrega: 'Em Entrega',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

// Custom Marker component with rich hover tooltip
function DriverMarkerWithTooltip({
  loc,
  isSelected,
  motoristaName,
  motoristaInfo,
  onMotoristaClick,
}: {
  loc: MotoristaLocation;
  isSelected: boolean;
  motoristaName: string;
  motoristaInfo?: MotoristaInfo;
  onMotoristaClick: (motoristaId: string) => void;
}) {
  if (!loc.latitude || !loc.longitude) return null;

  const isOnline = loc.isOnline ?? motoristaInfo?.isOnline ?? true;
  const entregas = motoristaInfo?.entregas || [];
  const entregasCount = entregas.length;

  // Calcular tempo desde última atualização para exibir "Offline há X"
  const lastSeenAt = loc.updated_at || motoristaInfo?.lastSeenAt;
  const lastSeenText = lastSeenAt
    ? formatDistanceToNow(new Date(lastSeenAt), { locale: ptBR, addSuffix: false })
    : null;

  return (
    <Marker
      position={[loc.latitude, loc.longitude]}
      icon={createTruckIcon(loc.heading ?? 0, isOnline, isSelected)}
      eventHandlers={{
        click: () => onMotoristaClick(loc.motorista_id),
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -30]}
        opacity={1}
        className="driver-tooltip"
      >
        <div className="px-3 py-2.5 min-w-[240px] max-w-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">{motoristaName}</p>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${isOnline
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {isOnline ? 'Online' : `Offline há ${lastSeenText || '?'}`}
            </span>
          </div>

          {/* Entregas list */}
          {entregasCount > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {entregasCount} entrega{entregasCount !== 1 ? 's' : ''} em andamento
              </span>
              {entregas.slice(0, 3).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[e.status] || 'bg-muted-foreground'}`}
                    title={statusLabels[e.status] || e.status}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{e.codigo}</span>
                  <span className="truncate text-foreground">{e.origemCidade} → {e.destinoCidade}</span>
                </div>
              ))}
              {entregasCount > 3 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  +{entregasCount - 3} mais entregas
                </p>
              )}
            </div>
          )}

          {entregasCount === 0 && (
            <p className="text-xs text-muted-foreground">Sem entregas ativas</p>
          )}

          <p className="text-[10px] text-primary mt-2 text-center">Clique para ver detalhes</p>
        </div>
      </Tooltip>
    </Marker>
  );
}

// Status indicator badges no topo do mapa - cores padronizadas
function StatusIndicators({ statusCounts }: { statusCounts: GestaoLeafletMapProps['statusCounts'] }) {
  if (!statusCounts) return null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border">
      <div className="flex items-center gap-1.5" title="Aguardando">
        <span className="w-3 h-3 rounded-full bg-amber-500 dark:bg-amber-400" />
        <span className="text-xs font-medium">{statusCounts.aguardando}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5" title="Saiu p/ Coleta">
        <span className="w-3 h-3 rounded-full bg-cyan-500 dark:bg-cyan-400" />
        <span className="text-xs font-medium">{statusCounts.coleta}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5" title="Saiu p/ Entrega">
        <span className="w-3 h-3 rounded-full bg-purple-500 dark:bg-purple-400" />
        <span className="text-xs font-medium">{statusCounts.entrega}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5" title="Entregue">
        <span className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-400" />
        <span className="text-xs font-medium">{statusCounts.entregue}</span>
      </div>
      {statusCounts.cancelada > 0 && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5" title="Cancelada">
            <span className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400" />
            <span className="text-xs font-medium">{statusCounts.cancelada}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mapa Leaflet para o Dialog de Gestão de Entregas
 * - Mostra todos os motoristas com seus ícones de caminhão
 * - Permite clicar para selecionar um motorista
 * - Tooltip no hover mostrando nome e status
 * - Mostra rota da entrega selecionada (origem + destino)
 */
export function GestaoLeafletMap({
  localizacoes,
  selectedMotoristaId,
  selectedViagemId,
  selectedEntregaId,
  onMotoristaClick,
  onEntregaDeselect,
  motoristaNames,
  motoristaInfo,
  statusCounts,
  selectedEntregaData,
}: GestaoLeafletMapProps) {
  // Collect all valid points
  const allPoints = useMemo(() => {
    return localizacoes
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude!, l.longitude!] as [number, number]);
  }, [localizacoes]);

  // Default center (Brazil)
  const mapCenter: [number, number] = useMemo(() => {
    if (allPoints.length > 0) {
      const lat = allPoints.reduce((acc, p) => acc + p[0], 0) / allPoints.length;
      const lng = allPoints.reduce((acc, p) => acc + p[1], 0) / allPoints.length;
      return [lat, lng];
    }
    return [-14.24, -51.93];
  }, [allPoints]);

  // Encontrar a entrega selecionada para mostrar a rota
  const selectedEntrega = useMemo(() => {
    if (!selectedMotoristaId || !selectedEntregaId || !motoristaInfo) return null;
    const info = motoristaInfo[selectedMotoristaId];
    if (!info) return null;
    return info.entregas.find(e => e.id === selectedEntregaId) || null;
  }, [selectedMotoristaId, selectedEntregaId, motoristaInfo]);

  // Coordenadas para rotas OSRM
  const driverLocation = useMemo(() => {
    if (!selectedMotoristaId) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedMotoristaId);
    if (loc?.latitude && loc?.longitude) {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    return null;
  }, [selectedMotoristaId, localizacoes]);

  const origemCoords = useMemo(() => {
    return selectedEntrega?.origemCoords || null;
  }, [selectedEntrega]);

  const destinoCoords = useMemo(() => {
    return selectedEntrega?.destinoCoords || null;
  }, [selectedEntrega]);

  // Determinar quais rotas mostrar baseado no status da entrega selecionada
  const selectedStatus = selectedEntrega?.status;
  const showRouteToOrigin = selectedStatus === 'aguardando' || selectedStatus === 'saiu_para_coleta';
  const showRouteOriginToDestino = selectedStatus === 'aguardando' || selectedStatus === 'saiu_para_coleta';
  const showRouteToDestino = selectedStatus === 'saiu_para_entrega';

  return (
    <div className="w-full h-full relative">
      {/* Status indicators no topo */}
      <StatusIndicators statusCounts={statusCounts} />

      <MapContainer
        center={mapCenter}
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={allPoints} />
        <MapController selectedMotoristaId={selectedMotoristaId} localizacoes={localizacoes} />

        {/* Marcadores de origem e destino da entrega selecionada */}
        {origemCoords && (
          <Marker
            position={[origemCoords.lat, origemCoords.lng]}
            icon={createLocationIcon('origem')}
          />
        )}
        {destinoCoords && (
          <Marker
            position={[destinoCoords.lat, destinoCoords.lng]}
            icon={createLocationIcon('destino')}
          />
        )}

        {/* Rota OSRM tracejada: Caminhão → Origem (quando aguardando ou saiu_para_coleta) */}
        {showRouteToOrigin && (
          <OSRMRoutePolyline
            origin={driverLocation}
            destination={origemCoords}
            color="#06b6d4"
            dashArray="8, 12"
          />
        )}

        {/* Rota OSRM sólida: Origem → Destino (quando aguardando ou saiu_para_coleta) */}
        {showRouteOriginToDestino && (
          <OSRMRoutePolyline
            origin={origemCoords}
            destination={destinoCoords}
            color="#a855f7"
          />
        )}

        {/* Rota OSRM tracejada: Caminhão → Destino (quando saiu_para_entrega) */}
        {showRouteToDestino && (
          <OSRMRoutePolyline
            origin={driverLocation}
            destination={destinoCoords}
            color="#22c55e"
            dashArray="8, 12"
          />
        )}

        {/* Histórico de rastreamento - mostra quando entrega ou viagem selecionada */}
        {(selectedEntregaId || selectedViagemId) && (
          <TrackingHistoryMarkers
            entregaId={selectedEntregaId}
            viagemId={selectedViagemId}
          />
        )}

        {/* Caminhões - quando uma entrega é selecionada, mostrar apenas o motorista dessa entrega */}
        {localizacoes.map(loc => {
          if (!loc.latitude || !loc.longitude) return null;

          // Se há uma entrega selecionada, esconder outros motoristas
          if (selectedEntregaId && loc.motorista_id !== selectedMotoristaId) {
            return null;
          }

          const isSelected = selectedMotoristaId === loc.motorista_id;
          const name = motoristaNames[loc.motorista_id] || 'Motorista';
          const info = motoristaInfo?.[loc.motorista_id];

          return (
            <DriverMarkerWithTooltip
              key={loc.motorista_id}
              loc={loc}
              isSelected={isSelected}
              motoristaName={name}
              motoristaInfo={info}
              onMotoristaClick={onMotoristaClick}
            />
          );
        })}
      </MapContainer>

      {/* Painel de detalhes da entrega selecionada - canto inferior esquerdo */}
      {selectedEntregaData && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-popover border rounded-xl shadow-xl p-4 min-w-[320px] max-w-[380px] animate-in slide-in-from-left-4 duration-200">
          {/* Header com botão de fechar */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                {selectedEntregaData.motoristaFoto && <AvatarImage src={selectedEntregaData.motoristaFoto} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {selectedEntregaData.motoristaNome?.[0] || 'M'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedEntregaData.motoristaNome}</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {selectedEntregaData.codigo}
                </Badge>
              </div>
            </div>
            <button
              onClick={onEntregaDeselect}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Rota */}
          <div className="flex items-center gap-2 text-sm mb-3 bg-muted/40 rounded-lg p-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{selectedEntregaData.carga.origemCidade}/{selectedEntregaData.carga.origemEstado}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <MapPin className="w-4 h-4 text-destructive shrink-0" />
            <span className="truncate">{selectedEntregaData.carga.destinoCidade}/{selectedEntregaData.carga.destinoEstado}</span>
          </div>

          {/* Info da carga */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Carga:</span>
              <span className="font-medium truncate">{selectedEntregaData.carga.descricao}</span>
            </div>

            {selectedEntregaData.carga.remetente && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Remetente:</span>
                <span className="font-medium truncate">{selectedEntregaData.carga.remetente}</span>
              </div>
            )}

            {selectedEntregaData.carga.destinatario && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Destinatário:</span>
                <span className="font-medium truncate">{selectedEntregaData.carga.destinatario}</span>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t mt-2">
              {selectedEntregaData.carga.peso && (
                <span className="flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedEntregaData.pesoAlocado ? `${formatWeight(selectedEntregaData.pesoAlocado)} / ` : ''}
                    {formatWeight(selectedEntregaData.carga.peso)}
                  </span>
                </span>
              )}
              {selectedEntregaData.valorFrete && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">R$ {selectedEntregaData.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </span>
              )}
              {selectedEntregaData.numeroCte && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">CT-e {selectedEntregaData.numeroCte}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom tooltip styles */}
      <style>{`
        .driver-tooltip {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--popover-foreground)) !important;
          border: 1px solid #e2e8f0 !important;
          border-color: hsl(var(--border)) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          padding: 0 !important;
        }
        .driver-tooltip::before {
          border-top-color: hsl(var(--border)) !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: hsl(var(--popover)) !important;
        }
      `}</style>
    </div>
  );
}