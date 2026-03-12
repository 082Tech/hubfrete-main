import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Truck,
  Search,
  MoreHorizontal,
  DollarSign,
  Loader2,
  MapPin,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Package,
  User,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Map,
  RefreshCw,
  Filter,
  ArrowRightLeft,
} from 'lucide-react';
import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
// Types
interface EntregaCompleta {
  id: string;
  codigo: string | null;
  status: string | null;
  created_at: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  numero_cte: string | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
    email: string | null;
    foto_url: string | null;
  } | null;
  veiculo: {
    id: string;
    placa: string;
    tipo: string | null;
    marca: string | null;
    modelo: string | null;
  } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    data_entrega_limite: string | null;
    endereco_origem: {
      cidade: string;
      estado: string;
    } | null;
    endereco_destino: {
      cidade: string;
      estado: string;
    } | null;
    empresa: {
      nome: string | null;
      tipo: string;
    } | null;
  };
}

// Status configuration for display
const statusEntregaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando', icon: Clock },
  'saiu_para_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Saiu para Coleta', icon: Package },
  'em_transito': { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Em Trânsito', icon: ArrowRightLeft },
  'saiu_para_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Saiu p/ Entrega', icon: Truck },
  'entregue': { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Concluída', icon: CheckCircle },
  'problema': { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
  'cancelada': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelada', icon: XCircle },
};

type FilterStatus = 'all' | 'ativas' | 'finalizadas';
const ITEMS_PER_PAGE = 15;

export default function EntregasAdmin() {
  const now = new Date();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingEntrega, setTrackingEntrega] = useState<EntregaCompleta | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });

  // Fetch ALL entregas
  const { data: entregas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-todas-entregas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          codigo,
          status,
          created_at,
          coletado_em,
          entregue_em,
          peso_alocado_kg,
          valor_frete,
          numero_cte,
          motorista:motoristas(id, nome_completo, telefone, email, foto_url),
          veiculo:veiculos(id, placa, tipo, marca, modelo),
          carga:cargas(
            id,
            codigo,
            descricao,
            peso_kg,
            tipo,
            data_entrega_limite,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado),
            empresa:empresas!cargas_empresa_id_fkey(nome, tipo)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaCompleta[];
    },
  });

  // Apply filters
  const filteredEntregas = useMemo(() => {
    let result = entregas;

    // Date filter
    if (dateRange?.from) {
      const from = new Date(dateRange.from); from.setHours(0,0,0,0);
      result = result.filter(e => new Date(e.created_at || '') >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to); to.setHours(23,59,59,999);
      result = result.filter(e => new Date(e.created_at || '') <= to);
    }
    
    // Apply search
    result = result.filter(entrega => 
      entrega.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.carga?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.numero_cte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrega.carga?.empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    switch (filterStatus) {
      case 'ativas':
        result = result.filter(e => ['aguardando', 'saiu_para_coleta', 'em_transito', 'saiu_para_entrega', 'problema'].includes(e.status || ''));
        break;
      case 'finalizadas':
        result = result.filter(e => ['entregue', 'cancelada'].includes(e.status || ''));
        break;
    }

    return result;
  }, [entregas, searchTerm, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredEntregas.length / ITEMS_PER_PAGE);
  const paginatedEntregas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntregas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntregas, currentPage]);

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number | null) => {
    if (!kg) return '-';
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Calculate stats
  const stats = useMemo(() => {
    const byStatus = entregas.reduce((acc, e) => {
      acc[e.status || ''] = (acc[e.status || ''] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalFrete = entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);

    return {
      total: entregas.length,
      aguardando: byStatus['aguardando'] || 0,
      emRota: (byStatus['saiu_para_coleta'] || 0) + (byStatus['em_transito'] || 0) + (byStatus['saiu_para_entrega'] || 0),
      entregue: byStatus['entregue'] || 0,
      problema: byStatus['problema'] || 0,
      totalFrete,
    };
  }, [entregas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary" />
            Cargas
          </h1>
          <p className="text-muted-foreground">
            Visualize todas as cargas da plataforma
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.aguardando}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emRota}</p>
                <p className="text-xs text-muted-foreground">Saiu p/ Entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.entregue}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.problema}</p>
                <p className="text-xs text-muted-foreground">Problemas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalFrete)}</p>
                <p className="text-xs text-muted-foreground">Volume Frete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, motorista, placa, CT-e ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-auto justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}</>
                    ) : format(dateRange.from, 'dd/MM/yyyy')
                  ) : 'Período'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => { setDateRange(range); setCurrentPage(1); }}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as FilterStatus); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ativas">Ativas</SelectItem>
                <SelectItem value="finalizadas">Finalizadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>N° CT-e</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Frete</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="w-10">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntregas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                        Nenhuma entrega encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEntregas.map((entrega) => {
                      const statusConfig = statusEntregaConfig[entrega.status || ''] || statusEntregaConfig.aguardando;
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <TableRow key={entrega.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-medium">{entrega.codigo || '-'}</span>
                              <span className="text-xs text-muted-foreground">{entrega.carga?.codigo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-muted-foreground">
                              {entrega.numero_cte || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 max-w-[150px]">
                                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate">{entrega.carga?.empresa?.nome || '-'}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{entrega.carga?.empresa?.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {entrega.carga?.empresa?.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3 text-green-500" />
                              <span>{entrega.carga?.endereco_origem?.cidade}/{entrega.carga?.endereco_origem?.estado}</span>
                              <span className="text-muted-foreground">→</span>
                              <MapPin className="w-3 h-3 text-red-500" />
                              <span>{entrega.carga?.endereco_destino?.cidade}/{entrega.carga?.endereco_destino?.estado}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={entrega.motorista?.foto_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {entrega.motorista?.nome_completo?.charAt(0) || <User className="w-3 h-3" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{entrega.motorista?.nome_completo || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-mono">{entrega.veiculo?.placa || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatWeight(entrega.peso_alocado_kg)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{formatCurrency(entrega.valor_frete)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(entrega.created_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setTrackingEntrega(entrega)}>
                                  <Map className="w-4 h-4 mr-2" />
                                  Ver no Mapa
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredEntregas.length)} de {filteredEntregas.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking Map Dialog */}
      <TrackingMapDialog
        entregaId={trackingEntrega?.id || null}
        info={trackingEntrega?.motorista ? {
          motorista: trackingEntrega.motorista.nome_completo,
          placa: trackingEntrega.veiculo?.placa || '-'
        } : null}
        onClose={() => setTrackingEntrega(null)}
      />
    </div>
  );
}
