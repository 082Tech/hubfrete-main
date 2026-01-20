import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
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
  Trash2,
} from 'lucide-react';
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
  status: string;
  coletado_em: string | null;
  entregue_em: string | null;
  motorista_id: string | null;
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
  status: string;
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
  // Additional fields for details
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
  aguardando_coleta: { label: 'Aguardando Coleta', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  em_coleta: { label: 'Em Coleta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  coletado: { label: 'Coletado', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Package },
  em_transito: { label: 'Em Trânsito', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Truck },
  em_entrega: { label: 'Em Entrega', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  devolvida: { label: 'Devolvida', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

// Filter options
type FilterStatus = 'all' | 'awaiting' | 'partial' | 'allocated' | 'all_delivered' | 'has_problems';
type SortField = 'created_at' | 'codigo' | 'peso_kg' | 'valor_mercadoria';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

export default function TodasCargas() {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cargaToDelete, setCargaToDelete] = useState<CargaData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle URL params for highlighting/expanding specific cargo and entrega
  useEffect(() => {
    const cargaId = searchParams.get('carga');
    const entregaId = searchParams.get('entrega');
    if (cargaId) {
      setExpandedRows(new Set([cargaId]));
      if (entregaId) {
        setHighlightedEntregaId(entregaId);
      }
      // Clear the URL params after processing
      setSearchParams({}, { replace: true });
      // Clear highlight after 5 seconds
      const timer = setTimeout(() => setHighlightedEntregaId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Fetch ALL cargas
  const { data: cargas = [], isLoading, refetch } = useQuery({
    queryKey: ['todas-cargas', filialAtiva?.id],
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
  const getPesoDisponivel = (carga: CargaData) => carga.peso_disponivel_kg ?? carga.peso_kg;
  
  const getPercentualAlocado = (carga: CargaData) => {
    const disponivel = getPesoDisponivel(carga);
    return ((carga.peso_kg - disponivel) / carga.peso_kg) * 100;
  };

  const allEntregasFinalized = (carga: CargaData) => {
    if (carga.entregas.length === 0) return false;
    return carga.entregas.every(e => ['entregue', 'devolvida', 'problema'].includes(e.status));
  };

  const hasProblems = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema' || e.status === 'devolvida');
  };

  // Apply filters
  const filteredCargas = useMemo(() => {
    let result = cargas.filter(carga => 
      carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (filterStatus) {
      case 'awaiting':
        result = result.filter(c => getPercentualAlocado(c) === 0);
        break;
      case 'partial':
        result = result.filter(c => {
          const p = getPercentualAlocado(c);
          return p > 0 && p < 100;
        });
        break;
      case 'allocated':
        result = result.filter(c => getPercentualAlocado(c) >= 100);
        break;
      case 'all_delivered':
        result = result.filter(c => allEntregasFinalized(c));
        break;
      case 'has_problems':
        result = result.filter(c => hasProblems(c));
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

  // Stats
  const stats = useMemo(() => ({
    total: cargas.length,
    aguardando: cargas.filter(c => getPercentualAlocado(c) === 0).length,
    parcial: cargas.filter(c => { const p = getPercentualAlocado(c); return p > 0 && p < 100; }).length,
    alocadas: cargas.filter(c => getPercentualAlocado(c) >= 100).length,
    concluidas: cargas.filter(c => allEntregasFinalized(c)).length,
    comProblemas: cargas.filter(c => hasProblems(c)).length,
    pesoTotal: cargas.reduce((acc, c) => acc + c.peso_kg, 0),
    valorTotal: cargas.reduce((acc, c) => acc + (c.valor_mercadoria || 0), 0),
  }), [cargas]);

  // Calculate total freight from all deliveries
  const getTotalFrete = (carga: CargaData) => {
    return carga.entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);
  };

  // Handle delete cargo
  const handleDeleteCarga = async () => {
    if (!cargaToDelete) return;
    
    setIsDeleting(true);
    try {
      // Collect address IDs to delete after cargo deletion
      const addressIdsToDelete: string[] = [];
      if (cargaToDelete.endereco_origem?.id) {
        addressIdsToDelete.push(cargaToDelete.endereco_origem.id);
      }
      if (cargaToDelete.endereco_destino?.id) {
        addressIdsToDelete.push(cargaToDelete.endereco_destino.id);
      }

      // First, unlink addresses from the cargo (set to null) to avoid FK constraint
      const { error: unlinkError } = await supabase
        .from('cargas')
        .update({ endereco_origem_id: null, endereco_destino_id: null })
        .eq('id', cargaToDelete.id);

      if (unlinkError) {
        console.error('Erro ao desvincular endereços:', unlinkError);
        throw unlinkError;
      }

      // Then delete the cargo
      const { error: deleteCargoError } = await supabase
        .from('cargas')
        .delete()
        .eq('id', cargaToDelete.id);

      if (deleteCargoError) throw deleteCargoError;

      // Finally, delete the orphaned addresses
      if (addressIdsToDelete.length > 0) {
        const { error: addressError } = await supabase
          .from('enderecos_carga')
          .delete()
          .in('id', addressIdsToDelete);

        if (addressError) {
          console.error('Erro ao excluir endereços (não crítico):', addressError);
        }
      }

      toast.success('Carga excluída com sucesso!');
      refetch();
    } catch (error) {
      console.error('Erro ao excluir carga:', error);
      toast.error('Erro ao excluir carga');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCargaToDelete(null);
    }
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
    <PortalLayout expectedUserType="embarcador">
      <TooltipProvider>
        <div className="space-y-6 p-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Todas as Cargas
              </h1>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todas as suas cargas
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
              <NovaCargaDialog onSuccess={refetch} />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Card 
              className={`bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'awaiting' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'awaiting' ? 'all' : 'awaiting')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Aguardando</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats.aguardando}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'partial' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'partial' ? 'all' : 'partial')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Parcial</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.parcial}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'allocated' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'allocated' ? 'all' : 'allocated')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Alocadas</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.alocadas}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'all_delivered' ? 'ring-2 ring-emerald-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'all_delivered' ? 'all' : 'all_delivered')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Concluídas</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.concluidas}</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'has_problems' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'has_problems' ? 'all' : 'has_problems')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Problemas</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.comProblemas}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Weight className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Peso Total</span>
                </div>
                <p className="text-xl font-bold text-blue-600">{formatWeight(stats.pesoTotal)}</p>
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
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="awaiting">Aguardando Alocação</SelectItem>
                <SelectItem value="partial">Parcialmente Alocadas</SelectItem>
                <SelectItem value="allocated">Totalmente Alocadas</SelectItem>
                <SelectItem value="all_delivered">Todas Entregas Concluídas</SelectItem>
                <SelectItem value="has_problems">Com Problemas</SelectItem>
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
                  Data de Criação {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('codigo')}>
                  Código {sortField === 'codigo' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('peso_kg')}>
                  Peso {sortField === 'peso_kg' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('valor_mercadoria')}>
                  Valor Mercadoria {sortField === 'valor_mercadoria' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {filterStatus !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')}>
                Limpar filtros
              </Button>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredCargas.length} {filteredCargas.length === 1 ? 'carga' : 'cargas'}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : paginatedCargas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma carga encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filterStatus !== 'all' ? 'Tente ajustar os filtros' : 'Crie sua primeira carga'}
                  </p>
                  <NovaCargaDialog onSuccess={refetch} />
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-semibold min-w-[130px] cursor-pointer" onClick={() => handleSort('codigo')}>
                          <div className="flex items-center">
                            Código
                            <SortIcon field="codigo" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[160px]">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Remetente
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[160px]">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Destinatário
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[90px] cursor-pointer text-center" onClick={() => handleSort('peso_kg')}>
                          <div className="flex items-center justify-center">
                            Peso
                            <SortIcon field="peso_kg" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[90px] text-center">Disponível</TableHead>
                        <TableHead className="font-semibold min-w-[130px]">Progresso</TableHead>
                        <TableHead className="font-semibold min-w-[110px] cursor-pointer" onClick={() => handleSort('valor_mercadoria')}>
                          <div className="flex items-center">
                            Mercadoria
                            <SortIcon field="valor_mercadoria" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[100px]">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Frete
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[90px] text-center">Entregas</TableHead>
                        <TableHead className="font-semibold min-w-[110px]">Status</TableHead>
                        <TableHead className="font-semibold w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCargas.map((carga) => {
                        const isExpanded = expandedRows.has(carga.id);
                        const percentual = getPercentualAlocado(carga);
                        const origem = getEnderecoData(carga, 'origem');
                        const destino = getEnderecoData(carga, 'destino');
                        const hasEntregas = carga.entregas.length > 0;
                        
                        return (
                          <>
                            {/* Main Row */}
                            <TableRow 
                              key={carga.id}
                              className={`hover:bg-muted/50 ${hasEntregas ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                              onClick={() => hasEntregas && toggleRow(carga.id)}
                            >
                              <TableCell className="p-2">
                                {hasEntregas && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRow(carga.id);
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-primary" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-primary">{carga.codigo}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {carga.descricao}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-green-500 shrink-0" />
                                        <p className="font-medium text-sm truncate max-w-[130px]">{origem.empresa}</p>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate max-w-[130px]">
                                        {origem.cidade}
                                      </p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="font-medium">{origem.empresa}</p>
                                    <p className="text-xs text-muted-foreground">{origem.enderecoCompleto}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                        <p className="font-medium text-sm truncate max-w-[130px]">{destino.empresa}</p>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate max-w-[130px]">
                                        {destino.cidade}
                                      </p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="font-medium">{destino.empresa}</p>
                                    <p className="text-xs text-muted-foreground">{destino.enderecoCompleto}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{formatWeight(carga.peso_kg)}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-medium ${getPesoDisponivel(carga) === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                  {formatWeight(getPesoDisponivel(carga))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="w-28">
                                  <Progress value={percentual} className="h-2" />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {percentual.toFixed(0)}% alocado
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-sm">
                                  {formatCurrency(carga.valor_mercadoria)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-sm text-green-600">
                                  {getTotalFrete(carga) > 0 ? formatCurrency(getTotalFrete(carga)) : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {carga.entregas.length} {carga.entregas.length === 1 ? 'entrega' : 'entregas'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(carga)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
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
                                    {carga.entregas.length === 0 && (
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCargaToDelete(carga);
                                          setDeleteDialogOpen(true);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>

                            {/* Expanded Child Rows (Entregas) */}
                            {isExpanded && carga.entregas.map((entrega, idx) => {
                              const config = statusEntregaConfig[entrega.status] || statusEntregaConfig.aguardando_coleta;
                              const StatusIcon = config.icon;
                              const isEntregaHighlighted = highlightedEntregaId === entrega.id;
                              
                              return (
                                <TableRow 
                                  key={`${carga.id}-entrega-${entrega.id}`}
                                  className={`bg-muted/30 hover:bg-muted/50 border-l-2 border-l-primary/50 ${isEntregaHighlighted ? 'ring-2 ring-primary ring-inset bg-primary/20 animate-pulse' : ''}`}
                                >
                                  <TableCell className="p-2">
                                    <div className="ml-3 w-0.5 h-4 bg-primary/30" />
                                  </TableCell>
                                  <TableCell colSpan={2}>
                                    <div className="flex items-center gap-3 pl-2">
                                      <Badge className={`${config.color} border gap-1 shrink-0`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {config.label}
                                      </Badge>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm truncate">
                                          {entrega.motoristas?.nome_completo || 'Sem motorista'}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {entrega.veiculos && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-mono">{entrega.veiculos.placa}</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell colSpan={2} className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span className="font-medium">{formatWeight(entrega.peso_alocado_kg || 0)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell colSpan={2}>
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="w-3.5 h-3.5 text-green-600" />
                                      <span className="font-medium text-green-600">{formatCurrency(entrega.valor_frete)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {entrega.entregue_em && (
                                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(entrega.entregue_em)}</span>
                                      </div>
                                    )}
                                    {entrega.coletado_em && !entrega.entregue_em && (
                                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>Coletado: {formatDate(entrega.coletado_em)}</span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsCarga(carga);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      Detalhes
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}

              {/* Pagination */}
              {renderPagination()}
            </CardContent>
          </Card>
        </div>

        {detailsCarga && (
          <CargaDetailsDialog
            carga={{
              id: detailsCarga.id,
              codigo: detailsCarga.codigo,
              descricao: detailsCarga.descricao,
              tipo: detailsCarga.tipo,
              peso_kg: detailsCarga.peso_kg,
              volume_m3: detailsCarga.volume_m3,
              valor_mercadoria: detailsCarga.valor_mercadoria,
              valor_frete_tonelada: detailsCarga.valor_frete_tonelada,
              status: detailsCarga.status as any,
              data_coleta_de: detailsCarga.data_coleta_de,
              data_coleta_ate: detailsCarga.data_coleta_ate,
              data_entrega_limite: detailsCarga.data_entrega_limite,
              created_at: detailsCarga.created_at,
              // Características especiais
              carga_fragil: detailsCarga.carga_fragil,
              carga_perigosa: detailsCarga.carga_perigosa,
              carga_viva: detailsCarga.carga_viva,
              empilhavel: detailsCarga.empilhavel,
              requer_refrigeracao: detailsCarga.requer_refrigeracao,
              temperatura_min: detailsCarga.temperatura_min,
              temperatura_max: detailsCarga.temperatura_max,
              numero_onu: detailsCarga.numero_onu,
              // Novos campos
              necessidades_especiais: detailsCarga.necessidades_especiais,
              regras_carregamento: detailsCarga.regras_carregamento,
              nota_fiscal_url: detailsCarga.nota_fiscal_url,
              veiculo_requisitos: detailsCarga.veiculo_requisitos,
              remetente: detailsCarga.endereco_origem ? {
                nome: detailsCarga.endereco_origem.contato_nome || detailsCarga.endereco_origem.cidade,
                cidade: detailsCarga.endereco_origem.cidade,
                estado: detailsCarga.endereco_origem.estado,
                endereco: `${detailsCarga.endereco_origem.logradouro}${detailsCarga.endereco_origem.numero ? `, ${detailsCarga.endereco_origem.numero}` : ''}`,
                contato_nome: detailsCarga.endereco_origem.contato_nome,
                contato_telefone: detailsCarga.endereco_origem.contato_telefone,
              } : null,
              destinatario: detailsCarga.endereco_destino ? {
                nome: detailsCarga.destinatario_nome_fantasia || detailsCarga.destinatario_razao_social || detailsCarga.endereco_destino.contato_nome || detailsCarga.endereco_destino.cidade,
                cidade: detailsCarga.endereco_destino.cidade,
                estado: detailsCarga.endereco_destino.estado,
                endereco: `${detailsCarga.endereco_destino.logradouro}${detailsCarga.endereco_destino.numero ? `, ${detailsCarga.endereco_destino.numero}` : ''}`,
                contato_nome: detailsCarga.endereco_destino.contato_nome,
                contato_telefone: detailsCarga.endereco_destino.contato_telefone,
              } : null,
              entregas: detailsCarga.entregas?.map(e => ({
                id: e.id,
                status: e.status as any,
                peso_alocado_kg: e.peso_alocado_kg,
                valor_frete: e.valor_frete,
                coletado_em: e.coletado_em,
                entregue_em: e.entregue_em,
                motoristas: e.motoristas,
                veiculos: e.veiculos,
              })) || [],
            }}
            open={!!detailsCarga}
            onOpenChange={(open) => !open && setDetailsCarga(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Carga</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a carga <strong>{cargaToDelete?.codigo}</strong>?
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCarga}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </PortalLayout>
  );
}
