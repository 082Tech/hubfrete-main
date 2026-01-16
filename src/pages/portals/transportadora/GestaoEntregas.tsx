import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Package,
  MapPin,
  Calendar,
  Loader2,
  Filter,
  Truck,
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  User,
  RefreshCw,
  X,
  Building2,
  Wifi,
  WifiOff,
  Radio,
  ArrowRight,
  Route,
  Clock,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the map component
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap').then(m => ({ default: m.EntregasMap })));

type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaCompleta {
  id: string;
  status: StatusEntrega | null;
  created_at: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  updated_at: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
    email: string | null;
  } | null;
  veiculo: {
    id: string;
    placa: string;
    tipo: string | null;
  } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    data_entrega_limite: string | null;
    destinatario_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    endereco_origem: {
      cidade: string;
      estado: string;
      logradouro: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    endereco_destino: {
      cidade: string;
      estado: string;
      logradouro: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    empresa: {
      nome: string | null;
    } | null;
  };
}

interface MotoristaLocalizacao {
  email_motorista: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
}

// Status configuration for display
const statusEntregaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando_coleta': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando Coleta', icon: Clock },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Em Coleta', icon: Package },
  'coletado': { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Coletado', icon: CheckCircle },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Em Trânsito', icon: Route },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Em Entrega', icon: Truck },
  'problema': { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
};

// Status filters for active deliveries
const allStatusFilters = [
  { value: 'aguardando_coleta', label: 'Aguardando Coleta' },
  { value: 'em_coleta', label: 'Em Coleta' },
  { value: 'coletado', label: 'Coletado' },
  { value: 'em_transito', label: 'Em Trânsito' },
  { value: 'em_entrega', label: 'Em Entrega' },
  { value: 'problema', label: 'Problema' },
];

