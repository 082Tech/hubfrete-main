import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GoogleMapsLoader, airbnbMapStyles } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap } from '@react-google-maps/api';
import { TrackingHistoryGoogleMarkers } from '@/components/maps/TrackingHistoryGoogleMarkers';
import type { Database } from '@/integrations/supabase/types';

type StatusCarga = Database['public']['Enums']['status_carga'];
type StatusEntrega = Database['public']['Enums']['status_entrega'];
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
  Loader2,
  MapPin,
  Building2,
  Calendar,
  Truck,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  User,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  History,
  Route,
  FileText,
} from 'lucide-react';

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
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  status: StatusEntrega;
  coletado_em: string | null;
  entregue_em: string | null;
  motorista_id: string | null;
  cte_url: string | null;
  motoristas: {
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculos: {
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
  status: StatusCarga;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  data_entrega_limite: string | null;
  created_at: string;
  destinatario_razao_social: string | null;
  destinatario_nome_fantasia: string | null;
  destinatario_cnpj: string | null;
  endereco_origem: EnderecoData | null;
  endereco_destino: EnderecoData | null;
  entregas: EntregaData[];
  volume_m3: number | null;
  carga_fragil: boolean | null;
  carga_perigosa: boolean | null;
  carga_viva: boolean | null;
  empilhavel: boolean | null;
  requer_refrigeracao: boolean | null;
  temperatura_min: number | null;
  temperatura_max: number | null;
  numero_onu: string | null;
  necessidades_especiais: string[] | null;
  regras_carregamento: string | null;
  nota_fiscal_url: string | null;
  veiculo_requisitos: {
    tipos_veiculo?: string[];
    tipos_carroceria?: string[];
  } | null;
}

// Status config for entregas
const statusEntregaConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  saiu_para_coleta: { label: 'Saiu para Coleta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  saiu_para_entrega: { label: 'Saiu para Entrega', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: RotateCcw },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

// Filter options for Histórico - only finalized states
type FilterStatus = 'all' | 'entregue' | 'cancelada' | 'problema';
type SortField = 'created_at' | 'codigo' | 'peso_kg' | 'valor_mercadoria';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

export default function HistoricoCargas() {
  const { filialAtiva } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsCarga, setDetailsCarga] = useState<CargaData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedEntregaId, setHighlightedEntregaId] = useState<string | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [ctePreviewUrl, setCtePreviewUrl] = useState<string | null>(null);
  const [ctePreviewOpen, setCtePreviewOpen] = useState(false);

  // Handle URL params for highlighting/expanding specific cargo and entrega
  useEffect(() => {
    const cargaId = searchParams.get('carga');
    const entregaId = searchParams.get('entrega');
    if (cargaId) {
      setExpandedRows(new Set([cargaId]));
      if (entregaId) {
        setHighlightedEntregaId(entregaId);
      }
      setSearchParams({}, { replace: true });
      const timer = setTimeout(() => setHighlightedEntregaId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Fetch ALL cargas
  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['historico-cargas', filialAtiva?.id],
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
          peso_disponivel_kg,
          permite_fracionado,
          valor_mercadoria,
          valor_frete_tonelada,
          status,
          data_coleta_de,
          data_coleta_ate,
          data_entrega_limite,
          created_at,
          destinatario_razao_social,
          destinatario_nome_fantasia,
          destinatario_cnpj,
          volume_m3,
          carga_fragil,
          carga_perigosa,
          carga_viva,
          empilhavel,
          requer_refrigeracao,
          temperatura_min,
          temperatura_max,
          numero_onu,
          necessidades_especiais,
          regras_carregamento,
          nota_fiscal_url,
          veiculo_requisitos,
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
            peso_alocado_kg,
            valor_frete,
            status,
            coletado_em,
            entregue_em,
            motorista_id,
            cte_url,
            motoristas (
              nome_completo,
              telefone
            ),
            veiculos (
              placa,
              marca,
              modelo,
              tipo
            )
          )
        `)
        .eq('filial_id', filialAtiva.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        entregas: Array.isArray(item.entregas) ? item.entregas : (item.entregas ? [item.entregas] : [])
      })) as CargaData[];
    },
    enabled: !!filialAtiva?.id,
  });

  // Helper functions
  const allEntregasFinalized = (carga: CargaData) => {
    if (carga.entregas.length === 0) return false;
    return carga.entregas.every(e => ['entregue', 'cancelada', 'problema'].includes(e.status));
  };

  const hasProblems = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema' || e.status === 'cancelada');
  };

  const allDelivered = (carga: CargaData) => {
    return carga.entregas.length > 0 && carga.entregas.every(e => e.status === 'entregue');
  };

  const hasCancelada = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'cancelada');
  };

  const hasProblema = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema');
  };

  // Apply filters - ONLY show finalized cargas (Histórico view)
  const filteredCargas = useMemo(() => {
    // First, filter to only show finalized cargas - this page only shows completed ones
    let result = cargas.filter(carga => allEntregasFinalized(carga));
    
    // Apply search
    result = result.filter(carga => 
      carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    switch (filterStatus) {
      case 'entregue':
        result = result.filter(c => allDelivered(c));
        break;
      case 'cancelada':
        result = result.filter(c => hasCancelada(c));
        break;
      case 'problema':
        result = result.filter(c => hasProblema(c));
        break;
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'codigo':
          comparison = a.codigo.localeCompare(b.codigo);
          break;
        case 'peso_kg':
          comparison = a.peso_kg - b.peso_kg;
          break;
        case 'valor_mercadoria':
          comparison = (a.valor_mercadoria || 0) - (b.valor_mercadoria || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cargas, searchTerm, filterStatus, sortField, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortField, sortOrder]);

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
    if (!endereco) return { empresa: '-', cidade: '-', enderecoCompleto: '-' };
    
    const enderecoCompleto = [
      endereco.logradouro,
      endereco.numero,
      endereco.bairro,
      `${endereco.cidade}/${endereco.estado}`,
      endereco.cep
    ].filter(Boolean).join(', ');
    
    let empresa: string;
    if (tipo === 'destino' && carga.destinatario_nome_fantasia) {
      empresa = carga.destinatario_nome_fantasia;
    } else if (tipo === 'destino' && carga.destinatario_razao_social) {
      empresa = carga.destinatario_razao_social;
    } else {
      empresa = endereco.contato_nome || (tipo === 'origem' ? (filialAtiva?.nome || 'Remetente') : 'Destinatário');
    }
    
    return { empresa, cidade: `${endereco.cidade}/${endereco.estado}`, enderecoCompleto };
  };

  const getStatusBadge = (carga: CargaData) => {
    if (hasProblema(carga)) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Com Problemas</Badge>;
    }
    if (hasCancelada(carga)) {
      return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Cancelada</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Concluída</Badge>;
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

  // Stats - only for finalized cargas
  const finalizedCargas = useMemo(() => cargas.filter(c => allEntregasFinalized(c)), [cargas]);
  
  const stats = useMemo(() => ({
    total: finalizedCargas.length,
    entregues: finalizedCargas.filter(c => allDelivered(c)).length,
    canceladas: finalizedCargas.filter(c => hasCancelada(c)).length,
    comProblemas: finalizedCargas.filter(c => hasProblema(c)).length,
    pesoTotal: finalizedCargas.reduce((acc, c) => acc + c.peso_kg, 0),
    valorTotal: finalizedCargas.reduce((acc, c) => acc + (c.valor_mercadoria || 0), 0),
  }), [finalizedCargas]);

  const getTotalFrete = (carga: CargaData) => {
    return carga.entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages: (number | 'ellipsis')[] = [];
      
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push('ellipsis');
        
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) pages.push(i);
        
        if (currentPage < totalPages - 2) pages.push('ellipsis');
        pages.push(totalPages);
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCargas.length)} de {filteredCargas.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, idx) => 
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8">
      <TooltipProvider>
        <div className="space-y-6 p-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                Histórico de Cargas
              </h1>
              <p className="text-sm text-muted-foreground">
                Cargas com todas as entregas finalizadas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card 
              className={`bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'entregue' ? 'ring-2 ring-emerald-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'entregue' ? 'all' : 'entregue')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Entregues</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.entregues}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'cancelada' ? 'ring-2 ring-gray-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'cancelada' ? 'all' : 'cancelada')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-muted-foreground">Canceladas</span>
                </div>
                <p className="text-2xl font-bold text-gray-600">{stats.canceladas}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'problema' ? 'ring-2 ring-destructive' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'problema' ? 'all' : 'problema')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Problemas</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.comProblemas}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Weight className="w-4 h-4 text-sky-500" />
                  <span className="text-xs text-muted-foreground">Peso Total</span>
                </div>
                <p className="text-xl font-bold text-sky-600">{formatWeight(stats.pesoTotal)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Mercadoria</span>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.valorTotal)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Finalizadas</SelectItem>
                <SelectItem value="entregue">Entregues</SelectItem>
                <SelectItem value="devolvida">Com Devoluções</SelectItem>
                <SelectItem value="problema">Com Problemas</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSort('created_at')}>
                  Data de criação <SortIcon field="created_at" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('codigo')}>
                  Código <SortIcon field="codigo" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('peso_kg')}>
                  Peso <SortIcon field="peso_kg" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('valor_mercadoria')}>
                  Valor <SortIcon field="valor_mercadoria" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : paginatedCargas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma carga no histórico</h3>
                <p className="text-sm text-muted-foreground">
                  Cargas finalizadas aparecerão aqui
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => handleSort('codigo')}>
                          <div className="flex items-center">Código <SortIcon field="codigo" /></div>
                        </TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead className="text-right whitespace-nowrap cursor-pointer" onClick={() => handleSort('peso_kg')}>
                          <div className="flex items-center justify-end">Peso <SortIcon field="peso_kg" /></div>
                        </TableHead>
                        <TableHead className="text-right whitespace-nowrap cursor-pointer" onClick={() => handleSort('valor_mercadoria')}>
                          <div className="flex items-center justify-end">Mercadoria <SortIcon field="valor_mercadoria" /></div>
                        </TableHead>
                        <TableHead className="text-right">Frete Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCargas.map((carga) => {
                        const isExpanded = expandedRows.has(carga.id);
                        const origem = getEnderecoData(carga, 'origem');
                        const destino = getEnderecoData(carga, 'destino');
                        
                        return (
                          <>
                            <TableRow 
                              key={carga.id} 
                              className={`cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                              onClick={() => toggleRow(carga.id)}
                            >
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium text-nowrap">{carga.codigo}</TableCell>
                              <TableCell>
                                <div className="max-w-[200px] truncate" title={carga.descricao}>
                                  {carga.descricao}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-sm">
                                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="truncate max-w-[120px]">{origem.cidade}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-medium">{origem.empresa}</p>
                                    <p className="text-xs text-muted-foreground">{origem.enderecoCompleto}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-sm">
                                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                                      <span className="truncate max-w-[120px]">{destino.cidade}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="font-medium">{destino.empresa}</p>
                                    <p className="text-xs text-muted-foreground">{destino.enderecoCompleto}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatWeight(carga.peso_kg)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(carga.valor_mercadoria)}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-600">
                                {formatCurrency(getTotalFrete(carga))}
                              </TableCell>
                              <TableCell>{getStatusBadge(carga)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsCarga(carga);
                                    }}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded Row - Entregas */}
                            {isExpanded && carga.entregas.length > 0 && (
                              <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableCell colSpan={10} className="p-0">
                                  <div className="px-8 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Truck className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">Entregas ({carga.entregas.length})</span>
                                    </div>
                                    <div className="bg-background rounded-lg border overflow-hidden">
                                      <Table>
                                                        <TableHeader>
                                                          <TableRow className="bg-muted/30">
                                                            <TableHead className="text-xs">Motorista</TableHead>
                                                            <TableHead className="text-xs">Veículo</TableHead>
                                                            <TableHead className="text-xs text-right">Peso Alocado</TableHead>
                                                            <TableHead className="text-xs text-right">Valor Frete</TableHead>
                                                            <TableHead className="text-xs">Coletado em</TableHead>
                                                            <TableHead className="text-xs">Entregue em</TableHead>
                                                            <TableHead className="text-xs">Status</TableHead>
                                                            <TableHead className="text-xs">CT-e</TableHead>
                                                            <TableHead className="text-xs w-10"></TableHead>
                                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {carga.entregas.map((entrega) => {
                                            const statusConfig = statusEntregaConfig[entrega.status] || statusEntregaConfig.aguardando_coleta;
                                            const StatusIcon = statusConfig.icon;
                                            const isHighlighted = highlightedEntregaId === entrega.id;
                                            
                                            return (
                                              <TableRow 
                                                key={entrega.id} 
                                                className={`${isHighlighted ? 'bg-primary/10 animate-pulse' : ''}`}
                                              >
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm">
                                                      {entrega.motoristas?.nome_completo || '-'}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    <Truck className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm font-mono">
                                                      {entrega.veiculos?.placa || '-'}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                  {entrega.peso_alocado_kg ? formatWeight(entrega.peso_alocado_kg) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium text-emerald-600">
                                                  {formatCurrency(entrega.valor_frete)}
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-1 text-sm">
                                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                                    {formatDate(entrega.coletado_em)}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-1 text-sm">
                                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                                    {formatDate(entrega.entregue_em)}
                                                  </div>
                                                </TableCell>
                                                                <TableCell>
                                                                  <Badge className={`${statusConfig.color} text-xs`}>
                                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                                    {statusConfig.label}
                                                                  </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                  {entrega.cte_url ? (
                                                                    <Badge 
                                                                      className="bg-green-500/10 text-green-600 border-green-500/20 cursor-pointer gap-1 text-xs"
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCtePreviewUrl(entrega.cte_url);
                                                                        setCtePreviewOpen(true);
                                                                      }}
                                                                    >
                                                                      <FileText className="w-3 h-3" />
                                                                      CT-e
                                                                    </Badge>
                                                                  ) : (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
                                                                      <FileText className="w-3 h-3" />
                                                                      Sem CT-e
                                                                    </Badge>
                                                                  )}
                                                                </TableCell>
                                                                <TableCell>
                                                                  <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                      </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                      <DropdownMenuItem onClick={() => {
                                                                        setTrackingMapEntregaId(entrega.id);
                                                                        setTrackingMapInfo({
                                                                          motorista: entrega.motoristas?.nome_completo || 'Motorista',
                                                                          placa: entrega.veiculos?.placa || '-',
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
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {renderPagination()}
              </>
            )}
          </Card>
        </div>

        {/* Details Dialog */}
        <CargaDetailsDialog
          carga={detailsCarga}
          open={!!detailsCarga}
          onOpenChange={(open) => !open && setDetailsCarga(null)}
        />

        {/* CT-e Preview Dialog */}
        <FilePreviewDialog
          open={ctePreviewOpen}
          onOpenChange={setCtePreviewOpen}
          fileUrl={ctePreviewUrl}
          title="Visualizar CT-e"
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
    </div>
  );
}