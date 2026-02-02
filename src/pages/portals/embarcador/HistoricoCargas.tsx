import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';
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
  AlertTriangle,
  X,
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
  cte_url: string | null;
  numero_cte: string | null;
  notas_fiscais_urls: string[] | null;
  manifesto_url: string | null;
  canhoto_url: string | null;
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

const ITEMS_PER_PAGE = 20;

// Column definitions for draggable table - optimized for visibility
const columns: ColumnDefinition[] = [
  { id: 'expand', label: '', minWidth: '32px', sticky: 'left' },
  { id: 'codigo', label: 'Código', minWidth: '100px', sortable: true, sortKey: 'codigo' },
  { id: 'rota', label: 'Rota', minWidth: '200px' },
  { id: 'peso', label: 'Peso', minWidth: '70px', sortable: true, sortKey: 'peso_kg' },
  { id: 'frete', label: 'Frete', minWidth: '90px', sortable: true, sortKey: 'frete_total' },
  { id: 'status', label: 'Status', minWidth: '90px' },
  { id: 'data', label: 'Data', minWidth: '85px', sortable: true, sortKey: 'created_at' },
  { id: 'acoes', label: '', minWidth: '40px', sticky: 'right' },
];

export default function HistoricoCargas() {
  const { filialAtiva } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsCarga, setDetailsCarga] = useState<CargaData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedEntregaId, setHighlightedEntregaId] = useState<string | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);
  
  // Date filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Entrega details dialog
  const [entregaDetailsOpen, setEntregaDetailsOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaData | null>(null);
  const [selectedEntregaCarga, setSelectedEntregaCarga] = useState<CargaData | null>(null);

  // Draggable columns hook
  const {
    orderedColumns,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetColumnOrder,
  } = useDraggableColumns({
    columns,
    persistKey: 'historico-cargas-embarcador',
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
            cte_url,
            numero_cte,
            notas_fiscais_urls,
            manifesto_url,
            canhoto_url,
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

  // Sort functions for custom fields
  const sortFunctions = useMemo(() => ({
    codigo: (a: CargaData, b: CargaData) => a.codigo.localeCompare(b.codigo, 'pt-BR'),
    peso_kg: (a: CargaData, b: CargaData) => a.peso_kg - b.peso_kg,
    valor_mercadoria: (a: CargaData, b: CargaData) => (a.valor_mercadoria || 0) - (b.valor_mercadoria || 0),
    frete_total: (a: CargaData, b: CargaData) => getTotalFrete(a) - getTotalFrete(b),
    created_at: (a: CargaData, b: CargaData) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  }), []);

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

    // Apply date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(c => {
        const cargaDate = new Date(c.created_at);
        return cargaDate >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(c => {
        const cargaDate = new Date(c.created_at);
        return cargaDate <= toDate;
      });
    }

    return result;
  }, [cargas, searchTerm, filterStatus, dateFrom, dateTo]);

  // Apply sorting with useTableSort
  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filteredCargas,
    defaultSort: { key: 'created_at', direction: 'desc' },
    persistKey: 'historico-cargas-embarcador-sort',
    sortFunctions,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedCargas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

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
    if (entrega.cte_url) count++;
    if (entrega.notas_fiscais_urls && entrega.notas_fiscais_urls.length > 0) count += entrega.notas_fiscais_urls.length;
    if (entrega.manifesto_url) count++;
    if (entrega.canhoto_url) count++;
    return count;
  };

  // Check if critical docs are missing
  const hasMissingCriticalDocs = (entrega: EntregaData) => {
    return !entrega.cte_url || !entrega.manifesto_url;
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

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Render cell based on column ID - optimized layout
  const renderCell = (columnId: string, carga: CargaData) => {
    const isExpanded = expandedRows.has(carga.id);
    const origem = getEnderecoData(carga, 'origem');
    const destino = getEnderecoData(carga, 'destino');

    switch (columnId) {
      case 'expand':
        return (
          <TableCell className="sticky left-0 bg-background z-10 px-2 w-8">
            <Button variant="ghost" size="icon" className="h-5 w-5">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </TableCell>
        );
      case 'codigo':
        return (
          <TableCell className="px-2">
            <div className="flex flex-col">
              <span className="font-mono text-xs font-semibold text-primary">{carga.codigo}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[90px]" title={carga.descricao}>
                {carga.descricao}
              </span>
            </div>
          </TableCell>
        );
      case 'rota':
        return (
          <TableCell className="px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="w-px h-3 bg-border" />
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <div className="flex flex-col min-w-0 text-xs">
                    <span className="truncate font-medium" title={origem.cidade}>{origem.cidade}</span>
                    <span className="truncate text-muted-foreground" title={destino.cidade}>{destino.cidade}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Origem</p>
                    <p className="font-medium text-sm">{origem.empresa}</p>
                    <p className="text-xs text-muted-foreground">{origem.enderecoCompleto}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600 font-medium">Destino</p>
                    <p className="font-medium text-sm">{destino.empresa}</p>
                    <p className="text-xs text-muted-foreground">{destino.enderecoCompleto}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'peso':
        return (
          <TableCell className="text-right font-medium text-xs px-2">{formatWeight(carga.peso_kg)}</TableCell>
        );
      case 'frete':
        return (
          <TableCell className="text-right font-semibold text-emerald-600 text-xs px-2">
            {formatCurrency(getTotalFrete(carga))}
          </TableCell>
        );
      case 'status':
        return <TableCell className="px-2">{getStatusBadge(carga)}</TableCell>;
      case 'data':
        return (
          <TableCell className="text-xs text-muted-foreground px-2">
            {format(new Date(carga.created_at), "dd/MM/yy", { locale: ptBR })}
          </TableCell>
        );
      case 'acoes':
        return (
          <TableCell className="sticky right-0 bg-background z-10 px-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setDetailsCarga(carga);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        );
      default:
        return <TableCell>-</TableCell>;
    }
  };

  // Render compact pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-t text-xs">
        <span className="text-muted-foreground">
          {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          
          <span className="px-2 font-medium">
            {currentPage} / {totalPages}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <TooltipProvider>
        <div className="flex flex-col h-full gap-4">
          {/* Header + Search + Filters - Compact */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Title + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h1 className="text-lg font-bold text-foreground">Histórico de Cargas</h1>
                  <p className="text-xs text-muted-foreground">Cargas finalizadas</p>
                </div>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* KPI Strip - Inline compact */}
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filterStatus === 'all' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <Package className="w-3.5 h-3.5" />
                Total: {stats.total}
              </button>
              <button 
                onClick={() => setFilterStatus(filterStatus === 'entregue' ? 'all' : 'entregue')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filterStatus === 'entregue' 
                    ? "bg-emerald-500 text-white" 
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Entregues: {stats.entregues}
              </button>
              <button 
                onClick={() => setFilterStatus(filterStatus === 'cancelada' ? 'all' : 'cancelada')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filterStatus === 'cancelada' 
                    ? "bg-gray-500 text-white" 
                    : "bg-gray-500/10 hover:bg-gray-500/20 text-gray-700"
                )}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Canceladas: {stats.canceladas}
              </button>
              {stats.comProblemas > 0 && (
                <button 
                  onClick={() => setFilterStatus(filterStatus === 'problema' ? 'all' : 'problema')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    filterStatus === 'problema' 
                      ? "bg-destructive text-destructive-foreground" 
                      : "bg-destructive/10 hover:bg-destructive/20 text-destructive"
                  )}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Problemas: {stats.comProblemas}
                </button>
              )}
              
              <div className="h-4 w-px bg-border mx-1" />
              
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" />
                {formatWeight(stats.pesoTotal)}
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                {formatCurrency(stats.freteTotal)}
              </span>
            </div>

            {/* Date Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters} className="h-7 px-2">
                  <X className="w-3 h-3" />
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={resetColumnOrder} className="ml-auto h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                Resetar
              </Button>
            </div>
          </div>

          {/* Table with sticky header and floating card concept */}
          <Card className="flex-1 flex flex-col overflow-hidden min-h-0 shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : paginatedCargas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma carga no histórico</h3>
                <p className="text-sm text-muted-foreground">Cargas finalizadas aparecerão aqui</p>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-auto relative">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="sticky top-0 bg-card z-20 [&_tr]:border-b shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                      <tr className="border-b transition-colors">
                        {orderedColumns.map((column) => (
                          <DraggableTableHead
                            key={column.id}
                            columnId={column.id}
                            isDragging={draggedColumn === column.id}
                            isDragOver={dragOverColumn === column.id}
                            isSticky={!!column.sticky}
                            sortable={column.sortable}
                            sortDirection={column.sortKey ? getSortDirection(column.sortKey) : null}
                            onSort={column.sortKey ? () => requestSort(column.sortKey!) : undefined}
                            onColumnDragStart={handleDragStart}
                            onColumnDragEnd={handleDragEnd}
                            onColumnDragOver={handleDragOver}
                            onColumnDragLeave={handleDragLeave}
                            onColumnDrop={handleDrop}
                            className={`whitespace-nowrap text-xs bg-card ${column.sticky === 'left' ? 'sticky left-0 z-30' : ''} ${column.sticky === 'right' ? 'sticky right-0 z-30' : ''}`}
                          >
                            {column.label}
                          </DraggableTableHead>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {paginatedCargas.map((carga) => {
                          const isExpanded = expandedRows.has(carga.id);
                          
                          return (
                            <React.Fragment key={carga.id}>
                              <tr 
                                className={`border-b transition-colors cursor-pointer hover:bg-muted/50 ${isExpanded ? 'bg-muted/30' : ''}`}
                                onClick={() => toggleRow(carga.id)}
                              >
                                {orderedColumns.map((column) => (
                                  <React.Fragment key={column.id}>
                                    {renderCell(column.id, carga)}
                                  </React.Fragment>
                                ))}
                              </tr>
                              
                              {/* Expanded Row - Entregas */}
                              {isExpanded && carga.entregas.length > 0 && (
                                <tr className="bg-muted/20 hover:bg-muted/20 border-b">
                                  <td colSpan={orderedColumns.length} className="p-0">
                                    <div className="px-8 py-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Truck className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Entregas ({carga.entregas.length})</span>
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
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                      {entrega.numero_cte || '-'}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className={`h-7 px-2 gap-1 ${hasMissing ? 'text-amber-600' : 'text-green-600'}`}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEntregaDetails(entrega, carga);
                                                      }}
                                                    >
                                                      <FileText className="w-3 h-3" />
                                                      {docsCount}
                                                      {hasMissing && <AlertTriangle className="w-3 h-3" />}
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
              cte_url: selectedEntrega.cte_url,
              numero_cte: selectedEntrega.numero_cte,
              notas_fiscais_urls: selectedEntrega.notas_fiscais_urls,
              manifesto_url: selectedEntrega.manifesto_url,
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
                tipo: selectedEntrega.veiculos.tipo || '',
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
                empresa: null,
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
              },
            }}
          />
        )}

        {/* Tracking History Map Dialog */}
        <TrackingMapDialog 
          entregaId={trackingMapEntregaId}
          info={trackingMapInfo}
          onClose={() => {
            setTrackingMapEntregaId(null);
            setTrackingMapInfo(null);
          }}
        />
      </TooltipProvider>
    </div>
  );
}
