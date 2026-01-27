import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import type { Database } from '@/integrations/supabase/types';
import { 
  Building2, 
  Calendar, 
  Package, 
  Search, 
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
import { GoogleMapsLoader, airbnbMapStyles } from '@/components/maps/GoogleMapsLoader';
import { GoogleMap } from '@react-google-maps/api';
import { TrackingHistoryGoogleMarkers } from '@/components/maps/TrackingHistoryGoogleMarkers';

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
  { id: 'docs', label: 'Docs', minWidth: '80px' },
  { id: 'encerrada_em', label: 'Encerrada em', minWidth: '110px', sortable: true, sortKey: 'encerrada_em' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

export default function HistoricoEntregas() {
  const { empresa } = useUserContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaHistorico | null>(null);
  const [trackingMapEntregaId, setTrackingMapEntregaId] = useState<string | null>(null);
  const [trackingMapInfo, setTrackingMapInfo] = useState<{ motorista: string; placa: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewTitle, setFilePreviewTitle] = useState('Documento');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState('');
  
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

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return entregas.filter((e) => {
      if (selectedStatus && e.status !== selectedStatus) return false;
      if (!q) return true;

      const destinatario = (e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '').toLowerCase();
      return (
        e.carga.codigo.toLowerCase().includes(q) ||
        e.carga.descricao.toLowerCase().includes(q) ||
        destinatario.includes(q) ||
        (e.carga.empresa?.nome || '').toLowerCase().includes(q) ||
        (e.motorista?.nome_completo || '').toLowerCase().includes(q) ||
        (e.veiculo?.placa || '').toLowerCase().includes(q) ||
        (e.numero_cte || '').toLowerCase().includes(q)
      );
    });
  }, [entregas, searchTerm, selectedStatus]);

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
  const filterKey = `${searchTerm}-${selectedStatus}`;
  if (filterKey !== lastFilterKey) {
    setCurrentPage(1);
    setLastFilterKey(filterKey);
  }

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

  // Count documents for a delivery
  const getDocsCount = (e: EntregaHistorico) => {
    let count = 0;
    if (e.cte_url) count++;
    if (e.notas_fiscais_urls && e.notas_fiscais_urls.length > 0) count += e.notas_fiscais_urls.length;
    if (e.manifesto_url) count++;
    if (e.canhoto_url) count++;
    return count;
  };

  // Check if critical docs are missing
  const hasMissingCriticalDocs = (e: EntregaHistorico) => {
    return !e.cte_url || !e.manifesto_url;
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
          <TableCell className="sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-nowrap">{e.codigo || e.carga.codigo}</span>
            </div>
          </TableCell>
        );
      case 'remetente':
        return (
          <TableCell className="text-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block max-w-[150px]">
                  {e.carga.empresa?.nome || '-'}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{e.carga.empresa?.nome || 'Remetente não informado'}</p>
                {origem && (
                  <p className="text-xs text-muted-foreground">{origem.logradouro}, {origem.cidade}/{origem.estado}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'destinatario':
        return (
          <TableCell className="text-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block max-w-[150px]">
                  {e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || '-'}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{e.carga.destinatario_nome_fantasia || e.carga.destinatario_razao_social || 'Destinatário não informado'}</p>
                {destino && (
                  <p className="text-xs text-muted-foreground">{destino.logradouro}, {destino.cidade}/{destino.estado}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TableCell>
        );
      case 'rota':
        return (
          <TableCell className="text-nowrap">
            <div className="flex items-center gap-1 text-sm">
              <MapPin className="w-3 h-3 text-chart-1 shrink-0" />
              <span className="truncate max-w-[50px]">{origem?.cidade || '-'}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <MapPin className="w-3 h-3 text-chart-2 shrink-0" />
              <span className="truncate max-w-[50px]">{destino?.cidade || '-'}</span>
            </div>
          </TableCell>
        );
      case 'peso':
        return (
          <TableCell className="text-sm text-nowrap">
            {formatPeso(e.peso_alocado_kg || e.carga.peso_kg)}
          </TableCell>
        );
      case 'motorista':
        return (
          <TableCell className="text-nowrap">
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
          </TableCell>
        );
      case 'status':
        return (
          <TableCell className="text-nowrap">
            <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
              <StatusIcon className="w-3 h-3" />
              {config?.label || status}
            </Badge>
          </TableCell>
        );
      case 'docs':
        const docsCount = getDocsCount(e);
        const hasMissing = hasMissingCriticalDocs(e);
        return (
          <TableCell className="text-nowrap">
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
          </TableCell>
        );
      case 'encerrada_em':
        return (
          <TableCell className="text-sm text-muted-foreground text-nowrap">
            {new Date(e.entregue_em || e.updated_at || Date.now()).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </TableCell>
        );
      case 'acoes':
        return (
          <TableCell className="sticky right-0 bg-background z-10">
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
                {e.cte_url && (
                  <DropdownMenuItem onClick={() => handleOpenFile(e.cte_url!, 'CT-e')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Ver CT-e
                  </DropdownMenuItem>
                )}
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
          </TableCell>
        );
      default:
        return <TableCell>-</TableCell>;
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
    <div className="p-4 md:p-8">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico de Entregas</h1>
              <p className="text-muted-foreground">Entregas finalizadas, devoluções e ocorrências</p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={resetColumnOrder}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redefinir ordem das colunas</TooltipContent>
              </Tooltip>
              <Badge variant="outline" className="w-fit">
                <Clock className="w-3 h-3 mr-1" />
                {sortedData.length} registros
              </Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              className={`border-border cursor-pointer transition-all ${selectedStatus === null ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
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
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'entregue' ? 'ring-2 ring-green-500' : 'hover:bg-muted/30'}`}
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
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'cancelada' ? 'ring-2 ring-gray-500' : 'hover:bg-muted/30'}`}
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
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'problema' ? 'ring-2 ring-destructive' : 'hover:bg-muted/30'}`}
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

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por código, destinatário, embarcador, motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className='!-mb-3'>
            <div className='flex gap-2 items-center'>
              <Truck className="w-4 h-4" />
              Entregas finalizadas
            </div>
            {selectedStatus && (
              <Badge variant="outline" className="">
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
          </div>

          {/* Table */}
          <Card className="border-border hidden md:block">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow className="bg-muted/50">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={orderedColumns.length} className="py-10 text-center text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={orderedColumns.length} className="py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="w-10 h-10 text-muted-foreground/50" />
                            <p>Nenhum registro encontrado.</p>
                            {(searchTerm || selectedStatus) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchTerm('');
                                  setSelectedStatus(null);
                                }}
                              >
                                Limpar filtros
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/30">
                          {orderedColumns.map((col) => (
                            <React.Fragment key={col.id}>
                              {renderCell(col.id, e)}
                            </React.Fragment>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
        </div>

        {/* Details Dialog */}
        <EntregaDetailsDialog
          entrega={selectedEntrega as any}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
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
