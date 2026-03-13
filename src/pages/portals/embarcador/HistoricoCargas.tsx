import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { EntregaDocsDialog } from '@/components/entregas/EntregaDocsDialog';
import { ChatSheet } from '@/components/mensagens/ChatSheet';

import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';

import { AdvancedFiltersPopover, type AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
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
  AlertTriangle,
  ArrowRightLeft,
  Info,
  MessageCircle,
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
  codigo: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  status: StatusEntrega;
  coletado_em: string | null;
  entregue_em: string | null;
  motorista_id: string | null;
  canhoto_url: string | null;
  outros_documentos: any[] | null;
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
  tipo_precificacao: string | null;
  valor_frete_m3: number | null;
  valor_frete_fixo: number | null;
  valor_frete_km: number | null;
  numero_pedido: string | null;
  status: StatusCarga;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  data_entrega_limite: string | null;
  created_at: string;
  remetente_razao_social: string | null;
  remetente_nome_fantasia: string | null;
  remetente_cnpj: string | null;
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
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ArrowRightLeft },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Truck },
  entregue: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: RotateCcw },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  parcialmente_finalizada: { label: 'Finalizada (Parcial)', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: CheckCircle2 },
};

// Filter options for Histórico - only finalized states
type FilterStatus = 'all' | 'entregue' | 'cancelada' | 'problema';
type SortField = 'created_at' | 'codigo' | 'peso_kg' | 'frete_total';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

