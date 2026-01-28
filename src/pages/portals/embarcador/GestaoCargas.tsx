import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import textAbbr from '@/utils/textAbbr';
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
  MoreHorizontal,
  Eye,
  Loader2,
  Filter,
  Truck,
  CheckCircle,
  AlertCircle,
  User,
  RefreshCw,
  X,
  Building2,
  WifiOff,
  Radio,
  ChevronDown,
  ChevronRight,
  FileText,
  DollarSign,
  MessageCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  XCircle,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { EntregaDetailsDialog } from '@/components/entregas/EntregaDetailsDialog';
import { ChatSheet } from '@/components/mensagens/ChatSheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// Sidebar state is read from localStorage (same key as PortalLayoutWrapper)
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the OpenStreetMap component
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap'));

type StatusCarga = Database['public']['Enums']['status_carga'];
type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaData {
  id: string;
  codigo: string | null;
  status: StatusEntrega | null;
  motorista_id: string | null;
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

interface EnderecoData {
  id: string;
  tipo: string;
  cidade: string;
  estado: string;
  logradouro: string;
  numero: string | null;
  bairro: string | null;
  latitude: number | null;
  longitude: number | null;
  contato_nome: string | null;
  contato_telefone: string | null;
}

interface CargaCompleta {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  peso_disponivel_kg: number | null;
  volume_m3: number | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  status: StatusCarga | null;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  data_entrega_limite: string | null;
  created_at: string | null;
  necessidades_especiais: string[] | null;
  regras_carregamento: string | null;
  nota_fiscal_url: string | null;
  carga_fragil: boolean | null;
  carga_perigosa: boolean | null;
  carga_viva: boolean | null;
  empilhavel: boolean | null;
  requer_refrigeracao: boolean | null;
  temperatura_min: number | null;
  temperatura_max: number | null;
  numero_onu: string | null;
  destinatario_razao_social: string | null;
  destinatario_nome_fantasia: string | null;
  destinatario_cnpj: string | null;
  endereco_origem: EnderecoData | null;
  endereco_destino: EnderecoData | null;
  filiais: {
    nome: string | null;
    cidade: string | null;
    estado: string | null;
    endereco: string | null;
    telefone: string | null;
    responsavel: string | null;
  } | null;
  entregas: EntregaData[];
}

// Status configuration for display - matching transportadora portal
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

// Statuses that should not appear in delivery management (finalized)
const activeStatuses: StatusEntrega[] = ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega', 'problema'];

export default function GestaoCargas() {
  const navigate = useNavigate();
  const { filialAtiva, switchingFilial, empresa } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);
  const [detailsCargaId, setDetailsCargaId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedEntregaForDetails, setSelectedEntregaForDetails] = useState<{ entrega: EntregaData; carga: CargaCompleta } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [tableExpanded, setTableExpanded] = useState(true);
  
  // Chat sheet state
  const [chatSheetOpen, setChatSheetOpen] = useState(false);
  const [chatEntregaId, setChatEntregaId] = useState<string | null>(null);

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

  // Fetch cargas that have active entregas, grouped by carga
  const { data: cargas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['gestao_entregas_embarcador', filialAtiva?.id],
    queryFn: async () => {
      if (!filialAtiva?.id) return [];

      // Fetch cargas with their active entregas
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          tipo,
          peso_kg,
          peso_disponivel_kg,
          volume_m3,
          valor_mercadoria,
          valor_frete_tonelada,
          status,
          data_coleta_de,
          data_coleta_ate,
          data_entrega_limite,
          created_at,
          necessidades_especiais,
          regras_carregamento,
          nota_fiscal_url,
          carga_fragil,
          carga_perigosa,
          carga_viva,
          empilhavel,
          requer_refrigeracao,
          temperatura_min,
          temperatura_max,
          numero_onu,
          destinatario_razao_social,
          destinatario_nome_fantasia,
          destinatario_cnpj,
          filiais (
            nome,
            cidade,
            estado,
            endereco,
            telefone,
            responsavel
          ),
          endereco_origem:enderecos_carga!cargas_endereco_origem_fkey (
            id,
            tipo,
            cidade,
            estado,
            logradouro,
            numero,
            bairro,
            latitude,
            longitude,
            contato_nome,
            contato_telefone
          ),
          endereco_destino:enderecos_carga!cargas_endereco_destino_fkey (
            id,
            tipo,
            cidade,
            estado,
            logradouro,
            numero,
            bairro,
            latitude,
            longitude,
            contato_nome,
            contato_telefone
          ),
          entregas!inner (
            id,
            codigo,
            status,
            motorista_id,
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
            motoristas (
              id,
              nome_completo,
              telefone,
              email,
              foto_url
            ),
            veiculos (
              id,
              placa,
              marca,
              modelo,
              tipo
            )
          )
        `)
        .eq('filial_id', filialAtiva.id)
        .in('entregas.status', activeStatuses)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter to only include cargas that have at least one active entrega
      return (data || [])
        .map(item => ({
          ...item,
          entregas: Array.isArray(item.entregas) 
            ? item.entregas.filter((e: any) => activeStatuses.includes(e.status))
            : []
        }))
        .filter(item => item.entregas.length > 0) as CargaCompleta[];
    },
    enabled: !!filialAtiva?.id,
    refetchInterval: 60000, // Refresh every 1 minute
  });

  // Fetch driver locations from localizações table
  const motoristaEmails = useMemo(() => {
    const emails = new Set<string>();
    cargas.forEach(c => {
      c.entregas.forEach(e => {
        if (e.motoristas?.email) {
          emails.add(e.motoristas.email);
        }
      });
    });
    return Array.from(emails);
  }, [cargas]);

  // Real-time driver locations
  const { localizacaoMap, isConnected: isRealtimeConnected } = useRealtimeLocalizacoes({
    emails: motoristaEmails,
    enabled: motoristaEmails.length > 0,
  });

  // Filter cargas based on search and status filters
  const filteredCargas = useMemo(() => {
    return cargas.map(carga => {
      // Filter entregas within each carga
      const filteredEntregas = carga.entregas.filter(entrega => {
        const matchesStatus = selectedStatuses.length === 0 ||
          selectedStatuses.includes(entrega.status || '');
        return matchesStatus;
      });

      return { ...carga, entregas: filteredEntregas };
    }).filter(carga => {
      // Filter carga by search term
      const matchesSearch =
        carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.entregas.some(e => 
          e.motoristas?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.veiculos?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.numero_cte?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Only include cargas that still have matching entregas
      return matchesSearch && carga.entregas.length > 0;
    });
  }, [cargas, searchTerm, selectedStatuses]);

  // Calculate stats - matching transportadora portal colors
  const stats = useMemo(() => {
    let aguardando = 0;
    let saiuParaColeta = 0;
    let saiuParaEntrega = 0;
    let problema = 0;
    let totalEntregas = 0;
    let totalFrete = 0;

    cargas.forEach(c => {
      c.entregas.forEach(e => {
        totalEntregas++;
        totalFrete += e.valor_frete || 0;
        if (e.status === 'aguardando') {
          aguardando++;
        } else if (e.status === 'saiu_para_coleta') {
          saiuParaColeta++;
        } else if (e.status === 'saiu_para_entrega') {
          saiuParaEntrega++;
        } else if (e.status === 'problema') {
          problema++;
        }
      });
    });

    return {
      total: totalEntregas,
      cargas: cargas.length,
      aguardando,
      saiu_para_coleta: saiuParaColeta,
      saiu_para_entrega: saiuParaEntrega,
      problema,
      totalFrete,
    };
  }, [cargas]);

  // Map data for entregas with location - using entrega.id as selection key
  const mapData = useMemo(() => {
    const data: any[] = [];
    
    filteredCargas.forEach(c => {
      c.entregas.forEach(e => {
        const origem = c.endereco_origem;
        const destino = c.endereco_destino;
        const motoristaEmail = e.motoristas?.email;
        const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;

        const hasLocation = localizacao?.latitude && localizacao?.longitude;
        const hasRoute = (origem?.latitude && origem?.longitude) || (destino?.latitude && destino?.longitude);

        if (!hasLocation && !hasRoute) return;

        data.push({
          id: e.id,
          entregaId: e.id,
          cargaId: c.id,
          latitude: localizacao?.latitude || null,
          longitude: localizacao?.longitude || null,
          status: e.status || null,
          codigo: c.codigo,
          descricao: c.descricao,
          motorista: e.motoristas?.nome_completo || null,
          motoristaFotoUrl: e.motoristas?.foto_url || null,
          motoristaOnline: localizacao?.status ?? null,
          placa: e.veiculos?.placa || null,
          destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
          origemCoords: origem?.latitude && origem?.longitude
            ? { lat: origem.latitude, lng: origem.longitude }
            : null,
          destinoCoords: destino?.latitude && destino?.longitude
            ? { lat: destino.latitude, lng: destino.longitude }
            : null,
          lastLocationUpdate: localizacao?.timestamp ?? null,
          heading: localizacao?.bussola_pos ?? null,
        });
      });
    });

    return data;
  }, [filteredCargas, localizacaoMap]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSearchTerm('');
  };

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

  const getEnderecoData = (carga: CargaCompleta, tipo: 'origem' | 'destino') => {
    const endereco = tipo === 'origem' ? carga.endereco_origem : carga.endereco_destino;
    if (!endereco) return { empresa: '-', cidade: '-', enderecoCompleto: '-' };
    
    const enderecoCompleto = [
      endereco.logradouro,
      endereco.numero,
      endereco.bairro,
      `${endereco.cidade}/${endereco.estado}`,
    ].filter(Boolean).join(', ');
    
    let empresa: string;
    if (tipo === 'destino' && carga.destinatario_nome_fantasia) {
      empresa = carga.destinatario_nome_fantasia;
    } else if (tipo === 'destino' && carga.destinatario_razao_social) {
      empresa = carga.destinatario_razao_social;
    } else if (tipo === 'origem') {
      empresa = carga.filiais?.nome || endereco.contato_nome || 'Remetente';
    } else {
      empresa = endereco.contato_nome || 'Destinatário';
    }
    
    return { empresa, cidade: `${endereco.cidade}/${endereco.estado}`, enderecoCompleto };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg.toLocaleString('pt-BR')}kg`;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTotalFrete = (carga: CargaCompleta) => {
    return carga.entregas.reduce((acc, e) => acc + (e.valor_frete || 0), 0);
  };

  const getTotalPeso = (carga: CargaCompleta) => {
    return carga.entregas.reduce((acc, e) => acc + (e.peso_alocado_kg || 0), 0);
  };

  // Filters sidebar content
  const FiltersContent = () => (
    <div className="space-y-6">
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

      {selectedStatuses.length > 0 && (
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
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            isOnline 
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

  const handleOpenChat = (entrega: EntregaData) => {
    setChatEntregaId(entrega.id);
    setChatSheetOpen(true);
  };

  // Render entrega row for nested subtable
  const renderEntregaRow = (entrega: EntregaData, carga: CargaCompleta, idx: number) => {
    const status = entrega.status || 'aguardando';
    const statusConfig = statusEntregaConfig[status];
    const StatusIcon = statusConfig?.icon || Package;
    const isSelected = selectedEntregaId === entrega.id;
    
    // Document counts
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
            {entrega.codigo || `${carga.codigo}-E${String(idx + 1).padStart(2, '0')}`}
          </Badge>
        </TableCell>
        <TableCell className="py-2.5">
          {entrega.motoristas ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={entrega.motoristas.foto_url || undefined} alt={entrega.motoristas.nome_completo} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {entrega.motoristas.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {textAbbr(entrega.motoristas.nome_completo, 18)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{entrega.motoristas.nome_completo}</p>
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
              {entrega.veiculos?.placa || '-'}
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
        {/* Documentos - Click to view (embarcador = view only) */}
        <TableCell className="py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 gap-1 ${hasMissingCritical ? 'text-amber-600' : 'text-green-600'}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntregaForDetails({ entrega, carga });
            }}
          >
            <FileText className="w-3 h-3" />
            {totalDocs}
            {hasMissingCritical && <AlertTriangle className="w-3 h-3" />}
          </Button>
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
                  handleOpenChat(entrega);
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedEntregaId(entrega.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver no mapa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedEntregaForDetails({ entrega, carga })}>
                <FileText className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenChat(entrega)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  // Get sidebar state from localStorage (synced with PortalLayoutWrapper)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('hubfrete_sidebar_collapsed') === 'true';
  });

  // Listen for storage changes to sync sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      setIsSidebarCollapsed(localStorage.getItem('hubfrete_sidebar_collapsed') === 'true');
    };
    
    // Listen for changes from other components
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for local changes (since storage event doesn't fire for same-tab changes)
    const interval = setInterval(handleStorageChange, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 overflow-hidden transition-[left] duration-300"
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
            />
          </Suspense>
        </div>

        {/* Loading/Empty States */}
        {(isLoading || switchingFilial) ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Card className="border-border bg-background shadow-lg pointer-events-auto">
              <CardContent className="p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              </CardContent>
            </Card>
          </div>
        ) : filteredCargas.length === 0 && cargas.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Card className="border-border bg-background shadow-lg max-w-sm pointer-events-auto">
              <CardContent className="p-6 text-center">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Nenhuma entrega encontrada</h3>
                <p className="text-sm text-muted-foreground">
                  Publique cargas para começar a receber entregas
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Desktop Layout */}
            <div className="hidden lg:block">
              {/* Floating Top Right Panel - Control Panel with Stats & Legend */}
              <div className={`absolute top-4 right-4 z-30 transition-all duration-300 ${filtersCollapsed ? 'w-auto' : 'w-80'}`}>
                {filtersCollapsed ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-10 h-10 bg-background shadow-lg hover:bg-muted border"
                      onClick={() => setFiltersCollapsed(false)}
                    >
                      <PanelLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-10 h-10 bg-background shadow-lg hover:bg-muted border"
                      onClick={() => refetch()}
                      disabled={isLoading || isFetching}
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="bg-background shadow-lg rounded-lg p-2 border">
                      <LiveIndicator />
                    </div>
                  </div>
                ) : (
                  <Card className="border bg-background shadow-xl">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => refetch()}
                            disabled={isLoading || isFetching}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                          </Button>
                          <LiveIndicator />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setFiltersCollapsed(true)}
                        >
                          <PanelLeftClose className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0 space-y-3">
                      {/* Stats Summary Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <div>
                            <span className="text-lg font-bold text-amber-600">{stats.aguardando}</span>
                            <p className="text-[10px] text-amber-600/80">Aguardando</p>
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
                            <p className="text-[10px] text-destructive/80">Problema</p>
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

                      {/* Filters - Collapsible */}
                      <details className="group">
                        <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
                          <Filter className="w-3 h-3" />
                          Filtros
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
                      {selectedStatuses.length > 0 && (
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
                          {/* Status Legend */}
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
                          {/* Connection Legend */}
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
                          {/* Route Legend when selection active */}
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
                  {/* Header */}
                  <CardHeader className="py-2.5 px-4 border-b">
                    <div className="flex items-center justify-between">
                      {/* Left: Title */}
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Cargas em Rota ({filteredCargas.length})</CardTitle>
                      </div>
                      
                      {/* Right: Minimize button */}
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
                      <div className="max-h-[280px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow>
                              <TableHead className="font-semibold w-8"></TableHead>
                              <TableHead className="font-semibold min-w-[130px]">Código</TableHead>
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
                              <TableHead className="font-semibold min-w-[90px] text-center">Peso Total</TableHead>
                              <TableHead className="font-semibold min-w-[100px]">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  Frete
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold min-w-[90px] text-center">Entregas</TableHead>
                              <TableHead className="font-semibold min-w-[100px]">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Limite
                                </div>
                              </TableHead>
                              <TableHead className="font-semibold w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCargas.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                                  Nenhuma entrega corresponde aos filtros selecionados
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredCargas.map((carga) => {
                                const isExpanded = expandedRows.has(carga.id);
                                const origem = getEnderecoData(carga, 'origem');
                                const destino = getEnderecoData(carga, 'destino');
                                const totalPeso = getTotalPeso(carga);
                                const totalFrete = getTotalFrete(carga);
                                
                                const statusCounts = carga.entregas.reduce((acc, e) => {
                                  acc[e.status || 'aguardando'] = (acc[e.status || 'aguardando'] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>);
                                
                                return (
                                  <React.Fragment key={carga.id}>
                                    <TableRow 
                                      className={`hover:bg-muted/50 cursor-pointer ${isExpanded ? 'bg-muted/30 border-l-2 border-l-primary' : ''}`}
                                      onClick={() => toggleRow(carga.id)}
                                    >
                                      <TableCell className="p-2">
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
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium text-primary text-nowrap">{carga.codigo}</p>
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
                                          <TooltipContent side="top" className="max-w-xs">
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
                                          <TooltipContent side="top" className="max-w-xs">
                                            <p className="font-medium">{destino.empresa}</p>
                                            <p className="text-xs text-muted-foreground">{destino.enderecoCompleto}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className="font-medium">{formatWeight(totalPeso)}</span>
                                      </TableCell>
                                      <TableCell>
                                        <span className="font-medium text-green-600">
                                          {formatCurrency(totalFrete)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="flex flex-wrap gap-1 justify-center">
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
                                      <TableCell>
                                        <span className="text-sm">
                                          {formatDate(carga.data_entrega_limite)}
                                        </span>
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
                                              setDetailsCargaId(carga.id);
                                            }}>
                                              <Eye className="w-4 h-4 mr-2" />
                                              Ver detalhes da carga
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>

                                    {isExpanded && carga.entregas.length > 0 && (
                                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                                        <TableCell colSpan={9} className="p-0">
                                          <div className="px-6 py-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Truck className="w-4 h-4 text-primary" />
                                              <span className="text-sm font-medium">Entregas ({carga.entregas.length})</span>
                                              <span className="text-xs text-muted-foreground">• Clique em uma entrega para ver no mapa</span>
                                            </div>
                                            <div className="bg-background rounded-lg border overflow-hidden">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow className="bg-muted/30">
                                                    <TableHead className="text-xs">Código</TableHead>
                                                    <TableHead className="text-xs">Motorista</TableHead>
                                                    <TableHead className="text-xs">Veículo</TableHead>
                                                    <TableHead className="text-xs text-right">Peso</TableHead>
                                                    <TableHead className="text-xs text-right">Frete</TableHead>
                                                    <TableHead className="text-xs">N° CT-e</TableHead>
                                                    <TableHead className="text-xs">Status</TableHead>
                                                    <TableHead className="text-xs">Docs</TableHead>
                                                    <TableHead className="text-xs">Chat</TableHead>
                                                    <TableHead className="text-xs w-10"></TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {carga.entregas.map((entrega, idx) => renderEntregaRow(entrega, carga, idx))}
                                                </TableBody>
                                              </Table>
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
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden absolute inset-0 flex flex-col">
              {/* Mobile Header */}
              <div className="bg-background/95 backdrop-blur-sm border-b p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h1 className="text-lg font-bold text-foreground">Gestão de Entregas</h1>
                    <p className="text-xs text-muted-foreground">Acompanhe em tempo real</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => refetch()}
                      disabled={isLoading || isFetching}
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <LiveIndicator />
                  </div>
                </div>
                {/* Mobile Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar código, motorista..."
                    className="pl-9 h-9 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Mobile Map Area */}
              <div className="flex-1 relative">
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
                  />
                </Suspense>
              </div>
            </div>
          </>
        )}
      {/* Dialogs */}
      {detailsCargaId && (() => {
        const cargaForDetails = cargas.find(c => c.id === detailsCargaId);
        if (!cargaForDetails) return null;
        
        return (
          <CargaDetailsDialog
            carga={{
              id: cargaForDetails.id,
              codigo: cargaForDetails.codigo,
              descricao: cargaForDetails.descricao,
              tipo: cargaForDetails.tipo,
              peso_kg: cargaForDetails.peso_kg,
              volume_m3: cargaForDetails.volume_m3,
              valor_mercadoria: cargaForDetails.valor_mercadoria,
              valor_frete_tonelada: cargaForDetails.valor_frete_tonelada,
              status: cargaForDetails.status,
              data_coleta_de: cargaForDetails.data_coleta_de,
              data_coleta_ate: cargaForDetails.data_coleta_ate,
              data_entrega_limite: cargaForDetails.data_entrega_limite,
              created_at: cargaForDetails.created_at,
              necessidades_especiais: cargaForDetails.necessidades_especiais,
              regras_carregamento: cargaForDetails.regras_carregamento,
              nota_fiscal_url: cargaForDetails.nota_fiscal_url,
              carga_fragil: cargaForDetails.carga_fragil,
              carga_perigosa: cargaForDetails.carga_perigosa,
              carga_viva: cargaForDetails.carga_viva,
              empilhavel: cargaForDetails.empilhavel,
              requer_refrigeracao: cargaForDetails.requer_refrigeracao,
              temperatura_min: cargaForDetails.temperatura_min,
              temperatura_max: cargaForDetails.temperatura_max,
              numero_onu: cargaForDetails.numero_onu,
              remetente: cargaForDetails.endereco_origem ? {
                nome: cargaForDetails.filiais?.nome || cargaForDetails.endereco_origem.contato_nome || 'Remetente',
                cidade: cargaForDetails.endereco_origem.cidade,
                estado: cargaForDetails.endereco_origem.estado,
                endereco: `${cargaForDetails.endereco_origem.logradouro}${cargaForDetails.endereco_origem.numero ? `, ${cargaForDetails.endereco_origem.numero}` : ''}`,
                contato_nome: cargaForDetails.endereco_origem.contato_nome,
                contato_telefone: cargaForDetails.endereco_origem.contato_telefone,
              } : null,
              destinatario: cargaForDetails.endereco_destino ? {
                nome: cargaForDetails.destinatario_nome_fantasia || cargaForDetails.destinatario_razao_social || cargaForDetails.endereco_destino.contato_nome || 'Destinatário',
                cidade: cargaForDetails.endereco_destino.cidade,
                estado: cargaForDetails.endereco_destino.estado,
                endereco: `${cargaForDetails.endereco_destino.logradouro}${cargaForDetails.endereco_destino.numero ? `, ${cargaForDetails.endereco_destino.numero}` : ''}`,
                contato_nome: cargaForDetails.endereco_destino.contato_nome,
                contato_telefone: cargaForDetails.endereco_destino.contato_telefone,
              } : null,
            }}
            open={!!detailsCargaId}
            onOpenChange={(open) => !open && setDetailsCargaId(null)}
          />
        );
      })()}

      {selectedEntregaForDetails && (
        <EntregaDetailsDialog
          open={!!selectedEntregaForDetails}
          onOpenChange={(open) => !open && setSelectedEntregaForDetails(null)}
          entrega={{
            id: selectedEntregaForDetails.entrega.id,
            status: selectedEntregaForDetails.entrega.status || 'aguardando',
            created_at: selectedEntregaForDetails.entrega.updated_at,
            coletado_em: selectedEntregaForDetails.entrega.coletado_em,
            entregue_em: selectedEntregaForDetails.entrega.entregue_em,
            peso_alocado_kg: selectedEntregaForDetails.entrega.peso_alocado_kg,
            valor_frete: selectedEntregaForDetails.entrega.valor_frete,
            cte_url: selectedEntregaForDetails.entrega.cte_url,
            numero_cte: selectedEntregaForDetails.entrega.numero_cte,
            notas_fiscais_urls: selectedEntregaForDetails.entrega.notas_fiscais_urls,
            manifesto_url: selectedEntregaForDetails.entrega.manifesto_url,
            canhoto_url: selectedEntregaForDetails.entrega.canhoto_url,
            motorista: selectedEntregaForDetails.entrega.motoristas,
            veiculo: selectedEntregaForDetails.entrega.veiculos,
            carga: {
              id: selectedEntregaForDetails.carga.id,
              codigo: selectedEntregaForDetails.carga.codigo,
              descricao: selectedEntregaForDetails.carga.descricao,
              peso_kg: selectedEntregaForDetails.carga.peso_kg,
              tipo: selectedEntregaForDetails.carga.tipo,
              data_entrega_limite: selectedEntregaForDetails.carga.data_entrega_limite,
              destinatario_nome_fantasia: selectedEntregaForDetails.carga.destinatario_nome_fantasia,
              destinatario_razao_social: selectedEntregaForDetails.carga.destinatario_razao_social,
              endereco_origem: selectedEntregaForDetails.carga.endereco_origem,
              endereco_destino: selectedEntregaForDetails.carga.endereco_destino,
              empresa: null,
            },
          }}
        />
      )}

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
