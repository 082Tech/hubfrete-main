import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeLocalizacoes } from '@/hooks/useRealtimeLocalizacoes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  Navigation,
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the Google Maps component
const EntregasGoogleMap = lazy(() => import('@/components/maps/EntregasGoogleMap').then(m => ({ default: m.EntregasGoogleMap })));

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

// Status configuration for display
const statusEntregaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'aguardando': { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Aguardando', icon: Package },
  'saiu_para_coleta': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Saiu para Coleta', icon: Package },
  'saiu_para_entrega': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Saiu para Entrega', icon: Truck },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Entregue', icon: CheckCircle },
  'problema': { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Problema', icon: AlertCircle },
  'cancelada': { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Cancelada', icon: AlertCircle },
};

// Status filters for active deliveries
const allStatusFilters = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'saiu_para_coleta', label: 'Saiu para Coleta' },
  { value: 'saiu_para_entrega', label: 'Saiu para Entrega' },
];

// Statuses that should not appear in delivery management (finalized)
const activeStatuses: StatusEntrega[] = ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'];

export default function GestaoCargas() {
  const navigate = useNavigate();
  const { filialAtiva, switchingFilial } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(null);
  const [detailsCargaId, setDetailsCargaId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedEntregaForDetails, setSelectedEntregaForDetails] = useState<{ entrega: EntregaData; carga: CargaCompleta } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
  const { data: cargas = [], isLoading, refetch } = useQuery({
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
        carga.descricao.toLowerCase().includes(searchTerm.toLowerCase());

      // Only include cargas that still have matching entregas
      return matchesSearch && carga.entregas.length > 0;
    });
  }, [cargas, searchTerm, selectedStatuses]);

  // Calculate stats
  const stats = useMemo(() => {
    let aguardando = 0;
    let emTransito = 0;
    let emEntrega = 0;
    let totalEntregas = 0;
    let totalFrete = 0;

    cargas.forEach(c => {
      c.entregas.forEach(e => {
        totalEntregas++;
        totalFrete += e.valor_frete || 0;
        if (e.status === 'aguardando') {
          aguardando++;
        } else if (e.status === 'saiu_para_coleta') {
          emTransito++;
        } else if (e.status === 'saiu_para_entrega') {
          emEntrega++;
        }
      });
    });

    return {
      total: totalEntregas,
      cargas: cargas.length,
      aguardando_coleta: aguardando,
      em_transito: emTransito,
      em_entrega: emEntrega,
      totalFrete,
    };
  }, [cargas]);

  // Map data for entregas with location
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
          cargaId: c.id,
          entregaId: e.id,
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
          heading: localizacao?.heading ?? null,
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

  const handleOpenChat = (entrega: EntregaData, carga: CargaCompleta) => {
    // Navigate to chat page with entrega context
    navigate(`/embarcador/mensagens?entrega=${entrega.id}`);
  };

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <TooltipProvider>
        {/* Desktop Layout - Sidebar + Content */}
        <div className="hidden lg:flex gap-6">
          {/* Desktop Sidebar: Filters + Stats + Search */}
          <aside className="flex flex-col w-72 shrink-0 gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">Gestão de Entregas</h1>
                <p className="text-sm text-muted-foreground">Acompanhe suas entregas em tempo real</p>
              </div>
            </div>

            {/* Action buttons and Live Indicator */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading || switchingFilial}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <LiveIndicator />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código ou descrição..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-border bg-amber-500/10">
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-xl font-bold text-amber-600">{stats.aguardando_coleta}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Aguardando</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-orange-500/10">
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xl font-bold text-orange-600">{stats.em_transito}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Em Trânsito</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-purple-500/10">
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Navigation className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xl font-bold text-purple-600">{stats.em_entrega}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Em Entrega</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{stats.cargas}</p>
                  <p className="text-[10px] text-muted-foreground">Cargas</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-green-500/10">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalFrete)}</p>
                  <p className="text-[10px] text-muted-foreground">Frete Total</p>
                </CardContent>
              </Card>
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
            {selectedStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
          </aside>

          {/* Desktop Main Content */}
          <div className="flex-1 space-y-4 min-w-0">
            {isLoading || switchingFilial ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCargas.length === 0 ? (
              <div className='space-y-4'>
                <Suspense fallback={
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="w-full h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                }>
                  <EntregasGoogleMap
                    entregas={mapData}
                    selectedCargaId={selectedCargaId}
                    onSelectCarga={setSelectedCargaId}
                  />
                </Suspense>

                <Card className="border-border">
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-1">Nenhuma entrega encontrada</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedStatuses.length > 0
                        ? 'Tente ajustar os filtros selecionados'
                        : 'Não há entregas ativas no momento'}
                    </p>
                    {selectedStatuses.length > 0 && (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className='space-y-4'>
                <Suspense fallback={
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="w-full h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                }>
                  <EntregasGoogleMap
                    entregas={mapData}
                    selectedCargaId={selectedCargaId}
                    onSelectCarga={setSelectedCargaId}
                  />
                </Suspense>

                <Card className="border-border">
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="font-semibold min-w-[130px]">Código</TableHead>
                            <TableHead className="font-semibold min-w-[160px]">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                Origem
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold min-w-[160px]">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                Destino
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
                          {filteredCargas.map((carga) => {
                            const isExpanded = expandedRows.has(carga.id);
                            const origem = getEnderecoData(carga, 'origem');
                            const destino = getEnderecoData(carga, 'destino');
                            const totalPeso = getTotalPeso(carga);
                            const totalFrete = getTotalFrete(carga);
                            const isSelected = selectedCargaId === carga.id;
                            
                            return (
                              <>
                                {/* Main Row - Carga */}
                                <TableRow 
                                  key={carga.id}
                                  className={`hover:bg-muted/50 cursor-pointer ${isExpanded ? 'bg-primary/5 border-l-2 border-l-primary' : ''} ${isSelected ? 'bg-primary/10' : ''}`}
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
                                      <TooltipContent side="bottom" className="max-w-xs">
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
                                      <TooltipContent side="bottom" className="max-w-xs">
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
                                    <Badge variant="outline" className="text-xs">
                                      {carga.entregas.length} {carga.entregas.length === 1 ? 'entrega' : 'entregas'}
                                    </Badge>
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

                                {/* Expanded Row - Entregas */}
                                {isExpanded && carga.entregas.length > 0 && (
                                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                                    <TableCell colSpan={9} className="p-0">
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
                                                <TableHead className="text-xs text-right">Peso</TableHead>
                                                <TableHead className="text-xs text-right">Frete</TableHead>
                                                <TableHead className="text-xs">CT-e</TableHead>
                                                <TableHead className="text-xs">Status</TableHead>
                                                <TableHead className="text-xs w-10"></TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {carga.entregas.map((entrega, idx) => {
                                                const statusConfig = statusEntregaConfig[entrega.status || 'aguardando_coleta'];
                                                const StatusIcon = statusConfig?.icon || Package;
                                                
                                                return (
                                                  <TableRow key={entrega.id}>
                                                    <TableCell className="font-mono text-sm font-medium text-primary text-nowrap">
                                                      {entrega.codigo || `${carga.codigo}-E${String(idx + 1).padStart(2, '0')}`}
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
                                                    <TableCell className="text-right text-sm font-medium text-green-600">
                                                      {formatCurrency(entrega.valor_frete)}
                                                    </TableCell>
                                                    <TableCell>
                                                      {entrega.cte_url ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
                                                          <FileText className="w-3 h-3" />
                                                          CT-e
                                                        </Badge>
                                                      ) : (
                                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
                                                          <FileText className="w-3 h-3" />
                                                          Pendente
                                                        </Badge>
                                                      )}
                                                    </TableCell>
                                                    <TableCell>
                                                      <Badge className={`${statusConfig?.color || ''} text-xs`}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusConfig?.label || entrega.status}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                          <DropdownMenuItem onClick={() => {
                                                            setSelectedEntregaForDetails({ entrega, carga });
                                                          }}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Ver detalhes
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleOpenChat(entrega, carga)}>
                                                            <MessageCircle className="w-4 h-4 mr-2" />
                                                            Abrir chat
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => {
                                                            setSelectedCargaId(carga.id);
                                                          }}>
                                                            <MapPin className="w-4 h-4 mr-2" />
                                                            Ver no mapa
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
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Gestão de Entregas</h1>
              <p className="text-xs text-muted-foreground">Acompanhe em tempo real</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading || switchingFilial}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FiltersContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border bg-amber-500/10">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-amber-600">{stats.aguardando_coleta}</p>
                <p className="text-[9px] text-muted-foreground">Aguardando</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-orange-500/10">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-[9px] text-muted-foreground">Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-purple-500/10">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-purple-600">{stats.em_entrega}</p>
                <p className="text-[9px] text-muted-foreground">Entrega</p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Mobile Map */}
          <Suspense fallback={
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="w-full h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          }>
            <EntregasGoogleMap
              entregas={mapData}
              selectedCargaId={selectedCargaId}
              onSelectCarga={setSelectedCargaId}
            />
          </Suspense>

          {/* Mobile Cards */}
          {isLoading || switchingFilial ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCargas.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrega encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCargas.map((carga) => {
                const origem = getEnderecoData(carga, 'origem');
                const destino = getEnderecoData(carga, 'destino');
                const isExpanded = expandedRows.has(carga.id);
                
                return (
                  <Card 
                    key={carga.id} 
                    className={`${selectedCargaId === carga.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleRow(carga.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-medium text-primary">{carga.codigo}</span>
                            <Badge variant="outline" className="text-xs">
                              {carga.entregas.length} {carga.entregas.length === 1 ? 'entrega' : 'entregas'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{carga.descricao}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-green-500" />
                              <span>{origem.cidade}</span>
                            </div>
                            <span>→</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-red-500" />
                              <span>{destino.cidade}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsCargaId(carga.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Mobile Expanded Entregas */}
                      {isExpanded && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {carga.entregas.map((entrega, idx) => {
                            const statusConfig = statusEntregaConfig[entrega.status || 'aguardando_coleta'];
                            
                            return (
                              <div 
                                key={entrega.id}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                              >
                                <div className="flex-1">
                                  <p className="text-xs font-mono font-medium text-primary">
                                    {entrega.codigo || `${carga.codigo}-E${String(idx + 1).padStart(2, '0')}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {entrega.motoristas?.nome_completo || 'Sem motorista'}
                                  </p>
                                </div>
                                <Badge className={`${statusConfig?.color || ''} text-[10px]`}>
                                  {statusConfig?.label || entrega.status}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </TooltipProvider>

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
    </div>
  );
}
