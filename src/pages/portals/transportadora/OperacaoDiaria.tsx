import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Phone,
  History,
  LayoutList,
  Share,
  Printer,
  X,
  ArrowUpRight,
  Map,
  MoreVertical,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMapsLoader, useGoogleMaps } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { AdvancedFiltersPopover, AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';

// Status definitions - apenas os status válidos
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; column: 'pending' | 'inRoute' | 'done' }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, column: 'pending' },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Truck, column: 'pending' },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: MapPin, column: 'inRoute' },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, column: 'done' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, column: 'done' },
};

type EntregaStatus = string;

interface Entrega {
  id: string;
  codigo: string;
  status: EntregaStatus;
  created_at: string;
  updated_at: string;
  motorista_id: string | null;
  veiculo_id: string | null;
  carroceria_id: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  coletado_em: string | null;
  entregue_em: string | null;
  motorista?: { id: string; nome_completo: string; telefone: string | null; foto_url: string | null } | null;
  veiculo?: { id: string; placa: string; modelo: string | null; tipo: string } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    endereco_origem?: { cidade: string; estado: string; logradouro: string; latitude: number | null; longitude: number | null } | null;
    endereco_destino?: { cidade: string; estado: string; logradouro: string; latitude: number | null; longitude: number | null } | null;
  };
  eventos?: Array<{
    id: string;
    tipo: string;
    timestamp: string;
    observacao: string | null;
    user_nome: string | null;
  }>;
}

// Delivery list item component (iFood style)
function EntregaListItem({
  entrega,
  isSelected,
  onClick,
}: {
  entrega: Entrega;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando;
  const tempoDecorrido = formatDistanceToNow(new Date(entrega.updated_at || entrega.created_at), {
    addSuffix: false,
    locale: ptBR
  });

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-muted/50 border-b last:border-b-0 ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
        }`}
      onClick={onClick}
    >
      {/* Avatar/Icon */}
      <Avatar className="h-9 w-9 shrink-0">
        {entrega.motorista?.foto_url ? (
          <AvatarImage src={entrega.motorista.foto_url} />
        ) : null}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {entrega.motorista?.nome_completo?.[0] || <Truck className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm truncate">
            {entrega.motorista?.nome_completo || 'Sem motorista'}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 shrink-0">
            #{entrega.codigo?.slice(-4) || entrega.id.slice(0, 4)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {entrega.valor_frete && (
            <span className="text-primary font-semibold">
              R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Time & Status */}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-1">cerca de {tempoDecorrido}</p>
        <Badge className={`text-[10px] ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}

// Empty column placeholder - centered both vertically and horizontally
function EmptyColumnPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground px-8 py-12 h-full min-h-[200px]">
      <Package className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

