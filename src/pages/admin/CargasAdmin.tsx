import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Search,
  MoreHorizontal,
  Eye,
  Weight,
  DollarSign,
  TrendingUp,
  Loader2,
  MapPin,
  Building2,
  Calendar,
  Truck,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  User,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Map,
  RefreshCw,
  ArrowRightLeft,
} from 'lucide-react';
import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';

// Types
interface EnderecoData {
  id: string;
  tipo: string;
  logradouro: string;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  cep: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface EntregaData {
  id: string;
  codigo: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  status: string;
  coletado_em: string | null;
  entregue_em: string | null;
  created_at: string | null;
  motorista_id: string | null;
  numero_cte: string | null;
  motoristas: {
    id: string;
    nome_completo: string;
    telefone: string | null;
    email: string | null;
    foto_url: string | null;
  } | null;
  veiculos: {
    id: string;
    placa: string;
    marca: string | null;
    modelo: string | null;
    tipo: string | null;
  } | null;
}

interface CargaData {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  peso_disponivel_kg: number | null;
  permite_fracionado: boolean | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  tipo_precificacao: string | null;
  valor_frete_m3: number | null;
  valor_frete_fixo: number | null;
  valor_frete_km: number | null;
  status: string;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  data_entrega_limite: string | null;
  created_at: string;
  remetente_razao_social: string | null;
  remetente_nome_fantasia: string | null;
  destinatario_razao_social: string | null;
  destinatario_nome_fantasia: string | null;
  endereco_origem: EnderecoData | null;
  endereco_destino: EnderecoData | null;
  entregas: EntregaData[];
  empresa: {
    id: number;
    nome: string | null;
    tipo: string;
  } | null;
}

// Status config for entregas
const statusEntregaConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  saiu_para_coleta: { label: 'Saiu para Coleta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ArrowRightLeft },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  entregue: { label: 'Concluída', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  cancelada: { label: 'Cancelada', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
};

type FilterStatus = 'all' | 'publicada' | 'em_transporte' | 'finalizada';
const ITEMS_PER_PAGE = 15;

export default function CargasAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingEntrega, setTrackingEntrega] = useState<EntregaData | null>(null);

  // Fetch ALL cargas from all companies
  const { data: cargas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-todas-cargas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          tipo,
          peso_kg,
          peso_disponivel_kg,
          permite_fracionado,
          valor_mercadoria,
          valor_frete_tonelada,
          tipo_precificacao,
          valor_frete_m3,
          valor_frete_fixo,
          valor_frete_km,
          status,
          data_coleta_de,
          data_coleta_ate,
          data_entrega_limite,
          created_at,
          remetente_razao_social,
          remetente_nome_fantasia,
          destinatario_razao_social,
          destinatario_nome_fantasia,
          endereco_origem:enderecos_carga!cargas_endereco_origem_fkey (
            id,
            tipo,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            cep,
            contato_nome,
            contato_telefone,
            latitude,
            longitude
          ),
          endereco_destino:enderecos_carga!cargas_endereco_destino_fkey (
            id,
            tipo,
            logradouro,
            numero,
            bairro,
            cidade,
            estado,
            cep,
            contato_nome,
            contato_telefone,
            latitude,
            longitude
          ),
          entregas (
            id,
            codigo,
            peso_alocado_kg,
            valor_frete,
            status,
            coletado_em,
            entregue_em,
            created_at,
            motorista_id,
            numero_cte,
            motoristas:motoristas (
              id,
              nome_completo,
              telefone,
              email,
              foto_url
            ),
            veiculos:veiculos (
              id,
              placa,
              marca,
              modelo,
              tipo
            )
          ),
          empresa:empresas (
            id,
            nome,
            tipo
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        entregas: Array.isArray(item.entregas) ? item.entregas : (item.entregas ? [item.entregas] : [])
      })) as CargaData[];
    },
  });

  // Helper functions
  const getPesoDisponivel = (carga: CargaData) => carga.peso_disponivel_kg ?? carga.peso_kg;
  
  const getPercentualAlocado = (carga: CargaData) => {
    const disponivel = getPesoDisponivel(carga);
    return ((carga.peso_kg - disponivel) / carga.peso_kg) * 100;
  };

  const allEntregasFinalized = (carga: CargaData) => {
    if (carga.entregas.length === 0) return false;
    return carga.entregas.every(e => ['entregue', 'cancelada', 'problema'].includes(e.status));
  };

  const hasProblems = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema' || e.status === 'cancelada');
  };

  // Apply filters
  const filteredCargas = useMemo(() => {
    let result = cargas;
    
    // Apply search
    result = result.filter(carga => 
      carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.empresa?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    switch (filterStatus) {
      case 'publicada':
        result = result.filter(c => getPercentualAlocado(c) === 0);
        break;
      case 'em_transporte':
        result = result.filter(c => {
          const p = getPercentualAlocado(c);
          return p > 0 && !allEntregasFinalized(c);
        });
        break;
      case 'finalizada':
        result = result.filter(c => allEntregasFinalized(c));
        break;
    }

    return result;
  }, [cargas, searchTerm, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredCargas.length / ITEMS_PER_PAGE);
  const paginatedCargas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCargas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCargas, currentPage]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getEnderecoData = (carga: CargaData, tipo: 'origem' | 'destino') => {
    const endereco = tipo === 'origem' ? carga.endereco_origem : carga.endereco_destino;
    if (!endereco) return { empresa: '-', cidade: '-' };
    
    let empresa: string;
    if (tipo === 'origem') {
      empresa = carga.remetente_nome_fantasia || carga.remetente_razao_social || endereco.contato_nome || 'Remetente';
    } else {
      empresa = carga.destinatario_nome_fantasia || carga.destinatario_razao_social || endereco.contato_nome || 'Destinatário';
    }
    
    return { empresa, cidade: `${endereco.cidade}/${endereco.estado}` };
  };

  const getStatusBadge = (carga: CargaData) => {
    const percentual = getPercentualAlocado(carga);
    const finalized = allEntregasFinalized(carga);
    const problems = hasProblems(carga);

    if (finalized && problems) {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Com Problemas</Badge>;
    }
    if (finalized) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Concluída</Badge>;
    }
    if (percentual >= 100) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">100% Alocada</Badge>;
    }
    if (percentual > 0) {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{percentual.toFixed(0)}% Alocada</Badge>;
    }
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Aguardando</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Calculate stats
  const stats = useMemo(() => {
    const publicadas = cargas.filter(c => getPercentualAlocado(c) === 0).length;
    const emTransporte = cargas.filter(c => getPercentualAlocado(c) > 0 && !allEntregasFinalized(c)).length;
    const finalizadas = cargas.filter(c => allEntregasFinalized(c)).length;
    const totalFrete = cargas.reduce((acc, c) => {
      return acc + c.entregas.reduce((sum, e) => sum + (e.valor_frete || 0), 0);
    }, 0);
    
    return { total: cargas.length, publicadas, emTransporte, finalizadas, totalFrete };
  }, [cargas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
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
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.publicadas}</p>
                <p className="text-xs text-muted-foreground">Publicadas</p>
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
                <p className="text-2xl font-bold">{stats.emTransporte}</p>
                <p className="text-xs text-muted-foreground">Em Transporte</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.finalizadas}</p>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
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
                placeholder="Buscar por código, descrição ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as FilterStatus); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="publicada">Publicadas</SelectItem>
                <SelectItem value="em_transporte">Em Transporte</SelectItem>
                <SelectItem value="finalizada">Finalizadas</SelectItem>
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
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Alocação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cargas</TableHead>
                    <TableHead>Publicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCargas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        Nenhuma carga encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCargas.map((carga) => (
                      <>
                        <TableRow
                          key={carga.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleRow(carga.id)}
                        >
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedRows.has(carga.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{carga.codigo}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{carga.empresa?.nome || '-'}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {carga.empresa?.tipo === 'EMBARCADOR' ? 'Embarcador' : 'Transportadora'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="w-3 h-3 text-green-500" />
                                    <span>{getEnderecoData(carga, 'origem').cidade}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <MapPin className="w-3 h-3 text-red-500" />
                                    <span>{getEnderecoData(carga, 'destino').cidade}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getEnderecoData(carga, 'origem').empresa} → {getEnderecoData(carga, 'destino').empresa}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Weight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{formatWeight(carga.peso_kg)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-20">
                              <Progress value={getPercentualAlocado(carga)} className="h-2" />
                              <span className="text-xs text-muted-foreground">{getPercentualAlocado(carga).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(carga)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{carga.entregas.length}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(carga.created_at)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Entregas */}
                        {expandedRows.has(carga.id) && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {carga.entregas.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhuma entrega vinculada a esta carga
                                  </p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30">
                                        <TableHead>Código</TableHead>
                                        <TableHead>N° CT-e</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Frete</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-10">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {carga.entregas.map((entrega) => {
                                        const statusConfig = statusEntregaConfig[entrega.status] || statusEntregaConfig.aguardando;
                                        const StatusIcon = statusConfig.icon;
                                        
                                        return (
                                          <TableRow key={entrega.id}>
                                            <TableCell>
                                              <span className="font-mono text-sm">{entrega.codigo || '-'}</span>
                                            </TableCell>
                                            <TableCell>
                                              <span className="font-mono text-sm text-muted-foreground">
                                                {entrega.numero_cte || '-'}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                  {entrega.motoristas?.nome_completo || '-'}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                  {entrega.veiculos?.placa || '-'}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <span className="text-sm">{formatWeight(entrega.peso_alocado_kg || 0)}</span>
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
                                      })}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
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
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCargas.length)} de {filteredCargas.length}
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
        info={trackingEntrega?.motoristas ? {
          motorista: trackingEntrega.motoristas.nome_completo,
          placa: trackingEntrega.veiculos?.placa || '-'
        } : null}
        onClose={() => setTrackingEntrega(null)}
      />
    </div>
  );
}
