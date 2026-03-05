import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/hooks/useUserContext';
import { useRemainingViewportHeight } from '@/hooks/useRemainingViewportHeight';
// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
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
  Plus,
  FileText,
  Pencil,
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
  codigo: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  status: string;
  coletado_em: string | null;
  entregue_em: string | null;
  created_at: string | null;
  previsao_coleta: string | null;
  motorista_id: string | null;
  cte_url: string | null;
  manifesto_url: string | null;
  canhoto_url: string | null;
  notas_fiscais_urls: string[] | null;
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
  expira_em: string;
  // Remetente fields
  remetente_razao_social: string | null;
  remetente_nome_fantasia: string | null;
  remetente_cnpj: string | null;
  // Destinatario fields
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

// Status config for entregas (simplified status enum)
const statusEntregaConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  saiu_para_coleta: { label: 'Saiu para Coleta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  saiu_para_entrega: { label: 'Em Rota', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  entregue: { label: 'Concluída', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  cancelada: { label: 'Cancelada', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
};

// Filter options - only non-finalized states for Publicadas
type FilterStatus = 'all' | 'awaiting' | 'partial' | 'allocated';
type SortField = 'created_at' | 'codigo' | 'peso_kg' | 'valor_mercadoria';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

export default function CargasPublicadas() {
  const { filialAtiva } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsCarga, setDetailsCarga] = useState<CargaData | null>(null);
  const [detailsEntrega, setDetailsEntrega] = useState<{ entrega: EntregaData; carga: CargaData } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedEntregaId, setHighlightedEntregaId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cargaToDelete, setCargaToDelete] = useState<CargaData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const { ref: tableContainerRef, height: tableHeight } = useRemainingViewportHeight<HTMLDivElement>({
    bottomOffset: 32,
    minHeight: 320,
  });

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
          tipo_precificacao,
          expira_em,
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
          remetente_cnpj,
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
            codigo,
            peso_alocado_kg,
            valor_frete,
            status,
            coletado_em,
            entregue_em,
            previsao_coleta,
            created_at,
            motorista_id,
            cte_url,
            manifesto_url,
            canhoto_url,
            notas_fiscais_urls,
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
          )
        `)
        .eq('filial_id', filialAtiva.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
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
    // Cargas without deliveries should remain visible (not finalized)
    if (carga.entregas.length === 0) return false;
    // Use simplified status enum: entregue, cancelada, problema are finalized
    return carga.entregas.every(e => ['entregue', 'cancelada', 'problema'].includes(e.status));
  };

  const hasProblems = (carga: CargaData) => {
    return carga.entregas.some(e => e.status === 'problema' || e.status === 'cancelada');
  };

  // Apply filters - ONLY show non-finalized cargas (Publicadas view)
  const filteredCargas = useMemo(() => {
    // First, filter out all finalized cargas - this page only shows active ones
    let result = cargas.filter(carga => !allEntregasFinalized(carga));

    // Apply search
    result = result.filter(carga =>
      carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      carga.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
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
    if (tipo === 'origem') {
      // Use remetente fields for origin
      empresa = carga.remetente_nome_fantasia || carga.remetente_razao_social || endereco.contato_nome || 'Remetente';
    } else {
      // Use destinatario fields for destination
      empresa = carga.destinatario_nome_fantasia || carga.destinatario_razao_social || endereco.contato_nome || 'Destinatário';
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

  // Calculate total freight from all deliveries
  const getTotalFrete = (carga: CargaData) => {
    return carga.entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);
  };

  // Calculate estimated total freight based on pricing type
  const getFreteEstimado = (carga: CargaData) => {
    const tp = carga.tipo_precificacao || 'por_tonelada';
    switch (tp) {
      case 'por_tonelada': return carga.valor_frete_tonelada ? (carga.peso_kg / 1000) * carga.valor_frete_tonelada : null;
      case 'por_m3': return carga.valor_frete_m3 && carga.volume_m3 ? carga.volume_m3 * carga.valor_frete_m3 : null;
      case 'fixo': return carga.valor_frete_fixo || null;
      case 'por_km': return null; // cannot estimate without distance
      default: return null;
    }
  };

  // Stats - only for non-finalized cargas
  const activeCargas = useMemo(() => cargas.filter(c => !allEntregasFinalized(c)), [cargas]);

  const stats = useMemo(() => {
    const freteEstimadoTotal = activeCargas.reduce((acc, c) => {
      const est = getFreteEstimado(c);
      return acc + (est || 0);
    }, 0);
    const freteAlocadoTotal = activeCargas.reduce((acc, c) => acc + getTotalFrete(c), 0);

    return {
      total: activeCargas.length,
      aguardando: activeCargas.filter(c => getPercentualAlocado(c) === 0).length,
      parcial: activeCargas.filter(c => { const p = getPercentualAlocado(c); return p > 0 && p < 100; }).length,
      alocadas: activeCargas.filter(c => getPercentualAlocado(c) >= 100).length,
      pesoTotal: activeCargas.reduce((acc, c) => acc + c.peso_kg, 0),
      valorTotal: activeCargas.reduce((acc, c) => acc + (c.valor_mercadoria || 0), 0),
      freteEstimadoTotal,
      freteAlocadoTotal,
    };
  }, [activeCargas, getTotalFrete]);

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

      // Step 1: Unlink addresses from the cargo (set endereco_origem_id and endereco_destino_id to null)
      const { error: unlinkError } = await supabase
        .from('cargas')
        .update({ endereco_origem_id: null, endereco_destino_id: null })
        .eq('id', cargaToDelete.id);

      if (unlinkError) {
        console.error('Erro ao desvincular endereços da carga:', unlinkError);
        throw unlinkError;
      }

      // Step 2: Clear carga_id in addresses (to avoid FK constraint on enderecos_carga)
      if (addressIdsToDelete.length > 0) {
        const { error: clearCargaIdError } = await supabase
          .from('enderecos_carga')
          .update({ carga_id: null })
          .in('id', addressIdsToDelete);

        if (clearCargaIdError) {
          console.error('Erro ao limpar carga_id dos endereços:', clearCargaIdError);
          throw clearCargaIdError;
        }
      }

      // Step 3: Delete the cargo (entregas will be deleted via CASCADE)
      const { error: deleteCargoError } = await supabase
        .from('cargas')
        .delete()
        .eq('id', cargaToDelete.id);

      if (deleteCargoError) throw deleteCargoError;

      // Step 4: Delete the orphaned addresses
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
    <div className="flex flex-col h-full p-4 md:p-8">
      <TooltipProvider>
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-6 h-6 text-primary" />
                Ofertas de Cargas Publicadas
              </h1>
              <p className="text-sm text-muted-foreground">
                Ofertas ativas aguardando ou em processo de alocação
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
              <NovaCargaDialog onSuccess={() => refetch()}>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Carga
                </Button>
              </NovaCargaDialog>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card
              className={`bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'all' ? 'ring-2 ring-primary ring-inset' : ''}`}
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
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'awaiting' ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'awaiting' ? 'all' : 'awaiting')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Aguardando</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.aguardando}</p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'partial' ? 'ring-2 ring-sky-500 ring-inset' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'partial' ? 'all' : 'partial')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                  <span className="text-xs text-muted-foreground">Parcial</span>
                </div>
                <p className="text-2xl font-bold text-sky-600">{stats.parcial}</p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'allocated' ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'allocated' ? 'all' : 'allocated')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Alocadas</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.alocadas}</p>
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

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Frete Total</span>
                </div>
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats.freteEstimadoTotal)}</p>
                {stats.freteAlocadoTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Alocado: {formatCurrency(stats.freteAlocadoTotal)}
                  </p>
                )}
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
                <SelectItem value="all">Todas Publicadas</SelectItem>
                <SelectItem value="awaiting">Aguardando Alocação</SelectItem>
                <SelectItem value="partial">Parcialmente Alocadas</SelectItem>
                <SelectItem value="allocated">Totalmente Alocadas</SelectItem>
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

          {/* Table with fixed height and sticky header */}
          <Card ref={tableContainerRef} className="flex-1 flex flex-col overflow-hidden" style={{ height: tableHeight }}>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 flex-1">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : paginatedCargas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                  <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma carga encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filterStatus !== 'all' ? 'Tente ajustar os filtros' : 'Crie sua primeira carga'}
                  </p>
                  <Button className="gap-2" onClick={() => navigate('/embarcador/ofertas/nova')}>
                    <Plus className="w-4 h-4" />
                    Nova Carga
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <tr className="border-b">
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground w-10"></th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[130px] cursor-pointer" onClick={() => handleSort('codigo')}>
                            <div className="flex items-center">
                              Código
                              <SortIcon field="codigo" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[160px]">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Remetente
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[160px]">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Destinatário
                            </div>
                          </th>
                          <th className="h-12 px-4 text-center align-middle font-semibold text-foreground min-w-[90px] cursor-pointer" onClick={() => handleSort('peso_kg')}>
                            <div className="flex items-center justify-center">
                              Peso
                              <SortIcon field="peso_kg" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-center align-middle font-semibold text-foreground min-w-[90px]">Disponível</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[130px]">Progresso</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[110px] cursor-pointer" onClick={() => handleSort('valor_mercadoria')}>
                            <div className="flex items-center">
                              Mercadoria
                              <SortIcon field="valor_mercadoria" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[100px]">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Frete
                            </div>
                          </th>
                          <th className="h-12 px-4 text-center align-middle font-semibold text-foreground min-w-[90px]">Cargas</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[110px]">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCargas.map((carga) => {
                          const isExpanded = expandedRows.has(carga.id);
                          const percentual = getPercentualAlocado(carga);
                          const origem = getEnderecoData(carga, 'origem');
                          const destino = getEnderecoData(carga, 'destino');
                          const hasEntregas = carga.entregas.length > 0;

                          return (
                            <React.Fragment key={carga.id}>
                              {/* Main Row */}
                              <tr
                                key={carga.id}
                                className={`border-b transition-colors hover:bg-muted/50 ${hasEntregas ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                                onClick={() => hasEntregas && toggleRow(carga.id)}
                              >
                                <td className="p-2 align-middle">
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
                                </td>
                                <td className="p-4 align-middle">
                                  <div>
                                    <p className="font-medium text-primary text-nowrap">{carga.codigo}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                      {carga.descricao}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium bg-muted/40 w-max px-1.5 py-0.5 rounded-sm">
                                      <Calendar className="w-3 h-3 text-muted-foreground" />
                                      Expira: {formatDate(carga.expira_em)}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-4 align-middle">
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
                                </td>
                                <td className="p-4 align-middle">
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
                                </td>
                                <td className="p-4 align-middle text-center">
                                  <span className="font-medium">{formatWeight(carga.peso_kg)}</span>
                                </td>
                                <td className="p-4 align-middle text-center">
                                  <span className={`font-medium ${getPesoDisponivel(carga) === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                    {formatWeight(getPesoDisponivel(carga))}
                                  </span>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="w-28">
                                    <Progress value={percentual} className="h-2" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {percentual.toFixed(0)}% alocado
                                    </p>
                                  </div>
                                </td>
                                <td className="p-4 align-middle">
                                  <span className="font-medium text-sm">
                                    {formatCurrency(carga.valor_mercadoria)}
                                  </span>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm text-green-600">
                                      {formatCurrency(getFreteEstimado(carga))}
                                    </span>
                                    {getTotalFrete(carga) > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Alocado: {formatCurrency(getTotalFrete(carga))}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 align-middle text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {carga.entregas.length} {carga.entregas.length === 1 ? 'carga' : 'cargas'}
                                  </Badge>
                                </td>
                                <td className="p-4 align-middle">
                                  {getStatusBadge(carga)}
                                </td>
                                <td className="p-4 align-middle">
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
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/embarcador/ofertas/editar/${carga.id}`);
                                        }}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                      )}
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
                                </td>
                              </tr>

                              {/* Expanded Row - Entregas com subtabela */}
                              {isExpanded && carga.entregas.length > 0 && (
                                <tr className="bg-muted/20 hover:bg-muted/20">
                                  <td colSpan={12} className="p-0">
                                    <div className="px-8 py-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Truck className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Cargas ({carga.entregas.length})</span>
                                      </div>
                                      <div className="bg-background rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b bg-muted/30">
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Código</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Motorista</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Veículo</th>
                                              <th className="h-10 px-4 text-right align-middle font-medium text-xs">Peso Alocado</th>
                                              <th className="h-10 px-4 text-right align-middle font-medium text-xs">Valor Frete</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">N° CT-e</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Docs</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Coletado em</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Status</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs w-10"></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {carga.entregas.map((entrega, idx) => {
                                              const statusConfig = statusEntregaConfig[entrega.status] || statusEntregaConfig.aguardando;
                                              const StatusIcon = statusConfig.icon;
                                              const isHighlighted = highlightedEntregaId === entrega.id;

                                              // Document count logic
                                              const hasCte = !!entrega.cte_url;
                                              const hasManifesto = !!entrega.manifesto_url;
                                              const hasCanhoto = !!entrega.canhoto_url;
                                              const hasNf = entrega.notas_fiscais_urls && entrega.notas_fiscais_urls.length > 0;
                                              const docCount = [hasCte, hasManifesto, hasCanhoto, hasNf].filter(Boolean).length;
                                              const missingCritical = !hasCte || !hasManifesto;

                                              return (
                                                <tr
                                                  key={entrega.id}
                                                  className={`border-b last:border-0 ${isHighlighted ? 'bg-primary/10 animate-pulse' : ''}`}
                                                >
                                                  <td className="p-4 align-middle font-mono text-sm font-medium text-primary text-nowrap">
                                                    {entrega.codigo || `${carga.codigo}-E${String(idx + 1).padStart(2, '0')}`}
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                      <User className="w-3 h-3 text-muted-foreground" />
                                                      <span className="text-sm">
                                                        {entrega.motoristas?.nome_completo || '-'}
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                      <Truck className="w-3 h-3 text-muted-foreground" />
                                                      <span className="text-sm font-mono">
                                                        {entrega.veiculos?.placa || '-'}
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="p-4 align-middle text-right text-sm font-medium">
                                                    {entrega.peso_alocado_kg ? formatWeight(entrega.peso_alocado_kg) : '-'}
                                                  </td>
                                                  <td className="p-4 align-middle text-right text-sm font-medium text-green-600">
                                                    {formatCurrency(entrega.valor_frete)}
                                                  </td>
                                                  <td className="p-4 align-middle text-sm font-mono">
                                                    {entrega.numero_cte || '-'}
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className={`h-7 px-2 gap-1 ${missingCritical ? 'text-amber-600' : 'text-emerald-600'}`}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailsEntrega({ entrega, carga });
                                                      }}
                                                    >
                                                      <FileText className="w-3 h-3" />
                                                      <span className="text-xs">{docCount}/4</span>
                                                      {missingCritical && <AlertCircle className="w-3 h-3" />}
                                                    </Button>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-1 text-sm">
                                                      <Calendar className="w-3 h-3 text-muted-foreground" />
                                                      {formatDate(entrega.coletado_em)}
                                                    </div>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <Badge className={`${statusConfig.color} text-xs`}>
                                                      <StatusIcon className="w-3 h-3 mr-1" />
                                                      {statusConfig.label}
                                                    </Badge>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                          <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                          setDetailsEntrega({ entrega, carga });
                                                        }}>
                                                          <Eye className="w-4 h-4 mr-2" />
                                                          Ver detalhes
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {renderPagination()}
                </>
              )}
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
              tipo_precificacao: detailsCarga.tipo_precificacao,
              valor_frete_m3: detailsCarga.valor_frete_m3,
              valor_frete_fixo: detailsCarga.valor_frete_fixo,
              valor_frete_km: detailsCarga.valor_frete_km,
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

        {/* Entrega Details Dialog */}
        {detailsEntrega && (
          <EntregaDetailsDialog
            entrega={{
              id: detailsEntrega.entrega.id,
              status: detailsEntrega.entrega.status as any,
              created_at: detailsEntrega.entrega.created_at,
              coletado_em: detailsEntrega.entrega.coletado_em,
              entregue_em: detailsEntrega.entrega.entregue_em,
              peso_alocado_kg: detailsEntrega.entrega.peso_alocado_kg,
              valor_frete: detailsEntrega.entrega.valor_frete,
              previsao_coleta: detailsEntrega.entrega.previsao_coleta,
              motorista: detailsEntrega.entrega.motoristas ? {
                id: detailsEntrega.entrega.motoristas.id,
                nome_completo: detailsEntrega.entrega.motoristas.nome_completo,
                telefone: detailsEntrega.entrega.motoristas.telefone,
                email: detailsEntrega.entrega.motoristas.email,
                foto_url: detailsEntrega.entrega.motoristas.foto_url,
              } : null,
              veiculo: detailsEntrega.entrega.veiculos ? {
                id: detailsEntrega.entrega.veiculos.id,
                placa: detailsEntrega.entrega.veiculos.placa,
                tipo: detailsEntrega.entrega.veiculos.tipo,
              } : null,
              carga: {
                id: detailsEntrega.carga.id,
                codigo: detailsEntrega.entrega.codigo || detailsEntrega.carga.codigo,
                descricao: detailsEntrega.carga.descricao,
                peso_kg: detailsEntrega.carga.peso_kg,
                tipo: detailsEntrega.carga.tipo,
                data_entrega_limite: detailsEntrega.carga.data_entrega_limite,
                destinatario_nome_fantasia: detailsEntrega.carga.destinatario_nome_fantasia,
                destinatario_razao_social: detailsEntrega.carga.destinatario_razao_social,
                endereco_origem: detailsEntrega.carga.endereco_origem ? {
                  cidade: detailsEntrega.carga.endereco_origem.cidade,
                  estado: detailsEntrega.carga.endereco_origem.estado,
                  logradouro: detailsEntrega.carga.endereco_origem.logradouro,
                  latitude: detailsEntrega.carga.endereco_origem.latitude,
                  longitude: detailsEntrega.carga.endereco_origem.longitude,
                } : null,
                endereco_destino: detailsEntrega.carga.endereco_destino ? {
                  cidade: detailsEntrega.carga.endereco_destino.cidade,
                  estado: detailsEntrega.carga.endereco_destino.estado,
                  logradouro: detailsEntrega.carga.endereco_destino.logradouro,
                  latitude: detailsEntrega.carga.endereco_destino.latitude,
                  longitude: detailsEntrega.carga.endereco_destino.longitude,
                } : null,
                empresa: {
                  nome: filialAtiva?.nome || null,
                },
              },
            }}
            open={!!detailsEntrega}
            onOpenChange={(open) => !open && setDetailsEntrega(null)}
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
    </div>
  );
}
