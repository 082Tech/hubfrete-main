import React, { useMemo, useState, useEffect } from 'react';
import { formatWeight } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import { AdvancedFiltersPopover, type AdvancedFilters } from '@/components/historico/AdvancedFiltersPopover';
import type { Database } from '@/integrations/supabase/types';
import {
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
  ChevronDown,
  Calendar,
  FileCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ArrowRightLeft,
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
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { EntregaDocsDialog } from '@/components/entregas/EntregaDocsDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { ViagemTrackingMapDialog } from '@/components/maps/ViagemTrackingMapDialog';
import { TrackingMapDialog } from '@/components/maps/TrackingMapDialog';
import { ViagemDetailsHistoricoDialog } from '@/components/viagens/ViagemDetailsHistoricoDialog';

type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaInViagem {
  id: string;
  codigo: string | null;
  status: StatusEntrega | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  ctes: { id: string }[];
  numero_cte: string | null;
  nfes: { id: string }[];
  canhoto_url: string | null;
  outros_documentos: any[] | null;
  entregue_em: string | null;
  updated_at: string | null;
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

interface ViagemHistorico {
  id: string;
  codigo: string;
  status: string;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  manifesto_url: string | null;
  km_total: number | null;
  mdfes: { pdf_path: string | null; status: string | null }[];
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculo: {
    placa: string;
    tipo: string;
  } | null;
  entregas: EntregaInViagem[];
}

const viagemStatusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  programada: {
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    label: 'Programada',
    icon: Clock,
  },
  aguardando: {
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Aguardando',
    icon: Clock,
  },
  em_andamento: {
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    label: 'Em Andamento',
    icon: Truck,
  },
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

const entregaStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  em_transito: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ArrowRightLeft },
  saiu_para_entrega: { label: 'Em Rota', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MapPin },
  entregue: { label: 'Concluída', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  problema: { label: 'Problema', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  cancelada: { label: 'Cancelada', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Ban },
};

const ITEMS_PER_PAGE = 15;

type SortField = 'encerrada_em' | 'codigo' | 'motorista' | 'entregas' | 'km';
type SortOrder = 'asc' | 'desc';

  type HistoricoViewMode = 'viagens' | 'cargas';

export default function HistoricoEntregas() {
  const { empresa } = useUserContext();
  const [viewMode, setViewMode] = useState<HistoricoViewMode>('viagens');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('encerrada_em');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Entrega details
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaInViagem | null>(null);

  // File preview
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewTitle, setFilePreviewTitle] = useState('Documento');

  // Chat sheet
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [chatEntregaId, setChatEntregaId] = useState<string | null>(null);

  // Tracking map (viagem-level)
  const [trackingViagemId, setTrackingViagemId] = useState<string | null>(null);
  const [trackingViagemInfo, setTrackingViagemInfo] = useState<{ motorista: string; placa: string; codigo: string } | null>(null);

  // Tracking map (entrega-level)
  const [trackingEntregaId, setTrackingEntregaId] = useState<string | null>(null);
  const [trackingEntregaInfo, setTrackingEntregaInfo] = useState<{ motorista: string; placa: string } | null>(null);

  // Viagem detail dialog
  const [detailViagemOpen, setDetailViagemOpen] = useState(false);
  const [selectedViagem, setSelectedViagem] = useState<ViagemHistorico | null>(null);

  // Docs dialog
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [docsEntregaId, setDocsEntregaId] = useState<string | null>(null);
  const [docsEntregaCodigo, setDocsEntregaCodigo] = useState<string | null>(null);
  const [docsEntregaCanhoto, setDocsEntregaCanhoto] = useState<string | null>(null);
  const [docsEntregaOutros, setDocsEntregaOutros] = useState<any[]>([]);

  const { data: viagens = [], isLoading } = useQuery({
    queryKey: ['historico_viagens_expandable', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      // Fetch all viagens (not just finalized)
      const { data: viagensData, error } = await supabase
        .from('viagens')
        .select(`
          id, codigo, status, created_at, updated_at, ended_at,
          manifesto_url, km_total,
          mdfes(pdf_path, status),
          motorista:motoristas(id, nome_completo, telefone),
          veiculo:veiculos(placa, tipo)
        `)
        .in('motorista_id', motoristaIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const viagemIds = (viagensData || []).map(v => v.id);
      if (viagemIds.length === 0) return [];

      // Fetch viagem_entregas links
      const { data: veLinks } = await supabase
        .from('viagem_entregas')
        .select('viagem_id, entrega_id')
        .in('viagem_id', viagemIds);

      const entregaIds = (veLinks || []).map(l => l.entrega_id);

      let entregasMap: Record<string, EntregaInViagem> = {};
      if (entregaIds.length > 0) {
        const { data: entregasData } = await supabase
          .from('entregas')
          .select(`
            id, codigo, status, peso_alocado_kg, valor_frete,
            numero_cte, canhoto_url, outros_documentos, previsao_coleta,
            entregue_em, updated_at,
            ctes(id),
            nfes(id),
            motorista:motoristas(id, nome_completo, telefone),
            veiculo:veiculos(placa, tipo),
            carga:cargas(
              id, codigo, descricao, peso_kg,
              destinatario_nome_fantasia, destinatario_razao_social,
              empresa:empresas!cargas_empresa_id_fkey(nome),
              endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro),
              endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro)
            )
          `)
          .in('id', entregaIds);

        (entregasData || []).forEach(e => {
          entregasMap[e.id] = e as unknown as EntregaInViagem;
        });
      }

      // Build viagem → entregas mapping
      const viagemEntregasMap: Record<string, EntregaInViagem[]> = {};
      (veLinks || []).forEach(link => {
        if (!viagemEntregasMap[link.viagem_id]) viagemEntregasMap[link.viagem_id] = [];
        const entrega = entregasMap[link.entrega_id];
        if (entrega) viagemEntregasMap[link.viagem_id].push(entrega);
      });

      return (viagensData || []).map(v => ({
        ...v,
        mdfes: Array.isArray((v as any).mdfes) ? (v as any).mdfes : [],
        entregas: viagemEntregasMap[v.id] || [],
      })) as unknown as ViagemHistorico[];
    },
    enabled: !!empresa?.id,
  });

  // Stats
  const stats = useMemo(() => ({
    total: viagens.length,
    ativas: viagens.filter(v => ['programada', 'aguardando', 'em_andamento'].includes(v.status)).length,
    finalizada: viagens.filter(v => v.status === 'finalizada').length,
    cancelada: viagens.filter(v => v.status === 'cancelada').length,
    totalEntregas: viagens.reduce((acc, v) => acc + v.entregas.length, 0),
  }), [viagens]);

  // Filtering
  const filtered = useMemo(() => {
    let result = viagens;

    if (selectedStatus) {
      if (selectedStatus === 'ativas') {
        result = result.filter(v => ['programada', 'aguardando', 'em_andamento'].includes(v.status));
      } else {
        result = result.filter(v => v.status === selectedStatus);
      }
    }

    if (advancedFilters.codigo) {
      const q = advancedFilters.codigo.toLowerCase();
      result = result.filter(v =>
        v.codigo.toLowerCase().includes(q) ||
        v.entregas.some(e => (e.codigo || '').toLowerCase().includes(q) || e.carga.codigo.toLowerCase().includes(q))
      );
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

    if (advancedFilters.embarcador) {
      const q = advancedFilters.embarcador.toLowerCase();
      result = result.filter(v =>
        v.entregas.some(e => (e.carga.empresa?.nome || '').toLowerCase().includes(q))
      );
    }

    if (advancedFilters.destinatario) {
      const q = advancedFilters.destinatario.toLowerCase();
      result = result.filter(v =>
        v.entregas.some(e =>
          (e.carga.destinatario_nome_fantasia || '').toLowerCase().includes(q) ||
          (e.carga.destinatario_razao_social || '').toLowerCase().includes(q)
        )
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

  // Sorting
  const sortedData = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'encerrada_em':
          comparison = new Date(a.ended_at || a.updated_at).getTime() - new Date(b.ended_at || b.updated_at).getTime();
          break;
        case 'codigo':
          comparison = a.codigo.localeCompare(b.codigo, 'pt-BR');
          break;
        case 'motorista':
          comparison = (a.motorista?.nome_completo || '').localeCompare(b.motorista?.nome_completo || '', 'pt-BR');
          break;
        case 'entregas':
          comparison = a.entregas.length - b.entregas.length;
          break;
        case 'km':
          comparison = (a.km_total || 0) - (b.km_total || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filtered, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, advancedFilters, sortField, sortOrder]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const formatPeso = (peso: number | null) => formatWeight(peso);

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleOpenFile = (url: string, title: string) => {
    setFilePreviewUrl(url);
    setFilePreviewTitle(title);
    setFilePreviewOpen(true);
  };

  const handleOpenDetails = (entrega: EntregaInViagem) => {
    setSelectedEntrega(entrega);
    setDetailsDialogOpen(true);
  };

  // Pagination renderer
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
          Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((page, idx) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(page)}>
                {page}
              </Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-hidden">
      <TooltipProvider>
        <div className="flex flex-col h-full gap-6 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
              <p className="text-muted-foreground">Todas as viagens e entregas</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Switch de Visualização */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                <Label htmlFor="historico-view-switch" className={`text-sm font-medium transition-colors ${viewMode === 'cargas' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Cargas
                </Label>
                <Switch
                  id="historico-view-switch"
                  checked={viewMode === 'viagens'}
                  onCheckedChange={(checked) => {
                    setViewMode(checked ? 'viagens' : 'cargas');
                    setCurrentPage(1);
                  }}
                />
                <Label htmlFor="historico-view-switch" className={`text-sm font-medium transition-colors flex items-center gap-1 ${viewMode === 'viagens' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <Route className="w-3.5 h-3.5" />
                  Viagens
                </Label>
              </div>
              <AdvancedFiltersPopover
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                showMotorista={true}
                showEmbarcador={true}
                showDestinatario={true}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 px-px">
            <Card
              className={`border-border cursor-pointer transition-all ${selectedStatus === null ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(null)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Route className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Viagens</p>
              </CardContent>
            </Card>
            <Card
              className={`border-border cursor-pointer transition-all ${selectedStatus === 'ativas' ? 'ring-2 ring-blue-500 ring-inset' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedStatus(selectedStatus === 'ativas' ? null : 'ativas')}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.ativas}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
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
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.totalEntregas}</p>
                <p className="text-xs text-muted-foreground">Total Entregas</p>
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
                Filtro: {viagemStatusConfig[selectedStatus]?.label}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={() => setSelectedStatus(null)}
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12 flex-1">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
                  <Route className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma viagem encontrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStatus || Object.keys(advancedFilters).length > 0 ? 'Tente ajustar os filtros' : 'As viagens finalizadas aparecerão aqui'}
                  </p>
                  {(selectedStatus || Object.keys(advancedFilters).length > 0) && (
                    <Button variant="outline" size="sm" onClick={() => { setAdvancedFilters({}); setSelectedStatus(null); }}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                        <tr className="border-b">
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground w-10"></th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[130px] cursor-pointer" onClick={() => handleSort('codigo')}>
                            <div className="flex items-center">
                              Viagem
                              <SortIcon field="codigo" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[150px] cursor-pointer" onClick={() => handleSort('motorista')}>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Motorista
                              <SortIcon field="motorista" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[200px]">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Rotas
                            </div>
                          </th>
                          <th className="h-12 px-4 text-center align-middle font-semibold text-foreground min-w-[90px] cursor-pointer" onClick={() => handleSort('entregas')}>
                            <div className="flex items-center justify-center">
                              Cargas
                              <SortIcon field="entregas" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[100px]">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[80px]">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              MDF-e
                            </div>
                          </th>
                          <th className="h-12 px-4 text-center align-middle font-semibold text-foreground min-w-[80px] cursor-pointer" onClick={() => handleSort('km')}>
                            <div className="flex items-center justify-center">
                              KM
                              <SortIcon field="km" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground min-w-[120px] cursor-pointer" onClick={() => handleSort('encerrada_em')}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Encerrada em
                              <SortIcon field="encerrada_em" />
                            </div>
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-semibold text-foreground w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((viagem) => {
                          const isExpanded = expandedRows.has(viagem.id);
                          const config = viagemStatusConfig[viagem.status];
                          const StatusIcon = config?.icon || CheckCircle;
                          const hasEntregas = viagem.entregas.length > 0;

                          // Build route summary
                          const origens = [...new Set(viagem.entregas.map(e => e.carga.endereco_origem?.cidade).filter(Boolean))];
                          const destinos = [...new Set(viagem.entregas.map(e => e.carga.endereco_destino?.cidade).filter(Boolean))];

                          return (
                            <React.Fragment key={viagem.id}>
                              {/* Main Row */}
                              <tr
                                className={`border-b transition-colors hover:bg-muted/50 ${hasEntregas ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                                onClick={() => hasEntregas && toggleRow(viagem.id)}
                              >
                                <td className="p-2 align-middle">
                                  {hasEntregas && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => { e.stopPropagation(); toggleRow(viagem.id); }}
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
                                  <div className="flex items-center gap-2">
                                    <Route className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="font-medium text-nowrap font-mono">{viagem.codigo}</span>
                                  </div>
                                </td>
                                <td className="p-4 align-middle text-nowrap">
                                  {viagem.motorista ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="w-3 h-3 text-primary" />
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm truncate max-w-[100px]">{viagem.motorista.nome_completo}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-medium">{viagem.motorista.nome_completo}</p>
                                          {viagem.veiculo && <p className="text-xs text-muted-foreground">Placa: {viagem.veiculo.placa}</p>}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </td>
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
                                <td className="p-4 align-middle text-sm text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {viagem.entregas.length}
                                  </Badge>
                                </td>
                                <td className="p-4 align-middle text-nowrap">
                                  <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {config?.label || viagem.status}
                                  </Badge>
                                </td>
                                <td className="p-4 align-middle text-nowrap">
                                  {(() => {
                                    // Prefer mdfes table (pdf_path), fallback to legacy manifesto_url
                                    const mdfe = viagem.mdfes?.find(m => m.pdf_path);
                                    const rawPath = mdfe?.pdf_path || viagem.manifesto_url;
                                    if (!rawPath) return (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        Pendente
                                      </span>
                                    );
                                    // pdf_path is a storage path, not a full URL — generate public URL
                                    const isStoragePath = !rawPath.startsWith('http');
                                    const finalUrl = isStoragePath
                                      ? supabase.storage.from('documentos').getPublicUrl(rawPath).data.publicUrl
                                      : rawPath;
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 gap-1 text-green-600"
                                        onClick={(e) => { e.stopPropagation(); handleOpenFile(finalUrl, 'Manifesto MDF-e'); }}
                                      >
                                        <FileCheck className="w-3 h-3" />
                                        Ver
                                      </Button>
                                    );
                                  })()}
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground text-center text-nowrap">
                                  {viagem.km_total ? `${viagem.km_total.toLocaleString('pt-BR')} km` : '-'}
                                </td>
                                <td className="p-4 align-middle text-sm text-muted-foreground text-nowrap">
                                  {new Date(viagem.ended_at || viagem.updated_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="p-4 align-middle">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => { setSelectedViagem(viagem); setDetailViagemOpen(true); }}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver mais
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        setTrackingViagemId(viagem.id);
                                        setTrackingViagemInfo({
                                          motorista: viagem.motorista?.nome_completo || 'Motorista',
                                          placa: viagem.veiculo?.placa || '-',
                                          codigo: viagem.codigo,
                                        });
                                      }}>
                                        <Route className="w-4 h-4 mr-2" />
                                        Ver histórico no mapa
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>

                              {/* Expanded Row - Entregas subtable */}
                              {isExpanded && hasEntregas && (
                                <tr className="bg-muted/20 hover:bg-muted/20">
                                  <td colSpan={10} className="p-0">
                                    <div className="px-8 py-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Cargas ({viagem.entregas.length})</span>
                                      </div>
                                      <div className="bg-background rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b bg-muted/30">
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Código</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Embarcador</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Destinatário</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Rota</th>
                                              <th className="h-10 px-4 text-right align-middle font-medium text-xs">Peso</th>
                                              <th className="h-10 px-4 text-right align-middle font-medium text-xs">Frete</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">N° CT-e</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Docs</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs">Status</th>
                                              <th className="h-10 px-4 text-left align-middle font-medium text-xs w-10"></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {viagem.entregas.map((entrega) => {
                                              const eStatus = entrega.status || 'aguardando';
                                              const eConfig = entregaStatusConfig[eStatus] || entregaStatusConfig.aguardando;
                                              const EStatusIcon = eConfig.icon;

                                              // Use real tables (same source as modal)
                                              const hasCte = (entrega.ctes?.length ?? 0) > 0;
                                              const hasCanhoto = !!entrega.canhoto_url;
                                              const hasNf = (entrega.nfes?.length ?? 0) > 0;
                                              const docsComplete = hasCte && hasCanhoto && hasNf;
                                              const docCount = (entrega.ctes?.length ?? 0) + (entrega.nfes?.length ?? 0) + (hasCanhoto ? 1 : 0);

                                              const origem = entrega.carga.endereco_origem;
                                              const destino = entrega.carga.endereco_destino;

                                              return (
                                                <tr key={entrega.id} className="border-b last:border-0 hover:bg-muted/30">
                                                  <td className="p-4 align-middle font-mono text-sm font-medium text-primary text-nowrap">
                                                    {entrega.codigo || entrega.carga.codigo}
                                                  </td>
                                                  <td className="p-4 align-middle text-nowrap">
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <span className="text-sm truncate max-w-[120px] block">
                                                          {entrega.carga.empresa?.nome || '-'}
                                                        </span>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        {entrega.carga.empresa?.nome || 'Não informado'}
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </td>
                                                  <td className="p-4 align-middle text-nowrap">
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <span className="text-sm truncate max-w-[120px] block">
                                                          {entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || '-'}
                                                        </span>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        {entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Não informado'}
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </td>
                                                  <td className="p-4 align-middle text-nowrap">
                                                    <div className="flex items-center gap-1 text-sm">
                                                      <span className="truncate max-w-[50px]">{origem?.cidade || '-'}</span>
                                                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                                      <span className="truncate max-w-[50px]">{destino?.cidade || '-'}</span>
                                                    </div>
                                                  </td>
                                                  <td className="p-4 align-middle text-right text-sm font-medium">
                                                    {formatPeso(entrega.peso_alocado_kg || entrega.carga.peso_kg)}
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
                                                      className={`h-7 px-2 gap-1 ${docsComplete ? 'text-green-600' : 'text-amber-600'}`}
                                                      title="Ver documentos"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDocsEntregaId(entrega.id);
                                                        setDocsEntregaCodigo(entrega.codigo || entrega.carga.codigo);
                                                        setDocsEntregaCanhoto(entrega.canhoto_url);
                                                        setDocsEntregaOutros(Array.isArray(entrega.outros_documentos) ? entrega.outros_documentos : []);
                                                        setDocsDialogOpen(true);
                                                      }}
                                                    >
                                                      <FileText className="w-3 h-3" />
                                                      <span className="text-xs font-medium">{docCount}</span>
                                                      {!docsComplete && <AlertTriangle className="w-3 h-3" />}
                                                    </Button>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <Badge className={`${eConfig.color} text-xs`}>
                                                      <EStatusIcon className="w-3 h-3 mr-1" />
                                                      {eConfig.label}
                                                    </Badge>
                                                  </td>
                                                  <td className="p-4 align-middle">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                          <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => handleOpenDetails(entrega)}>
                                                          <Eye className="w-4 h-4 mr-2" />
                                                          Ver detalhes
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                          setChatEntregaId(entrega.id);
                                                          setChatSheetOpen(true);
                                                        }}>
                                                          <MessageCircle className="w-4 h-4 mr-2" />
                                                          Ver conversa
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                          setTrackingEntregaId(entrega.id);
                                                          setTrackingEntregaInfo({
                                                            motorista: viagem.motorista?.nome_completo || 'Motorista',
                                                            placa: viagem.veiculo?.placa || '-',
                                                          });
                                                        }}>
                                                          <Route className="w-4 h-4 mr-2" />
                                                          Ver rastreamento
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

                  {renderPagination()}
                </>
              )}
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedData.map((viagem) => {
              const config = viagemStatusConfig[viagem.status];
              const StatusIcon = config?.icon || CheckCircle;
              const origens = [...new Set(viagem.entregas.map(e => e.carga.endereco_origem?.cidade).filter(Boolean))];
              const destinos = [...new Set(viagem.entregas.map(e => e.carga.endereco_destino?.cidade).filter(Boolean))];

              return (
                <Card key={viagem.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1 font-mono">{viagem.codigo}</Badge>
                        <p className="font-medium text-foreground">
                          {viagem.motorista?.nome_completo || 'Sem motorista'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {viagem.entregas.length} {viagem.entregas.length === 1 ? 'carga' : 'cargas'}
                          {viagem.km_total ? ` • ${viagem.km_total} km` : ''}
                        </p>
                      </div>
                      <Badge className={`text-xs gap-1 ${config?.color || ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config?.label || viagem.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-3">
                      <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="truncate">{origens[0] || '-'}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="truncate">{destinos[0] || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {new Date(viagem.ended_at || viagem.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-2">
                        {viagem.manifesto_url && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => handleOpenFile(viagem.manifesto_url!, 'MDF-e')}>
                            <FileCheck className="w-3 h-3 mr-1" />
                            MDF-e
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Dialogs */}
        <EntregaDetailsDialog
          entrega={selectedEntrega as any}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />

        <EntregaDocsDialog
          open={docsDialogOpen}
          onOpenChange={setDocsDialogOpen}
          entregaId={docsEntregaId || ''}
          entregaCodigo={docsEntregaCodigo}
          canhotoUrl={docsEntregaCanhoto}
          outrosDocumentos={docsEntregaOutros}
        />

        <ViagemTrackingMapDialog
          viagemId={trackingViagemId}
          info={trackingViagemInfo}
          onClose={() => { setTrackingViagemId(null); setTrackingViagemInfo(null); }}
        />

        <TrackingMapDialog
          entregaId={trackingEntregaId}
          info={trackingEntregaInfo}
          onClose={() => { setTrackingEntregaId(null); setTrackingEntregaInfo(null); }}
        />

        <ViagemDetailsHistoricoDialog
          viagem={selectedViagem}
          open={detailViagemOpen}
          onOpenChange={setDetailViagemOpen}
        />

        <FilePreviewDialog
          open={filePreviewOpen}
          onOpenChange={setFilePreviewOpen}
          fileUrl={filePreviewUrl}
          title={filePreviewTitle}
        />

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
