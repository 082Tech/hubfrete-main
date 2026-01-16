import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  MapPin,
  Calendar,
  Weight,
  Truck,
  Search,
  Filter,
  Loader2,
  ArrowRight,
  ThermometerSnowflake,
  AlertTriangle,
  Boxes,
  CheckCircle,
  User,
  List,
  Map as MapIcon,
  DollarSign,
  Rabbit,
  Ban,
  Layers,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VeiculoRequisitos {
  tipos_veiculo?: string[];
  tipos_carroceria?: string[];
}

interface Carga {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  peso_disponivel_kg: number | null;
  volume_m3: number | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  requer_refrigeracao: boolean;
  carga_perigosa: boolean;
  carga_fragil: boolean;
  carga_viva: boolean;
  empilhavel: boolean;
  necessidades_especiais: string[] | null;
  veiculo_requisitos: VeiculoRequisitos | null;
  endereco_origem: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  endereco_destino: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  empresa: {
    nome: string;
    logo_url: string | null;
  } | null;
}

interface Veiculo {
  id: string;
  placa: string;
  tipo: string;
  carroceria: string;
  capacidade_kg: number | null;
  marca: string | null;
  modelo: string | null;
}

interface Motorista {
  id: string;
  nome_completo: string;
  telefone: string | null;
  veiculos: Veiculo[];
}

const tipoCargaLabels: Record<string, string> = {
  granel_solido: 'Granel Sólido',
  granel_liquido: 'Granel Líquido',
  carga_seca: 'Carga Seca',
  refrigerada: 'Refrigerada',
  congelada: 'Congelada',
  perigosa: 'Perigosa',
  viva: 'Viva',
  indivisivel: 'Indivisível',
  container: 'Container',
};