export default function HistoricoCargas() {
  const { filialAtiva, empresa } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailsCarga, setDetailsCarga] = useState<CargaData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedEntregaId, setHighlightedEntregaId] = useState<string | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});

  // Entrega details dialog
  const [entregaDetailsOpen, setEntregaDetailsOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaData | null>(null);
  const [selectedEntregaCarga, setSelectedEntregaCarga] = useState<CargaData | null>(null);

  // Docs dialog
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [docsEntregaId, setDocsEntregaId] = useState<string | null>(null);
  const [docsEntregaCodigo, setDocsEntregaCodigo] = useState<string | null>(null);
  const [docsEntregaCanhoto, setDocsEntregaCanhoto] = useState<string | null>(null);
  const [docsEntregaOutros, setDocsEntregaOutros] = useState<any[]>([]);

  // Chat sheet state
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [chatEntregaId, setChatEntregaId] = useState<string | null>(null);


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
          tipo_precificacao,
          valor_frete_m3,
          valor_frete_fixo,
          valor_frete_km,
          numero_pedido,
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
            motorista_id,
            canhoto_url,
            outros_documentos,
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
    // Se a carga for explicitamente finalizada parcialmente pelo Cron (expirou) 
    // ELA VAI PRO HISTÓRICO mesmo que não tenha 100% das entregas ativas finalizadas. 
    // OBS: O Cron job agora OBRIGA que não haja entregas ativas para ela assumir este status.
    if (carga.status === 'parcialmente_finalizada') return true;

    if (carga.entregas.length === 0) return false;
    return carga.entregas.every(e => ['entregue', 'cancelada', 'problema'].includes(e.status));
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

  const getTotalFrete = (carga: CargaData) => {
    return carga.entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);
  };

  // Apply filters - ONLY show finalized cargas (Histórico view)
  const filteredCargas = useMemo(() => {
    // First, filter to only show finalized cargas
    let result = cargas.filter(carga => allEntregasFinalized(carga));

    // Apply advanced filters
    if (advancedFilters.codigo) {
      const q = advancedFilters.codigo.toLowerCase();
      result = result.filter(carga =>
        carga.codigo.toLowerCase().includes(q) ||
        carga.descricao.toLowerCase().includes(q)
      );
    }

    if (advancedFilters.destinatario) {
      const q = advancedFilters.destinatario.toLowerCase();
      result = result.filter(carga =>
        (carga.destinatario_nome_fantasia || '').toLowerCase().includes(q) ||
        (carga.destinatario_razao_social || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.motorista) {
      const q = advancedFilters.motorista.toLowerCase();
      result = result.filter(carga =>
        carga.entregas.some(e =>
          e.motoristas?.nome_completo?.toLowerCase().includes(q)
        )
      );
    }

    if (advancedFilters.cidadeOrigem) {
      const q = advancedFilters.cidadeOrigem.toLowerCase();
      result = result.filter(carga =>
        carga.endereco_origem?.cidade?.toLowerCase().includes(q)
      );
    }

    if (advancedFilters.cidadeDestino) {
      const q = advancedFilters.cidadeDestino.toLowerCase();
      result = result.filter(carga =>
        carga.endereco_destino?.cidade?.toLowerCase().includes(q)
      );
    }

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

    // Apply date filters from advanced filters
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(c => {
        const cargaDate = new Date(c.created_at);
        return cargaDate >= fromDate;
      });
    }

    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(c => {
        const cargaDate = new Date(c.created_at);
        return cargaDate <= toDate;
      });
    }

    // Sort
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
        case 'frete_total':
          comparison = getTotalFrete(a) - getTotalFrete(b);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cargas, advancedFilters, filterStatus, sortField, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, advancedFilters, sortField, sortOrder]);

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
      empresa = carga.remetente_nome_fantasia || carga.remetente_razao_social || endereco.contato_nome || 'Remetente';
    } else {
      empresa = carga.destinatario_nome_fantasia || carga.destinatario_razao_social || endereco.contato_nome || 'Destinatário';
    }

    return { empresa, cidade: `${endereco.cidade}/${endereco.estado}`, enderecoCompleto };
  };

  const getStatusBadge = (carga: CargaData) => {
    if (carga.status === 'parcialmente_finalizada') {
      return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Finalizada (Parcial)</Badge>;
    }
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

  // Count documents for an entrega
  const getDocsCount = (entrega: EntregaData) => {
    let count = 0;
    if (entrega.canhoto_url) count++;
    return count;
  };

  const hasMissingCriticalDocs = (_entrega: EntregaData) => {
    // CT-e and NF-e now checked via separate tables
    return false;
  };

  const handleOpenEntregaDetails = (entrega: EntregaData, carga: CargaData) => {
    setSelectedEntrega(entrega);
    setSelectedEntregaCarga(carga);
    setEntregaDetailsOpen(true);
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
    freteTotal: finalizedCargas.reduce((acc, c) => acc + getTotalFrete(c), 0),
  }), [finalizedCargas]);

  // Get unique motoristas for filter dropdown
  const motoristasUnicos = useMemo(() => {
    const motoristasSet = new Map<string, string>();
    cargas.forEach(carga => {
      carga.entregas.forEach(entrega => {
        if (entrega.motoristas?.nome_completo) {
          motoristasSet.set(entrega.motoristas.nome_completo, entrega.motoristas.nome_completo);
        }
      });
    });
    return Array.from(motoristasSet.entries()).map(([id, nome]) => ({ id, nome }));
  }, [cargas]);

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
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <TooltipProvider>
        <div className="flex flex-col h-full gap-6 min-h-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                Histórico de Cargas
              </h1>
              <p className="text-sm text-muted-foreground">
                Cargas finalizadas (entregues, canceladas ou com problemas)
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              <Clock className="w-3 h-3 mr-1" />
              {filteredCargas.length} registros
            </Badge>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0">
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
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'entregue' ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}
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
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'cancelada' ? 'ring-2 ring-gray-500 ring-inset' : ''}`}
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

            {stats.comProblemas > 0 && (
              <Card
                className={`cursor-pointer hover:shadow-md transition-shadow ${filterStatus === 'problema' ? 'ring-2 ring-destructive ring-inset' : ''}`}
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
            )}

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
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats.freteTotal)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <AdvancedFiltersPopover
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              showMotorista={true}
              showDestinatario={true}
              motoristas={motoristasUnicos}
            />

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
                <DropdownMenuItem onClick={() => handleSort('frete_total')}>
                  Frete Total {sortField === 'frete_total' && (sortOrder === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className='flex gap-2 items-center text-sm text-muted-foreground'>
              <Package className="w-4 h-4" />
              Cargas finalizadas
            </div>

            {filterStatus !== 'all' && (
              <Badge variant="outline">
                Filtro: {filterStatus === 'entregue' ? 'Concluídas' : filterStatus === 'cancelada' ? 'Canceladas' : 'Com Problemas'}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterStatus('all');
                  }}
                >
                  ×
                </Button>
              </Badge>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredCargas.length} {filteredCargas.length === 1 ? 'carga' : 'cargas'}
            </div>
          </div>

          {/* Table */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : paginatedCargas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma carga no histórico
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cargas finalizadas aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                      <tr className="border-b transition-colors bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-10"></th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[130px] cursor-pointer" onClick={() => handleSort('codigo')}>
                          <div className="flex items-center">
                            Código
                            <SortIcon field="codigo" />
                          </div>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[160px]">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Remetente
                          </div>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[160px]">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Destinatário
                          </div>
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-semibold text-muted-foreground min-w-[90px] cursor-pointer" onClick={() => handleSort('peso_kg')}>
                          <div className="flex items-center justify-center">
                            Peso
                            <SortIcon field="peso_kg" />
                          </div>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[100px] cursor-pointer" onClick={() => handleSort('frete_total')}>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Frete
                            <SortIcon field="frete_total" />
                          </div>
                        </th>
                        <th className="h-12 px-4 text-center align-middle font-semibold text-muted-foreground min-w-[90px]">Entregas</th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[110px]">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[100px] cursor-pointer" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">
                            Data
                            <SortIcon field="created_at" />
                          </div>
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {paginatedCargas.map((carga) => {
                        const isExpanded = expandedRows.has(carga.id);
                        const origem = getEnderecoData(carga, 'origem');
                        const destino = getEnderecoData(carga, 'destino');
                        const hasEntregas = carga.entregas.length > 0;

                        return (
                          <React.Fragment key={carga.id}>
                            {/* Main Row */}
                            <tr
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
                              <td className="p-4 align-middle">
                                <span className="font-medium text-sm text-green-600">
                                  {formatCurrency(getTotalFrete(carga))}
                                </span>
                              </td>
                              <td className="p-4 align-middle text-center">
                                <Badge variant="outline" className="text-xs">
                                  {carga.entregas.length} {carga.entregas.length === 1 ? 'entrega' : 'entregas'}
                                </Badge>
                              </td>
                              <td className="p-4 align-middle">
                                {getStatusBadge(carga)}
                              </td>
                              <td className="p-4 align-middle">
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(carga.created_at), "dd/MM/yy", { locale: ptBR })}
                                </span>
                              </td>
                              <td className="p-4 align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsCarga(carga);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>

                            {/* Expanded Row - Entregas */}
                            {isExpanded && carga.entregas.length > 0 && (
                              <tr className="border-b transition-colors bg-muted/20 hover:bg-muted/20">
                                <td colSpan={10} className="p-0 align-middle">
                                  <div className="px-8 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Truck className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">Cargas ({carga.entregas.length})</span>
                                    </div>
                                    <div className="bg-background rounded-lg border overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/30">
                                            <TableHead className="text-xs">Código</TableHead>
                                            <TableHead className="text-xs">Motorista</TableHead>
                                            <TableHead className="text-xs">Veículo</TableHead>
                                            <TableHead className="text-xs text-right">Peso Alocado</TableHead>
                                            <TableHead className="text-xs text-right">Valor Frete</TableHead>
                                            <TableHead className="text-xs">Coletado em</TableHead>
                                            <TableHead className="text-xs">Entregue em</TableHead>
                                            <TableHead className="text-xs">Status</TableHead>
                                            <TableHead className="text-xs">N° CT-e</TableHead>
                                            <TableHead className="text-xs">Docs</TableHead>
                                            <TableHead className="text-xs w-10"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {carga.entregas.map((entrega) => {
                                            const statusConfig = statusEntregaConfig[entrega.status] || statusEntregaConfig.aguardando;
                                            const StatusIcon = statusConfig.icon;
                                            const isHighlighted = highlightedEntregaId === entrega.id;
                                            const docsCount = getDocsCount(entrega);
                                            const hasMissing = hasMissingCriticalDocs(entrega);

                                            return (
                                              <TableRow
                                                key={entrega.id}
                                                className={`${isHighlighted ? 'bg-primary/10 animate-pulse' : ''}`}
                                              >
                                                <TableCell className="text-xs font-mono">
                                                  {entrega.codigo || '-'}
                                                </TableCell>
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
                                                <span className="text-sm font-medium text-emerald-600">
                                                  {formatCurrency(entrega.valor_frete)}
                                                </span>
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
                                                  <span className="text-xs font-mono text-muted-foreground">
                                                    -
                                                  </span>
                                                </TableCell>
                                                <TableCell>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 gap-1 text-primary hover:text-primary"
                                                    title="Ver documentos"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDocsEntregaId(entrega.id);
                                                      setDocsEntregaCodigo(entrega.codigo);
                                                      setDocsEntregaCanhoto(entrega.canhoto_url);
                                                      setDocsEntregaOutros(Array.isArray(entrega.outros_documentos) ? entrega.outros_documentos : []);
                                                      setDocsDialogOpen(true);
                                                    }}
                                                  >
                                                    <FileText className="w-3 h-3" />
                                                  </Button>
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
                                                        setChatEntregaId(entrega.id);
                                                        setChatSheetOpen(true);
                                                      }}>
                                                        <MessageCircle className="w-4 h-4 mr-2" />
                                                        Ver conversa
                                                      </DropdownMenuItem>
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
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {renderPagination()}
            </CardContent>
          </Card>
        </div>

        {/* Details Dialog */}
        <CargaDetailsDialog
          carga={detailsCarga ? {
            ...detailsCarga,
            remetente: {
              nome: detailsCarga.remetente_nome_fantasia || detailsCarga.remetente_razao_social || null,
              cidade: detailsCarga.endereco_origem?.cidade || null,
              estado: detailsCarga.endereco_origem?.estado || null,
              endereco: detailsCarga.endereco_origem
                ? [detailsCarga.endereco_origem.logradouro, detailsCarga.endereco_origem.numero, detailsCarga.endereco_origem.bairro].filter(Boolean).join(', ')
                : null,
              contato_nome: detailsCarga.endereco_origem?.contato_nome || null,
              contato_telefone: detailsCarga.endereco_origem?.contato_telefone || null,
            },
            destinatario: {
              nome: detailsCarga.destinatario_nome_fantasia || detailsCarga.destinatario_razao_social || null,
              cidade: detailsCarga.endereco_destino?.cidade || null,
              estado: detailsCarga.endereco_destino?.estado || null,
              endereco: detailsCarga.endereco_destino
                ? [detailsCarga.endereco_destino.logradouro, detailsCarga.endereco_destino.numero, detailsCarga.endereco_destino.bairro].filter(Boolean).join(', ')
                : null,
              contato_nome: detailsCarga.endereco_destino?.contato_nome || null,
              contato_telefone: detailsCarga.endereco_destino?.contato_telefone || null,
            },
          } : null}
          open={!!detailsCarga}
          onOpenChange={(open) => !open && setDetailsCarga(null)}
        />

        {/* Entrega Details Dialog */}
        {selectedEntrega && selectedEntregaCarga && (
          <EntregaDetailsDialog
            open={entregaDetailsOpen}
            onOpenChange={setEntregaDetailsOpen}
            entrega={{
              id: selectedEntrega.id,
              codigo: selectedEntrega.codigo,
              status: selectedEntrega.status,
              created_at: null,
              peso_alocado_kg: selectedEntrega.peso_alocado_kg,
              valor_frete: selectedEntrega.valor_frete,
              coletado_em: selectedEntrega.coletado_em,
              entregue_em: selectedEntrega.entregue_em,
              canhoto_url: selectedEntrega.canhoto_url,
              motorista: selectedEntrega.motoristas ? {
                id: selectedEntrega.motorista_id || '',
                nome_completo: selectedEntrega.motoristas.nome_completo,
                telefone: selectedEntrega.motoristas.telefone,
                email: null,
                foto_url: null,
              } : null,
              veiculo: selectedEntrega.veiculos ? {
                id: '',
                placa: selectedEntrega.veiculos.placa,
                tipo: selectedEntrega.veiculos.tipo,
              } : null,
              carga: {
                id: selectedEntregaCarga.id,
                codigo: selectedEntregaCarga.codigo,
                descricao: selectedEntregaCarga.descricao,
                peso_kg: selectedEntregaCarga.peso_kg,
                tipo: selectedEntregaCarga.tipo,
                data_entrega_limite: selectedEntregaCarga.data_entrega_limite,
                destinatario_nome_fantasia: selectedEntregaCarga.destinatario_nome_fantasia,
                destinatario_razao_social: selectedEntregaCarga.destinatario_razao_social,
                endereco_origem: selectedEntregaCarga.endereco_origem ? {
                  cidade: selectedEntregaCarga.endereco_origem.cidade,
                  estado: selectedEntregaCarga.endereco_origem.estado,
                  logradouro: selectedEntregaCarga.endereco_origem.logradouro,
                  latitude: selectedEntregaCarga.endereco_origem.latitude,
                  longitude: selectedEntregaCarga.endereco_origem.longitude,
                } : null,
                endereco_destino: selectedEntregaCarga.endereco_destino ? {
                  cidade: selectedEntregaCarga.endereco_destino.cidade,
                  estado: selectedEntregaCarga.endereco_destino.estado,
                  logradouro: selectedEntregaCarga.endereco_destino.logradouro,
                  latitude: selectedEntregaCarga.endereco_destino.latitude,
                  longitude: selectedEntregaCarga.endereco_destino.longitude,
                } : null,
                empresa: null,
              },
            }}
          />
        )}

        {/* Tracking Map Dialog */}
        <TrackingMapDialog
          entregaId={trackingMapEntregaId}
          info={trackingMapInfo}
          onClose={() => {
            setTrackingMapEntregaId(null);
            setTrackingMapInfo(null);
          }}
        />

        {/* Docs Dialog */}
        <EntregaDocsDialog
          open={docsDialogOpen}
          onOpenChange={setDocsDialogOpen}
          entregaId={docsEntregaId || ''}
          entregaCodigo={docsEntregaCodigo}
          canhotoUrl={docsEntregaCanhoto}
          outrosDocumentos={docsEntregaOutros}
        />

        {/* Chat Sheet */}
        <ChatSheet
          open={chatSheetOpen}
          onOpenChange={setChatSheetOpen}
          entregaId={chatEntregaId}
          userType="embarcador"
          empresaId={empresa?.id}
        />
      </TooltipProvider>
    </div>
  );
}
