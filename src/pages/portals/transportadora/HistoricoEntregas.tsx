import { useMemo, useState } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';
import { 
  Building2, 
  Calendar, 
  Package, 
  Search, 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MapPin,
  ArrowRight,
  User,
  MoreHorizontal,
  Eye,
  MessageCircle,
  Scale,
  Clock,
  Ban,
  Route,
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { useNavigate } from 'react-router-dom';
import { GoogleMapsLoader, airbnbMapStyles } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap } from '@react-google-maps/api';
import { TrackingHistoryGoogleMarkers } from '@/components/maps/TrackingHistoryGoogleMarkers';

type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaHistorico {
  id: string;
  status: StatusEntrega | null;
  updated_at: string | null;
  entregue_em: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculo: {
    placa: string;
    tipo: string;
  } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    destinatario_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    empresa: { nome: string | null } | null;
    endereco_origem: { cidade: string; estado: string; logradouro: string } | null;
    endereco_destino: { cidade: string; estado: string; logradouro: string } | null;
  };
}

const finalizedStatuses: StatusEntrega[] = ['entregue', 'devolvida', 'problema', 'cancelada'];

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'entregue': { 
    color: 'bg-green-500/10 text-green-600 border-green-500/20', 
    label: 'Entregue', 
    icon: CheckCircle 
  },
  'devolvida': { 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
    label: 'Devolvida', 
    icon: XCircle 
  },
  'problema': { 
    color: 'bg-destructive/10 text-destructive border-destructive/20', 
    label: 'Problema', 
    icon: AlertTriangle 
  },
  'cancelada': { 
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', 
    label: 'Cancelada', 
    icon: Ban 
  },
};

