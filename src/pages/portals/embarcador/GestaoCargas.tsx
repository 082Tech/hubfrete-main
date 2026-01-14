import { useState, useMemo, Suspense, lazy } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Filter,
  Truck,
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  User,
  List,
  MapPinned,
  RefreshCw,
  X,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the map component
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap').then(m => ({ default: m.EntregasMap })));

type StatusCarga = Database['public']['Enums']['status_carga'];
type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaData {
  id: string;
  status: StatusEntrega | null;
  latitude_atual: number | null;
  longitude_atual: number | null;
  motorista_id: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  updated_at: string | null;
  motoristas: {
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculos: {
    placa: string;
    marca: string | null;
    modelo: string | null;
  } | null;
}

interface CargaCompleta {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  valor_mercadoria: number | null;
  status: StatusCarga | null;
  data_coleta_de: string | null;
  data_entrega_limite: string | null;
  created_at: string | null;
  enderecos_carga: {
    tipo: string;
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
  }[];
  // entregas can be a single object (one-to-one) or null
  entregas: EntregaData | null;
}

// Status configuration for display
const statusCargaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'rascunho': { color: 'bg-muted text-muted-foreground border-muted', label: 'Rascunho', icon: Package },
  'publicada': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Publicada', icon: Package },
  'aceita': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Aceita', icon: Package },
  'em_coleta': { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', label: 'Em Coleta', icon: Truck },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Em Trânsito', icon: Navigation },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Entregue', icon: CheckCircle },
  'cancelada': { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Cancelada', icon: AlertCircle },
};

const statusEntregaConfig: Record<string, { color: string; label: string }> = {
  'aguardando_coleta': { color: 'bg-gray-500/10 text-gray-600', label: 'Aguardando Coleta' },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600', label: 'Em Coleta' },
  'coletado': { color: 'bg-cyan-500/10 text-cyan-600', label: 'Coletado' },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600', label: 'Em Trânsito' },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600', label: 'Em Entrega' },
  'entregue': { color: 'bg-green-500/10 text-green-600', label: 'Entregue' },
  'problema': { color: 'bg-red-500/10 text-red-600', label: 'Problema' },
  'devolvida': { color: 'bg-red-500/10 text-red-600', label: 'Devolvida' },
};

// All possible status filters
const allStatusFilters = [
  { value: 'rascunho', label: 'Rascunho', group: 'carga' },
  { value: 'publicada', label: 'Publicada', group: 'carga' },
  { value: 'aceita', label: 'Aceita', group: 'carga' },
  { value: 'em_coleta', label: 'Em Coleta', group: 'transporte' },
  { value: 'em_transito', label: 'Em Trânsito', group: 'transporte' },
  { value: 'entregue', label: 'Entregue', group: 'finalizado' },
  { value: 'cancelada', label: 'Cancelada', group: 'finalizado' },
];

