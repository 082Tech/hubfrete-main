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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Users,
  RefreshCw,
  X,
  Building2,
  WifiOff,
  Radio,
  ArrowRight,
  Route,
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
  Weight,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
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

interface MotoristaLocalizacao {
  email_motorista: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
  heading: number | null;
}

interface MotoristaCompleto {
  id: string;
  nome_completo: string;
  telefone: string | null;
  email: string | null;
  foto_url: string | null;
  ativo: boolean | null;
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

  // Fetch entregas da transportadora
  const { data: entregas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['gestao_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Primeiro busca os motoristas da empresa
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
    refetchInterval: 60000, // Refresh every 1 minute
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

  // Get all driver emails for realtime tracking
  const motoristaEmails = useMemo(() => {
    const emails = new Set<string>();
    entregas.forEach(e => {
      if (e.motorista?.email) {
        emails.add(e.motorista.email);
      }
    });
    return Array.from(emails);
  }, [entregas]);

  // Real-time driver locations (no polling!)
  const { localizacaoMap, isConnected: isRealtimeConnected } = useRealtimeLocalizacoes({
    emails: motoristaEmails,
    enabled: motoristaEmails.length > 0,
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

  // Calculate summary for selected motoristas
  const selectedMotoristaSummary = useMemo(() => {
    if (selectedMotoristaIds.length === 0) return null;

    // If multiple drivers are selected, we show a combined summary
    const motoristaEntregas = filteredEntregas.filter(e =>
      e.motorista?.id && selectedMotoristaIds.includes(e.motorista.id)
    );
    const totalPeso = motoristaEntregas.reduce((acc, e) => acc + (e.peso_alocado_kg || e.carga.peso_kg), 0);

    // For single driver, show detailed info
    if (selectedMotoristaIds.length === 1) {
      const motorista = motoristaEntregas[0]?.motorista;
      const veiculo = motoristaEntregas[0]?.veiculo;
      const motoristaEmail = motorista?.email;
      const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;

      return {
        motorista,
        veiculo,
        totalEntregas: motoristaEntregas.length,
        totalPeso,
        localizacao,
        isSingle: true,
      };
    }

    // For multiple drivers
    return {
      motorista: null,
      veiculo: null,
      totalEntregas: motoristaEntregas.length,
      totalPeso,
      localizacao: null,
      isSingle: false,
      driversCount: selectedMotoristaIds.length,
    };
  }, [selectedMotoristaIds, filteredEntregas, localizacaoMap]);

  // Calculate stats
  const stats = useMemo(() => {
    const byStatus = entregas.reduce((acc, e) => {
      acc[e.status || ''] = (acc[e.status || ''] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: entregas.length,
      aguardando: byStatus['aguardando'] || 0,
      saiu_para_coleta: byStatus['saiu_para_coleta'] || 0,
      saiu_para_entrega: byStatus['saiu_para_entrega'] || 0,
      problema: byStatus['problema'] || 0,
    };
  }, [entregas]);

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

  // Rows start collapsed by default - no auto-expansion

  // Delete entrega mutation with reverse logic
  const deleteEntrega = useMutation({
    mutationFn: async (entrega: EntregaCompleta) => {
      const pesoAlocado = entrega.peso_alocado_kg || 0;
      const cargaId = entrega.carga.id;

      // 1. Get current cargo data
      const { data: cargaAtual, error: fetchError } = await supabase
        .from('cargas')
        .select('peso_disponivel_kg, peso_kg, status')
        .eq('id', cargaId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calculate new available weight and status
      const pesoDisponivelAtual = cargaAtual.peso_disponivel_kg ?? 0;
      const novoPesoDisponivel = pesoDisponivelAtual + pesoAlocado;

      // If restored weight equals total weight, set to 'publicada', otherwise 'parcialmente_alocada'
      const novoStatus = novoPesoDisponivel >= cargaAtual.peso_kg
        ? 'publicada'
        : 'parcialmente_alocada';

      // 3. Delete associated chat and participants first
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('entrega_id', entrega.id)
        .single();

      if (chat) {
        // Delete chat participants
        await supabase
          .from('chat_participantes')
          .delete()
          .eq('chat_id', chat.id);

        // Delete messages
        await supabase
          .from('mensagens')
          .delete()
          .eq('chat_id', chat.id);

        // Delete chat
        await supabase
          .from('chats')
          .delete()
          .eq('id', chat.id);
      }

      // 4. Delete the entrega
      const { error: deleteError } = await supabase
        .from('entregas')
        .delete()
        .eq('id', entrega.id);

      if (deleteError) throw deleteError;

      // 5. Update cargo with restored weight and new status
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

      // Set timestamp for specific status transitions
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

  // Bulk update status mutation for all driver deliveries
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
    return nfsCount >= 1; // At least one NF is required
  };

  // Get entrega by ID from entregas list
  const getEntregaById = (entregaId: string): EntregaCompleta | undefined => {
    return entregas.find(e => e.id === entregaId);
  };

  const handleStatusChange = (entregaId: string, newStatus: StatusEntrega, entregaCodigo?: string) => {
    // Validate document requirements for "entregue" status
    if (newStatus === 'entregue') {
      const entrega = getEntregaById(entregaId);
      if (entrega && !canMarkAsDelivered(entrega)) {
        toast.error('Não é possível marcar como entregue. É necessário anexar pelo menos uma Nota Fiscal.');
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
    // Validate document requirements for "entregue" status
    if (newStatus === 'entregue') {
      const entregasWithMissingDocs = entregaIds.filter(id => {
        const entrega = getEntregaById(id);
        return entrega && !canMarkAsDelivered(entrega);
      });

      if (entregasWithMissingDocs.length > 0) {
        toast.error(`${entregasWithMissingDocs.length} entrega(s) não podem ser marcadas como entregue. É necessário anexar pelo menos uma Nota Fiscal em cada.`);
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

  // Map data for entregas with location - using entrega.id as the selection key
  const mapData = useMemo(() => {
    const result: Array<{
      id: string;
      entregaId: string;
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
      destino: string | null;
      origemCoords: { lat: number; lng: number } | null;
      destinoCoords: { lat: number; lng: number } | null;
      isIdleDriver?: boolean;
      lastLocationUpdate?: number | null;
      heading?: number | null;
    }> = [];

    // Add drivers from entregas
    filteredEntregas.forEach(e => {
      const origem = e.carga.endereco_origem;
      const destino = e.carga.endereco_destino;

      const motoristaEmail = e.motorista?.email;
      const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;

      const hasLocation = localizacao?.latitude != null && localizacao?.longitude != null;
      const hasRoute = (origem?.latitude != null && origem?.longitude != null) || (destino?.latitude != null && destino?.longitude != null);

      if (!hasLocation && !hasRoute) return;

      result.push({
        id: e.id,
        entregaId: e.id,
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

  const formatPeso = (peso: number) => peso.toLocaleString('pt-BR') + ' kg';

  const formatLocationTimestamp = (timestamp: number | null | undefined): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filters sidebar content
  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Motorista multi-select filter with search */}
      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Motoristas</h4>
        <Popover open={motoristaPopoverOpen} onOpenChange={setMotoristaPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={motoristaPopoverOpen}
              className="w-full justify-between h-auto min-h-10 py-2"
            >
              <span className="text-left truncate">
                {selectedMotoristaIds.length === 0
                  ? "Todos os motoristas"
                  : selectedMotoristaIds.length === 1
                    ? motoristasFromEntregas.find(m => m.id === selectedMotoristaIds[0])?.nome_completo
                    : `${selectedMotoristaIds.length} motoristas selecionados`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
        {selectedMotoristaIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs h-8"
            onClick={() => setSelectedMotoristaIds([])}
          >
            <X className="w-3 h-3 mr-1" />
            Limpar seleção
          </Button>
        )}
      </div>

      {/* Status filter */}
      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">Status da Entrega</h4>
        <div className="space-y-2">
          {allStatusFilters.map(status => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${status.value}`}
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={() => handleStatusToggle(status.value)}
              />
              <Label htmlFor={`filter-${status.value}`} className="text-sm font-normal cursor-pointer">
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
  );

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

  // Driver Summary Card (shown when drivers are selected)
  const DriverSummaryCard = () => {
    if (!selectedMotoristaSummary) return null;

    const { motorista, veiculo, totalEntregas, totalPeso, localizacao, isSingle, driversCount } = selectedMotoristaSummary as any;
    const lastUpdate = localizacao?.timestamp;
    const isRecent = lastUpdate && (Date.now() - lastUpdate) < 5 * 60 * 1000;

    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {isSingle ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {motorista?.foto_url ? (
                      <img src={motorista.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{motorista?.nome_completo || 'Motorista'}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {veiculo && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {veiculo.placa}
                        </span>
                      )}
                      {lastUpdate && (
                        <span className={`flex items-center gap-1 ${isRecent ? 'text-chart-2' : ''}`}>
                          <Radio className={`w-3 h-3 ${isRecent ? 'animate-pulse' : ''}`} />
                          {formatLocationTimestamp(lastUpdate)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{driversCount} motoristas selecionados</h3>
                    <p className="text-sm text-muted-foreground">Resumo combinado</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalEntregas}</p>
                <p className="text-xs text-muted-foreground">Entregas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{formatPeso(totalPeso)}</p>
                <p className="text-xs text-muted-foreground">Peso Total</p>
              </div>

              {/* Bulk actions for selected drivers */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Alterar todas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(statusEntregaConfig).map(([statusKey, statusConfig]) => {
                    const StatusIconComponent = statusConfig.icon;
                    return (
                      <DropdownMenuItem
                        key={statusKey}
                        onClick={() => {
                          const entregaIds = filteredEntregas
                            .filter(e => e.motorista?.id && selectedMotoristaIds.includes(e.motorista.id))
                            .map(e => e.id);
                          handleBulkStatusChange(
                            entregaIds,
                            statusKey as StatusEntrega,
                            isSingle ? motorista?.nome_completo : `${driversCount} motoristas`
                          );
                        }}
                      >
                        <StatusIconComponent className="w-4 h-4 mr-2" />
                        {statusConfig.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedMotoristaIds([])}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render individual entrega row
  const renderEntregaRow = (entrega: EntregaCompleta) => {
    const status = entrega.status || 'aguardando';
    const config = statusEntregaConfig[status];
    const StatusIcon = config?.icon || Package;
    const isSelected = selectedEntregaId === entrega.id;

    return (
      <TableRow
        key={entrega.id}
        className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
        onClick={() => setSelectedEntregaId(isSelected ? null : entrega.id)}
      >
        <TableCell className="py-3">
          <Badge
            variant="secondary"
            className="text-xs font-mono whitespace-nowrap"
          >
            {entrega.codigo || entrega.carga.codigo}
          </Badge>
        </TableCell>
        <TableCell className="py-3">
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
        <TableCell className="py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm whitespace-nowrap">
                {entrega.carga.empresa?.nome ? textAbbr(entrega.carga.empresa.nome, 15) : '-'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{entrega.carga.empresa?.nome || 'Remetente não informado'}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm whitespace-nowrap">
                {(entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social)
                  ? textAbbr(entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || '', 18)
                  : '-'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Destinatário não informado'}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                <span>{textAbbr(entrega.carga.endereco_origem?.cidade || '-', 10)}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>{textAbbr(entrega.carga.endereco_destino?.cidade || '-', 10)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{entrega.carga.endereco_origem?.cidade}/{entrega.carga.endereco_origem?.estado} → {entrega.carga.endereco_destino?.cidade}/{entrega.carga.endereco_destino?.estado}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="text-right py-3">
          <span className="text-sm font-medium whitespace-nowrap">
            {formatPeso(entrega.peso_alocado_kg || entrega.carga.peso_kg)}
          </span>
        </TableCell>
        <TableCell className="py-3">
          <Badge variant="outline" className={`${config?.color} border text-xs gap-1 whitespace-nowrap`}>
            <StatusIcon className="w-3 h-3" />
            {config?.label || status}
          </Badge>
        </TableCell>
        {/* Documentos - Unified Column (styled like HistoricoEntregas) */}
        <TableCell className="py-3">
          {(() => {
            const hasCte = !!entrega.cte_url;
            const hasManifesto = !!entrega.manifesto_url;
            const nfsCount = entrega.notas_fiscais_urls?.length || 0;
            const totalDocs = (hasCte ? 1 : 0) + nfsCount + (hasManifesto ? 1 : 0);
            // Critical docs are: CTE, Manifesto, and at least 1 NF
            const hasMissingCritical = !hasCte || !hasManifesto || nfsCount === 0;

            return (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 gap-1 ${hasMissingCritical ? 'text-amber-600' : 'text-green-600'}`}
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
            );
          })()}
        </TableCell>
        <TableCell className="py-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(entrega.carga.data_entrega_limite)}
          </span>
        </TableCell>
        {/* Sticky Chat column */}
        <TableCell className={`sticky right-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 ${isSelected ? 'bg-primary/5' : 'bg-card'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setChatEntregaId(entrega.id);
                  setChatSheetOpen(true);
                }}
              >
                <MessageCircle className="w-4 h-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir chat</TooltipContent>
          </Tooltip>
        </TableCell>
        {/* Sticky Actions column */}
        <TableCell className={`sticky right-0 z-10 ${isSelected ? 'bg-primary/5' : 'bg-card'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
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

  // Render entrega row for nested subtable (without driver column)
  const renderNestedEntregaRow = (entrega: EntregaCompleta) => {
    const status = entrega.status || 'aguardando';
    const config = statusEntregaConfig[status];
    const StatusIcon = config?.icon || Package;
    const isSelected = selectedEntregaId === entrega.id;

    return (
      <TableRow
        key={entrega.id}
        className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`}
        onClick={() => setSelectedEntregaId(isSelected ? null : entrega.id)}
      >
        <TableCell className="py-2.5">
          <Badge
            variant="secondary"
            className="text-xs font-mono whitespace-nowrap"
          >
            {entrega.codigo || entrega.carga.codigo}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm whitespace-nowrap">
                {entrega.carga.empresa?.nome ? textAbbr(entrega.carga.empresa.nome, 15) : '-'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{entrega.carga.empresa?.nome || 'Remetente não informado'}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm whitespace-nowrap">
                {(entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social)
                  ? textAbbr(entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || '', 18)
                  : '-'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{entrega.carga.destinatario_nome_fantasia || entrega.carga.destinatario_razao_social || 'Destinatário não informado'}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="py-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                <span>{textAbbr(entrega.carga.endereco_origem?.cidade || '-', 10)}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>{textAbbr(entrega.carga.endereco_destino?.cidade || '-', 10)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{entrega.carga.endereco_origem?.cidade}/{entrega.carga.endereco_origem?.estado} → {entrega.carga.endereco_destino?.cidade}/{entrega.carga.endereco_destino?.estado}</p>
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell className="text-right py-2.5">
          <span className="text-sm font-medium whitespace-nowrap">
            {formatPeso(entrega.peso_alocado_kg || entrega.carga.peso_kg)}
          </span>
        </TableCell>
        <TableCell className="py-2.5">
          <Badge variant="outline" className={`${config?.color} border text-xs gap-1 whitespace-nowrap`}>
            <StatusIcon className="w-3 h-3" />
            {config?.label || status}
          </Badge>
        </TableCell>
        {/* Documentos (styled like HistoricoEntregas) */}
        <TableCell className="py-2.5">
          {(() => {
            const hasCte = !!entrega.cte_url;
            const hasManifesto = !!entrega.manifesto_url;
            const nfsCount = entrega.notas_fiscais_urls?.length || 0;
            const totalDocs = (hasCte ? 1 : 0) + nfsCount + (hasManifesto ? 1 : 0);
            // Critical docs are: CTE, Manifesto, and at least 1 NF
            const hasMissingCritical = !hasCte || !hasManifesto || nfsCount === 0;

            return (
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
            );
          })()}
        </TableCell>
        <TableCell className="py-2.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(entrega.carga.data_entrega_limite)}
          </span>
        </TableCell>
        {/* Chat column */}
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
        {/* Actions column */}
        <TableCell className="py-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
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
    <TooltipProvider>
      <div className="p-4 md:p-8 pb-20 md:pb-8">
        {/* Desktop Layout - New Layout: Top row (Filters | Map), Bottom row (Full-width Table) */}
        <div className="hidden lg:block space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntregas.length === 0 && entregas.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Card className="border-border max-w-sm">
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
              {/* Collapsible Layout */}
              <div className="flex gap-4">
                {/* Left Column: Collapsible Filters Panel */}
                <div className={`transition-all duration-300 ${filtersCollapsed ? 'w-12' : 'w-64'} shrink-0`}>
                  {filtersCollapsed ? (
                    // Collapsed state - just icons
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => setFiltersCollapsed(false)}
                      >
                        <PanelLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => refetch()}
                        disabled={isLoading || isFetching}
                      >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  ) : (
                    // Expanded state - full filters
                    <div className="space-y-4">
                      {/* Header with collapse button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-xl font-bold text-foreground">Gestão de Entregas</h1>
                          <p className="text-sm text-muted-foreground">Rastreie suas entregas em tempo real</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setFiltersCollapsed(true)}
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => refetch()}
                          disabled={isLoading || isFetching}
                        >
                          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <LiveIndicator />
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar código, motorista, placa, CT-e..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Stats Cards - cores correspondentes aos status */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                          <p className="text-xl font-bold text-amber-600">{stats.aguardando}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Aguardando</p>
                        </div>
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-xl font-bold text-blue-600">{stats.saiu_para_coleta}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Saiu p/ Coleta</p>
                        </div>
                        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Truck className="w-4 h-4 text-purple-600" />
                          </div>
                          <p className="text-xl font-bold text-purple-600">{stats.saiu_para_entrega}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Saiu p/ Entrega</p>
                        </div>
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          </div>
                          <p className="text-xl font-bold text-destructive">{stats.problema}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Problemas</p>
                        </div>
                      </div>

                      {/* Filters Card */}
                      <Card className="border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filtros
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FiltersContent />
                        </CardContent>
                      </Card>

                      {/* Active Filters */}
                      {(selectedStatuses.length > 0 || selectedMotoristaIds.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {selectedMotoristaIds.map(motoristaId => (
                            <Badge
                              key={motoristaId}
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20 cursor-pointer text-xs"
                              onClick={() => handleMotoristaToggle(motoristaId)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              {textAbbr(motoristasFromEntregas.find(m => m.id === motoristaId)?.nome_completo || '', 12)}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                          {selectedStatuses.map(status => {
                            const config = statusEntregaConfig[status];
                            return (
                              <Badge
                                key={status}
                                variant="outline"
                                className={`${config?.color || ''} cursor-pointer text-xs`}
                                onClick={() => handleStatusToggle(status)}
                              >
                                {config?.label || status}
                                <X className="w-3 h-3 ml-1" />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Map + Table - grows to fill remaining space */}
                <div className="flex-1 space-y-4 min-w-0">
                  {/* Map */}
                  <Suspense fallback={
                    <Card className="border-border">
                      <CardContent className="p-0">
                        <div className="w-full h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  }>
                    <EntregasMap
                      entregas={mapData}
                      selectedEntregaId={selectedEntregaId}
                      onSelectEntrega={setSelectedEntregaId}
                    />
                  </Suspense>

                  {/* Driver Summary Card - shown when drivers are selected */}
                  {selectedMotoristaIds.length > 0 && <DriverSummaryCard />}

                  {/* Table with driver grouping */}
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="relative max-h-[500px] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-20">
                            <TableRow className="bg-muted">
                              <TableHead className="font-semibold w-8 bg-muted"></TableHead>
                              <TableHead className="font-semibold whitespace-nowrap bg-muted">Motorista</TableHead>
                              <TableHead className="font-semibold whitespace-nowrap bg-muted">Veículo</TableHead>
                              <TableHead className="font-semibold whitespace-nowrap text-right bg-muted">Peso Total</TableHead>
                              <TableHead className="font-semibold whitespace-nowrap bg-muted">Entregas</TableHead>
                              <TableHead className="font-semibold whitespace-nowrap bg-muted">Status</TableHead>
                              <TableHead className="font-semibold w-10 bg-muted"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entregasGroupedByDriver.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  Nenhuma entrega corresponde aos filtros selecionados
                                </TableCell>
                              </TableRow>
                            ) : (
                              entregasGroupedByDriver.map((group) => {
                                const isExpanded = expandedDrivers.has(group.motoristaId);
                                const motoristaEmail = group.motorista?.email;
                                const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;
                                const isOnlineDriver = localizacao?.timestamp && (Date.now() - localizacao.timestamp) < 2 * 60 * 1000;
                                const totalPesoGrupo = group.entregas.reduce((acc, e) => acc + (e.peso_alocado_kg || e.carga.peso_kg), 0);
                                
                                // Calculate status summary
                                const statusCounts = group.entregas.reduce((acc, e) => {
                                  acc[e.status || 'aguardando'] = (acc[e.status || 'aguardando'] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>);

                                return (
                                  <React.Fragment key={group.motoristaId}>
                                    {/* Driver header row */}
                                    <TableRow 
                                      className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                                      onClick={() => toggleDriverExpansion(group.motoristaId)}
                                    >
                                      <TableCell className="py-3">
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
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
                                                    <div className="w-2.5 h-2.5 rounded-full bg-chart-2 animate-pulse" />
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
                                        <span className="font-semibold text-foreground">{formatPeso(totalPesoGrupo)}</span>
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

                                    {/* Expanded Row - Entregas com subtabela */}
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
                                                      <TableHead className="text-xs font-semibold">Remetente</TableHead>
                                                      <TableHead className="text-xs font-semibold">Destinatário</TableHead>
                                                      <TableHead className="text-xs font-semibold">Rota</TableHead>
                                                      <TableHead className="text-xs font-semibold text-right">Peso</TableHead>
                                                      <TableHead className="text-xs font-semibold">Status</TableHead>
                                                      <TableHead className="text-xs font-semibold">
                                                        <div className="flex items-center gap-1">
                                                          <FileText className="w-3 h-3" />
                                                          Docs
                                                        </div>
                                                      </TableHead>
                                                      <TableHead className="text-xs font-semibold">Previsão</TableHead>
                                                      <TableHead className="text-xs font-semibold w-10">Chat</TableHead>
                                                      <TableHead className="text-xs font-semibold w-10"></TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {group.entregas.map(entrega => renderNestedEntregaRow(entrega))}
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
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
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
              <div className="rounded-lg border border-chart-3/30 bg-chart-3/10 p-2 text-center">
                <Clock className="w-3 h-3 mx-auto text-chart-3 mb-0.5" />
                <p className="text-lg font-bold text-chart-3">{stats.aguardando}</p>
                <p className="text-[8px] text-muted-foreground">Aguardando</p>
              </div>
              <div className="rounded-lg border border-chart-1/30 bg-chart-1/10 p-2 text-center">
                <Package className="w-3 h-3 mx-auto text-chart-1 mb-0.5" />
                <p className="text-lg font-bold text-chart-1">{stats.saiu_para_coleta}</p>
                <p className="text-[8px] text-muted-foreground">Coleta</p>
              </div>
              <div className="rounded-lg border border-chart-5/30 bg-chart-5/10 p-2 text-center">
                <Truck className="w-3 h-3 mx-auto text-chart-5 mb-0.5" />
                <p className="text-lg font-bold text-chart-5">{stats.saiu_para_entrega}</p>
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
                  <div className="mt-6">
                    <FiltersContent />
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

              {/* Mobile Driver Summary */}
              {selectedMotoristaIds.length > 0 && <DriverSummaryCard />}

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
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => {
                                    setChatEntregaId(entrega.id);
                                    setChatSheetOpen(true);
                                  }}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir chat
                                  </DropdownMenuItem>
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
                                      <DropdownMenuSubContent className="w-48">
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
                            </div>
                          </div>
                          <p
                            className="text-sm font-medium line-clamp-1 cursor-pointer"
                            onClick={() => setSelectedEntregaId(selectedEntregaId === entrega.id ? null : entrega.id)}
                          >
                            {entrega.carga.descricao}
                          </p>
                          <div
                            className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                            onClick={() => setSelectedEntregaId(selectedEntregaId === entrega.id ? null : entrega.id)}
                          >
                            <MapPin className="w-3 h-3 text-chart-1" />
                            <span className="truncate">{entrega.carga.endereco_origem?.cidade}</span>
                            <ArrowRight className="w-3 h-3" />
                            <MapPin className="w-3 h-3 text-chart-2" />
                            <span className="truncate">{entrega.carga.endereco_destino?.cidade}</span>
                          </div>
                          {entrega.motorista && (
                            <div
                              className="flex items-center gap-2 text-xs pt-2 border-t border-border cursor-pointer"
                              onClick={() => setSelectedEntregaId(selectedEntregaId === entrega.id ? null : entrega.id)}
                            >
                              <User className="w-3 h-3 text-primary" />
                              <span className="truncate">{entrega.motorista.nome_completo}</span>
                              {entrega.veiculo && (
                                <span className="text-muted-foreground">• {entrega.veiculo.placa}</span>
                              )}
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
        </div>

        {/* Details Dialog */}
        <EntregaDetailsDialog
          entrega={selectedEntregaForDetails}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />

        {/* Status Change Confirmation Dialog */}
        <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  {pendingStatusChange && (
                    <>
                      {pendingStatusChange.type === 'single' ? (
                        <p>
                          Deseja alterar o status desta entrega para{' '}
                          <strong className="text-foreground">
                            "{statusEntregaConfig[pendingStatusChange.newStatus]?.label || pendingStatusChange.newStatus}"
                          </strong>?
                        </p>
                      ) : (
                        <p>
                          Deseja alterar o status de{' '}
                          <strong className="text-foreground">{pendingStatusChange.count} entregas</strong>
                          {pendingStatusChange.motoristaName && (
                            <> do motorista <strong className="text-foreground">{pendingStatusChange.motoristaName}</strong></>
                          )}{' '}
                          para{' '}
                          <strong className="text-foreground">
                            "{statusEntregaConfig[pendingStatusChange.newStatus]?.label || pendingStatusChange.newStatus}"
                          </strong>?
                        </p>
                      )}

                      {pendingStatusChange.newStatus === 'saiu_para_coleta' && (
                        <p className="mt-3 text-sm">
                          A data/hora de coleta será registrada automaticamente.
                        </p>
                      )}
                      {pendingStatusChange.newStatus === 'entregue' && (
                        <p className="mt-3 text-sm">
                          A data/hora de entrega será registrada automaticamente.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updateStatus.isPending || updateBulkStatus.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmStatusChange}
                disabled={updateStatus.isPending || updateBulkStatus.isPending}
              >
                {(updateStatus.isPending || updateBulkStatus.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
              <AlertDialogDescription>
                {entregaToDelete && (
                  <>
                    Tem certeza que deseja excluir a entrega da carga <strong>{entregaToDelete.carga.codigo}</strong>?
                    <br /><br />
                    Esta ação irá:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Liberar <strong>{(entregaToDelete.peso_alocado_kg || 0).toLocaleString('pt-BR')} kg</strong> de volta para a carga</li>
                      <li>Remover a conversa associada a esta entrega</li>
                      <li>Devolver a carga ao status "Disponível"</li>
                    </ul>
                    <br />
                    Esta ação não pode ser desfeita.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteEntrega.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteEntrega.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteEntrega.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Anexar Documentos Dialog */}
        {entregaForCte && (
          <AnexarDocumentosDialog
            open={anexarCteDialogOpen}
            onOpenChange={setAnexarCteDialogOpen}
            entrega={entregaForCte}
          />
        )}

        {/* CT-e/Manifesto Preview */}
        <FilePreviewDialog
          open={ctePreviewOpen}
          onOpenChange={setCtePreviewOpen}
          fileUrl={ctePreviewUrl}
          title="Visualizar Documento"
        />

        {/* Chat Sheet */}
        <ChatSheet
          open={chatSheetOpen}
          onOpenChange={setChatSheetOpen}
          entregaId={chatEntregaId}
          userType="transportadora"
          empresaId={empresa?.id}
        />
      </div>
    </TooltipProvider>
  );
}