export default function HistoricoEntregas() {
  const { empresa } = useUserContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaHistorico | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['historico_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (motoristasError) throw motoristasError;

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(
          `
          id,
          status,
          updated_at,
          entregue_em,
          peso_alocado_kg,
          valor_frete,
          motorista:motoristas(id, nome_completo, telefone),
          veiculo:veiculos(placa, tipo),
          carga:cargas(
            id,
            codigo,
            descricao,
            peso_kg,
            destinatario_nome_fantasia,
            destinatario_razao_social,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro),
            empresa:empresas!cargas_empresa_id_fkey(nome)
          )
        `
        )
        .in('motorista_id', motoristaIds)
        .in('status', finalizedStatuses)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaHistorico[];
    },
    enabled: !!empresa?.id,
  });

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: entregas.length,
      entregue: entregas.filter(e => e.status === 'entregue').length,
      devolvida: entregas.filter(e => e.status === 'devolvida').length,
      problema: entregas.filter(e => e.status === 'problema').length,
    };
  }, [entregas]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return entregas.filter((e) => {
      // Status filter
      if (selectedStatus && e.status !== selectedStatus) return false;

      // Search filter
      if (!q) return true;
      
      const destinatario = (e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '').toLowerCase();
      return (
        e.carga.codigo.toLowerCase().includes(q) ||
        e.carga.descricao.toLowerCase().includes(q) ||
        destinatario.includes(q) ||
        (e.carga.empresa?.nome || '').toLowerCase().includes(q) ||
        (e.motorista?.nome_completo || '').toLowerCase().includes(q) ||
        (e.veiculo?.placa || '').toLowerCase().includes(q)
      );
    });
  }, [entregas, searchTerm, selectedStatus]);

  const formatPeso = (peso: number | null) => {
    if (!peso) return '-';
    if (peso >= 1000) return `${(peso / 1000).toFixed(1)}t`;
    return `${peso.toLocaleString('pt-BR')} kg`;
  };

  const handleOpenDetails = (entrega: EntregaHistorico) => {
    setSelectedEntrega(entrega);
    setDetailsDialogOpen(true);
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico de Entregas</h1>
              <p className="text-muted-foreground">Entregas finalizadas, devoluções e ocorrências</p>
            </div>
            <Badge variant="outline" className="w-fit">
              <Clock className="w-3 h-3 mr-1" />
              {filtered.length} registros
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card 
              className={`border-border cursor-pointer transition-all ${selectedStatus === null ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(null)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card 
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'entregue' ? 'ring-2 ring-green-500' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(selectedStatus === 'entregue' ? null : 'entregue')}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.entregue}</p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </CardContent>
            </Card>
            <Card 
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'devolvida' ? 'ring-2 ring-amber-500' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(selectedStatus === 'devolvida' ? null : 'devolvida')}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.devolvida}</p>
                <p className="text-xs text-muted-foreground">Devolvidas</p>
              </CardContent>
            </Card>
            <Card 
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'problema' ? 'ring-2 ring-destructive' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(selectedStatus === 'problema' ? null : 'problema')}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.problema}</p>
                <p className="text-xs text-muted-foreground">Problemas</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por código, destinatário, embarcador, motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Entregas finalizadas
                {selectedStatus && (
                  <Badge variant="outline" className="ml-2">
                    Filtro: {statusConfig[selectedStatus]?.label}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus(null);
                      }}
                    >
                      ×
                    </Button>
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold min-w-[100px] sticky left-0 bg-muted/50 z-10">Código</TableHead>
                      <TableHead className="font-semibold min-w-[160px]">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Remetente
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[160px]">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Destinatário
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[180px]">Rota</TableHead>
                      <TableHead className="font-semibold min-w-[80px]">
                        <div className="flex items-center gap-1">
                          <Scale className="w-3 h-3" />
                          Peso
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[130px]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Motorista
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold min-w-[120px]">Status</TableHead>
                      <TableHead className="font-semibold min-w-[110px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Encerrada em
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="w-10 h-10 text-muted-foreground/50" />
                            <p>Nenhum registro encontrado.</p>
                            {(searchTerm || selectedStatus) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSearchTerm('');
                                  setSelectedStatus(null);
                                }}
                              >
                                Limpar filtros
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((e) => {
                        const origem = e.carga.endereco_origem;
                        const destino = e.carga.endereco_destino;
                        const status = e.status || 'entregue';
                        const config = statusConfig[status];
                        const StatusIcon = config?.icon || CheckCircle;

                        return (
                          <TableRow key={e.id} className="hover:bg-muted/30">
                            <TableCell className="sticky left-0 bg-background z-10">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-nowrap">{e.carga.codigo}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate block max-w-[150px]">
                                    {e.carga.empresa?.nome || '-'}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{e.carga.empresa?.nome || 'Remetente não informado'}</p>
                                  {origem && (
                                    <p className="text-xs text-muted-foreground">{origem.logradouro}, {origem.cidade}/{origem.estado}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate block max-w-[150px]">
                                    {e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '-'}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || 'Destinatário não informado'}</p>
                                  {destino && (
                                    <p className="text-xs text-muted-foreground">{destino.logradouro}, {destino.cidade}/{destino.estado}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-chart-1 shrink-0" />
                                <span className="truncate max-w-[50px]">{origem?.cidade || '-'}</span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                <MapPin className="w-3 h-3 text-chart-2 shrink-0" />
                                <span className="truncate max-w-[50px]">{destino?.cidade || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatPeso(e.peso_alocado_kg || e.carga.peso_kg)}
                            </TableCell>
                            <TableCell>
                              {e.motorista ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-primary" />
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm truncate max-w-[80px]">
                                        {e.motorista.nome_completo}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-medium">{e.motorista.nome_completo}</p>
                                      {e.veiculo && <p className="text-xs text-muted-foreground">Placa: {e.veiculo.placa}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                                <StatusIcon className="w-3 h-3" />
                                {config?.label || status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(e.entregue_em || e.updated_at || Date.now()).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => navigate(`/transportadora/mensagens?entrega=${e.id}`)}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Ver conversa
                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleOpenDetails(e)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver detalhes
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => {
                                                    setTrackingMapEntregaId(e.id);
                                                    setTrackingMapInfo({
                                                      motorista: e.motorista?.nome_completo || 'Motorista',
                                                      placa: e.veiculo?.placa || '-',
                                                    });
                                                  }}>
                                                    <Route className="w-4 h-4 mr-2" />
                                                    Ver histórico no mapa
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((e) => {
              const status = e.status || 'entregue';
              const config = statusConfig[status];
              const StatusIcon = config?.icon || CheckCircle;

              return (
                <Card key={e.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">
                          {e.carga.codigo}
                        </Badge>
                        <p className="font-medium text-foreground">{e.carga.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.carga.empresa?.nome} • {formatPeso(e.peso_alocado_kg || e.carga.peso_kg)}
                        </p>
                      </div>
                      <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config?.label || status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-3">
                      <MapPin className="w-4 h-4 text-chart-1 shrink-0" />
                      <span className="truncate">{e.carga.endereco_origem?.cidade}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <MapPin className="w-4 h-4 text-chart-2 shrink-0" />
                      <span className="truncate">{e.carga.endereco_destino?.cidade}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        {e.motorista && (
                          <>
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm truncate max-w-[100px]">{e.motorista.nome_completo}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(e.entregue_em || e.updated_at || Date.now()).toLocaleDateString('pt-BR')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleOpenDetails(e)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Details Dialog */}
        <EntregaDetailsDialog
          entrega={selectedEntrega as any}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />

        {/* Tracking History Map Dialog */}
        <Dialog open={!!trackingMapEntregaId} onOpenChange={(open) => {
          if (!open) {
            setTrackingMapEntregaId(null);
            setTrackingMapInfo(null);
          }
        }}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Route className="w-5 h-5 text-primary" />
                Histórico de Rastreamento
                {trackingMapInfo && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    {trackingMapInfo.motorista} • {trackingMapInfo.placa}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 relative">
              <GoogleMapsLoader>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: -23.55, lng: -46.63 }}
                  zoom={10}
                  options={{
                    styles: airbnbMapStyles,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                  }}
                  onLoad={(map) => setMapInstance(map)}
                >
                  <TrackingHistoryGoogleMarkers 
                    entregaId={trackingMapEntregaId}
                    onBoundsReady={(bounds) => {
                      if (mapInstance && bounds) {
                        mapInstance.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
                      }
                    }}
                  />
                </GoogleMap>
              </GoogleMapsLoader>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </PortalLayout>
  );
}