// Price marker icon for map
const createPriceIcon = (price: number | null) => {
  const priceText = price ? `R$${Math.round(price)}` : '---';
  return L.divIcon({
    className: 'custom-price-marker',
    html: `
      <div style="
        background: hsl(var(--primary));
        color: white;
        padding: 6px 10px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 12px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        cursor: pointer;
        transition: transform 0.2s;
      ">${priceText}/ton</div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
  });
};

// Origin marker (green O)
const createOriginIcon = () => {
  return L.divIcon({
    className: 'custom-origin-marker',
    html: `
      <div style="
        background: hsl(142.1 76.2% 36.3%);
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">O</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Destination marker (red D)
const createDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-destination-marker',
    html: `
      <div style="
        background: hsl(0 84.2% 60.2%);
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">D</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Fit bounds component
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export default function CargasDisponiveis() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('');
  const [pesoAlocado, setPesoAlocado] = useState<string>('');
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [hoveredCargaId, setHoveredCargaId] = useState<string | null>(null);
  
  // Route data for dialog map
  const [dialogRouteCoords, setDialogRouteCoords] = useState<[number, number][]>([]);
  const [dialogRouteDistance, setDialogRouteDistance] = useState<number | null>(null);
  const [dialogRouteDuration, setDialogRouteDuration] = useState<number | null>(null);
  const [isLoadingDialogRoute, setIsLoadingDialogRoute] = useState(false);

  // Fetch OSRM route when dialog opens
  useEffect(() => {
    const fetchDialogRoute = async () => {
      if (!selectedCarga || !isAcceptDialogOpen) {
        setDialogRouteCoords([]);
        setDialogRouteDistance(null);
        setDialogRouteDuration(null);
        return;
      }

      const origemLat = Number(selectedCarga.endereco_origem?.latitude);
      const origemLng = Number(selectedCarga.endereco_origem?.longitude);
      const destinoLat = Number(selectedCarga.endereco_destino?.latitude);
      const destinoLng = Number(selectedCarga.endereco_destino?.longitude);

      if (!origemLat || !origemLng || !destinoLat || !destinoLng) return;

      setIsLoadingDialogRoute(true);
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );
          setDialogRouteCoords(coords);
          setDialogRouteDistance(data.routes[0].distance / 1000); // km
          setDialogRouteDuration(data.routes[0].duration / 60); // minutes
        }
      } catch (error) {
        console.error('Erro ao buscar rota OSRM:', error);
      } finally {
        setIsLoadingDialogRoute(false);
      }
    };

    fetchDialogRoute();
  }, [selectedCarga, isAcceptDialogOpen]);

  // Fetch cargas publicadas
  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas_disponiveis'],
    queryFn: async () => {
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
          data_coleta_de,
          data_coleta_ate,
          requer_refrigeracao,
          carga_perigosa,
          carga_fragil,
          carga_viva,
          empilhavel,
          necessidades_especiais,
          veiculo_requisitos,
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, latitude, longitude),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, latitude, longitude),
          empresa:empresas!cargas_empresa_id_fkey(nome, logo_url)
        `)
        .eq('status', 'publicada')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Carga[];
    },
  });

  // Fetch motoristas da transportadora com status de disponibilidade
  const { data: motoristas = [] } = useQuery({
    queryKey: ['motoristas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('motoristas')
        .select(`
          id,
          nome_completo,
          telefone,
          veiculos(id, placa, tipo, carroceria, capacidade_kg, marca, modelo)
        `)
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);

      if (error) throw error;
      return (data || []) as Motorista[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas ativas para saber quais motoristas estão ocupados
  const { data: entregasAtivas = [] } = useQuery({
    queryKey: ['entregas_ativas_motoristas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select('motorista_id')
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega'])
        .not('motorista_id', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Filtrar motoristas disponíveis (sem entrega ativa)
  const motoristasOcupados = useMemo(() => {
    return new Set(entregasAtivas.map(e => e.motorista_id));
  }, [entregasAtivas]);

  const motoristasDisponiveis = useMemo(() => {
    return motoristas.filter(m => !motoristasOcupados.has(m.id));
  }, [motoristas, motoristasOcupados]);

  // Mutation para aceitar carga
  const acceptCarga = useMutation({
    mutationFn: async ({ 
      cargaId, 
      motoristaId, 
      veiculoId, 
      pesoAlocadoKg, 
      valorFrete 
    }: { 
      cargaId: string; 
      motoristaId: string; 
      veiculoId: string; 
      pesoAlocadoKg: number;
      valorFrete: number;
    }) => {
      // Get current cargo to update peso_disponivel_kg
      const { data: cargaAtual, error: fetchError } = await supabase
        .from('cargas')
        .select('peso_disponivel_kg, peso_kg')
        .eq('id', cargaId)
        .single();

      if (fetchError) throw fetchError;

      const pesoDisponivel = cargaAtual.peso_disponivel_kg ?? cargaAtual.peso_kg;
      const novoPesoDisponivel = pesoDisponivel - pesoAlocadoKg;

      // Update cargo status and available weight
      const novoStatus = novoPesoDisponivel <= 0 ? 'aceita' : 'publicada';
      const { error: cargaError } = await supabase
        .from('cargas')
        .update({ 
          status: novoStatus,
          peso_disponivel_kg: Math.max(0, novoPesoDisponivel)
        })
        .eq('id', cargaId);

      if (cargaError) throw cargaError;

      // Create delivery record
      const { error: entregaError } = await supabase
        .from('entregas')
        .insert({
          carga_id: cargaId,
          motorista_id: motoristaId,
          veiculo_id: veiculoId,
          peso_alocado_kg: pesoAlocadoKg,
          valor_frete: valorFrete,
          status: 'aguardando_coleta',
        });

      if (entregaError) throw entregaError;
    },
    onSuccess: () => {
      toast.success('Carga aceita com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['cargas_disponiveis'] });
      setIsAcceptDialogOpen(false);
      setSelectedCarga(null);
      setSelectedMotorista('');
      setSelectedVeiculo('');
      setPesoAlocado('');
    },
    onError: (error) => {
      console.error('Erro ao aceitar carga:', error);
      toast.error('Erro ao aceitar carga');
    },
  });

  const filteredCargas = useMemo(() => {
    return cargas.filter((carga) => {
      const matchesSearch =
        carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.endereco_origem?.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carga.endereco_destino?.cidade?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = filterTipo === 'all' || carga.tipo === filterTipo;

      return matchesSearch && matchesTipo;
    });
  }, [cargas, searchTerm, filterTipo]);

  // Map bounds
  const mapBounds = useMemo(() => {
    const coords = filteredCargas
      .filter(c => c.endereco_origem?.latitude && c.endereco_origem?.longitude)
      .map(c => [c.endereco_origem!.latitude!, c.endereco_origem!.longitude!] as [number, number]);
    
    if (coords.length === 0) return null;
    if (coords.length === 1) return L.latLngBounds([coords[0], coords[0]]);
    return L.latLngBounds(coords);
  }, [filteredCargas]);

  const handleAcceptClick = (carga: Carga) => {
    setSelectedCarga(carga);
    setSelectedMotorista('');
    setSelectedVeiculo('');
    // Default to available weight or full weight
    const pesoDisponivel = carga.peso_disponivel_kg ?? carga.peso_kg;
    setPesoAlocado(pesoDisponivel.toString());
    setIsAcceptDialogOpen(true);
  };

  // Get vehicles for selected driver
  const selectedMotoristaData = useMemo(() => {
    return motoristasDisponiveis.find((m) => m.id === selectedMotorista);
  }, [motoristasDisponiveis, selectedMotorista]);

  // Get selected vehicle data
  const selectedVeiculoData = useMemo(() => {
    return selectedMotoristaData?.veiculos?.find((v) => v.id === selectedVeiculo);
  }, [selectedMotoristaData, selectedVeiculo]);

  // Calculate freight based on allocated weight
  const calculatedFrete = useMemo(() => {
    if (!selectedCarga?.valor_frete_tonelada || !pesoAlocado) return 0;
    const peso = parseFloat(pesoAlocado) || 0;
    return (peso / 1000) * selectedCarga.valor_frete_tonelada;
  }, [selectedCarga, pesoAlocado]);

  const handleConfirmAccept = () => {
    if (!selectedCarga || !selectedMotorista || !selectedVeiculo) {
      toast.error('Selecione motorista e veículo');
      return;
    }

    const peso = parseFloat(pesoAlocado) || 0;
    if (peso <= 0) {
      toast.error('Peso deve ser maior que zero');
      return;
    }

    const pesoDisponivel = selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg;
    if (peso > pesoDisponivel) {
      toast.error('Peso alocado maior que o disponível');
      return;
    }

    acceptCarga.mutate({
      cargaId: selectedCarga.id,
      motoristaId: selectedMotorista,
      veiculoId: selectedVeiculo,
      pesoAlocadoKg: peso,
      valorFrete: calculatedFrete,
    });
  };

  // Labels for vehicle types
  const tipoVeiculoLabels: Record<string, string> = {
    truck: 'Truck',
    toco: 'Toco',
    tres_quartos: '3/4',
    vuc: 'VUC',
    carreta: 'Carreta',
    carreta_ls: 'Carreta LS',
    bitrem: 'Bitrem',
    rodotrem: 'Rodotrem',
    vanderleia: 'Vanderléia',
    bitruck: 'Bitruck',
  };

  const tipoCarroceriaLabels: Record<string, string> = {
    aberta: 'Aberta',
    fechada_bau: 'Fechada/Baú',
    graneleira: 'Graneleira',
    tanque: 'Tanque',
    sider: 'Sider',
    frigorifico: 'Frigorífico',
    cegonha: 'Cegonha',
    prancha: 'Prancha',
    container: 'Container',
    graneleiro: 'Graneleiro',
    grade_baixa: 'Grade Baixa',
    cacamba: 'Caçamba',
    plataforma: 'Plataforma',
    bau: 'Baú',
    bau_frigorifico: 'Baú Frigorífico',
    bau_refrigerado: 'Baú Refrigerado',
    silo: 'Silo',
    gaiola: 'Gaiola',
    bug_porta_container: 'Bug Porta Container',
    munk: 'Munk',
    apenas_cavalo: 'Apenas Cavalo',
    cavaqueira: 'Cavaqueira',
    hopper: 'Hopper',
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Carga Card component for reuse
  const CargaCard = ({ carga, isHovered }: { carga: Carga; isHovered?: boolean }) => (
    <Card
      className={`border-border hover:shadow-lg transition-all cursor-pointer ${isHovered ? 'ring-2 ring-primary shadow-lg' : ''}`}
      onMouseEnter={() => setHoveredCargaId(carga.id)}
      onMouseLeave={() => setHoveredCargaId(null)}
      onClick={() => handleAcceptClick(carga)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Company Logo */}
          {carga.empresa?.logo_url && (
            <div className="shrink-0 w-10 h-10 rounded-md border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
              <img 
                src={carga.empresa.logo_url} 
                alt={carga.empresa.nome || 'Logo'} 
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {carga.codigo}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {tipoCargaLabels[carga.tipo] || carga.tipo}
              </Badge>
            </div>
            <p className="font-medium text-sm line-clamp-1">{carga.descricao}</p>
            {carga.empresa?.nome && (
              <p className="text-xs text-muted-foreground mt-0.5">{carga.empresa.nome}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {carga.requer_refrigeracao && (
              <Tooltip>
                <TooltipTrigger>
                  <ThermometerSnowflake className="w-4 h-4 text-blue-500" />
                </TooltipTrigger>
                <TooltipContent>Refrigerada</TooltipContent>
              </Tooltip>
            )}
            {carga.carga_perigosa && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>Perigosa</TooltipContent>
              </Tooltip>
            )}
            {carga.carga_fragil && (
              <Tooltip>
                <TooltipTrigger>
                  <Boxes className="w-4 h-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>Frágil</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-chart-1" />
            <span className="truncate max-w-[80px]">{carga.endereco_origem?.cidade || 'N/A'}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-chart-2" />
            <span className="truncate max-w-[80px]">{carga.endereco_destino?.cidade || 'N/A'}</span>
          </div>
        </div>

        {/* Available Weight Badge */}
        {carga.peso_disponivel_kg !== null && carga.peso_disponivel_kg < carga.peso_kg && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Fracionada - {((carga.peso_disponivel_kg / carga.peso_kg) * 100).toFixed(0)}% disponível
            </Badge>
          </div>
        )}

        {/* Details Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Weight className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">
                {(carga.peso_disponivel_kg ?? carga.peso_kg).toLocaleString('pt-BR')} kg
              </span>
              {carga.peso_disponivel_kg !== null && carga.peso_disponivel_kg < carga.peso_kg && (
                <span className="text-muted-foreground">/ {carga.peso_kg.toLocaleString('pt-BR')} kg</span>
              )}
            </span>
            {carga.data_coleta_de && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(carga.data_coleta_de), 'dd/MM', { locale: ptBR })}
              </span>
            )}
          </div>
          {carga.valor_frete_tonelada && (
            <div className="flex items-center gap-1 text-sm font-semibold text-chart-2">
              <DollarSign className="w-4 h-4" />
              {formatCurrency(carga.valor_frete_tonelada)}/ton
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cargas Disponíveis</h1>
            <p className="text-muted-foreground">
              Visualize e aceite cargas publicadas pelos embarcadores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredCargas.length} cargas
            </Badge>
            {/* View Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-1.5"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="w-4 h-4" />
                Mapa
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, descrição, origem ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo de carga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(tipoCargaLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCargas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma carga disponível
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterTipo !== 'all'
                  ? 'Nenhuma carga corresponde aos filtros aplicados.'
                  : 'Não há cargas publicadas no momento. Volte mais tarde.'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCargas.map((carga) => (
              <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} />
            ))}
          </div>
        ) : (
          /* Split View - List + Map (Airbnb style) */
          <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Left - Scrollable List */}
            <div className="w-1/2 lg:w-2/5 overflow-y-auto px-1 py-1 space-y-3">
              {filteredCargas.map((carga) => (
                <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} />
              ))}
            </div>

            {/* Right - Map */}
            <div className="flex-1 rounded-xl overflow-hidden border border-border">
              <MapContainer
                center={[-15.7801, -47.9292]}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                className='z-0'
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapBounds && <FitBounds bounds={mapBounds} />}
                {filteredCargas
                  .filter(c => c.endereco_origem?.latitude && c.endereco_origem?.longitude)
                  .map((carga) => (
                    <Marker
                      key={carga.id}
                      position={[carga.endereco_origem!.latitude!, carga.endereco_origem!.longitude!]}
                      icon={createPriceIcon(carga.valor_frete_tonelada)}
                      eventHandlers={{
                        mouseover: () => setHoveredCargaId(carga.id),
                        mouseout: () => setHoveredCargaId(null),
                        click: () => handleAcceptClick(carga),
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <p className="font-semibold text-sm">{carga.codigo}</p>
                          <p className="text-xs text-muted-foreground mb-2">{carga.descricao}</p>
                          <div className="flex items-center gap-1 text-xs mb-2">
                            <MapPin className="w-3 h-3 text-chart-1" />
                            <span>{carga.endereco_origem?.cidade}</span>
                            <ArrowRight className="w-3 h-3" />
                            <MapPin className="w-3 h-3 text-chart-2" />
                            <span>{carga.endereco_destino?.cidade}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{carga.peso_kg.toLocaleString('pt-BR')} kg</span>
                            <span className="font-semibold text-chart-2 text-sm">
                              {formatCurrency(carga.valor_frete_tonelada)}/ton
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={() => handleAcceptClick(carga)}
                          >
                            Aceitar Carga
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Accept Dialog */}
        <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Aceitar Carga</DialogTitle>
              <DialogDescription>
                Revise os detalhes da carga e selecione motorista e veículo.
              </DialogDescription>
            </DialogHeader>

            {selectedCarga && (
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {/* Header with Logo and Basic Info */}
                  <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                    {/* Company Logo */}
                    {selectedCarga.empresa?.logo_url && (
                      <div className="shrink-0 w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                        <img 
                          src={selectedCarga.empresa.logo_url} 
                          alt={selectedCarga.empresa.nome || 'Logo'} 
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-lg">{selectedCarga.codigo}</p>
                          <p className="text-sm text-muted-foreground">{selectedCarga.descricao}</p>
                          {selectedCarga.empresa?.nome && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Embarcador: {selectedCarga.empresa.nome}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{tipoCargaLabels[selectedCarga.tipo] || selectedCarga.tipo}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Weight className="w-4 h-4" />
                          <span className="font-medium">
                            {(selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg).toLocaleString('pt-BR')} kg disponíveis
                          </span>
                          {selectedCarga.peso_disponivel_kg !== null && selectedCarga.peso_disponivel_kg < selectedCarga.peso_kg && (
                            <span className="text-muted-foreground">/ {selectedCarga.peso_kg.toLocaleString('pt-BR')} kg total</span>
                          )}
                        </span>
                      </div>

                      {selectedCarga.valor_frete_tonelada && (
                        <p className="text-lg font-semibold text-chart-2">
                          {formatCurrency(selectedCarga.valor_frete_tonelada)}/ton
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Route Map */}
                  {selectedCarga.endereco_origem?.latitude && selectedCarga.endereco_destino?.latitude && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <MapIcon className="w-4 h-4" />
                        Rota
                      </h4>
                      <div className="h-48 rounded-lg overflow-hidden border border-border">
                        <MapContainer
                          center={[
                            (Number(selectedCarga.endereco_origem.latitude) + Number(selectedCarga.endereco_destino.latitude)) / 2,
                            (Number(selectedCarga.endereco_origem.longitude) + Number(selectedCarga.endereco_destino.longitude)) / 2
                          ]}
                          zoom={5}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={false}
                          className='z-0'
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <FitBounds 
                            bounds={L.latLngBounds(
                              [Number(selectedCarga.endereco_origem.latitude), Number(selectedCarga.endereco_origem.longitude)],
                              [Number(selectedCarga.endereco_destino.latitude), Number(selectedCarga.endereco_destino.longitude)]
                            )} 
                          />
                          {/* OSRM Route Polyline */}
                          {dialogRouteCoords.length > 0 && (
                            <Polyline
                              positions={dialogRouteCoords}
                              pathOptions={{
                                color: 'hsl(221.2 83.2% 53.3%)',
                                weight: 4,
                                opacity: 0.8,
                                dashArray: '10, 10',
                              }}
                            />
                          )}
                          {/* Origin Marker */}
                          <Marker
                            position={[Number(selectedCarga.endereco_origem.latitude), Number(selectedCarga.endereco_origem.longitude)]}
                            icon={createOriginIcon()}
                          >
                            <Popup>
                              <div className="text-sm">
                                <p className="font-semibold">Origem</p>
                                <p>{selectedCarga.endereco_origem.cidade}, {selectedCarga.endereco_origem.estado}</p>
                              </div>
                            </Popup>
                          </Marker>
                          {/* Destination Marker */}
                          <Marker
                            position={[Number(selectedCarga.endereco_destino.latitude), Number(selectedCarga.endereco_destino.longitude)]}
                            icon={createDestinationIcon()}
                          >
                            <Popup>
                              <div className="text-sm">
                                <p className="font-semibold">Destino</p>
                                <p>{selectedCarga.endereco_destino.cidade}, {selectedCarga.endereco_destino.estado}</p>
                              </div>
                            </Popup>
                          </Marker>
                        </MapContainer>
                      </div>
                      {/* Route Stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span>{selectedCarga.endereco_origem?.cidade}, {selectedCarga.endereco_origem?.estado}</span>
                          <ArrowRight className="w-4 h-4" />
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{selectedCarga.endereco_destino?.cidade}, {selectedCarga.endereco_destino?.estado}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLoadingDialogRoute ? (
                            <Badge variant="outline" className="gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Calculando...
                            </Badge>
                          ) : (
                            <>
                              {dialogRouteDistance !== null && (
                                <Badge variant="secondary" className="gap-1">
                                  {dialogRouteDistance.toFixed(0)} km
                                </Badge>
                              )}
                              {dialogRouteDuration !== null && (
                                <Badge variant="outline" className="gap-1">
                                  {dialogRouteDuration >= 60 
                                    ? `${Math.floor(dialogRouteDuration / 60)}h ${Math.round(dialogRouteDuration % 60)}min`
                                    : `${Math.round(dialogRouteDuration)} min`
                                  }
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special Requirements */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Características da Carga
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCarga.requer_refrigeracao && (
                        <Badge variant="secondary" className="gap-1">
                          <ThermometerSnowflake className="w-3.5 h-3.5" />
                          Refrigerada
                        </Badge>
                      )}
                      {selectedCarga.carga_perigosa && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Perigosa
                        </Badge>
                      )}
                      {selectedCarga.carga_fragil && (
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Boxes className="w-3.5 h-3.5" />
                          Frágil
                        </Badge>
                      )}
                      {selectedCarga.carga_viva && (
                        <Badge variant="secondary" className="gap-1">
                          <Rabbit className="w-3.5 h-3.5" />
                          Carga Viva
                        </Badge>
                      )}
                      {selectedCarga.empilhavel === false && (
                        <Badge variant="secondary" className="gap-1">
                          <Ban className="w-3.5 h-3.5" />
                          Não Empilhável
                        </Badge>
                      )}
                      {selectedCarga.empilhavel === true && (
                        <Badge variant="outline" className="gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          Empilhável
                        </Badge>
                      )}
                    </div>

                    {/* Special Needs */}
                    {selectedCarga.necessidades_especiais && selectedCarga.necessidades_especiais.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-1">Necessidades Especiais:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedCarga.necessidades_especiais.map((need, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {need}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Requirements */}
                  {selectedCarga.veiculo_requisitos && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Requisitos de Veículo
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedCarga.veiculo_requisitos.tipos_veiculo && selectedCarga.veiculo_requisitos.tipos_veiculo.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Tipos de Veículo:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedCarga.veiculo_requisitos.tipos_veiculo.map((tipo) => (
                                <Badge key={tipo} variant="outline" className="text-xs">
                                  {tipoVeiculoLabels[tipo] || tipo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedCarga.veiculo_requisitos.tipos_carroceria && selectedCarga.veiculo_requisitos.tipos_carroceria.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Tipos de Carroceria:</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedCarga.veiculo_requisitos.tipos_carroceria.map((tipo) => (
                                <Badge key={tipo} variant="outline" className="text-xs">
                                  {tipoCarroceriaLabels[tipo] || tipo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Driver Selection */}
                  <div className="space-y-2 px-1">
                    <Label>Motorista Disponível</Label>
                    <Select
                      value={selectedMotorista}
                      onValueChange={(value) => {
                        setSelectedMotorista(value);
                        setSelectedVeiculo('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristasDisponiveis.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {motoristas.length === 0 
                              ? 'Nenhum motorista cadastrado' 
                              : 'Todos os motoristas estão em rota'}
                          </div>
                        ) : (
                          motoristasDisponiveis.map((motorista) => (
                            <SelectItem key={motorista.id} value={motorista.id}>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{motorista.nome_completo}</span>
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                  Disponível
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({motorista.veiculos?.length || 0} veículos)
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {motoristasOcupados.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {motoristasOcupados.size} motorista(s) em rota não listado(s)
                      </p>
                    )}
                  </div>

                  {/* Vehicle Selection */}
                  {selectedMotorista && (
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedMotoristaData?.veiculos?.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Motorista sem veículo cadastrado
                            </div>
                          ) : (
                            selectedMotoristaData?.veiculos?.map((veiculo) => (
                              <SelectItem key={veiculo.id} value={veiculo.id}>
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  <span className="font-medium">{veiculo.placa}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo} / {tipoCarroceriaLabels[veiculo.carroceria] || veiculo.carroceria}
                                  </span>
                                  {veiculo.capacidade_kg && (
                                    <span className="text-xs text-muted-foreground">
                                      ({veiculo.capacidade_kg.toLocaleString('pt-BR')} kg)
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Weight Allocation */}
                  {selectedVeiculo && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Peso a Carregar (kg)</Label>
                        <Input
                          type="number"
                          value={pesoAlocado}
                          onChange={(e) => setPesoAlocado(e.target.value)}
                          placeholder="Informe o peso"
                          max={selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Disponível: {(selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg).toLocaleString('pt-BR')} kg
                          </span>
                          {selectedVeiculoData?.capacidade_kg && (
                            <span>
                              Capacidade do veículo: {selectedVeiculoData.capacidade_kg.toLocaleString('pt-BR')} kg
                            </span>
                          )}
                        </div>
                        {selectedVeiculoData?.capacidade_kg && parseFloat(pesoAlocado) > selectedVeiculoData.capacidade_kg && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Peso excede a capacidade do veículo!
                          </p>
                        )}
                      </div>

                      {/* Freight Calculation */}
                      <div className="p-3 bg-chart-2/10 rounded-lg border border-chart-2/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Valor do Frete Calculado:</span>
                          <span className="text-xl font-bold text-chart-2">
                            {formatCurrency(calculatedFrete)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(parseFloat(pesoAlocado) || 0).toLocaleString('pt-BR')} kg × {formatCurrency(selectedCarga.valor_frete_tonelada)}/ton
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAcceptDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAccept}
                disabled={!selectedMotorista || !selectedVeiculo || !pesoAlocado || acceptCarga.isPending}
                className="gap-2"
              >
                {acceptCarga.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Aceite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
