import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isToday, startOfDay, endOfDay } from 'date-fns';
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
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  User,
  Calendar,
  Route,
  Navigation,
  Box,
  DollarSign,
  FileText,
  Phone,
  Building2,
  History,
  Play,
  Square,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMapsLoader } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

// Status definitions for the kanban columns
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

// Card component for each delivery in the kanban
function EntregaCard({ 
  entrega, 
  isSelected, 
  onClick,
  tempoDecorrido
}: { 
  entrega: Entrega; 
  isSelected: boolean;
  onClick: () => void;
  tempoDecorrido: string;
}) {
  const statusInfo = statusConfig[entrega.status] || statusConfig.aguardando_coleta;
  const StatusIcon = statusInfo.icon;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{tempoDecorrido}</span>
        </div>

        <p className="text-sm font-medium line-clamp-2 mb-3">
          {entrega.carga.descricao}
        </p>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 text-green-500" />
            <span className="truncate">
              {entrega.carga.endereco_origem?.cidade || 'Origem'}, {entrega.carga.endereco_origem?.estado || ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-red-500" />
            <span className="truncate">
              {entrega.carga.endereco_destino?.cidade || 'Destino'}, {entrega.carga.endereco_destino?.estado || ''}
            </span>
          </div>
        </div>

        {entrega.motorista && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium truncate">{entrega.motorista.nome_completo}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <Badge className={`text-[10px] ${statusInfo.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
          {entrega.valor_frete && (
            <span className="text-xs font-semibold text-green-600">
              R$ {entrega.valor_frete.toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Column component for the kanban
function KanbanColumn({ 
  title, 
  icon: Icon, 
  entries, 
  color,
  selectedId,
  onSelect,
  isLoading 
}: { 
  title: string;
  icon: React.ElementType;
  entries: Entrega[];
  color: string;
  selectedId: string | null;
  onSelect: (entrega: Entrega) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 p-4 border-b ${color}`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {entries.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma entrega</p>
            </div>
          ) : (
            entries.map((entrega) => (
              <EntregaCard
                key={entrega.id}
                entrega={entrega}
                isSelected={selectedId === entrega.id}
                onClick={() => onSelect(entrega)}
                tempoDecorrido={formatDistanceToNow(new Date(entrega.updated_at || entrega.created_at), { 
                  addSuffix: false, 
                  locale: ptBR 
                })}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Detail panel component
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
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
        <Box className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Nenhuma entrega selecionada</p>
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {entrega.codigo || entrega.id.slice(0, 8)}
            </Badge>
            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>
        
        <h2 className="font-semibold text-lg line-clamp-2">{entrega.carga.descricao}</h2>
        
        {/* Quick Actions */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2 mt-4">
            {nextStatuses.map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const isPrimary = status !== 'cancelada';
              return (
                <Button
                  key={status}
                  variant={isPrimary ? 'default' : 'outline'}
                  size="sm"
                  className={!isPrimary ? 'text-destructive border-destructive hover:bg-destructive/10' : ''}
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
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Mini Map */}
          <div className="rounded-lg overflow-hidden border h-48">
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Route className="w-4 h-4" /> Rota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Origem</p>
                  <p className="text-sm font-medium">
                    {entrega.carga.endereco_origem?.cidade}, {entrega.carga.endereco_origem?.estado}
                  </p>
                  <p className="text-xs text-muted-foreground">{entrega.carga.endereco_origem?.logradouro}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="w-3 h-3 text-red-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="text-sm font-medium">
                    {entrega.carga.endereco_destino?.cidade}, {entrega.carga.endereco_destino?.estado}
                  </p>
                  <p className="text-xs text-muted-foreground">{entrega.carga.endereco_destino?.logradouro}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Info */}
          {entrega.motorista && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" /> Motorista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{entrega.motorista.nome_completo}</p>
                {entrega.motorista.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {entrega.motorista.telefone}
                  </div>
                )}
                {entrega.veiculo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="w-3.5 h-3.5" />
                    {entrega.veiculo.placa} • {entrega.veiculo.modelo || entrega.veiculo.tipo}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cargo Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" /> Carga
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Código</p>
                <p className="font-mono">{entrega.carga.codigo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="capitalize">{entrega.carga.tipo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peso Alocado</p>
                <p>{(entrega.peso_alocado_kg || 0).toLocaleString('pt-BR')} kg</p>
              </div>
              {entrega.valor_frete && (
                <div>
                  <p className="text-xs text-muted-foreground">Frete</p>
                  <p className="text-green-600 font-semibold">
                    R$ {entrega.valor_frete.toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entrega.eventos && entrega.eventos.length > 0 ? (
                <div className="relative pl-4 space-y-4">
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-border" />
                  {entrega.eventos.slice(0, 10).map((evento, idx) => (
                    <div key={evento.id} className="relative">
                      <div className={`absolute -left-2.5 top-1 w-2 h-2 rounded-full ${
                        idx === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`} />
                      <div className="ml-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">
                            {evento.tipo.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(evento.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {evento.observacao && (
                          <p className="text-xs text-muted-foreground mt-0.5">{evento.observacao}</p>
                        )}
                        {evento.user_nome && (
                          <p className="text-xs text-muted-foreground">por {evento.user_nome}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum evento registrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

// Main component
export default function OperacaoDiaria() {
  const { empresa, filialAtiva } = useUserContext();
  const queryClient = useQueryClient();
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [motoristaIds, setMotoristaIds] = useState<string[]>([]);
  
  const { localizacoes } = useRealtimeLocalizacoes({ 
    motoristaIds, 
    enabled: motoristaIds.length > 0 
  });

  // Fetch today's deliveries
  const { data: entregas = [], isLoading, refetch } = useQuery({
    queryKey: ['operacao-diaria', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      
      let query = supabase
        .from('entregas')
        .select(`
          id, codigo, status, created_at, updated_at,
          motorista_id, veiculo_id, carroceria_id,
          peso_alocado_kg, valor_frete, coletado_em, entregue_em,
          motorista:motoristas(id, nome_completo, telefone, foto_url),
          veiculo:veiculos(id, placa, modelo, tipo),
          carga:cargas!inner(
            id, codigo, descricao, peso_kg, tipo, empresa_id,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, latitude, longitude)
          )
        `)
        .not('status', 'is', null)
        .order('updated_at', { ascending: false });

      // Filter by motoristas linked to this empresa
      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (motoristas && motoristas.length > 0) {
        const motoristaIds = motoristas.map(m => m.id);
        query = query.in('motorista_id', motoristaIds);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

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
    refetchInterval: 30000, // Refresh every 30s
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

      // Insert event
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

  // Filter and group deliveries
  const filteredEntregas = useMemo(() => {
    let filtered = entregas;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = entregas.filter(e => 
        e.codigo?.toLowerCase().includes(search) ||
        e.carga.descricao.toLowerCase().includes(search) ||
        e.motorista?.nome_completo.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [entregas, searchTerm]);

  // Group by status for kanban
  const aguardando = filteredEntregas.filter(e => e.status === 'aguardando_coleta' || e.status === 'em_coleta');
  const emRota = filteredEntregas.filter(e => e.status === 'em_transito' || e.status === 'em_entrega');
  const finalizados = filteredEntregas.filter(e => e.status === 'entregue' || e.status === 'cancelada');

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
      // Update local state optimistically
      setSelectedEntrega(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Operação Diária
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar entrega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Aguardando: {aguardando.length}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            Em Rota: {emRota.length}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Finalizados: {finalizados.length}
          </Badge>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Aguardando */}
        <div className="w-80 border-r bg-amber-50/30 dark:bg-amber-950/10 shrink-0 flex flex-col">
          <KanbanColumn
            title="Aguardando"
            icon={Clock}
            entries={aguardando}
            color="bg-amber-100/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
            selectedId={selectedEntrega?.id || null}
            onSelect={setSelectedEntrega}
            isLoading={isLoading}
          />
        </div>

        {/* Column 2: Em Rota */}
        <div className="w-80 border-r bg-blue-50/30 dark:bg-blue-950/10 shrink-0 flex flex-col">
          <KanbanColumn
            title="Em Rota"
            icon={Truck}
            entries={emRota}
            color="bg-blue-100/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
            selectedId={selectedEntrega?.id || null}
            onSelect={setSelectedEntrega}
            isLoading={isLoading}
          />
        </div>

        {/* Column 3: Details Panel */}
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
    </div>
  );
}
