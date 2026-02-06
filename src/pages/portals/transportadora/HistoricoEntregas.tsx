import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
// Table components not used - using native HTML for sticky headers
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import { AdvancedFiltersPopover, type AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import type { Database } from '@/integrations/supabase/types';
import { 
  Building2, 
  Calendar, 
  Package, 
  Truck, 
  CheckCircle, 
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
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
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
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { useNavigate } from 'react-router-dom';
import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';
import HistoricoViagens from '@/components/historico/HistoricoViagens';

type ViewMode = 'entregas' | 'viagens';


type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaHistorico {
  id: string;
  codigo: string | null;
  status: StatusEntrega | null;
  updated_at: string | null;
  entregue_em: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  cte_url: string | null;
  numero_cte: string | null;
  notas_fiscais_urls: string[] | null;
  manifesto_url: string | null;
  canhoto_url?: string | null;
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

const finalizedStatuses: StatusEntrega[] = ['entregue', 'problema', 'cancelada'];

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'entregue': {
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    label: 'Entregue',
    icon: CheckCircle
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

const ITEMS_PER_PAGE = 15;

// Column definitions
const columns: ColumnDefinition[] = [
  { id: 'codigo', label: 'Código', minWidth: '100px', sticky: 'left', sortable: true, sortKey: 'codigo' },
  { id: 'remetente', label: 'Remetente', minWidth: '160px', sortable: true, sortKey: 'remetente' },
  { id: 'destinatario', label: 'Destinatário', minWidth: '160px', sortable: true, sortKey: 'destinatario' },
  { id: 'rota', label: 'Rota', minWidth: '180px' },
  { id: 'peso', label: 'Peso', minWidth: '80px', sortable: true, sortKey: 'peso' },
  { id: 'motorista', label: 'Motorista', minWidth: '130px', sortable: true, sortKey: 'motorista' },
  { id: 'status', label: 'Status', minWidth: '120px', sortable: true, sortKey: 'status' },
  { id: 'numero_cte', label: 'N° CT-e', minWidth: '100px' },
  { id: 'docs', label: 'Docs', minWidth: '80px' },
  { id: 'encerrada_em', label: 'Encerrada em', minWidth: '110px', sortable: true, sortKey: 'encerrada_em' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

export default function HistoricoEntregas() {
  const { empresa } = useUserContext();
  const navigate = useNavigate();
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('viagens');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaHistorico | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewTitle, setFilePreviewTitle] = useState('Documento');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Chat sheet state
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [chatEntregaId, setChatEntregaId] = useState<string | null>(null);


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
    persistKey: 'historico-entregas-columns',
  });

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
          codigo,
          status,
          updated_at,
          entregue_em,
          peso_alocado_kg,
          valor_frete,
          cte_url,
          numero_cte,
          notas_fiscais_urls,
          manifesto_url,
          canhoto_url,
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
      cancelada: entregas.filter(e => e.status === 'cancelada').length,
      problema: entregas.filter(e => e.status === 'problema').length,
    };
  }, [entregas]);

  // Get unique motoristas for filter dropdown
  const motoristasUnicos = useMemo(() => {
    const motoristasSet = new Map<string, string>();
    entregas.forEach(e => {
      if (e.motorista?.nome_completo) {
        motoristasSet.set(e.motorista.id, e.motorista.nome_completo);
      }
    });
    return Array.from(motoristasSet.entries()).map(([id, nome]) => ({ id, nome }));
  }, [entregas]);

  const filtered = useMemo(() => {
    let result = entregas;
    
    // Apply status filter
    if (selectedStatus) {
      result = result.filter(e => e.status === selectedStatus);
    }

    // Apply advanced filters
    if (advancedFilters.codigo) {
      const q = advancedFilters.codigo.toLowerCase();
      result = result.filter(e => 
        e.carga.codigo.toLowerCase().includes(q) ||
        (e.codigo || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.destinatario) {
      const q = advancedFilters.destinatario.toLowerCase();
      result = result.filter(e => 
        (e.carga.destinatario_nome_fantasia || '').toLowerCase().includes(q) ||
        (e.carga.destinatario_razao_social || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.embarcador) {
      const q = advancedFilters.embarcador.toLowerCase();
      result = result.filter(e => 
        (e.carga.empresa?.nome || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.motorista) {
      const q = advancedFilters.motorista.toLowerCase();
      result = result.filter(e => 
        (e.motorista?.nome_completo || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.cidadeOrigem) {
      const q = advancedFilters.cidadeOrigem.toLowerCase();
      result = result.filter(e => 
        e.carga.endereco_origem?.cidade?.toLowerCase().includes(q)
      );
    }

    if (advancedFilters.cidadeDestino) {
      const q = advancedFilters.cidadeDestino.toLowerCase();
      result = result.filter(e => 
        e.carga.endereco_destino?.cidade?.toLowerCase().includes(q)
      );
    }

    // Apply date filters from advanced filters
    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(e => {
        const entregaDate = new Date(e.entregue_em || e.updated_at || Date.now());
        return entregaDate >= fromDate;
      });
    }
    
    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(e => {
        const entregaDate = new Date(e.entregue_em || e.updated_at || Date.now());
        return entregaDate <= toDate;
      });
    }

    return result;
  }, [entregas, selectedStatus, advancedFilters]);

  // Custom sort functions for nested/computed fields
  const sortFunctions = useMemo(() => ({
    codigo: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.codigo || a.carga.codigo).localeCompare(b.codigo || b.carga.codigo, 'pt-BR'),
    remetente: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.carga.empresa?.nome || '').localeCompare(b.carga.empresa?.nome || '', 'pt-BR'),
    destinatario: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.carga.destinatario_nome_fantasia || a.carga.destinatario_razao_social || '')
        .localeCompare(b.carga.destinatario_nome_fantasia || b.carga.destinatario_razao_social || '', 'pt-BR'),
    peso: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.peso_alocado_kg || a.carga.peso_kg) - (b.peso_alocado_kg || b.carga.peso_kg),
    motorista: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.motorista?.nome_completo || '').localeCompare(b.motorista?.nome_completo || '', 'pt-BR'),
    status: (a: EntregaHistorico, b: EntregaHistorico) =>
      (a.status || '').localeCompare(b.status || '', 'pt-BR'),
    encerrada_em: (a: EntregaHistorico, b: EntregaHistorico) =>
      new Date(a.entregue_em || a.updated_at || 0).getTime() - new Date(b.entregue_em || b.updated_at || 0).getTime(),
  }), []);

  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filtered,
    defaultSort: { key: 'encerrada_em', direction: 'desc' },
    persistKey: 'historico-entregas-transportadora',
    sortFunctions,
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, advancedFilters]);

  const formatPeso = (peso: number | null) => {
    if (!peso) return '-';
    if (peso >= 1000) return `${(peso / 1000).toFixed(1)}t`;
    return `${peso.toLocaleString('pt-BR')} kg`;
  };

  const handleOpenDetails = (entrega: EntregaHistorico) => {
    setSelectedEntrega(entrega);
    setDetailsDialogOpen(true);
  };

  const handleOpenFile = (url: string, title: string) => {
    setFilePreviewUrl(url);
    setFilePreviewTitle(title);
    setFilePreviewOpen(true);
  };

  // Count documents for a delivery (3 obrigatórios: CT-e, Canhoto, NF-e)
  const getDocsCount = (e: EntregaHistorico) => {
    let count = 0;
    if (e.cte_url) count++;
    if (e.notas_fiscais_urls && e.notas_fiscais_urls.length > 0) count += e.notas_fiscais_urls.length;
    if (e.canhoto_url) count++;
    return count;
  };

  // Check if critical docs are missing (NF + CTE + Canhoto) - Manifesto pertence à viagem
  const hasMissingCriticalDocs = (e: EntregaHistorico) => {
    const nfsCount = e.notas_fiscais_urls?.length || 0;
    return !e.cte_url || !e.canhoto_url || nfsCount === 0;
  };

  // Render cell based on column ID
  const renderCell = (columnId: string, e: EntregaHistorico) => {
    const origem = e.carga.endereco_origem;
    const destino = e.carga.endereco_destino;
    const status = e.status || 'entregue';
    const config = statusConfig[status];
    const StatusIcon = config?.icon || CheckCircle;

    switch (columnId) {
      case 'codigo':
        return (
          <td className="p-4 align-middle sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-nowrap">{e.codigo || e.carga.codigo}</span>
            </div>
          </td>
        );
      case 'remetente':
        return (
          <td className="p-4 align-middle text-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="font-medium text-sm truncate max-w-[130px]">
                      {e.carga.empresa?.nome || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[130px]">
                    {origem?.cidade || '-'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{e.carga.empresa?.nome || 'Remetente não informado'}</p>
                {origem && (
                  <p className="text-xs text-muted-foreground">{origem.logradouro}, {origem.cidade}/{origem.estado}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </td>
        );
      case 'destinatario':
        return (
          <td className="p-4 align-middle text-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="font-medium text-sm truncate max-w-[130px]">
                      {e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[130px]">
                    {destino?.cidade || '-'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || 'Destinatário não informado'}</p>
                {destino && (
                  <p className="text-xs text-muted-foreground">{destino.logradouro}, {destino.cidade}/{destino.estado}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </td>
        );
      case 'rota':
        return (
          <td className="p-4 align-middle text-nowrap">
            <div className="flex items-center gap-1 text-sm">
              <span className="truncate max-w-[50px]">{origem?.cidade || '-'}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[50px]">{destino?.cidade || '-'}</span>
            </div>
          </td>
        );
      case 'peso':
        return (
          <td className="p-4 align-middle text-sm text-nowrap">
            {formatPeso(e.peso_alocado_kg || e.carga.peso_kg)}
          </td>
        );
      case 'motorista':
        return (
          <td className="p-4 align-middle text-nowrap">
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
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle text-nowrap">
            <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
              <StatusIcon className="w-3 h-3" />
              {config?.label || status}
            </Badge>
          </td>
        );
      case 'numero_cte':
        return (
          <td className="p-4 align-middle text-nowrap">
            <span className="text-xs font-mono text-muted-foreground">
              {e.numero_cte || '-'}
            </span>
          </td>
        );
      case 'docs':
        const docsCount = getDocsCount(e);
        const hasMissing = hasMissingCriticalDocs(e);
        return (
          <td className="p-4 align-middle text-nowrap">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 gap-1 ${hasMissing ? 'text-amber-600' : 'text-green-600'}`}
              onClick={() => handleOpenDetails(e)}
            >
              <FileText className="w-3 h-3" />
              {docsCount}
              {hasMissing && <AlertTriangle className="w-3 h-3" />}
            </Button>
          </td>
        );
      case 'encerrada_em':
        return (
          <td className="p-4 align-middle text-sm text-muted-foreground text-nowrap">
            {new Date(e.entregue_em || e.updated_at || Date.now()).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </td>
        );
      case 'acoes':
        return (
          <td className="p-4 align-middle sticky right-0 bg-background z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  setChatEntregaId(e.id);
                  setChatSheetOpen(true);
                }}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ver conversa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenDetails(e)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenDetails(e)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver documentos
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
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  // Render column header icon based on column ID
  const getColumnIcon = (columnId: string) => {
    switch (columnId) {
      case 'remetente': return <Building2 className="w-3 h-3" />;
      case 'destinatario': return <Package className="w-3 h-3" />;
      case 'peso': return <Scale className="w-3 h-3" />;
      case 'motorista': return <User className="w-3 h-3" />;
      case 'docs': return <FileText className="w-3 h-3" />;
      case 'encerrada_em': return <Calendar className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <TooltipProvider>
        <div className="flex flex-col h-full gap-6 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
              <p className="text-muted-foreground">Entregas e viagens finalizadas</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Switch de Visualização */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                <Label htmlFor="hist-view-mode" className={`text-sm font-medium transition-colors ${viewMode === 'entregas' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Entregas
                </Label>
                <Switch
                  id="hist-view-mode"
                  checked={viewMode === 'viagens'}
                  onCheckedChange={(checked) => {
                    setViewMode(checked ? 'viagens' : 'entregas');
                    setSelectedStatus(null);
                  }}
                />
                <Label htmlFor="hist-view-mode" className={`text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'viagens' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <Route className="w-3.5 h-3.5" />
                  Viagens
                </Label>
              </div>

              <Separator orientation="vertical" className="h-8" />

              <AdvancedFiltersPopover
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                showMotorista={true}
                showEmbarcador={viewMode === 'entregas'}
                showDestinatario={viewMode === 'entregas'}
                motoristas={motoristasUnicos}
              />

              {viewMode === 'entregas' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={resetColumnOrder}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redefinir ordem das colunas</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {viewMode === 'viagens' ? (
            <HistoricoViagens advancedFilters={advancedFilters} />
          ) : (
          <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0 px-px">
            <Card
              className={`border-border cursor-pointer transition-all ${selectedStatus === null ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'}`}
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
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'entregue' ? 'ring-2 ring-green-500 ring-inset' : 'hover:bg-muted/30'}`}
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
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'cancelada' ? 'ring-2 ring-gray-500 ring-inset' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(selectedStatus === 'cancelada' ? null : 'cancelada')}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Ban className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-2xl font-bold text-gray-600">{stats.cancelada}</p>
                <p className="text-xs text-muted-foreground">Canceladas</p>
              </CardContent>
            </Card>
            <Card
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'problema' ? 'ring-2 ring-destructive ring-inset' : 'hover:bg-muted/30'}`}
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

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className='flex gap-2 items-center text-sm text-muted-foreground'>
              <Truck className="w-4 h-4" />
              Entregas finalizadas
            </div>
            
            {selectedStatus && (
              <Badge variant="outline">
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
            
            <div className="ml-auto text-sm text-muted-foreground">
              {sortedData.length} {sortedData.length === 1 ? 'entrega' : 'entregas'}
            </div>
          </div>

          {/* Table */}
          <Card
            className="border-border hidden md:flex flex-col flex-1 min-h-0"
          >
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 z-20 bg-background [&_tr]:border-b">
                    <tr className="border-b transition-colors bg-muted/50">
                      {orderedColumns.map((col) => (
                        <DraggableTableHead
                          key={col.id}
                          columnId={col.id}
                          isDragging={draggedColumn === col.id}
                          isDragOver={dragOverColumn === col.id}
                          isSticky={!!col.sticky}
                          sortable={col.sortable}
                          sortDirection={col.sortKey ? getSortDirection(col.sortKey) : null}
                          onSort={col.sortKey ? () => requestSort(col.sortKey!) : undefined}
                          onColumnDragStart={handleDragStart}
                          onColumnDragEnd={handleDragEnd}
                          onColumnDragOver={handleDragOver}
                          onColumnDragLeave={handleDragLeave}
                          onColumnDrop={handleDrop}
                          className={`min-w-[${col.minWidth}] ${
                            col.sticky === 'left' ? 'sticky left-0 bg-muted/50 z-10' :
                            col.sticky === 'right' ? 'sticky right-0 bg-muted/50 z-10' : ''
                          }`}
                        >
                          {getColumnIcon(col.id)}
                          {col.label}
                        </DraggableTableHead>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {isLoading ? (
                      <tr className="border-b transition-colors">
                        <td colSpan={orderedColumns.length} className="p-4 align-middle py-10 text-center text-muted-foreground">
                          Carregando...
                        </td>
                      </tr>
                    ) : paginatedData.length === 0 ? (
                      <tr className="border-b transition-colors">
                        <td colSpan={orderedColumns.length} className="p-4 align-middle py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="w-10 h-10 text-muted-foreground/50" />
                            <p>Nenhum registro encontrado.</p>
                            {(selectedStatus || Object.keys(advancedFilters).length > 0) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAdvancedFilters({});
                                  setSelectedStatus(null);
                                }}
                              >
                                Limpar filtros
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((e) => (
                        <tr key={e.id} className="border-b transition-colors hover:bg-muted/30">
                          {orderedColumns.map((col) => (
                            <React.Fragment key={col.id}>
                              {renderCell(col.id, e)}
                            </React.Fragment>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
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
          </>
          )}
        </div>
        {/* Details Dialog */}
        <EntregaDetailsDialog
          entrega={selectedEntrega as any}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />

        {/* Tracking History Map Dialog */}
        <TrackingMapDialog 
          entregaId={trackingMapEntregaId}
          info={trackingMapInfo}
          onClose={() => {
            setTrackingMapEntregaId(null);
            setTrackingMapInfo(null);
          }}
        />

        {/* File Preview Dialog */}
        <FilePreviewDialog
          open={filePreviewOpen}
          onOpenChange={setFilePreviewOpen}
          fileUrl={filePreviewUrl}
          title={filePreviewTitle}
        />

        {/* Chat Sheet */}
        <ChatSheet
          open={chatSheetOpen}
          onOpenChange={setChatSheetOpen}
          entregaId={chatEntregaId}
          userType="transportadora"
          empresaId={empresa?.id}
        />
      </TooltipProvider>
    </div>
  );
}
