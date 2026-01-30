import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import textAbbr from '@/utils/textAbbr';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Package,
  MapPin,
  Calendar,
  Loader2,
  Filter,
  Truck,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  User,
  RefreshCw,
  X,
  WifiOff,
  Radio,
  ArrowRight,
  Clock,
  MoreHorizontal,
  Eye,
  FileText,
  Trash2,
  Upload,
  XCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { AnexarDocumentosDialog } from '@/components/entregas/AnexarDocumentosDialog';
import { FilePreviewDialog } from '@/components/entregas/FilePreviewDialog';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the OpenStreetMap component
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap'));
type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaCompleta {
  id: string;
  codigo: string | null;
  status: StatusEntrega | null;
  created_at: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  updated_at: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  cte_url: string | null;
  numero_cte: string | null;
  notas_fiscais_urls: string[] | null;
  manifesto_url: string | null;
  canhoto_url: string | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
    email: string | null;
    foto_url: string | null;
  } | null;
  veiculo: {
    id: string;
    placa: string;
    tipo: string | null;
  } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
    tipo: string;
    data_entrega_limite: string | null;
    destinatario_nome_fantasia: string | null;
    destinatario_razao_social: string | null;
    endereco_origem: {
      cidade: string;
      estado: string;
      logradouro: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    endereco_destino: {
      cidade: string;
      estado: string;
      logradouro: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    empresa: {
      nome: string | null;
    } | null;
  };
}

// Status configuration for display
const statusEntregaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando', icon: Clock },
  'saiu_para_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Saiu para Coleta', icon: Package },
  'saiu_para_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Saiu para Entrega', icon: Truck },
  'entregue': { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Entregue', icon: CheckCircle },
  'problema': { color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Problema', icon: AlertCircle },
  'cancelada': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelada', icon: XCircle },
};

// Status filters for active deliveries
const allStatusFilters = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'saiu_para_coleta', label: 'Saiu para Coleta' },
  { value: 'saiu_para_entrega', label: 'Saiu para Entrega' },
  { value: 'problema', label: 'Problema' },
];