export default function GestaoEntregas() {
  const { empresa } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor internet connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch entregas da transportadora
  const { data: entregas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['gestao_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Primeiro busca os motoristas da empresa
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      if (motoristasError) throw motoristasError;

      const motoristaIds = (motoristasData || []).map((m) => m.id);

      if (motoristaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          created_at,
          coletado_em,
          entregue_em,
          updated_at,
          peso_alocado_kg,
          valor_frete,
          motorista:motoristas(id, nome_completo, telefone, email),
          veiculo:veiculos(id, placa, tipo),
          carga:cargas(
            id,
            codigo,
            descricao,
            peso_kg,
            tipo,
            data_entrega_limite,
            destinatario_nome_fantasia,
            destinatario_razao_social,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, latitude, longitude),
            empresa:empresas!cargas_empresa_id_fkey(nome)
          )
        `)
        .in('motorista_id', motoristaIds)
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega', 'problema'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaCompleta[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 60000, // Refresh every 1 minute
  });

  // Fetch driver locations from localizações table
  const motoristaEmails = useMemo(() => {
    const emails = new Set<string>();
    entregas.forEach(e => {
      if (e.motorista?.email) {
        emails.add(e.motorista.email);
      }
    });
    return Array.from(emails);
  }, [entregas]);

  const { data: localizacoes = [] } = useQuery({
    queryKey: ['localizacoes_motoristas_transportadora', motoristaEmails],
    queryFn: async () => {
      if (motoristaEmails.length === 0) return [];

      const { data, error } = await supabase
        .from('localizações')
        .select('email_motorista, latitude, longitude, timestamp, status')
        .in('email_motorista', motoristaEmails);

      if (error) throw error;
      return (data || []) as MotoristaLocalizacao[];
    },
    enabled: motoristaEmails.length > 0,
    refetchInterval: 60000, // Refresh every 1 minute
  });

  // Create a map of email to location for quick lookup
  const localizacaoMap = useMemo(() => {
    const map = new Map<string, MotoristaLocalizacao>();
    localizacoes.forEach(loc => {
      if (loc.email_motorista) {
        map.set(loc.email_motorista, loc);
      }
    });
    return map;
  }, [localizacoes]);

  // Filter entregas
  const filteredEntregas = useMemo(() => {
    return entregas.filter(entrega => {
      const matchesSearch =
        entrega.carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(entrega.status || '');

      return matchesSearch && matchesStatus;
    });
  }, [entregas, searchTerm, selectedStatuses]);

  // Calculate stats
  const stats = useMemo(() => {
    const byStatus = entregas.reduce((acc, e) => {
      acc[e.status || ''] = (acc[e.status || ''] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: entregas.length,
      aguardando_coleta: (byStatus['aguardando_coleta'] || 0) + (byStatus['em_coleta'] || 0) + (byStatus['coletado'] || 0),
      em_transito: byStatus['em_transito'] || 0,
      em_entrega: byStatus['em_entrega'] || 0,
      problema: byStatus['problema'] || 0,
    };
  }, [entregas]);

  // Map data for entregas with location
  const mapData = useMemo(() => {
    return filteredEntregas
      .map(e => {
        const origem = e.carga.endereco_origem;
        const destino = e.carga.endereco_destino;

        // Get driver location from localizações table
        const motoristaEmail = e.motorista?.email;
        const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;

        // Include if has driver location OR has origin/destination coords
        const hasLocation = localizacao?.latitude && localizacao?.longitude;
        const hasRoute = (origem?.latitude && origem?.longitude) || (destino?.latitude && destino?.longitude);

        if (!hasLocation && !hasRoute) return null;

        return {
          id: e.id,
          cargaId: e.carga.id,
          latitude: localizacao?.latitude || null,
          longitude: localizacao?.longitude || null,
          status: e.status || null,
          codigo: e.carga.codigo,
          descricao: e.carga.descricao,
          motorista: e.motorista?.nome_completo || null,
          telefone: e.motorista?.telefone || null,
          placa: e.veiculo?.placa || null,
          destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
          origemCoords: origem?.latitude && origem?.longitude
            ? { lat: origem.latitude, lng: origem.longitude }
            : null,
          destinoCoords: destino?.latitude && destino?.longitude
            ? { lat: destino.latitude, lng: destino.longitude }
            : null,
        };
      })
      .filter(Boolean) as NonNullable<typeof mapData[number]>[];
  }, [filteredEntregas, localizacaoMap]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSearchTerm('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPeso = (peso: number) => peso.toLocaleString('pt-BR') + ' kg';

  // Filters sidebar content
  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Status da Entrega</h4>
        <div className="space-y-2">
          {allStatusFilters.map(status => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${status.value}`}
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={() => handleStatusToggle(status.value)}
              />
              <Label htmlFor={`filter-${status.value}`} className="text-sm font-normal cursor-pointer">
                {status.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {selectedStatuses.length > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="w-4 h-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );

  // Live indicator component
  const LiveIndicator = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isOnline 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {isOnline ? (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Ao Vivo</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline 
            ? 'Mapa atualizado em tempo real' 
            : 'Sem conexão com a internet'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="flex gap-6">
        {/* Desktop Sidebar: Filters + Stats + Search */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestão de Entregas</h1>
              <p className="text-sm text-muted-foreground">Rastreie suas entregas em tempo real</p>
            </div>
          </div>

          {/* Action buttons and Live Indicator */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <LiveIndicator />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código, motorista, placa..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-border bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xl font-bold text-amber-600">{stats.aguardando_coleta}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Aguardando</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-orange-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Route className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-xl font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Em Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-purple-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Truck className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-purple-600">{stats.em_entrega}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Em Entrega</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-destructive/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-xl font-bold text-destructive">{stats.problema}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Problemas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FiltersContent />
            </CardContent>
          </Card>

          {/* Active Filters */}
          {selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(status => {
                const config = statusEntregaConfig[status];
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className={`${config?.color || ''} cursor-pointer text-xs`}
                    onClick={() => handleStatusToggle(status)}
                  >
                    {config?.label || status}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          )}
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col gap-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Entregas</h1>
              <p className="text-muted-foreground">Rastreie suas entregas em tempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <LiveIndicator />
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading || isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="border-border bg-amber-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-amber-600" />
                </div>
                <p className="text-lg font-bold text-amber-600">{stats.aguardando_coleta}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Aguardando</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-orange-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Route className="w-3 h-3 text-orange-600" />
                </div>
                <p className="text-lg font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Em Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-purple-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Truck className="w-3 h-3 text-purple-600" />
                </div>
                <p className="text-lg font-bold text-purple-600">{stats.em_entrega}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Em Entrega</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-destructive/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <AlertCircle className="w-3 h-3 text-destructive" />
                </div>
                <p className="text-lg font-bold text-destructive">{stats.problema}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Problemas</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 w-full">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(status => {
                const config = statusEntregaConfig[status];
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className={`${config?.color || ''} cursor-pointer`}
                    onClick={() => handleStatusToggle(status)}
                  >
                    {config?.label || status}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content - Map and Table */}
        <div className="flex-1 space-y-4 min-w-0 hidden lg:block">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregas.length === 0 ? (
            <div className='space-y-4'>
              <Suspense fallback={
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="w-full h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              }>
                <EntregasMap
                  entregas={mapData}
                  selectedCargaId={selectedEntregaId}
                  onSelectCarga={setSelectedEntregaId}
                />
              </Suspense>

              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Nenhuma entrega em andamento</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStatuses.length > 0
                      ? 'Tente ajustar os filtros selecionados'
                      : 'Aceite cargas para começar a gerenciar entregas'}
                  </p>
                  {selectedStatuses.length > 0 && (
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className='space-y-4'>
              <Suspense fallback={
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="w-full h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              }>
                <EntregasMap
                  entregas={mapData}
                  selectedCargaId={selectedEntregaId}
                  onSelectCarga={setSelectedEntregaId}
                />
              </Suspense>

              <Card className="border-border">
                <CardContent className="p-0">
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold min-w-[120px] sticky left-0 bg-muted/50 z-10">Código</TableHead>
                          <TableHead className="font-semibold min-w-[150px]">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Embarcador
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold min-w-[200px]">Rota</TableHead>
                          <TableHead className="font-semibold min-w-[90px]">Peso</TableHead>
                          <TableHead className="font-semibold min-w-[130px]">Motorista</TableHead>
                          <TableHead className="font-semibold min-w-[90px]">Veículo</TableHead>
                          <TableHead className="font-semibold min-w-[120px]">Status</TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Previsão
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntregas.map((entrega) => {
                          const status = entrega.status || 'aguardando_coleta';
                          const config = statusEntregaConfig[status];
                          const StatusIcon = config?.icon || Package;
                          const isSelected = selectedEntregaId === entrega.id;

                          return (
                            <TableRow
                              key={entrega.id}
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedEntregaId(entrega.id)}
                            >
                              <TableCell className="font-medium sticky left-0 bg-background z-10">
                                <Badge variant="secondary" className="text-xs">
                                  {entrega.carga.codigo}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm truncate block max-w-[140px]">
                                      {entrega.carga.empresa?.nome || '-'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {entrega.carga.empresa?.nome || 'Embarcador não informado'}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <MapPin className="w-3 h-3 text-chart-1 shrink-0" />
                                  <span className="truncate max-w-[60px]">
                                    {entrega.carga.endereco_origem?.cidade || '-'}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <MapPin className="w-3 h-3 text-chart-2 shrink-0" />
                                  <span className="truncate max-w-[60px]">
                                    {entrega.carga.endereco_destino?.cidade || '-'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatPeso(entrega.peso_alocado_kg || entrega.carga.peso_kg)}
                              </TableCell>
                              <TableCell>
                                {entrega.motorista ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <User className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="text-sm truncate max-w-[80px]">
                                      {entrega.motorista.nome_completo}
                                    </span>
                                    {entrega.motorista.telefone && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <a href={`tel:${entrega.motorista.telefone}`}>
                                              <Phone className="w-3 h-3" />
                                            </a>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Ligar para motorista</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entrega.veiculo ? (
                                  <Badge variant="outline" className="text-xs">
                                    {entrega.veiculo.placa}
                                  </Badge>
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
                                {formatDate(entrega.carga.data_entrega_limite)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Mobile Content - Cards only */}
        <div className="lg:hidden flex-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregas.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-1">Nenhuma entrega em andamento</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Nenhuma entrega corresponde à busca.' : 'Aceite cargas para começar.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEntregas.map((entrega) => {
                const status = entrega.status || 'aguardando_coleta';
                const config = statusEntregaConfig[status];
                const StatusIcon = config?.icon || Package;

                return (
                  <Card key={entrega.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant="secondary" className="text-xs mb-1">
                            {entrega.carga.codigo}
                          </Badge>
                          <p className="font-medium text-foreground">{entrega.carga.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {entrega.carga.empresa?.nome} • {formatPeso(entrega.peso_alocado_kg || entrega.carga.peso_kg)}
                          </p>
                        </div>
                        <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config?.label || status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm mb-3">
                        <MapPin className="w-4 h-4 text-chart-1 shrink-0" />
                        <span className="truncate">{entrega.carga.endereco_origem?.cidade}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <MapPin className="w-4 h-4 text-chart-2 shrink-0" />
                        <span className="truncate">{entrega.carga.endereco_destino?.cidade}</span>
                      </div>

                      {entrega.motorista && (
                        <div className="flex items-center gap-2 pt-3 border-t border-border">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entrega.motorista.nome_completo}</p>
                            {entrega.veiculo && (
                              <p className="text-xs text-muted-foreground">{entrega.veiculo.placa}</p>
                            )}
                          </div>
                          {entrega.motorista.telefone && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                              <a href={`tel:${entrega.motorista.telefone}`}>
                                <Phone className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
