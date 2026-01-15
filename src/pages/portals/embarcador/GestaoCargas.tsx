import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Edit,
  Trash2,
  Loader2,
  Filter,
  Truck,
  CheckCircle,
  AlertCircle,
  Navigation,
  Phone,
  User,
  List,
  MapPinned,
  RefreshCw,
  X,
  Building2,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CargaDetailsDialog } from '@/components/cargas/CargaDetailsDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/hooks/useUserContext';
import type { Database } from '@/integrations/supabase/types';

// Lazy load the map component
const EntregasMap = lazy(() => import('@/components/maps/EntregasMap').then(m => ({ default: m.EntregasMap })));

type StatusCarga = Database['public']['Enums']['status_carga'];
type StatusEntrega = Database['public']['Enums']['status_entrega'];

interface EntregaData {
  id: string;
  status: StatusEntrega | null;
  motorista_id: string | null;
  coletado_em: string | null;
  entregue_em: string | null;
  updated_at: string | null;
  peso_alocado_kg: number | null;
  valor_frete: number | null;
  motoristas: {
    nome_completo: string;
    telefone: string | null;
    email: string | null;
  } | null;
  veiculos: {
    placa: string;
    marca: string | null;
    modelo: string | null;
    tipo: string | null;
    capacidade_kg: number | null;
    capacidade_m3: number | null;
  } | null;
}

interface MotoristaLocalizacao {
  email_motorista: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
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
  volume_m3: number | null;
  valor_mercadoria: number | null;
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
  entregas: EntregaData | null;
}

