import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  User,
  Calendar,
  Route,
  Phone,
  History,
  Circle,
  LayoutList,
  Share,
  Printer,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

// Lazy load GestaoEntregas for the dialog
import GestaoEntregas from './GestaoEntregas';

// Status definitions
const statusConfig = {
  aguardando_coleta: { label: 'Aguardando Coleta', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  em_coleta: { label: 'Em Coleta', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Truck },
  em_entrega: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: MapPin },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

type EntregaStatus = keyof typeof statusConfig;

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
  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando_coleta;
  const tempoDecorrido = formatDistanceToNow(new Date(entrega.updated_at || entrega.created_at), { 
    addSuffix: false, 
    locale: ptBR 
  });
  
  return (
    <div 
      className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-muted/50 border-b ${
        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar/Icon */}
      <Avatar className="h-10 w-10 shrink-0">
        {entrega.motorista?.foto_url ? (
          <AvatarImage src={entrega.motorista.foto_url} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary">
          {entrega.motorista?.nome_completo?.[0] || <Truck className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {entrega.motorista?.nome_completo || 'Sem motorista'}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] px-1.5">
            #{entrega.codigo?.slice(-4) || entrega.id.slice(0, 4)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="truncate max-w-[180px]">
            {entrega.carga.endereco_origem?.cidade || 'Origem'} → {entrega.carga.endereco_destino?.cidade || 'Destino'}
          </span>
          {entrega.valor_frete && (
            <>
              <span className="mx-1">•</span>
              <span className="text-green-600 font-medium">
                R$ {entrega.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Time & Status */}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-1">{tempoDecorrido}</p>
        <Badge className={`text-[10px] ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}

// Detail panel (right side)
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
  if (!entrega) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
        <Package className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecione uma entrega</p>
        <p className="text-sm">Clique em uma entrega para ver os detalhes</p>
      </div>
    );
  }

  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando_coleta;
  const StatusIcon = statusInfo.icon;

  const origemCoords = entrega.carga.endereco_origem?.latitude && entrega.carga.endereco_origem?.longitude
    ? { lat: entrega.carga.endereco_origem.latitude, lng: entrega.carga.endereco_origem.longitude }
    : null;
  const destinoCoords = entrega.carga.endereco_destino?.latitude && entrega.carga.endereco_destino?.longitude
    ? { lat: entrega.carga.endereco_destino.latitude, lng: entrega.carga.endereco_destino.longitude }
    : null;

  const mapCenter = driverLocation || origemCoords || destinoCoords || { lat: -23.55, lng: -46.63 };

  // Determine next possible statuses
  const getNextStatuses = (): EntregaStatus[] => {
    switch (entrega.status) {
      case 'aguardando_coleta': return ['em_coleta', 'cancelada'];
      case 'em_coleta': return ['em_transito', 'cancelada'];
      case 'em_transito': return ['em_entrega', 'cancelada'];
      case 'em_entrega': return ['entregue', 'cancelada'];
      default: return [];
    }
  };

  const nextStatuses = getNextStatuses();
  const isFinalized = entrega.status === 'entregue' || entrega.status === 'cancelada';

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header with code and actions */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Entrega Nº</span>
            <Badge variant="outline" className="font-mono font-bold text-base px-2">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">
          {format(new Date(entrega.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })} • {entrega.carga.codigo}
        </p>
        
        {/* Status banner */}
        <div className={`rounded-md px-4 py-2 text-center ${statusInfo.color}`}>
          <span className="font-semibold flex items-center justify-center gap-2">
            <StatusIcon className="w-4 h-4" />
            {statusInfo.label} há {formatDistanceToNow(new Date(entrega.updated_at), { locale: ptBR })}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Cargo description */}
          <div className="text-sm">
            <p className="text-muted-foreground text-xs mb-1">Descrição da carga:</p>
            <p className="font-medium">{entrega.carga.descricao}</p>
          </div>
          
          <Separator />
          
          {/* Mini Map */}
          <div className="rounded-lg overflow-hidden border h-40">
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
                      scale: 8,
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
                      scale: 6,
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
                      scale: 2,
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
                      strokeWeight: 3,
                      geodesic: true,
                    }}
                  />
                )}
              </GoogleMap>
            </GoogleMapsLoader>
          </div>

          {/* Route Info */}
          <Card className="shadow-none border">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Origem</p>
                  <p className="text-sm font-medium">
                    {entrega.carga.endereco_origem?.cidade}, {entrega.carga.endereco_origem?.estado}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entrega.carga.endereco_origem?.logradouro}</p>
                </div>
              </div>
              <div className="ml-1.5 h-4 border-l-2 border-dashed border-muted-foreground/30" />
              <div className="flex items-start gap-3">
                <MapPin className="w-3 h-3 text-red-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="text-sm font-medium">
                    {entrega.carga.endereco_destino?.cidade}, {entrega.carga.endereco_destino?.estado}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entrega.carga.endereco_destino?.logradouro}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver & Vehicle */}
          {entrega.motorista && (
            <Card className="shadow-none border">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {entrega.motorista.foto_url && <AvatarImage src={entrega.motorista.foto_url} />}
                    <AvatarFallback>{entrega.motorista.nome_completo?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{entrega.motorista.nome_completo}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {entrega.motorista.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {entrega.motorista.telefone}
                        </span>
                      )}
                      {entrega.veiculo && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
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
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Histórico</span>
            </div>
            
            {entrega.eventos && entrega.eventos.length > 0 ? (
              <div className="relative pl-4 space-y-3">
                <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-purple-200" />
                {entrega.eventos.slice(0, 8).map((evento, idx) => (
                  <div key={evento.id} className="relative">
                    <div className={`absolute -left-2.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      idx === 0 ? 'bg-purple-500' : 'bg-purple-200'
                    }`} />
                    <div className="ml-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm">
                          Status alterado para <span className="font-semibold">{evento.tipo.replace(/status_/g, '').replace(/_/g, ' ')}</span>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        em {format(new Date(evento.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {evento.user_nome && <span> por <span className="font-medium">{evento.user_nome}</span></span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento registrado
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
      
      {/* Footer actions */}
      {!isFinalized && nextStatuses.length > 0 && (
        <div className="p-4 border-t bg-muted/20">
          <div className="flex gap-2">
            {nextStatuses.map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const isPrimary = status !== 'cancelada';
              return (
                <Button
                  key={status}
                  variant={isPrimary ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-1 ${!isPrimary ? 'text-destructive border-destructive hover:bg-destructive/10' : ''}`}
                  onClick={() => onStatusChange(status)}
                  disabled={isChangingStatus}
                >
                  {isChangingStatus ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 mr-1" />
                  )}
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Main component
export default function OperacaoDiaria() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [motoristaIds, setMotoristaIds] = useState<string[]>([]);
  const [gestaoDialogOpen, setGestaoDialogOpen] = useState(false);
  
  const { localizacoes } = useRealtimeLocalizacoes({ 
    motoristaIds, 
    enabled: motoristaIds.length > 0 
  });

  // Fetch today's deliveries (or pending from previous days)
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
        return [];
      }

      const motoristaIdsList = motoristas.map(m => m.id);
      
      // Fetch deliveries:
      // - All from today (any status)
      // - OR pending from previous days (not finalized)
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
        .or(`updated_at.gte.${startOfToday},and(status.in.(aguardando_coleta,em_coleta,em_transito,em_entrega))`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching entregas:', error);
        throw error;
      }

      // Fetch eventos for each entrega
      const entregasWithEvents = await Promise.all(
        (data || []).map(async (entrega) => {
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

  // Update motorista IDs when entregas change
  useEffect(() => {
    const ids = entregas
      .map(e => e.motorista_id)
      .filter((id): id is string => id !== null);
    setMotoristaIds([...new Set(ids)]);
  }, [entregas]);

  const statusMutation = useMutation({
    mutationFn: async ({ entregaId, newStatus }: { entregaId: string; newStatus: EntregaStatus }) => {
      const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
      
      if (newStatus === 'entregue') {
        updates.entregue_em = new Date().toISOString();
      } else if (newStatus === 'em_coleta') {
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

  // Filter by search
  const filteredEntregas = useMemo(() => {
    if (!searchTerm) return entregas;
    const search = searchTerm.toLowerCase();
    return entregas.filter(e => 
      e.codigo?.toLowerCase().includes(search) ||
      e.carga.descricao.toLowerCase().includes(search) ||
      e.motorista?.nome_completo.toLowerCase().includes(search) ||
      e.carga.endereco_origem?.cidade?.toLowerCase().includes(search) ||
      e.carga.endereco_destino?.cidade?.toLowerCase().includes(search)
    );
  }, [entregas, searchTerm]);

  // Get driver location for selected delivery
  const driverLocation = useMemo(() => {
    if (!selectedEntrega?.motorista_id) return null;
    const loc = localizacoes.find(l => l.motorista_id === selectedEntrega.motorista_id);
    if (loc?.latitude && loc?.longitude) {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    return null;
  }, [selectedEntrega, localizacoes]);

  const handleStatusChange = (newStatus: EntregaStatus) => {
    if (selectedEntrega) {
      statusMutation.mutate({ entregaId: selectedEntrega.id, newStatus });
      setSelectedEntrega(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const pending = entregas.filter(e => ['aguardando_coleta', 'em_coleta'].includes(e.status)).length;
    const inRoute = entregas.filter(e => ['em_transito', 'em_entrega'].includes(e.status)).length;
    const completed = entregas.filter(e => e.status === 'entregue').length;
    const cancelled = entregas.filter(e => e.status === 'cancelada').length;
    return { pending, inRoute, completed, cancelled };
  }, [entregas]);

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Últimas entregas</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquise por motorista ou código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-72"
              />
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setGestaoDialogOpen(true)}
            >
              <LayoutList className="w-4 h-4" />
              Gestão de Entregas
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Delivery List */}
        <div className="w-[480px] border-r flex flex-col shrink-0">
          {/* Stats bar */}
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{stats.pending}</span>
              <span className="text-muted-foreground">aguardando</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{stats.inRoute}</span>
              <span className="text-muted-foreground">em rota</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium">{stats.completed}</span>
              <span className="text-muted-foreground">concluídos</span>
            </span>
          </div>
          
          {/* List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEntregas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma entrega hoje</p>
                <p className="text-sm">As entregas do dia aparecerão aqui</p>
              </div>
            ) : (
              filteredEntregas.map((entrega) => (
                <EntregaListItem
                  key={entrega.id}
                  entrega={entrega}
                  isSelected={selectedEntrega?.id === entrega.id}
                  onClick={() => setSelectedEntrega(entrega)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 min-w-[400px]">
          <DetailPanel
            entrega={selectedEntrega}
            onClose={() => setSelectedEntrega(null)}
            onStatusChange={handleStatusChange}
            isChangingStatus={statusMutation.isPending}
            driverLocation={driverLocation}
          />
        </div>
      </div>
      
      {/* Gestão de Entregas Dialog */}
      <Dialog open={gestaoDialogOpen} onOpenChange={setGestaoDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Gestão de Entregas</DialogTitle>
          </DialogHeader>
          <div className="h-full overflow-auto">
            <GestaoEntregas />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