export default function GestaoEntregas() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMotoristaIds, setSelectedMotoristaIds] = useState<string[]>([]);
  const [motoristaPopoverOpen, setMotoristaPopoverOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntregaForDetails, setSelectedEntregaForDetails] = useState<EntregaCompleta | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entregaToDelete, setEntregaToDelete] = useState<EntregaCompleta | null>(null);
  const [anexarCteDialogOpen, setAnexarCteDialogOpen] = useState(false);
  const [entregaForCte, setEntregaForCte] = useState<EntregaCompleta | null>(null);
  const [ctePreviewOpen, setCtePreviewOpen] = useState(false);
  const [ctePreviewUrl, setCtePreviewUrl] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [tableExpanded, setTableExpanded] = useState(true);

  // Chat sheet state
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [chatEntregaId, setChatEntregaId] = useState<string | null>(null);

  // Status change confirmation dialog state
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    type: 'single' | 'bulk';
    entregaId?: string;
    entregaIds?: string[];
    newStatus: StatusEntrega;
    motoristaName?: string;
    count?: number;
  } | null>(null);

  // Monitor internet connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get sidebar state from localStorage (synced with PortalLayoutWrapper)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('hubfrete_sidebar_collapsed') === 'true';
  });

  // Listen for storage changes to sync sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      setIsSidebarCollapsed(localStorage.getItem('hubfrete_sidebar_collapsed') === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch entregas da transportadora
  const { data: entregas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['gestao_entregas_transportadora', empresa?.id],
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
        .select(`
          id,
          codigo,
          status,
          created_at,
          coletado_em,
          entregue_em,
          updated_at,
          peso_alocado_kg,
          valor_frete,
          cte_url,
          numero_cte,
          notas_fiscais_urls,
          manifesto_url,
          canhoto_url,
          motorista:motoristas(id, nome_completo, telefone, email, foto_url),
          veiculo:veiculos(id, placa, tipo),
          carga:cargas(
            id,
            codigo,
            descricao,
            peso_kg,
            tipo,
            data_entrega_limite,
            destinatario_nome_fantasia,
            destinatario_razao_social,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro, latitude, longitude),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro, latitude, longitude),
            empresa:empresas!cargas_empresa_id_fkey(nome)
          )
        `)
        .in('motorista_id', motoristaIds)
        .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega', 'problema'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntregaCompleta[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 60000,
  });

  // Get unique motoristas from entregas for the filter dropdown
  const motoristasFromEntregas = useMemo(() => {
    const motoristasMap = new Map<string, { id: string; nome_completo: string }>();
    entregas.forEach(e => {
      if (e.motorista) {
        motoristasMap.set(e.motorista.id, {
          id: e.motorista.id,
          nome_completo: e.motorista.nome_completo,
        });
      }
    });
    return Array.from(motoristasMap.values()).sort((a, b) =>
      a.nome_completo.localeCompare(b.nome_completo)
    );
  }, [entregas]);

  // Get all driver IDs for realtime tracking
  const motoristaIds = useMemo(() => {
    const ids = new Set<string>();
    entregas.forEach(e => {
      if (e.motorista?.id) {
        ids.add(e.motorista.id);
      }
    });
    return Array.from(ids);
  }, [entregas]);

  // Real-time driver locations
  const { localizacaoMap, isConnected: isRealtimeConnected } = useRealtimeLocalizacoes({
    motoristaIds,
    enabled: motoristaIds.length > 0,
  });

  // Filter entregas
  const filteredEntregas = useMemo(() => {
    return entregas.filter(entrega => {
      const matchesSearch =
        entrega.carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.motorista?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entrega.numero_cte?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(entrega.status || '');

      const matchesMotorista = selectedMotoristaIds.length === 0 ||
        (entrega.motorista?.id && selectedMotoristaIds.includes(entrega.motorista.id));

      return matchesSearch && matchesStatus && matchesMotorista;
    });
  }, [entregas, searchTerm, selectedStatuses, selectedMotoristaIds]);

  // Calculate stats
  const stats = useMemo(() => {
    const byStatus = entregas.reduce((acc, e) => {
      acc[e.status || ''] = (acc[e.status || ''] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalFrete = entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);

    return {
      total: entregas.length,
      aguardando: byStatus['aguardando'] || 0,
      saiu_para_coleta: byStatus['saiu_para_coleta'] || 0,
      saiu_para_entrega: byStatus['saiu_para_entrega'] || 0,
      problema: byStatus['problema'] || 0,
      totalFrete,
    };
  }, [entregas]);

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg.toLocaleString('pt-BR')}kg`;
  };

  // Group entregas by driver
  const entregasGroupedByDriver = useMemo(() => {
    const grouped = new Map<string, { motorista: EntregaCompleta['motorista']; veiculo: EntregaCompleta['veiculo']; entregas: EntregaCompleta[] }>();
    
    filteredEntregas.forEach(entrega => {
      const motoristaId = entrega.motorista?.id || 'sem-motorista';
      if (!grouped.has(motoristaId)) {
        grouped.set(motoristaId, {
          motorista: entrega.motorista,
          veiculo: entrega.veiculo,
          entregas: [],
        });
      }
      grouped.get(motoristaId)!.entregas.push(entrega);
    });

    return Array.from(grouped.entries()).map(([id, data]) => ({
      motoristaId: id,
      ...data,
    }));
  }, [filteredEntregas]);

  // Toggle driver expansion
  const toggleDriverExpansion = (motoristaId: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(motoristaId)) {
        next.delete(motoristaId);
      } else {
        next.add(motoristaId);
      }
      return next;
    });
  };

  // Delete entrega mutation
  const deleteEntrega = useMutation({
    mutationFn: async (entrega: EntregaCompleta) => {
      const pesoAlocado = entrega.peso_alocado_kg || 0;
      const cargaId = entrega.carga.id;

      const { data: cargaAtual, error: fetchError } = await supabase
        .from('cargas')
        .select('peso_disponivel_kg, peso_kg, status')
        .eq('id', cargaId)
        .single();

      if (fetchError) throw fetchError;

      const pesoDisponivelAtual = cargaAtual.peso_disponivel_kg ?? 0;
      const novoPesoDisponivel = pesoDisponivelAtual + pesoAlocado;

      const novoStatus = novoPesoDisponivel >= cargaAtual.peso_kg
        ? 'publicada'
        : 'parcialmente_alocada';

      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('entrega_id', entrega.id)
        .single();

      if (chat) {
        await supabase.from('chat_participantes').delete().eq('chat_id', chat.id);
        await supabase.from('mensagens').delete().eq('chat_id', chat.id);
        await supabase.from('chats').delete().eq('id', chat.id);
      }

      const { error: deleteError } = await supabase
        .from('entregas')
        .delete()
        .eq('id', entrega.id);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('cargas')
        .update({
          peso_disponivel_kg: Math.min(novoPesoDisponivel, cargaAtual.peso_kg),
          status: novoStatus
        })
        .eq('id', cargaId);

      if (updateError) throw updateError;

      return { pesoRestaurado: pesoAlocado, novoStatus };
    },
    onSuccess: (result) => {
      toast.success(`Entrega excluída. ${result.pesoRestaurado.toLocaleString('pt-BR')} kg liberados na carga.`);
      queryClient.invalidateQueries({ queryKey: ['gestao_entregas_transportadora'] });
      setDeleteDialogOpen(false);
      setEntregaToDelete(null);
    },
    onError: (error) => {
      console.error('Erro ao excluir entrega:', error);
      toast.error('Erro ao excluir entrega');
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ entregaId, newStatus }: { entregaId: string; newStatus: StatusEntrega }) => {
      const updateData: { status: StatusEntrega; coletado_em?: string | null; entregue_em?: string | null } = {
        status: newStatus,
      };

      if (newStatus === 'saiu_para_coleta') {
        updateData.coletado_em = new Date().toISOString();
      }
      if (newStatus === 'entregue') {
        updateData.entregue_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('entregas')
        .update(updateData)
        .eq('id', entregaId);

      if (error) throw error;
      return { newStatus };
    },
    onSuccess: (result) => {
      const config = statusEntregaConfig[result.newStatus];
      toast.success(`Status alterado para "${config?.label || result.newStatus}"`);
      queryClient.invalidateQueries({ queryKey: ['gestao_entregas_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da entrega');
    },
  });

  // Bulk update status mutation
  const updateBulkStatus = useMutation({
    mutationFn: async ({ entregaIds, newStatus }: { entregaIds: string[]; newStatus: StatusEntrega }) => {
      const updateData: { status: StatusEntrega; coletado_em?: string | null; entregue_em?: string | null } = {
        status: newStatus,
      };

      if (newStatus === 'saiu_para_coleta') {
        updateData.coletado_em = new Date().toISOString();
      }
      if (newStatus === 'entregue') {
        updateData.entregue_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('entregas')
        .update(updateData)
        .in('id', entregaIds);

      if (error) throw error;
      return { newStatus, count: entregaIds.length };
    },
    onSuccess: (result) => {
      const config = statusEntregaConfig[result.newStatus];
      toast.success(`${result.count} entregas alteradas para "${config?.label || result.newStatus}"`);
      queryClient.invalidateQueries({ queryKey: ['gestao_entregas_transportadora'] });
    },
    onError: (error) => {
      console.error('Erro ao alterar status em massa:', error);
      toast.error('Erro ao alterar status das entregas');
    },
  });

  // Helper to check if delivery has required documents for "entregue" status
  const canMarkAsDelivered = (entrega: EntregaCompleta): boolean => {
    const nfsCount = entrega.notas_fiscais_urls?.length || 0;
    const hasCte = !!entrega.cte_url;
    const hasManifesto = !!entrega.manifesto_url;
    const hasCanhoto = !!entrega.canhoto_url;
    return nfsCount >= 1 && hasCte && hasManifesto && hasCanhoto;
  };

  const getEntregaById = (entregaId: string): EntregaCompleta | undefined => {
    return entregas.find(e => e.id === entregaId);
  };

  const handleStatusChange = (entregaId: string, newStatus: StatusEntrega) => {
    if (newStatus === 'entregue') {
      const entrega = getEntregaById(entregaId);
      if (entrega && !canMarkAsDelivered(entrega)) {
        toast.error('Não é possível marcar como entregue. É necessário anexar: pelo menos 1 Nota Fiscal, CT-e, Manifesto e Canhoto.');
        return;
      }
    }

    setPendingStatusChange({
      type: 'single',
      entregaId,
      newStatus,
      count: 1,
    });
    setStatusChangeDialogOpen(true);
  };

  const handleBulkStatusChange = (entregaIds: string[], newStatus: StatusEntrega, motoristaName?: string) => {
    if (newStatus === 'entregue') {
      const entregasWithMissingDocs = entregaIds.filter(id => {
        const entrega = getEntregaById(id);
        return entrega && !canMarkAsDelivered(entrega);
      });

      if (entregasWithMissingDocs.length > 0) {
        toast.error(`${entregasWithMissingDocs.length} entrega(s) não podem ser marcadas como entregue. É necessário anexar: NF, CT-e, Manifesto e Canhoto em cada.`);
        return;
      }
    }

    setPendingStatusChange({
      type: 'bulk',
      entregaIds,
      newStatus,
      motoristaName,
      count: entregaIds.length,
    });
    setStatusChangeDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return;

    if (pendingStatusChange.type === 'single' && pendingStatusChange.entregaId) {
      updateStatus.mutate({ entregaId: pendingStatusChange.entregaId, newStatus: pendingStatusChange.newStatus });
    } else if (pendingStatusChange.type === 'bulk' && pendingStatusChange.entregaIds) {
      updateBulkStatus.mutate({ entregaIds: pendingStatusChange.entregaIds, newStatus: pendingStatusChange.newStatus });
    }

    setStatusChangeDialogOpen(false);
    setPendingStatusChange(null);
  };

  const handleDeleteClick = (entrega: EntregaCompleta) => {
    setEntregaToDelete(entrega);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entregaToDelete) {
      deleteEntrega.mutate(entregaToDelete);
    }
  };

  // Map data for entregas with location
  const mapData = useMemo(() => {
    const result: Array<{
      id: string;
      entregaId: string;
      entregaCodigo: string | null;
      cargaCodigo: string;
      latitude: number | null;
      longitude: number | null;
      status: string | null;
      codigo: string | null;
      descricao: string | null;
      motorista: string | null;
      motoristaFotoUrl: string | null;
      motoristaOnline: boolean | null;
      telefone: string | null;
      placa: string | null;
      pesoAlocado: number | null;
      valorFrete: number | null;
      origem: string | null;
      destino: string | null;
      origemCoords: { lat: number; lng: number } | null;
      destinoCoords: { lat: number; lng: number } | null;
      lastLocationUpdate?: number | null;
      heading?: number | null;
    }> = [];

    filteredEntregas.forEach(e => {
      const origem = e.carga.endereco_origem;
      const destino = e.carga.endereco_destino;
      const motoristaId = e.motorista?.id;
      const localizacao = motoristaId ? localizacaoMap.get(motoristaId) : null;

      const hasLocation = localizacao?.latitude != null && localizacao?.longitude != null;
      const hasRoute = (origem?.latitude != null && origem?.longitude != null) || (destino?.latitude != null && destino?.longitude != null);

      if (!hasLocation && !hasRoute) return;

      result.push({
        id: e.id,
        entregaId: e.id,
        entregaCodigo: e.codigo,
        cargaCodigo: e.carga.codigo,
        latitude: localizacao?.latitude ?? null,
        longitude: localizacao?.longitude ?? null,
        status: e.status || null,
        codigo: e.carga.codigo,
        descricao: e.carga.descricao,
        motorista: e.motorista?.nome_completo || null,
        motoristaFotoUrl: e.motorista?.foto_url || null,
        motoristaOnline: localizacao?.status ?? null,
        telefone: e.motorista?.telefone || null,
        placa: e.veiculo?.placa || null,
        pesoAlocado: e.peso_alocado_kg || null,
        valorFrete: e.valor_frete || null,
        origem: origem ? `${origem.cidade}, ${origem.estado}` : null,
        destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
        origemCoords: origem?.latitude != null && origem?.longitude != null
          ? { lat: origem.latitude, lng: origem.longitude }
          : null,
        destinoCoords: destino?.latitude != null && destino?.longitude != null
          ? { lat: destino.latitude, lng: destino.longitude }
          : null,
        lastLocationUpdate: localizacao?.timestamp ?? null,
        heading: localizacao?.heading ?? null,
      });
    });

    return result;
  }, [filteredEntregas, localizacaoMap]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleMotoristaToggle = (motoristaId: string) => {
    setSelectedMotoristaIds(prev =>
      prev.includes(motoristaId)
        ? prev.filter(id => id !== motoristaId)
        : [...prev, motoristaId]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSearchTerm('');
    setSelectedMotoristaIds([]);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Live indicator component
  const LiveIndicator = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${isOnline
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
            {isOnline ? (
              <>
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Ao Vivo</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline
            ? 'Mapa atualizado em tempo real'
            : 'Sem conexão com a internet'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Render entrega row for nested subtable
  const renderEntregaRow = (entrega: EntregaCompleta, idx: number) => {
    const status = entrega.status || 'aguardando';
    const statusConfig = statusEntregaConfig[status];
    const StatusIcon = statusConfig?.icon || Package;
    const isSelected = selectedEntregaId === entrega.id;
    
    const hasCte = !!entrega.cte_url;
    const hasManifesto = !!entrega.manifesto_url;
    const hasCanhoto = !!entrega.canhoto_url;
    const nfsCount = entrega.notas_fiscais_urls?.length || 0;
    const totalDocs = (hasCte ? 1 : 0) + nfsCount + (hasManifesto ? 1 : 0) + (hasCanhoto ? 1 : 0);
    const hasMissingCritical = !hasCte || !hasManifesto || !hasCanhoto || nfsCount === 0;

    return (
      <TableRow 
        key={entrega.id}
        className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`}
        onClick={() => setSelectedEntregaId(isSelected ? null : entrega.id)}
      >
        <TableCell className="py-2.5">
          <Badge variant="secondary" className="text-xs font-mono whitespace-nowrap">
            {entrega.codigo || entrega.carga.codigo}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5">
          {entrega.motorista ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={entrega.motorista.foto_url || undefined} alt={entrega.motorista.nome_completo} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {entrega.motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {textAbbr(entrega.motorista.nome_completo, 18)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{entrega.motorista.nome_completo}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2">
            <Truck className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-mono">
              {entrega.veiculo?.placa || '-'}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right py-2.5">
          <span className="text-sm font-medium">
            {entrega.peso_alocado_kg ? formatWeight(entrega.peso_alocado_kg) : '-'}
          </span>
        </TableCell>
        <TableCell className="text-right py-2.5">
          <span className="text-sm font-medium text-green-600">
            {formatCurrency(entrega.valor_frete)}
          </span>
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            {entrega.numero_cte || '-'}
          </span>
        </TableCell>
        <TableCell className="py-2.5">
          <Badge className={`${statusConfig?.color || ''} text-xs gap-1`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig?.label || status}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 gap-1 ${hasMissingCritical ? 'text-amber-600' : 'text-green-600'}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntregaForDetails(entrega);
              setDetailsDialogOpen(true);
            }}
          >
            <FileText className="w-3 h-3" />
            {totalDocs}
            {hasMissingCritical && <AlertTriangle className="w-3 h-3" />}
          </Button>
        </TableCell>
        <TableCell className="py-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setChatEntregaId(entrega.id);
                  setChatSheetOpen(true);
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir chat</TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-popover">
              <DropdownMenuItem onClick={() => setSelectedEntregaId(entrega.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver no mapa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectedEntregaForDetails(entrega);
                setDetailsDialogOpen(true);
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setEntregaForCte(entrega);
                setAnexarCteDialogOpen(true);
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Gerenciar Documentos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Alterar status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-48 bg-popover">
                    {Object.entries(statusEntregaConfig).map(([statusKey, config]) => {
                      const isCurrentStatus = entrega.status === statusKey;
                      const StatusIconComponent = config.icon;
                      return (
                        <DropdownMenuItem
                          key={statusKey}
                          disabled={isCurrentStatus}
                          className={isCurrentStatus ? 'opacity-50' : ''}
                          onClick={() => handleStatusChange(entrega.id, statusKey as StatusEntrega)}
                        >
                          <StatusIconComponent className="w-4 h-4 mr-2" />
                          {config.label}
                          {isCurrentStatus && (
                            <CheckCircle className="w-3 h-3 ml-auto text-primary" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => handleDeleteClick(entrega)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir entrega
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      {/* Desktop: Fullscreen Map Layout */}
      <div 
        className="hidden lg:block fixed inset-0 overflow-hidden transition-[left] duration-300"
        style={{ left: isSidebarCollapsed ? '4rem' : '16rem' }}
      >
        <TooltipProvider>
          {/* Fullscreen Map Container */}
          <div className="absolute inset-0 z-0">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <EntregasMap
                entregas={mapData}
                selectedEntregaId={selectedEntregaId}
                onSelectEntrega={setSelectedEntregaId}
                fullHeight
                hideLegend
                hideSelectionBadge
              />
            </Suspense>
          </div>

          {/* Loading/Empty States */}
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Card className="border-border bg-background shadow-lg pointer-events-auto">
                <CardContent className="p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
                </CardContent>
              </Card>
            </div>
          ) : filteredEntregas.length === 0 && entregas.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Card className="border-border bg-background shadow-lg max-w-sm pointer-events-auto">
                <CardContent className="p-6 text-center">
                  <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">Nenhuma entrega encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    Aceite cargas para começar a gerenciar entregas
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Selected Delivery Card - positioned to the left of control panel */}
              {selectedEntregaId && (() => {
                const selectedEntrega = mapData.find(e => e.entregaId === selectedEntregaId || e.id === selectedEntregaId);
                if (!selectedEntrega) return null;
                const statusConfig = statusEntregaConfig[selectedEntrega.status || 'aguardando'];
                const StatusIcon = statusConfig?.icon || Package;
                return (
                  <div className={`absolute top-4 z-30 transition-all duration-300 ${filtersCollapsed ? 'right-16' : 'right-[22rem]'}`}>
                    <Card className="w-64 border shadow-xl bg-background">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${statusConfig?.color?.split(' ')[0] || 'bg-muted'}`}>
                              <StatusIcon className={`w-4 h-4 ${statusConfig?.color?.split(' ')[1] || 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{selectedEntrega.entregaCodigo || 'Entrega'}</p>
                              <p className="text-[10px] text-muted-foreground">{selectedEntrega.cargaCodigo}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setSelectedEntregaId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 pt-0 space-y-2">
                        <Badge variant="outline" className={`text-[10px] ${statusConfig?.color || ''}`}>
                          {statusConfig?.label || selectedEntrega.status}
                        </Badge>
                        
                        {/* Route Info */}
                        <div className="space-y-1.5">
                          {selectedEntrega.origem && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              <span className="text-muted-foreground truncate">{selectedEntrega.origem}</span>
                            </div>
                          )}
                          {selectedEntrega.destino && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                              <span className="text-muted-foreground truncate">{selectedEntrega.destino}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Driver & Vehicle */}
                        {(selectedEntrega.motorista || selectedEntrega.placa) && (
                          <div className="pt-1.5 border-t flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {selectedEntrega.motoristaFotoUrl ? (
                                <AvatarImage src={selectedEntrega.motoristaFotoUrl} />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {selectedEntrega.motorista?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'M'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{selectedEntrega.motorista || 'Motorista'}</p>
                              {selectedEntrega.placa && (
                                <p className="text-[10px] text-muted-foreground">{selectedEntrega.placa}</p>
                              )}
                            </div>
                            {selectedEntrega.motoristaOnline !== null && (
                              <div className={`w-2 h-2 rounded-full ${selectedEntrega.motoristaOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                            )}
                          </div>
                        )}
                        
                        {/* Weight & Freight */}
                        <div className="pt-1.5 border-t grid grid-cols-2 gap-2">
                          {selectedEntrega.pesoAlocado && (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Peso</p>
                              <p className="font-medium">{formatWeight(selectedEntrega.pesoAlocado)}</p>
                            </div>
                          )}
                          {selectedEntrega.valorFrete && (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Frete</p>
                              <p className="font-medium text-green-600">{formatCurrency(selectedEntrega.valorFrete)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Floating Control Panel - Top Right */}
              <div className={`absolute top-4 z-20 transition-all duration-300 ${filtersCollapsed ? 'right-4' : 'right-4'}`}>
                {filtersCollapsed ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 bg-background shadow-lg"
                      onClick={() => setFiltersCollapsed(false)}
                    >
                      <PanelLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 bg-background shadow-lg"
                      onClick={() => refetch()}
                      disabled={isLoading || isFetching}
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ) : (
                  <Card className="w-80 border shadow-xl bg-background">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm">Gestão de Entregas</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <LiveIndicator />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => refetch()}
                            disabled={isLoading || isFetching}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setFiltersCollapsed(true)}
                          >
                            <PanelLeftClose className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0 space-y-3">
                      {/* Status Summary Cards */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <div>
                            <span className="text-lg font-bold text-amber-600">{stats.aguardando}</span>
                            <p className="text-[10px] text-amber-600/80">Aguard.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <div>
                            <span className="text-lg font-bold text-blue-600">{stats.saiu_para_coleta}</span>
                            <p className="text-[10px] text-blue-600/80">Coleta</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-2">
                          <Truck className="w-4 h-4 text-purple-600" />
                          <div>
                            <span className="text-lg font-bold text-purple-600">{stats.saiu_para_entrega}</span>
                            <p className="text-[10px] text-purple-600/80">Entrega</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <div>
                            <span className="text-lg font-bold text-destructive">{stats.problema}</span>
                            <p className="text-[10px] text-destructive/80">Probl.</p>
                          </div>
                        </div>
                      </div>

                      {/* Total Frete */}
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency(stats.totalFrete)}</span>
                          <p className="text-[10px] text-emerald-600/80">Frete Total</p>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar código, motorista..."
                          className="pl-8 h-8 text-xs bg-background"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Motorista Filter */}
                      <Popover open={motoristaPopoverOpen} onOpenChange={setMotoristaPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={motoristaPopoverOpen}
                            className="w-full justify-between h-8 text-xs"
                          >
                            <span className="text-left truncate">
                              {selectedMotoristaIds.length === 0
                                ? "Todos os motoristas"
                                : selectedMotoristaIds.length === 1
                                  ? motoristasFromEntregas.find(m => m.id === selectedMotoristaIds[0])?.nome_completo
                                  : `${selectedMotoristaIds.length} motoristas`}
                            </span>
                            <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar motorista..." />
                            <CommandList>
                              <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                              <CommandGroup>
                                {motoristasFromEntregas.map((m) => (
                                  <CommandItem
                                    key={m.id}
                                    value={m.nome_completo}
                                    onSelect={() => handleMotoristaToggle(m.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Checkbox
                                      checked={selectedMotoristaIds.includes(m.id)}
                                      className="pointer-events-none"
                                    />
                                    <span>{m.nome_completo}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Filters - Collapsible */}
                      <details className="group">
                        <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
                          <Filter className="w-3 h-3" />
                          Filtros de Status
                          <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 space-y-1.5">
                          {allStatusFilters.map(status => (
                            <div key={status.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-${status.value}`}
                                checked={selectedStatuses.includes(status.value)}
                                onCheckedChange={() => handleStatusToggle(status.value)}
                                className="h-3.5 w-3.5"
                              />
                              <Label htmlFor={`filter-${status.value}`} className="text-xs font-normal cursor-pointer">
                                {status.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </details>

                      {/* Active Filters */}
                      {(selectedStatuses.length > 0 || selectedMotoristaIds.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {selectedStatuses.map(status => {
                            const config = statusEntregaConfig[status];
                            return (
                              <Badge
                                key={status}
                                variant="outline"
                                className={`${config?.color || ''} cursor-pointer text-[9px] px-1.5 py-0`}
                                onClick={() => handleStatusToggle(status)}
                              >
                                {config?.label || status}
                                <X className="w-2.5 h-2.5 ml-1" />
                              </Badge>
                            );
                          })}
                          {selectedMotoristaIds.length > 0 && (
                            <Badge
                              variant="outline"
                              className="cursor-pointer text-[9px] px-1.5 py-0"
                              onClick={() => setSelectedMotoristaIds([])}
                            >
                              {selectedMotoristaIds.length} motorista(s)
                              <X className="w-2.5 h-2.5 ml-1" />
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Legend */}
                      <details className="group" open>
                        <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
                          <MapPin className="w-3 h-3" />
                          Legenda do Mapa
                          <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 space-y-2">
                          <div className="space-y-1">
                            <p className="text-[9px] font-medium text-muted-foreground uppercase">Status</p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {[
                                { key: 'aguardando', color: '#f97316', label: 'Aguardando' },
                                { key: 'saiu_para_coleta', color: '#3b82f6', label: 'Coleta' },
                                { key: 'saiu_para_entrega', color: '#8b5cf6', label: 'Entrega' },
                                { key: 'problema', color: '#ef4444', label: 'Problema' },
                              ].map(item => (
                                <div key={item.key} className="flex items-center gap-1">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1 pt-1 border-t">
                            <p className="text-[9px] font-medium text-muted-foreground uppercase">Conexão</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <span className="text-[10px] text-muted-foreground">Online</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-[10px] text-muted-foreground">Offline</span>
                              </div>
                            </div>
                          </div>
                          {selectedEntregaId && (
                            <div className="space-y-1 pt-1 border-t">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase">Rota</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                  <span className="text-[10px] text-muted-foreground">Origem</span>
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 ml-2" />
                                  <span className="text-[10px] text-muted-foreground">Destino</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-0" style={{ borderTop: '2px dashed #f97316' }} />
                                  <span className="text-[10px] text-muted-foreground">p/ Coleta</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-0" style={{ borderTop: '2px solid #3b82f6' }} />
                                  <span className="text-[10px] text-muted-foreground">p/ Entrega</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Floating Table Panel at Bottom - Full Width */}
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <Card className="border bg-background shadow-xl">
                  <CardHeader className="py-2.5 px-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Entregas por Motorista ({entregasGroupedByDriver.length})</CardTitle>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setTableExpanded(!tableExpanded)}
                      >
                        {tableExpanded ? (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Minimizar
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-4 h-4 mr-1" />
                            Expandir
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {tableExpanded && (
                    <CardContent className="p-0">
                      <div className="max-h-[340px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow>
                              <TableHead className="font-semibold w-8"></TableHead>
                              <TableHead className="font-semibold min-w-[200px]">Motorista</TableHead>
                              <TableHead className="font-semibold min-w-[100px]">Veículo</TableHead>
                              <TableHead className="font-semibold min-w-[100px] text-right">Peso Total</TableHead>
                              <TableHead className="font-semibold min-w-[100px]">Entregas</TableHead>
                              <TableHead className="font-semibold min-w-[150px]">Status</TableHead>
                              <TableHead className="font-semibold w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entregasGroupedByDriver.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                  Nenhuma entrega corresponde aos filtros selecionados
                                </TableCell>
                              </TableRow>
                            ) : (
                              entregasGroupedByDriver.map((group) => {
                                const isExpanded = expandedDrivers.has(group.motoristaId);
                                const motoristaEmail = group.motorista?.email;
                                const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;
                                const isOnlineDriver = localizacao?.status === true;
                                const totalPesoGrupo = group.entregas.reduce((acc, e) => acc + (e.peso_alocado_kg || e.carga.peso_kg), 0);
                                
                                const statusCounts = group.entregas.reduce((acc, e) => {
                                  acc[e.status || 'aguardando'] = (acc[e.status || 'aguardando'] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>);

                                return (
                                  <React.Fragment key={group.motoristaId}>
                                    <TableRow
                                      className={`hover:bg-muted/50 cursor-pointer ${isExpanded ? 'bg-muted/30 border-l-2 border-l-primary' : ''}`}
                                      onClick={() => toggleDriverExpansion(group.motoristaId)}
                                    >
                                      <TableCell className="p-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDriverExpansion(group.motoristaId);
                                          }}
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-primary" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                          <Avatar className="h-9 w-9">
                                            <AvatarImage src={group.motorista?.foto_url || undefined} />
                                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                              {group.motorista?.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-foreground">{group.motorista?.nome_completo || 'Sem motorista'}</span>
                                              {isOnlineDriver && (
                                                <Tooltip>
                                                  <TooltipTrigger>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                                  </TooltipTrigger>
                                                  <TooltipContent>Online agora</TooltipContent>
                                                </Tooltip>
                                              )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{group.motorista?.email}</span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        {group.veiculo ? (
                                          <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{group.veiculo.placa}</span>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right py-3">
                                        <span className="font-semibold text-foreground">{formatWeight(totalPesoGrupo)}</span>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <Badge variant="outline" className="text-xs">
                                          {group.entregas.length} {group.entregas.length === 1 ? 'entrega' : 'entregas'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(statusCounts).map(([status, count]) => {
                                            const config = statusEntregaConfig[status];
                                            return (
                                              <Badge key={status} variant="outline" className={`${config?.color || ''} text-[10px] px-1.5 py-0`}>
                                                {count}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-3">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                              <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48 bg-popover">
                                            <DropdownMenuSub>
                                              <DropdownMenuSubTrigger>
                                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                Alterar todas
                                              </DropdownMenuSubTrigger>
                                              <DropdownMenuPortal>
                                                <DropdownMenuSubContent className="w-48 bg-popover">
                                                  {Object.entries(statusEntregaConfig).map(([statusKey, statusConfig]) => {
                                                    const StatusIconComponent = statusConfig.icon;
                                                    return (
                                                      <DropdownMenuItem
                                                        key={statusKey}
                                                        onClick={() => handleBulkStatusChange(
                                                          group.entregas.map(e => e.id),
                                                          statusKey as StatusEntrega,
                                                          group.motorista?.nome_completo
                                                        )}
                                                      >
                                                        <StatusIconComponent className="w-4 h-4 mr-2" />
                                                        {statusConfig.label}
                                                      </DropdownMenuItem>
                                                    );
                                                  })}
                                                </DropdownMenuSubContent>
                                              </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>

                                    {/* Expanded Row - Nested delivery table */}
                                    {isExpanded && group.entregas.length > 0 && (
                                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                                        <TableCell colSpan={7} className="p-0">
                                          <div className="px-8 py-4">
                                            <div className="flex items-center gap-2 mb-3">
                                              <Package className="w-4 h-4 text-primary" />
                                              <span className="text-sm font-medium">Entregas ({group.entregas.length})</span>
                                            </div>
                                            <div className="bg-background rounded-lg border overflow-hidden">
                                              <ScrollArea className="w-full">
                                                <Table>
                                                  <TableHeader>
                                                    <TableRow className="bg-muted/30">
                                                      <TableHead className="text-xs font-semibold">Código</TableHead>
                                                      <TableHead className="text-xs font-semibold">Motorista</TableHead>
                                                      <TableHead className="text-xs font-semibold">Veículo</TableHead>
                                                      <TableHead className="text-xs font-semibold text-right">Peso</TableHead>
                                                      <TableHead className="text-xs font-semibold text-right">Frete</TableHead>
                                                      <TableHead className="text-xs font-semibold">N° CT-e</TableHead>
                                                      <TableHead className="text-xs font-semibold">Status</TableHead>
                                                      <TableHead className="text-xs font-semibold">Docs</TableHead>
                                                      <TableHead className="text-xs font-semibold w-10">Chat</TableHead>
                                                      <TableHead className="text-xs font-semibold w-10"></TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {group.entregas.map((entrega, idx) => renderEntregaRow(entrega, idx))}
                                                  </TableBody>
                                                </Table>
                                                <ScrollBar orientation="horizontal" />
                                              </ScrollArea>
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </>
          )}
        </TooltipProvider>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden p-4 pb-20 space-y-4">
        <TooltipProvider>
          {/* Mobile Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">Gestão de Entregas</h1>
                <p className="text-sm text-muted-foreground">Rastreie suas entregas</p>
              </div>
              <div className="flex items-center gap-2">
                <LiveIndicator />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isLoading || isFetching}
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-center">
                <Clock className="w-3 h-3 mx-auto text-amber-600 mb-0.5" />
                <p className="text-lg font-bold text-amber-600">{stats.aguardando}</p>
                <p className="text-[8px] text-muted-foreground">Aguardando</p>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-center">
                <Package className="w-3 h-3 mx-auto text-blue-600 mb-0.5" />
                <p className="text-lg font-bold text-blue-600">{stats.saiu_para_coleta}</p>
                <p className="text-[8px] text-muted-foreground">Coleta</p>
              </div>
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 text-center">
                <Truck className="w-3 h-3 mx-auto text-purple-600 mb-0.5" />
                <p className="text-lg font-bold text-purple-600">{stats.saiu_para_entrega}</p>
                <p className="text-[8px] text-muted-foreground">Entrega</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-center">
                <AlertCircle className="w-3 h-3 mx-auto text-destructive mb-0.5" />
                <p className="text-lg font-bold text-destructive">{stats.problema}</p>
                <p className="text-[8px] text-muted-foreground">Problemas</p>
              </div>
            </div>

            {/* Mobile Search + Filter */}
            <div className="flex gap-2">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Motorista Filter */}
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-3">Motoristas</h4>
                      <div className="space-y-2">
                        {motoristasFromEntregas.map((m) => (
                          <div key={m.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`motorista-${m.id}`}
                              checked={selectedMotoristaIds.includes(m.id)}
                              onCheckedChange={() => handleMotoristaToggle(m.id)}
                            />
                            <Label htmlFor={`motorista-${m.id}`} className="text-sm font-normal cursor-pointer">
                              {m.nome_completo}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Status Filter */}
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-3">Status da Entrega</h4>
                      <div className="space-y-2">
                        {allStatusFilters.map(status => (
                          <div key={status.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`filter-mobile-${status.value}`}
                              checked={selectedStatuses.includes(status.value)}
                              onCheckedChange={() => handleStatusToggle(status.value)}
                            />
                            <Label htmlFor={`filter-mobile-${status.value}`} className="text-sm font-normal cursor-pointer">
                              {status.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(selectedStatuses.length > 0 || selectedMotoristaIds.length > 0) && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
                        <X className="w-4 h-4" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mobile Map */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Suspense fallback={
                <div className="w-full h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              }>
                <div className="h-[250px] rounded-lg overflow-hidden border border-border">
                  <EntregasMap
                    entregas={mapData}
                    selectedEntregaId={selectedEntregaId}
                    onSelectEntrega={setSelectedEntregaId}
                  />
                </div>
              </Suspense>

              {/* Mobile Cards List */}
              {filteredEntregas.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="p-6 text-center">
                    <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <h3 className="font-medium text-foreground mb-1">Nenhuma entrega</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Nenhuma corresponde à busca.' : 'Aceite cargas para começar.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEntregas.map((entrega) => {
                    const status = entrega.status || 'aguardando';
                    const config = statusEntregaConfig[status];
                    const StatusIcon = config?.icon || Package;

                    return (
                      <Card
                        key={entrega.id}
                        className={`border-border transition-all ${selectedEntregaId === entrega.id ? 'ring-2 ring-primary' : ''}`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer"
                              onClick={() => setSelectedEntregaId(selectedEntregaId === entrega.id ? null : entrega.id)}
                            >
                              {entrega.carga.codigo}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${config?.color} border text-xs gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {config?.label || status}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 bg-popover">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedEntregaForDetails(entrega);
                                    setDetailsDialogOpen(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setChatEntregaId(entrega.id);
                                    setChatSheetOpen(true);
                                  }}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir chat
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setEntregaForCte(entrega);
                                    setAnexarCteDialogOpen(true);
                                  }}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Gerenciar Documentos
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                                      Alterar status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent className="w-48 bg-popover">
                                        {Object.entries(statusEntregaConfig).map(([statusKey, statusConfig]) => {
                                          const isCurrentStatus = entrega.status === statusKey;
                                          const StatusIconComponent = statusConfig.icon;
                                          return (
                                            <DropdownMenuItem
                                              key={statusKey}
                                              disabled={isCurrentStatus}
                                              className={isCurrentStatus ? 'opacity-50' : ''}
                                              onClick={() => handleStatusChange(entrega.id, statusKey as StatusEntrega)}
                                            >
                                              <StatusIconComponent className="w-4 h-4 mr-2" />
                                              {statusConfig.label}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteClick(entrega)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir entrega
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{entrega.carga.descricao}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span>{entrega.carga.endereco_origem?.cidade || '-'}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span>{entrega.carga.endereco_destino?.cidade || '-'}</span>
                          </div>
                          {entrega.motorista && (
                            <div className="flex items-center gap-2 pt-1 border-t">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={entrega.motorista.foto_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {entrega.motorista.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{entrega.motorista.nome_completo}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TooltipProvider>
      </div>

      {/* Dialogs */}
      <ChatSheet 
        open={chatSheetOpen} 
        onOpenChange={setChatSheetOpen} 
        entregaId={chatEntregaId}
        userType="transportadora"
        empresaId={empresa?.id}
      />

      <EntregaDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        entrega={selectedEntregaForDetails}
      />

      {entregaForCte && (
        <AnexarDocumentosDialog
          open={anexarCteDialogOpen}
          onOpenChange={setAnexarCteDialogOpen}
          entrega={{
            id: entregaForCte.id,
            cte_url: entregaForCte.cte_url,
            numero_cte: entregaForCte.numero_cte,
            notas_fiscais_urls: entregaForCte.notas_fiscais_urls,
            manifesto_url: entregaForCte.manifesto_url,
            carga: {
              codigo: entregaForCte.carga.codigo,
            },
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['gestao_entregas_transportadora'] });
            setAnexarCteDialogOpen(false);
            setEntregaForCte(null);
          }}
        />
      )}

      <FilePreviewDialog
        open={ctePreviewOpen}
        onOpenChange={setCtePreviewOpen}
        fileUrl={ctePreviewUrl}
        title="CT-e"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a entrega <strong>{entregaToDelete?.carga.codigo}</strong>?
              O peso alocado será liberado na carga original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.type === 'single' ? (
                <>Deseja alterar o status da entrega para <strong>"{statusEntregaConfig[pendingStatusChange.newStatus]?.label}"</strong>?</>
              ) : (
                <>Deseja alterar o status de <strong>{pendingStatusChange?.count} entrega(s)</strong>{pendingStatusChange?.motoristaName ? ` de ${pendingStatusChange.motoristaName}` : ''} para <strong>"{statusEntregaConfig[pendingStatusChange?.newStatus || 'aguardando']?.label}"</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