// Status configuration for display
const statusCargaConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  'rascunho': { color: 'bg-muted text-muted-foreground border-muted', label: 'Rascunho', icon: Package },
  'publicada': { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Publicada', icon: Package },
  'aceita': { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Aceita', icon: Package },
  'em_coleta': { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', label: 'Em Coleta', icon: Truck },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Em Trânsito', icon: Navigation },
  'entregue': { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Entregue', icon: CheckCircle },
  'cancelada': { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Cancelada', icon: AlertCircle },
};

const statusEntregaConfig: Record<string, { color: string; label: string }> = {
  'aguardando_coleta': { color: 'bg-gray-500/10 text-gray-600', label: 'Aguardando Coleta' },
  'em_coleta': { color: 'bg-blue-500/10 text-blue-600', label: 'Em Coleta' },
  'coletado': { color: 'bg-cyan-500/10 text-cyan-600', label: 'Coletado' },
  'em_transito': { color: 'bg-orange-500/10 text-orange-600', label: 'Em Trânsito' },
  'em_entrega': { color: 'bg-purple-500/10 text-purple-600', label: 'Em Entrega' },
  'entregue': { color: 'bg-green-500/10 text-green-600', label: 'Entregue' },
  'problema': { color: 'bg-red-500/10 text-red-600', label: 'Problema' },
  'devolvida': { color: 'bg-red-500/10 text-red-600', label: 'Devolvida' },
};

// Status filters for active deliveries - 3 statuses now
const allStatusFilters = [
  { value: 'aguardando_coleta', label: 'Aguardando Coleta', group: 'entrega' },
  { value: 'em_transito', label: 'Em Trânsito', group: 'entrega' },
  { value: 'em_entrega', label: 'Em Entrega', group: 'entrega' },
];

// Status finalizados que não devem aparecer na Gestão de Entregas
const finalizedStatuses = ['entregue', 'cancelada', 'problema', 'devolvida'];

export default function GestaoCargas() {
  const { filialAtiva, switchingFilial } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(null);
  const [detailsCargaId, setDetailsCargaId] = useState<string | null>(null);
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

  // Fetch all cargas that have active entregas (not from cargas directly)
  const { data: cargas = [], isLoading, refetch } = useQuery({
    queryKey: ['gestao_entregas', filialAtiva?.id],
    queryFn: async () => {
      if (!filialAtiva?.id) return [];

      // First, get entregas with active statuses
      const activeStatuses: Database['public']['Enums']['status_entrega'][] = ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega'];
      
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          motorista_id,
          coletado_em,
          entregue_em,
          updated_at,
          peso_alocado_kg,
          valor_frete,
          motoristas (
            nome_completo,
            telefone,
            email
          ),
          veiculos (
            placa,
            marca,
            modelo,
            tipo,
            capacidade_kg,
            capacidade_m3
          ),
          cargas!inner (
            id,
            codigo,
            descricao,
            tipo,
            peso_kg,
            volume_m3,
            valor_mercadoria,
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
            filial_id,
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
            )
          )
        `)
        .in('status', activeStatuses)
        .eq('cargas.filial_id', filialAtiva.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected CargaCompleta format
      return (data || []).map(entrega => {
        const carga = entrega.cargas as any;
        return {
          id: carga.id,
          codigo: carga.codigo,
          descricao: carga.descricao,
          tipo: carga.tipo,
          peso_kg: carga.peso_kg,
          volume_m3: carga.volume_m3,
          valor_mercadoria: carga.valor_mercadoria,
          status: carga.status,
          data_coleta_de: carga.data_coleta_de,
          data_coleta_ate: carga.data_coleta_ate,
          data_entrega_limite: carga.data_entrega_limite,
          created_at: carga.created_at,
          necessidades_especiais: carga.necessidades_especiais,
          regras_carregamento: carga.regras_carregamento,
          nota_fiscal_url: carga.nota_fiscal_url,
          carga_fragil: carga.carga_fragil,
          carga_perigosa: carga.carga_perigosa,
          carga_viva: carga.carga_viva,
          empilhavel: carga.empilhavel,
          requer_refrigeracao: carga.requer_refrigeracao,
          temperatura_min: carga.temperatura_min,
          temperatura_max: carga.temperatura_max,
          numero_onu: carga.numero_onu,
          endereco_origem: carga.endereco_origem,
          endereco_destino: carga.endereco_destino,
          filiais: carga.filiais,
          entregas: {
            id: entrega.id,
            status: entrega.status,
            motorista_id: entrega.motorista_id,
            coletado_em: entrega.coletado_em,
            entregue_em: entrega.entregue_em,
            updated_at: entrega.updated_at,
            peso_alocado_kg: entrega.peso_alocado_kg,
            valor_frete: entrega.valor_frete,
            motoristas: entrega.motoristas,
            veiculos: entrega.veiculos,
          }
        } as CargaCompleta;
      });
    },
    enabled: !!filialAtiva?.id,
  });

  // Fetch driver locations from localizações table
  const motoristaEmails = useMemo(() => {
    const emails = new Set<string>();
    cargas.forEach(c => {
      if (c.entregas?.motoristas?.email) {
        emails.add(c.entregas.motoristas.email);
      }
    });
    return Array.from(emails);
  }, [cargas]);

  const { data: localizacoes = [] } = useQuery({
    queryKey: ['localizacoes_motoristas', motoristaEmails],
    queryFn: async () => {
      if (motoristaEmails.length === 0) return [];

      const { data, error } = await supabase
        .from('localizações')
        .select('email_motorista, latitude, longitude, timestamp, status')
        .in('email_motorista', motoristaEmails);

      if (error) throw error;
      return (data || []) as MotoristaLocalizacao[];
    },
    enabled: motoristaEmails.length > 0,
    refetchInterval: 60000, // Refresh every 1 minutes
  });

  // Create a map of email to location for quick lookup
  const localizacaoMap = useMemo(() => {
    const map = new Map<string, MotoristaLocalizacao>();
    localizacoes.forEach(loc => {
      if (loc.email_motorista) {
        map.set(loc.email_motorista, loc);
      }
    });
    return map;
  }, [localizacoes]);

  // Filter cargas based on entrega status
  const filteredCargas = useMemo(() => {
    return cargas.filter(carga => {
      const matchesSearch =
        carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.descricao.toLowerCase().includes(searchTerm.toLowerCase());

      const entregaStatus = carga.entregas?.status;
      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(entregaStatus || '');

      return matchesSearch && matchesStatus;
    });
  }, [cargas, searchTerm, selectedStatuses]);

  // Calculate stats - focused on 3 delivery statuses
  const stats = useMemo(() => ({
    total: cargas.length,
    aguardando_coleta: cargas.filter(c => c.entregas?.status === 'aguardando_coleta' || c.entregas?.status === 'em_coleta' || c.entregas?.status === 'coletado').length,
    em_transito: cargas.filter(c => c.entregas?.status === 'em_transito').length,
    em_entrega: cargas.filter(c => c.entregas?.status === 'em_entrega').length,
  }), [cargas]);

  // Map data for entregas with location from localizações table
  const mapData = useMemo(() => {
    return filteredCargas
      .map(c => {
        const e = c.entregas;
        const origem = c.endereco_origem;
        const destino = c.endereco_destino;

        // Get driver location from localizações table
        const motoristaEmail = e?.motoristas?.email;
        const localizacao = motoristaEmail ? localizacaoMap.get(motoristaEmail) : null;

        // Include if has driver location OR has origin/destination coords
        const hasLocation = localizacao?.latitude && localizacao?.longitude;
        const hasRoute = (origem?.latitude && origem?.longitude) || (destino?.latitude && destino?.longitude);

        if (!hasLocation && !hasRoute) return null;

        return {
          id: e?.id || c.id,
          cargaId: c.id,
          latitude: localizacao?.latitude || null,
          longitude: localizacao?.longitude || null,
          status: e?.status || null,
          codigo: c.codigo,
          descricao: c.descricao,
          motorista: e?.motoristas?.nome_completo || null,
          telefone: e?.motoristas?.telefone || null,
          placa: e?.veiculos?.placa || null,
          destino: destino ? `${destino.cidade}, ${destino.estado}` : null,
          origemCoords: origem?.latitude && origem?.longitude
            ? { lat: origem.latitude, lng: origem.longitude }
            : null,
          destinoCoords: destino?.latitude && destino?.longitude
            ? { lat: destino.latitude, lng: destino.longitude }
            : null,
        };
      })
      .filter(Boolean) as NonNullable<typeof mapData[number]>[];
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

  const getRemetente = (carga: CargaCompleta) => {
    // Remetente is the filial (branch) that sent the cargo
    const origem = carga.endereco_origem;
    return {
      nome: carga.filiais?.nome || 'Filial',
      cidade: origem?.cidade || carga.filiais?.cidade || '-',
      estado: origem?.estado || carga.filiais?.estado || '',
      endereco: origem ? `${origem.logradouro}${origem.numero ? `, ${origem.numero}` : ''}` : carga.filiais?.endereco,
      contato_nome: origem?.contato_nome || carga.filiais?.responsavel,
      contato_telefone: origem?.contato_telefone || carga.filiais?.telefone,
    };
  };

  const getDestinatario = (carga: CargaCompleta) => {
    // Destinatário is the destination contact/company
    const destino = carga.endereco_destino;
    if (!destino) return null;
    return {
      nome: destino.contato_nome || 'Destinatário',
      cidade: destino.cidade,
      estado: destino.estado,
      endereco: `${destino.logradouro}${destino.numero ? `, ${destino.numero}` : ''}`,
      contato_nome: destino.contato_nome,
      contato_telefone: destino.contato_telefone,
    };
  };

  const getEndereco = (carga: CargaCompleta, tipo: 'origem' | 'destino') => {
    const endereco = tipo === 'origem' ? carga.endereco_origem : carga.endereco_destino;
    if (!endereco) return { cidade: '-', contato: null, endereco: null };
    return {
      cidade: `${endereco.cidade}, ${endereco.estado}`,
      contato: endereco.contato_nome,
      telefone: endereco.contato_telefone,
      endereco: `${endereco.logradouro}${endereco.numero ? `, ${endereco.numero}` : ''}`,
    };
  };

  const formatVolume = (volume: number | null) => {
    if (!volume) return '-';
    return `${volume.toLocaleString('pt-BR')} m³`;
  };

  const tipoCargaLabels: Record<string, string> = {
    'carga_seca': 'Carga Seca',
    'granel_solido': 'Granel Sólido',
    'granel_liquido': 'Granel Líquido',
    'refrigerada': 'Refrigerada',
    'congelada': 'Congelada',
    'perigosa': 'Perigosa',
    'viva': 'Carga Viva',
    'indivisivel': 'Indivisível',
    'container': 'Container',
  };

  const tipoVeiculoLabels: Record<string, string> = {
    'truck': 'Truck',
    'toco': 'Toco',
    'tres_quartos': '3/4',
    'vuc': 'VUC',
    'carreta': 'Carreta',
    'carreta_ls': 'Carreta LS',
    'bitrem': 'Bitrem',
    'rodotrem': 'Rodotrem',
    'vanderleia': 'Vanderléia',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPeso = (peso: number) => peso.toLocaleString('pt-BR') + ' kg';

  const formatValor = (valor: number | null) => {
    if (!valor) return '-';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getProgress = (carga: CargaCompleta): number => {
    switch (carga.status) {
      case 'rascunho': return 5;
      case 'publicada': return 20;
      case 'aceita': return 40;
      case 'em_coleta': return 55;
      case 'em_transito': return 75;
      case 'entregue': return 100;
      case 'cancelada': return 0;
      default: return 0;
    }
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

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="flex gap-6">
        {/* Desktop Sidebar: Filters + Stats + Search */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-4">
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

          {/* Stats Cards - 3 status cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border bg-gray-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-xl font-bold text-gray-600">{stats.aguardando_coleta}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Aguardando Coleta</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-orange-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-xl font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Em Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-purple-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Navigation className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-purple-600">{stats.em_entrega}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Em Entrega</p>
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

        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col gap-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Entregas</h1>
              <p className="text-muted-foreground">Acompanhe suas entregas em tempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <LiveIndicator />
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading || switchingFilial}
              >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Mobile Stats - 3 cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border bg-gray-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Package className="w-3 h-3 text-gray-600" />
                </div>
                <p className="text-lg font-bold text-gray-600">{stats.aguardando_coleta}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Aguard. Coleta</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-orange-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Truck className="w-3 h-3 text-orange-600" />
                </div>
                <p className="text-lg font-bold text-orange-600">{stats.em_transito}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Em Trânsito</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-purple-500/5">
              <CardContent className="p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Navigation className="w-3 h-3 text-purple-600" />
                </div>
                <p className="text-lg font-bold text-purple-600">{stats.em_entrega}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">Em Entrega</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 w-full">
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

          {selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStatuses.map(status => {
                const config = statusEntregaConfig[status];
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className={`${config?.color || ''} cursor-pointer`}
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

        {/* Main Content - Map and Table */}
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
                <EntregasMap
                  entregas={mapData}
                  selectedCargaId={selectedCargaId}
                  onSelectCarga={setSelectedCargaId}
                />
              </Suspense>

              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Nenhuma carga encontrada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStatuses.length > 0
                      ? 'Tente ajustar os filtros selecionados'
                      : 'Clique em "Nova Carga" para começar'}
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
                <EntregasMap
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
                          <TableHead className="font-semibold min-w-[140px] sticky left-0 bg-muted/50 z-10">Código</TableHead>
                          <TableHead className="font-semibold min-w-[180px]">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Remetente
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold min-w-[180px]">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Destinatário
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold min-w-[90px]">Peso</TableHead>
                          <TableHead className="font-semibold min-w-[80px]">Volume</TableHead>
                          <TableHead className="font-semibold min-w-[100px]">Tipo</TableHead>
                          <TableHead className="font-semibold min-w-[110px]">Motorista</TableHead>
                          <TableHead className="font-semibold min-w-[90px]">Veículo</TableHead>
                          <TableHead className="font-semibold min-w-[110px]">Status</TableHead>
                          <TableHead className="font-semibold min-w-[100px]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Previsão
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCargas.map((carga) => {
                          const status = carga.status || 'rascunho';
                          const config = statusCargaConfig[status];
                          const StatusIcon = config?.icon || Package;
                          const entrega = carga.entregas;
                          const isSelected = selectedCargaId === carga.id;
                          const remetente = getRemetente(carga);
                          const destinatario = getDestinatario(carga);

                          return (
                            <TableRow
                              key={carga.id}
                              className={`hover:bg-muted/50 cursor-pointer ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''}`}
                              onClick={() => setSelectedCargaId(isSelected ? null : carga.id)}
                            >
                              {/* Código (sticky) */}
                              <TableCell className="sticky left-0 bg-background z-10">
                                <div>
                                  <p className="font-medium text-foreground">{carga.codigo}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">{carga.descricao}</p>
                                </div>
                              </TableCell>

                              {/* Remetente */}
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-sm">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                          <span className="font-medium truncate max-w-[140px]">{remetente.nome}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                          {remetente.cidade}{remetente.estado ? `, ${remetente.estado}` : ''}
                                        </p>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <p className="font-medium">{remetente.nome}</p>
                                      {remetente.endereco && <p className="text-xs">{remetente.endereco}</p>}
                                      <p className="text-xs">{remetente.cidade}, {remetente.estado}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>

                              {/* Destinatário */}
                              <TableCell>
                                {destinatario ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-sm">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                            <span className="font-medium truncate max-w-[140px]">{destinatario.nome}</span>
                                          </div>
                                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                            {destinatario.cidade}, {destinatario.estado}
                                          </p>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs">
                                        <p className="font-medium">{destinatario.nome}</p>
                                        {destinatario.endereco && <p className="text-xs">{destinatario.endereco}</p>}
                                        <p className="text-xs">{destinatario.cidade}, {destinatario.estado}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Peso */}
                              <TableCell className="text-sm">{formatPeso(carga.peso_kg)}</TableCell>

                              {/* Volume */}
                              <TableCell className="text-sm">{formatVolume(carga.volume_m3)}</TableCell>

                              {/* Tipo */}
                              <TableCell>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {tipoCargaLabels[carga.tipo] || carga.tipo}
                                </Badge>
                              </TableCell>

                              {/* Motorista */}
                              <TableCell>
                                {entrega?.motoristas ? (
                                  <div className="text-sm">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span className="truncate max-w-[90px]">{entrega.motoristas.nome_completo}</span>
                                    </div>
                                    {entrega.motoristas.telefone && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="w-3 h-3" />
                                        <span>{entrega.motoristas.telefone}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Veículo */}
                              <TableCell>
                                {entrega?.veiculos ? (
                                  <div className="text-sm">
                                    <p className="font-medium">{entrega.veiculos.placa}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {tipoVeiculoLabels[entrega.veiculos.tipo || ''] || entrega.veiculos.tipo || '-'}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                <Badge variant="outline" className={config?.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {config?.label}
                                </Badge>
                              </TableCell>

                              {/* Previsão */}
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(carga.data_entrega_limite)}
                                </div>
                              </TableCell>

                              {/* Ações */}
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                                    <DropdownMenuItem
                                      className="gap-2 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsCargaId(carga.id);
                                      }}
                                    >
                                      <Eye className="w-4 h-4" /> Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="gap-2 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCargaId(carga.id);
                                        toast.info('Carga destacada no mapa');
                                      }}
                                    >
                                      <MapPin className="w-4 h-4" /> Ver no mapa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                      <Edit className="w-4 h-4" /> Editar
                                    </DropdownMenuItem>
                                    {entrega?.motoristas?.telefone && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`tel:${entrega.motoristas!.telefone}`, '_blank');
                                          }}
                                        >
                                          <Phone className="w-4 h-4" /> Ligar para motorista
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="gap-2 cursor-pointer text-destructive"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="w-4 h-4" /> Cancelar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
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

      {/* Details Dialog */}
      {detailsCargaId && (() => {
        const carga = cargas.find(c => c.id === detailsCargaId);
        if (!carga) return null;

        const remetente = getRemetente(carga);
        const destinatario = getDestinatario(carga);

        return (
          <CargaDetailsDialog
            carga={{
              ...carga,
              remetente,
              destinatario,
            }}
            open={!!detailsCargaId}
            onOpenChange={(open) => !open && setDetailsCargaId(null)}
          />
        );
      })()}
    </PortalLayout>
  );
}