// Detail panel (right side) - more compact
function DetailPanel({
  entrega,
  onClose,
  onStatusChange,
  isChangingStatus,
  driverLocation
}: {
  entrega: Entrega | null;
  onClose: () => void;
  onStatusChange: (newStatus: EntregaStatus) => void;
  isChangingStatus: boolean;
  driverLocation: { lat: number; lng: number } | null;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  if (!entrega) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyColumnPlaceholder
          message="Selecione uma entrega para ver os detalhes"
        />
      </div>
    );
  }

  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando;
  const StatusIcon = statusInfo.icon;

  const origemCoords = entrega.carga.endereco_origem?.latitude && entrega.carga.endereco_origem?.longitude
    ? { lat: entrega.carga.endereco_origem.latitude, lng: entrega.carga.endereco_origem.longitude }
    : null;
  const destinoCoords = entrega.carga.endereco_destino?.latitude && entrega.carga.endereco_destino?.longitude
    ? { lat: entrega.carga.endereco_destino.latitude, lng: entrega.carga.endereco_destino.longitude }
    : null;

  const mapCenter = driverLocation || origemCoords || destinoCoords || { lat: -23.55, lng: -46.63 };

  // Determine next status based on current status
  const getNextStatus = (): { status: string; label: string; icon: React.ElementType } | null => {
    switch (entrega.status) {
      case 'aguardando': return { status: 'saiu_para_coleta', label: 'Saiu para Coleta', icon: Truck };
      case 'saiu_para_coleta': return { status: 'saiu_para_entrega', label: 'Saiu para Entrega', icon: MapPin };
      case 'saiu_para_entrega': return { status: 'entregue', label: 'Marcar como Entregue', icon: CheckCircle };
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  const isFinalized = entrega.status === 'entregue' || entrega.status === 'cancelada';

  const handleCancelConfirm = () => {
    onStatusChange('cancelada');
    setCancelDialogOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header with code and actions */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Entrega Nº</span>
            <Badge variant="outline" className="font-mono font-bold text-xs px-2 border-primary text-primary">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Share className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Printer className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          {format(new Date(entrega.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })} • {entrega.carga.codigo}
        </p>

        {/* Status banner */}
        <div className={`rounded-md px-3 py-1.5 text-center text-sm ${statusInfo.color}`}>
          <span className="font-semibold flex items-center justify-center gap-2">
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label} há {formatDistanceToNow(new Date(entrega.updated_at), { locale: ptBR })}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Cargo description */}
          <div className="text-sm">
            <p className="font-medium text-xs">{entrega.carga.descricao}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {entrega.carga.endereco_origem?.cidade} → {entrega.carga.endereco_destino?.cidade}
            </p>
          </div>

          <Separator />

          {/* Mini Map - aspect ratio mais quadrado */}
          <div className="rounded-lg overflow-hidden border h-[300px]">
            <GoogleMapsLoader>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={10}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                }}
              >
                {origemCoords && (
                  <Marker
                    position={origemCoords}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 7,
                      fillColor: '#22c55e',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                    }}
                    title="Origem"
                  />
                )}
                {destinoCoords && (
                  <Marker
                    position={destinoCoords}
                    icon={{
                      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                      scale: 5,
                      fillColor: '#ef4444',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                    }}
                    title="Destino"
                  />
                )}
                {driverLocation && (
                  <Marker
                    position={driverLocation}
                    icon={{
                      path: 'M 0,-8 L 5,8 L 0,4 L -5,8 Z',
                      scale: 1.5,
                      fillColor: '#3b82f6',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                      rotation: 0,
                    }}
                    title="Motorista"
                  />
                )}
                {origemCoords && destinoCoords && (
                  <Polyline
                    path={[origemCoords, driverLocation || origemCoords, destinoCoords].filter(Boolean) as google.maps.LatLngLiteral[]}
                    options={{
                      strokeColor: '#6366f1',
                      strokeOpacity: 0.6,
                      strokeWeight: 2,
                      geodesic: true,
                    }}
                  />
                )}
              </GoogleMap>
            </GoogleMapsLoader>
          </div>

          {/* Driver & Vehicle */}
          {entrega.motorista && (
            <Card className="shadow-none border">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {entrega.motorista.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
                    <AvatarFallback className="text-xs">{entrega.motorista.nome_completo?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{entrega.motorista.nome_completo}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {entrega.motorista.telefone && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {entrega.motorista.telefone}
                        </span>
                      )}
                      {entrega.veiculo && (
                        <span className="flex items-center gap-0.5">
                          <Truck className="w-2.5 h-2.5" />
                          {entrega.veiculo.placa}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-xs">Histórico</span>
            </div>

            {entrega.eventos && entrega.eventos.length > 0 ? (
              <div className="relative pl-3 space-y-2">
                <div className="absolute left-1 top-1.5 bottom-1.5 w-0.5 bg-purple-200" />
                {entrega.eventos.slice(0, 5).map((evento, idx) => (
                  <div key={evento.id} className="relative">
                    <div className={`absolute -left-2 top-0.5 w-2 h-2 rounded-full border-2 border-background ${idx === 0 ? 'bg-purple-500' : 'bg-purple-200'
                      }`} />
                    <div className="ml-2">
                      <span className="text-xs">
                        {evento.tipo.replace(/status_/g, '').replace(/_/g, ' ')}
                      </span>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(evento.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum evento registrado
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer actions - botão principal + menu de 3 pontos */}
      {!isFinalized && nextStatus && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex gap-2">
            {/* Menu de mais ações (3 pontos) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setCancelDialogOpen(true)} className="text-destructive focus:text-destructive">
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar entrega
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão de ação principal */}
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onStatusChange(nextStatus.status)}
              disabled={isChangingStatus}
            >
              {isChangingStatus ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <nextStatus.icon className="w-3.5 h-3.5 mr-1" />
              )}
              {nextStatus.label}
            </Button>
          </div>
        </div>
      )}

      {/* Alert Dialog para confirmar cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá cancelar a entrega {entrega.codigo}. O peso será devolvido para a carga original. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Gestão Dialog com Mapa + Lista Motoristas ====================

function GestaoEntregasDialogContent({
  entregas,
  localizacoes,
}: {
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null }>;
}) {
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  // Agrupar entregas por motorista
  const motoristaGroups = useMemo(() => {
    const groups: Record<string, { motorista: Entrega['motorista']; entregas: Entrega[] }> = {};

    entregas.forEach(e => {
      if (!e.motorista_id || !e.motorista) return;
      if (!groups[e.motorista_id]) {
        groups[e.motorista_id] = { motorista: e.motorista, entregas: [] };
      }
      groups[e.motorista_id].entregas.push(e);
    });

    return Object.entries(groups).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [entregas]);

  // Lista de motoristas para o filtro
  const motoristasList = useMemo(() =>
    motoristaGroups.map(g => ({ id: g.id, nome: g.motorista?.nome_completo || '' })),
    [motoristaGroups]
  );

  // Filtrar baseado nos filtros avançados
  const filteredGroups = useMemo(() => {
    if (!filters.motorista && !filters.codigo && !filters.cidadeOrigem && !filters.cidadeDestino) {
      return motoristaGroups;
    }

    return motoristaGroups.filter(group => {
      if (filters.motorista && !group.motorista?.nome_completo.toLowerCase().includes(filters.motorista.toLowerCase())) {
        return false;
      }

      // Verifica se alguma entrega do grupo atende aos filtros
      const hasMatchingEntrega = group.entregas.some(e => {
        if (filters.codigo && !e.codigo?.toLowerCase().includes(filters.codigo.toLowerCase())) {
          return false;
        }
        if (filters.cidadeOrigem && !e.carga.endereco_origem?.cidade?.toLowerCase().includes(filters.cidadeOrigem.toLowerCase())) {
          return false;
        }
        if (filters.cidadeDestino && !e.carga.endereco_destino?.cidade?.toLowerCase().includes(filters.cidadeDestino.toLowerCase())) {
          return false;
        }
        return true;
      });

      return hasMatchingEntrega;
    });
  }, [motoristaGroups, filters]);

  // Handler para clicar no motorista na lista
  const handleMotoristaClick = useCallback((motoristaId: string) => {
    setSelectedMotoristaId(motoristaId);

    // Centralizar no mapa
    const loc = localizacoes.find(l => l.motorista_id === motoristaId);
    if (loc?.latitude && loc?.longitude && mapRef) {
      mapRef.panTo({ lat: loc.latitude, lng: loc.longitude });
      mapRef.setZoom(13);
    }
  }, [localizacoes, mapRef]);

  // Calcula bounds para todos os motoristas
  const mapBounds = useMemo(() => {
    const validLocs = localizacoes.filter(l => l.latitude && l.longitude);
    if (validLocs.length === 0) return null;

    const bounds = new google.maps.LatLngBounds();
    validLocs.forEach(l => {
      if (l.latitude && l.longitude) {
        bounds.extend({ lat: l.latitude, lng: l.longitude });
      }
    });
    return bounds;
  }, [localizacoes]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
    if (mapBounds) {
      setTimeout(() => map.fitBounds(mapBounds, { top: 50, right: 50, bottom: 50, left: 50 }), 100);
    }
  }, [mapBounds]);

  return (
    <>
      <DialogHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-bold">Gestão de Entregas</DialogTitle>
        </div>
      </DialogHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* Mapa grande à esquerda (70%) */}
        <div className="flex-[7] relative">
          <GoogleMapsLoader>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: -14.24, lng: -51.93 }}
              zoom={4}
              onLoad={handleMapLoad}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {filteredGroups.map(group => {
                const loc = localizacoes.find(l => l.motorista_id === group.id);
                if (!loc?.latitude || !loc?.longitude) return null;

                const isSelected = selectedMotoristaId === group.id;

                return (
                  <Marker
                    key={group.id}
                    position={{ lat: loc.latitude, lng: loc.longitude }}
                    onClick={() => handleMotoristaClick(group.id)}
                    icon={{
                      path: 'M 0,-10 L 6,10 L 0,5 L -6,10 Z',
                      scale: isSelected ? 2.5 : 2,
                      fillColor: isSelected ? '#22c55e' : '#3b82f6',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 2,
                      rotation: 0,
                    }}
                    title={group.motorista?.nome_completo || 'Motorista'}
                  />
                );
              })}
            </GoogleMap>
          </GoogleMapsLoader>
        </div>

        {/* Lista de motoristas à direita (30%) */}
        <div className="flex-[3] border-l flex flex-col bg-background">
          <div className="px-3 py-2 border-b bg-muted/30">
            <span className="text-sm font-medium">Motoristas ({filteredGroups.length})</span>
          </div>

          <ScrollArea className="flex-1">
            {filteredGroups.length === 0 ? (
              <EmptyColumnPlaceholder message="Nenhum motorista encontrado" />
            ) : (
              filteredGroups.map(group => {
                const loc = localizacoes.find(l => l.motorista_id === group.id);
                const isOnline = !!(loc?.latitude && loc?.longitude);
                const isSelected = selectedMotoristaId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`px-3 py-2.5 border-b cursor-pointer transition-all hover:bg-muted/50 ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                    onClick={() => handleMotoristaClick(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {group.motorista?.foto_url && <AvatarImage src={group.motorista.foto_url} />}
                          <AvatarFallback className="text-xs">{group.motorista?.nome_completo?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{group.motorista?.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.entregas.length} entrega{group.entregas.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Entregas do motorista */}
                    {isSelected && group.entregas.length > 0 && (
                      <div className="mt-2 pl-10 space-y-1">
                        {group.entregas.slice(0, 3).map(e => (
                          <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] px-1 font-mono">
                              {e.codigo?.slice(-4)}
                            </Badge>
                            <span className="truncate">
                              {e.carga.endereco_origem?.cidade} → {e.carga.endereco_destino?.cidade}
                            </span>
                          </div>
                        ))}
                        {group.entregas.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{group.entregas.length - 3} mais
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

// Wrapper com Dialog
function GestaoEntregasDialog({
  open,
  onOpenChange,
  entregas,
  localizacoes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregas: Entrega[];
  localizacoes: Array<{ motorista_id: string; latitude: number | null; longitude: number | null }>;
}) {
  const { isLoaded } = useGoogleMaps();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0">
        {isLoaded ? (
          <GestaoEntregasDialogContent entregas={entregas} localizacoes={localizacoes} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Main component
export default function OperacaoDiaria() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [motoristaIds, setMotoristaIds] = useState<string[]>([]);
  const [gestaoDialogOpen, setGestaoDialogOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({});

  // Fetch today's deliveries (by created_at) OR pending from previous days
  const { data: entregas = [], isLoading, refetch } = useQuery({
    queryKey: ['operacao-diaria', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();

      // First get motoristas for this empresa
      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (!motoristas || motoristas.length === 0) {
        console.log('No motoristas found for empresa:', empresa.id);
        return [];
      }

      const motoristaIdsList = motoristas.map(m => m.id);

      // Fetch deliveries - usando apenas os status válidos
      const pendingStatuses = ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id, codigo, status, created_at, updated_at,
          motorista_id, veiculo_id, carroceria_id,
          peso_alocado_kg, valor_frete, coletado_em, entregue_em,
          motorista:motoristas(id, nome_completo, telefone, foto_url),
          veiculo:veiculos(id, placa, modelo, tipo),
          carga:cargas!inner(
            id, codigo, descricao, peso_kg, tipo,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, latitude, longitude)
          )
        `)
        .in('motorista_id', motoristaIdsList)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching entregas:', error);
        throw error;
      }

      // Filter: created today OR still pending
      const filtered = (data || []).filter(e => {
        const createdToday = new Date(e.created_at) >= new Date(startOfToday);
        const isPending = pendingStatuses.includes(e.status);
        return createdToday || isPending;
      });

      // Fetch eventos for each entrega
      const entregasWithEvents = await Promise.all(
        filtered.map(async (entrega) => {
          const { data: eventos } = await supabase
            .from('entrega_eventos')
            .select('id, tipo, timestamp, observacao, user_nome')
            .eq('entrega_id', entrega.id)
            .order('timestamp', { ascending: false })
            .limit(10);

          return { ...entrega, eventos: eventos || [] };
        })
      );

      return entregasWithEvents as Entrega[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 30000,
  });

  const motoristaGroups = useMemo(() => {
    const groups: Record<string, { motorista: Entrega['motorista']; entregas: Entrega[] }> = {};

    entregas.forEach(e => {
      if (!e.motorista_id || !e.motorista) return;
      if (!groups[e.motorista_id]) {
        groups[e.motorista_id] = { motorista: e.motorista, entregas: [] };
      }
      groups[e.motorista_id].entregas.push(e);
    });

    return Object.entries(groups).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [entregas]);

  const motoristasList = useMemo(() =>
    motoristaGroups.map(g => ({ id: g.id, nome: g.motorista?.nome_completo || '' })),
    [motoristaGroups]
  );

  const { localizacoes } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0
  });

  // Update motorista IDs when entregas change
  useEffect(() => {
    const ids = entregas
      .map(e => e.motorista_id)
      .filter((id): id is string => id !== null);
    setMotoristaIds([...new Set(ids)]);
  }, [entregas]);

  const statusMutation = useMutation({
    mutationFn: async ({ entregaId, newStatus }: { entregaId: string; newStatus: string }) => {
      const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };

      if (newStatus === 'entregue') {
        updates.entregue_em = new Date().toISOString();
      } else if (newStatus === 'saiu_para_coleta') {
        updates.coletado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('entregas')
        .update(updates)
        .eq('id', entregaId);

      if (error) throw error;

      await supabase.from('entrega_eventos').insert({
        entrega_id: entregaId,
        tipo: `status_${newStatus}`,
        timestamp: new Date().toISOString(),
        observacao: `Status alterado para ${statusConfig[newStatus]?.label || newStatus}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacao-diaria'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status');
      console.error(error);
    },
  });

  // Separar entregas por status para as colunas
  const { aguardandoEntregas, emRotaEntregas } = useMemo(() => {
    const aguardando = entregas.filter(e =>
      ['aguardando', 'saiu_para_coleta'].includes(e.status)
    );
    const emRota = entregas.filter(e =>
      ['saiu_para_entrega', 'entregue', 'cancelada'].includes(e.status)
    );
    return { aguardandoEntregas: aguardando, emRotaEntregas: emRota };
  }, [entregas]);

  // Get driver location for selected delivery
  const driverLocation = useMemo(() => {
    if (!selectedEntrega?.motorista_id) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedEntrega.motorista_id);
    if (loc?.latitude && loc?.longitude) {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    return null;
  }, [selectedEntrega, localizacoes]);

  const handleStatusChange = (newStatus: string) => {
    if (selectedEntrega) {
      statusMutation.mutate({ entregaId: selectedEntrega.id, newStatus });
      setSelectedEntrega(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh)' }}>
      <div className="flex items-center justify-between p-4 !pb-0 md:p-8 ">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão Entregas</h1>
          <p className="text-muted-foreground">
            Visualize sua operação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <AdvancedFiltersPopover
            filters={filters}
            onFiltersChange={setFilters}
            showMotorista
            showEmbarcador={false}
            showDestinatario={false}
            motoristas={motoristasList}
          />
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => setGestaoDialogOpen(true)}
          >
            <Map className="w-4 h-4" />
            Gestão da operação
          </Button>
        </div>
      </div>

      {/* Main content - 3 columns: 30% 30% 40% */}
      <div className="flex-1 grid overflow-hidden p-4 !pt-4 md:p-8" style={{ gridTemplateColumns: '30% 30% 40%' }}>
        {/* Column 1: Entregas Aguardando (30%) */}
        <div className="border rounded-l-md bg-muted/20 flex flex-col min-w-0 overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">Aguardando ({aguardandoEntregas.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : aguardandoEntregas.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyColumnPlaceholder message="Suas entregas aparecerão aqui" />
              </div>
            ) : (
              aguardandoEntregas.map((entrega) => (
                <EntregaListItem
                  key={entrega.id}
                  entrega={entrega}
                  isSelected={selectedEntrega?.id === entrega.id}
                  onClick={() => setSelectedEntrega(entrega)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Entregas em Rota/Finalizadas (30%) */}
        <div className="border border-l-0 flex flex-col bg-background min-w-0 overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">Em Rota / Finalizadas ({emRotaEntregas.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : emRotaEntregas.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyColumnPlaceholder message="Entregas em rota aparecerão aqui" />
              </div>
            ) : (
              emRotaEntregas.map((entrega) => (
                <EntregaListItem
                  key={entrega.id}
                  entrega={entrega}
                  isSelected={selectedEntrega?.id === entrega.id}
                  onClick={() => setSelectedEntrega(entrega)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Detail Panel (40%) */}
        <div className="min-w-0 border border-l-0 rounded-r-md overflow-hidden flex flex-col">
          <DetailPanel
            entrega={selectedEntrega}
            onClose={() => setSelectedEntrega(null)}
            onStatusChange={handleStatusChange}
            isChangingStatus={statusMutation.isPending}
            driverLocation={driverLocation}
          />
        </div>
      </div>

      {/* Gestão de Entregas Dialog com Mapa + Motoristas */}
      <GestaoEntregasDialog
        open={gestaoDialogOpen}
        onOpenChange={setGestaoDialogOpen}
        entregas={entregas}
        localizacoes={localizacoes}
      />
    </div>
  );
}