export default function GestaoCargas() {
  const { filialAtiva, switchingFilial } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(null);

  // Fetch all cargas with related data
  const { data: cargas = [], isLoading, refetch } = useQuery({
    queryKey: ['gestao_cargas', filialAtiva?.id],
    queryFn: async () => {
      if (!filialAtiva?.id) return [];

      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          tipo,
          peso_kg,
          valor_mercadoria,
          status,
          data_coleta_de,
          data_entrega_limite,
          created_at,
          enderecos_carga (
            tipo,
            cidade,
            estado,
            latitude,
            longitude
          ),
          entregas (
            id,
            status,
            latitude_atual,
            longitude_atual,
            motorista_id,
            coletado_em,
            entregue_em,
            updated_at,
            motoristas (
              nome_completo,
              telefone
            ),
            veiculos (
              placa,
              marca,
              modelo
            )
          )
        `)
        .eq('filial_id', filialAtiva.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CargaCompleta[];
    },
    enabled: !!filialAtiva?.id,
  });

  // Filter cargas
  const filteredCargas = useMemo(() => {
    return cargas.filter(carga => {
      const matchesSearch =
        carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.descricao.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(carga.status || 'rascunho');

      return matchesSearch && matchesStatus;
    });
  }, [cargas, searchTerm, selectedStatuses]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: cargas.length,
    publicadas: cargas.filter(c => c.status === 'publicada').length,
    aceitas: cargas.filter(c => c.status === 'aceita').length,
    em_transito: cargas.filter(c => c.status === 'em_transito' || c.status === 'em_coleta').length,
    entregues: cargas.filter(c => c.status === 'entregue').length,
    problemas: cargas.filter(c => c.entregas?.status === 'problema').length,
  }), [cargas]);

  // Map data for entregas with location
  const mapData = useMemo(() => {
    return filteredCargas
      .filter(c => c.entregas !== null)
      .map(c => {
        const e = c.entregas!;
        const origem = c.enderecos_carga?.find(end => end.tipo === 'origem');
        const destino = c.enderecos_carga?.find(end => end.tipo === 'destino');
        return {
          id: e.id,
          cargaId: c.id,
          latitude: e.latitude_atual,
          longitude: e.longitude_atual,
          status: e.status,
          codigo: c.codigo,
          descricao: c.descricao,
          motorista: e.motoristas?.nome_completo || null,
          telefone: e.motoristas?.telefone || null,
          placa: e.veiculos?.placa || null,
          destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
          origemCoords: origem?.latitude && origem?.longitude 
            ? { lat: origem.latitude, lng: origem.longitude } 
            : null,
          destinoCoords: destino?.latitude && destino?.longitude 
            ? { lat: destino.latitude, lng: destino.longitude } 
            : null,
        };
      });
  }, [filteredCargas]);

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

  const getEndereco = (carga: CargaCompleta, tipo: 'origem' | 'destino') => {
    const endereco = carga.enderecos_carga?.find(e => e.tipo === tipo);
    if (!endereco) return '-';
    return `${endereco.cidade}, ${endereco.estado}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPeso = (peso: number) => peso.toLocaleString('pt-BR') + ' kg';

  const formatValor = (valor: number | null) => {
    if (!valor) return '-';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getProgress = (carga: CargaCompleta): number => {
    switch (carga.status) {
      case 'rascunho': return 5;
      case 'publicada': return 20;
      case 'aceita': return 40;
      case 'em_coleta': return 55;
      case 'em_transito': return 75;
      case 'entregue': return 100;
      case 'cancelada': return 0;
      default: return 0;
    }
  };

  // Filters sidebar content
  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Status da Carga</h4>
        <div className="space-y-2">
          {allStatusFilters.filter(s => s.group === 'carga').map(status => (
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

      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Em Transporte</h4>
        <div className="space-y-2">
          {allStatusFilters.filter(s => s.group === 'transporte').map(status => (
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

      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Finalizados</h4>
        <div className="space-y-2">
          {allStatusFilters.filter(s => s.group === 'finalizado').map(status => (
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

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="flex gap-6">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <Card className="border-border sticky top-4">
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
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Cargas</h1>
              <p className="text-muted-foreground">Gerencie todas as suas cargas e entregas</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading || switchingFilial}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <NovaCargaDialog onSuccess={() => refetch()} />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.publicadas}</p>
                <p className="text-xs text-muted-foreground">Publicadas</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.aceitas}</p>
                <p className="text-xs text-muted-foreground">Aceitas</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.entregues}</p>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.problemas}</p>
                <p className="text-xs text-muted-foreground">Problemas</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3 w-full sm:w-auto">
              {/* Mobile Filter Button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden shrink-0">
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

              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(status => {
                const config = statusCargaConfig[status];
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

          {/* Content */}
          {isLoading || switchingFilial ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCargas.length === 0 ? (
            <div className='space-y-6'>
              <Suspense fallback={
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="w-full h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              }>
                <EntregasMap 
                  entregas={mapData} 
                  selectedCargaId={selectedCargaId}
                  onSelectCarga={setSelectedCargaId}
                />
              </Suspense>

              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Nenhuma carga encontrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStatuses.length > 0
                      ? 'Tente ajustar os filtros selecionados'
                      : 'Clique em "Nova Carga" para começar'}
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
            <div className='space-y-6'>
              <Suspense fallback={
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="w-full h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              }>
                <EntregasMap 
                  entregas={mapData} 
                  selectedCargaId={selectedCargaId}
                  onSelectCarga={setSelectedCargaId}
                />
              </Suspense>

              <Card className="border-border">
                <CardContent className="p-0">
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="min-w-[200px]">Carga</TableHead>
                          <TableHead className="min-w-[120px]">Origem</TableHead>
                          <TableHead className="min-w-[120px]">Destino</TableHead>
                          <TableHead className="min-w-[100px]">Peso</TableHead>
                          <TableHead className="min-w-[120px]">Valor</TableHead>
                          <TableHead className="min-w-[150px]">Status</TableHead>
                          <TableHead className="min-w-[140px]">Progresso</TableHead>
                          <TableHead className="min-w-[100px]">Data</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCargas.map((carga) => {
                          const status = carga.status || 'rascunho';
                          const config = statusCargaConfig[status];
                          const StatusIcon = config?.icon || Package;
                          const entrega = carga.entregas;
                          const progress = getProgress(carga);
                          const isSelected = selectedCargaId === carga.id;

                          return (
                            <TableRow 
                              key={carga.id} 
                              className={`border-border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedCargaId(isSelected ? null : carga.id)}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">{carga.codigo}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{carga.descricao}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{getEndereco(carga, 'origem')}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate">{getEndereco(carga, 'destino')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{formatPeso(carga.peso_kg)}</TableCell>
                              <TableCell className="text-sm font-medium">{formatValor(carga.valor_mercadoria)}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={config?.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {config?.label}
                                  </Badge>
                                  {entrega && entrega.motoristas && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      <span className="truncate max-w-[100px]">{entrega.motoristas.nome_completo}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Progress value={progress} className="h-2" />
                                  <p className="text-xs text-muted-foreground">{progress}%</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(carga.data_coleta_de)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                                    <DropdownMenuItem className="gap-2 cursor-pointer">
                                      <Eye className="w-4 h-4" /> Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer">
                                      <Edit className="w-4 h-4" /> Editar
                                    </DropdownMenuItem>
                                    {entrega?.motoristas?.telefone && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={() => window.open(`tel:${entrega.motoristas!.telefone}`, '_blank')}
                                        >
                                          <Phone className="w-4 h-4" /> Ligar para motorista
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                                      <Trash2 className="w-4 h-4" /> Cancelar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
