import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import { useTableSort } from '@/hooks/useTableSort';
import { useDraggableColumns, ColumnDefinition } from '@/hooks/useDraggableColumns';
import { DraggableTableHead } from '@/components/ui/draggable-table-head';
import { AdvancedFiltersPopover, type AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import {
  Building2,
  Calendar,
  Package,
  Truck,
  CheckCircle,
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
  AlertTriangle,
  FileCheck,
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
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';

interface ViagemHistorico {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  manifesto_url: string | null;
  km_total: number | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculo: {
    placa: string;
    tipo: string;
  } | null;
  entregas: Array<{
    id: string;
    codigo: string | null;
    status: string | null;
    cte_url: string | null;
    canhoto_url: string | null;
    notas_fiscais_urls: string[] | null;
    carga: {
      codigo: string;
      descricao: string;
      peso_kg: number;
      empresa: { nome: string | null } | null;
      endereco_origem: { cidade: string; estado: string } | null;
      endereco_destino: { cidade: string; estado: string } | null;
    };
  }>;
}

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  finalizada: {
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    label: 'Finalizada',
    icon: CheckCircle,
  },
  cancelada: {
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    label: 'Cancelada',
    icon: Ban,
  },
};

const ITEMS_PER_PAGE = 15;

const columns: ColumnDefinition[] = [
  { id: 'codigo', label: 'Viagem', minWidth: '120px', sticky: 'left', sortable: true, sortKey: 'codigo' },
  { id: 'motorista', label: 'Motorista', minWidth: '140px', sortable: true, sortKey: 'motorista' },
  { id: 'rotas', label: 'Rotas', minWidth: '200px' },
  { id: 'entregas', label: 'Entregas', minWidth: '80px', sortable: true, sortKey: 'entregas' },
  { id: 'status', label: 'Status', minWidth: '100px', sortable: true, sortKey: 'status' },
  { id: 'manifesto', label: 'MDF-e', minWidth: '80px' },
  { id: 'km', label: 'KM', minWidth: '80px', sortable: true, sortKey: 'km' },
  { id: 'encerrada_em', label: 'Encerrada em', minWidth: '120px', sortable: true, sortKey: 'encerrada_em' },
  { id: 'acoes', label: '', minWidth: '50px', sticky: 'right' },
];

interface HistoricoViagensProps {
  advancedFilters: AdvancedFilters;
}

export default function HistoricoViagens({ advancedFilters }: HistoricoViagensProps) {
  const { empresa } = useUserContext();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewTitle, setFilePreviewTitle] = useState('Documento');
  const [currentPage, setCurrentPage] = useState(1);

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
    persistKey: 'historico-viagens-columns',
  });

  const { data: viagens = [], isLoading } = useQuery({
    queryKey: ['historico_viagens_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      // Fetch finalized viagens
      const { data: viagensData, error } = await supabase
        .from('viagens')
        .select(`
          id, codigo, status, created_at, updated_at, ended_at, 
          manifesto_url, km_total,
          motorista:motoristas(id, nome_completo, telefone),
          veiculo:veiculos(placa, tipo)
        `)
        .in('motorista_id', motoristaIds)
        .in('status', ['finalizada', 'cancelada'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch entregas for each viagem
      const viagemIds = (viagensData || []).map(v => v.id);
      if (viagemIds.length === 0) return [];

      const { data: veLinks } = await supabase
        .from('viagem_entregas')
        .select('viagem_id, entrega_id')
        .in('viagem_id', viagemIds);

      const entregaIds = (veLinks || []).map(l => l.entrega_id);
      
      let entregasMap: Record<string, any> = {};
      if (entregaIds.length > 0) {
        const { data: entregasData } = await supabase
          .from('entregas')
          .select(`
            id, codigo, status, cte_url, canhoto_url, notas_fiscais_urls,
            carga:cargas(
              codigo, descricao, peso_kg,
              empresa:empresas!cargas_empresa_id_fkey(nome),
              endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
              endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado)
            )
          `)
          .in('id', entregaIds);

        (entregasData || []).forEach(e => {
          entregasMap[e.id] = e;
        });
      }

      // Build viagem → entregas mapping
      const viagemEntregasMap: Record<string, any[]> = {};
      (veLinks || []).forEach(link => {
        if (!viagemEntregasMap[link.viagem_id]) viagemEntregasMap[link.viagem_id] = [];
        const entrega = entregasMap[link.entrega_id];
        if (entrega) viagemEntregasMap[link.viagem_id].push(entrega);
      });

      return (viagensData || []).map(v => ({
        ...v,
        entregas: viagemEntregasMap[v.id] || [],
      })) as ViagemHistorico[];
    },
    enabled: !!empresa?.id,
  });

  const stats = useMemo(() => ({
    total: viagens.length,
    finalizada: viagens.filter(v => v.status === 'finalizada').length,
    cancelada: viagens.filter(v => v.status === 'cancelada').length,
  }), [viagens]);

  const filtered = useMemo(() => {
    let result = viagens;

    if (selectedStatus) {
      result = result.filter(v => v.status === selectedStatus);
    }

    if (advancedFilters.codigo) {
      const q = advancedFilters.codigo.toLowerCase();
      result = result.filter(v => v.codigo.toLowerCase().includes(q));
    }

    if (advancedFilters.motorista) {
      const q = advancedFilters.motorista.toLowerCase();
      result = result.filter(v =>
        (v.motorista?.nome_completo || '').toLowerCase().includes(q)
      );
    }

    if (advancedFilters.cidadeOrigem) {
      const q = advancedFilters.cidadeOrigem.toLowerCase();
      result = result.filter(v =>
        v.entregas.some(e => e.carga.endereco_origem?.cidade?.toLowerCase().includes(q))
      );
    }

    if (advancedFilters.cidadeDestino) {
      const q = advancedFilters.cidadeDestino.toLowerCase();
      result = result.filter(v =>
        v.entregas.some(e => e.carga.endereco_destino?.cidade?.toLowerCase().includes(q))
      );
    }

    if (advancedFilters.dateFrom) {
      const fromDate = new Date(advancedFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(v => new Date(v.ended_at || v.updated_at) >= fromDate);
    }

    if (advancedFilters.dateTo) {
      const toDate = new Date(advancedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(v => new Date(v.ended_at || v.updated_at) <= toDate);
    }

    return result;
  }, [viagens, selectedStatus, advancedFilters]);

  const sortFunctions = useMemo(() => ({
    codigo: (a: ViagemHistorico, b: ViagemHistorico) => a.codigo.localeCompare(b.codigo, 'pt-BR'),
    motorista: (a: ViagemHistorico, b: ViagemHistorico) =>
      (a.motorista?.nome_completo || '').localeCompare(b.motorista?.nome_completo || '', 'pt-BR'),
    entregas: (a: ViagemHistorico, b: ViagemHistorico) => a.entregas.length - b.entregas.length,
    status: (a: ViagemHistorico, b: ViagemHistorico) => a.status.localeCompare(b.status, 'pt-BR'),
    km: (a: ViagemHistorico, b: ViagemHistorico) => (a.km_total || 0) - (b.km_total || 0),
    encerrada_em: (a: ViagemHistorico, b: ViagemHistorico) =>
      new Date(a.ended_at || a.updated_at).getTime() - new Date(b.ended_at || b.updated_at).getTime(),
  }), []);

  const { sortedData, requestSort, getSortDirection } = useTableSort({
    data: filtered,
    defaultSort: { key: 'encerrada_em', direction: 'desc' },
    persistKey: 'historico-viagens-transportadora',
    sortFunctions,
  });

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, advancedFilters]);

  const handleOpenFile = (url: string, title: string) => {
    setFilePreviewUrl(url);
    setFilePreviewTitle(title);
    setFilePreviewOpen(true);
  };

  const getColumnIcon = (columnId: string) => {
    switch (columnId) {
      case 'motorista': return <User className="w-3 h-3" />;
      case 'rotas': return <MapPin className="w-3 h-3" />;
      case 'entregas': return <Package className="w-3 h-3" />;
      case 'manifesto': return <FileText className="w-3 h-3" />;
      case 'km': return <Route className="w-3 h-3" />;
      case 'encerrada_em': return <Calendar className="w-3 h-3" />;
      default: return null;
    }
  };

  const renderCell = (columnId: string, v: ViagemHistorico) => {
    const config = statusConfig[v.status];
    const StatusIcon = config?.icon || CheckCircle;

    // Build route summary
    const origens = [...new Set(v.entregas.map(e => e.carga.endereco_origem?.cidade).filter(Boolean))];
    const destinos = [...new Set(v.entregas.map(e => e.carga.endereco_destino?.cidade).filter(Boolean))];

    switch (columnId) {
      case 'codigo':
        return (
          <td className="p-4 align-middle sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-nowrap font-mono">{v.codigo}</span>
            </div>
          </td>
        );
      case 'motorista':
        return (
          <td className="p-4 align-middle text-nowrap">
            {v.motorista ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm truncate max-w-[100px]">{v.motorista.nome_completo}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{v.motorista.nome_completo}</p>
                    {v.veiculo && <p className="text-xs text-muted-foreground">Placa: {v.veiculo.placa}</p>}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </td>
        );
      case 'rotas':
        return (
          <td className="p-4 align-middle text-nowrap">
            <div className="flex items-center gap-1 text-sm">
              <span className="truncate max-w-[70px]">{origens[0] || '-'}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[70px]">{destinos[0] || '-'}</span>
              {destinos.length > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1">+{destinos.length - 1}</Badge>
              )}
            </div>
          </td>
        );
      case 'entregas':
        return (
          <td className="p-4 align-middle text-sm text-center">
            <Badge variant="outline" className="text-xs">
              {v.entregas.length}
            </Badge>
          </td>
        );
      case 'status':
        return (
          <td className="p-4 align-middle text-nowrap">
            <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
              <StatusIcon className="w-3 h-3" />
              {config?.label || v.status}
            </Badge>
          </td>
        );
      case 'manifesto':
        return (
          <td className="p-4 align-middle text-nowrap">
            {v.manifesto_url ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-green-600"
                onClick={() => handleOpenFile(v.manifesto_url!, 'Manifesto MDF-e')}
              >
                <FileCheck className="w-3 h-3" />
                Ver
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Pendente
              </span>
            )}
          </td>
        );
      case 'km':
        return (
          <td className="p-4 align-middle text-sm text-muted-foreground text-nowrap">
            {v.km_total ? `${v.km_total.toLocaleString('pt-BR')} km` : '-'}
          </td>
        );
      case 'encerrada_em':
        return (
          <td className="p-4 align-middle text-sm text-muted-foreground text-nowrap">
            {new Date(v.ended_at || v.updated_at).toLocaleDateString('pt-BR', {
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
                {v.manifesto_url && (
                  <DropdownMenuItem onClick={() => handleOpenFile(v.manifesto_url!, 'Manifesto MDF-e')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Manifesto
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {/* TODO: expandir entregas */}}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver entregas ({v.entregas.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        );
      default:
        return <td className="p-4 align-middle">-</td>;
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0 px-px">
        <Card
          className={`border-border cursor-pointer transition-all ${selectedStatus === null ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'}`}
          onClick={() => setSelectedStatus(null)}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Route className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card
          className={`border-border cursor-pointer transition-all ${selectedStatus === 'finalizada' ? 'ring-2 ring-green-500 ring-inset' : 'hover:bg-muted/30'}`}
          onClick={() => setSelectedStatus(selectedStatus === 'finalizada' ? null : 'finalizada')}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.finalizada}</p>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
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
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <Route className="w-4 h-4" />
          Viagens finalizadas
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
          {sortedData.length} {sortedData.length === 1 ? 'viagem' : 'viagens'}
        </div>
      </div>

      {/* Table */}
      <Card className="border-border hidden md:flex flex-col flex-1 min-h-0">
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
                        <Route className="w-10 h-10 text-muted-foreground/50" />
                        <p>Nenhuma viagem encontrada.</p>
                        {(selectedStatus || Object.keys(advancedFilters).length > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
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
                  paginatedData.map((v) => (
                    <tr key={v.id} className="border-b transition-colors hover:bg-muted/30">
                      {orderedColumns.map((col) => (
                        <React.Fragment key={col.id}>
                          {renderCell(col.id, v)}
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
        {paginatedData.map((v) => {
          const config = statusConfig[v.status];
          const StatusIcon = config?.icon || CheckCircle;
          const destinos = [...new Set(v.entregas.map(e => e.carga.endereco_destino?.cidade).filter(Boolean))];

          return (
            <Card key={v.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="secondary" className="text-xs mb-1 font-mono">
                      {v.codigo}
                    </Badge>
                    <p className="font-medium text-foreground">
                      {v.motorista?.nome_completo || 'Sem motorista'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.entregas.length} entrega{v.entregas.length !== 1 ? 's' : ''} • {v.veiculo?.placa || '-'}
                    </p>
                  </div>
                  <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                    <StatusIcon className="w-3 h-3" />
                    {config?.label || v.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm mb-2">
                  <Route className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{destinos.join(' → ') || '-'}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className={`w-3 h-3 ${v.manifesto_url ? 'text-green-600' : 'text-amber-500'}`} />
                    <span>{v.manifesto_url ? 'MDF-e ✓' : 'MDF-e pendente'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.ended_at || v.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* File Preview */}
      <FilePreviewDialog
        open={filePreviewOpen}
        onOpenChange={setFilePreviewOpen}
        fileUrl={filePreviewUrl}
        title={filePreviewTitle}
      />
    </>
  );
}
