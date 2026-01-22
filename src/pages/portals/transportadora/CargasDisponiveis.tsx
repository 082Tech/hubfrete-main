// Layout is now handled by PortalLayoutWrapper in App.tsx
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
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import CargasGoogleMap from '@/components/maps/CargasGoogleMap';
import RouteGoogleMap from '@/components/maps/RouteGoogleMap';
import { createChatForEntrega } from '@/lib/chatService';

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
  peso_minimo_fracionado_kg: number | null;
  permite_fracionado: boolean | null;
  volume_m3: number | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  data_entrega_limite: string | null;
  requer_refrigeracao: boolean;
  carga_perigosa: boolean;
  carga_fragil: boolean;
  carga_viva: boolean;
  empilhavel: boolean;
  necessidades_especiais: string[] | null;
  veiculo_requisitos: VeiculoRequisitos | null;
  empresa_id: number | null;
  // Destinatário fields
  destinatario_razao_social: string | null;
  destinatario_nome_fantasia: string | null;
  destinatario_cnpj: string | null;
  destinatario_contato_nome: string | null;
  destinatario_contato_telefone: string | null;
  endereco_origem: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cep: string | null;
  } | null;
  endereco_destino: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cep: string | null;
  } | null;
  empresa: {
    nome: string;
    logo_url: string | null;
  } | null;
  filial: {
    nome: string | null;
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

interface Carroceria {
  id: string;
  placa: string;
  tipo: string;
  capacidade_kg: number | null;
}

interface Motorista {
  id: string;
  nome_completo: string;
  telefone: string | null;
  veiculos: Veiculo[];
  carrocerias: Carroceria[];
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

// Helper function to extract initials from company name
const getEmpresaInitials = (nome: string | undefined | null): string => {
  if (!nome) return '?';
  const words = nome.split(' ').filter(w => w.length > 0 && !['de', 'da', 'do', 'dos', 'das', 'e', 'ltda', 'sa', 's/a', 'eireli', 'me'].includes(w.toLowerCase()));
  if (words.length === 0) return nome.substring(0, 2).toUpperCase();
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

// Leaflet icons and functions removed - now using Google Maps components

export default function CargasDisponiveis() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('');
  const [pesoAlocadoInput, setPesoAlocadoInput] = useState<number>(0);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | undefined>(undefined);
  const [hoveredCargaId, setHoveredCargaId] = useState<string | null>(null);

  // Set default view mode based on device
  useEffect(() => {
    if (viewMode === undefined) {
      setViewMode(isMobile ? 'list' : 'map');
    }
  }, [isMobile, viewMode]);

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
          peso_minimo_fracionado_kg,
          permite_fracionado,
          volume_m3,
          valor_mercadoria,
          valor_frete_tonelada,
          data_coleta_de,
          data_coleta_ate,
          data_entrega_limite,
          requer_refrigeracao,
          carga_perigosa,
          carga_fragil,
          carga_viva,
          empilhavel,
          necessidades_especiais,
          veiculo_requisitos,
          empresa_id,
          destinatario_razao_social,
          destinatario_nome_fantasia,
          destinatario_cnpj,
          destinatario_contato_nome,
          destinatario_contato_telefone,
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, latitude, longitude, logradouro, numero, bairro, cep),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, latitude, longitude, logradouro, numero, bairro, cep),
          empresa:empresas!cargas_empresa_id_fkey(nome, logo_url),
          filial:filiais!cargas_filial_id_fkey(nome)
        `)
        .in('status', ['publicada', 'parcialmente_alocada'])
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
          veiculos(id, placa, tipo, carroceria, capacidade_kg, marca, modelo),
          carrocerias(id, placa, tipo, capacidade_kg)
        `)
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);

      if (error) throw error;
      return (data || []) as Motorista[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas ativas para calcular capacidade em uso por motorista
  const { data: entregasAtivas = [] } = useQuery({
    queryKey: ['entregas_ativas_motoristas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select('motorista_id, peso_alocado_kg')
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega'])
        .not('motorista_id', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Calculate peso em uso por motorista (soma de entregas ativas)
  const pesoEmUsoPorMotorista = useMemo(() => {
    const pesoMap = new Map<string, number>();
    entregasAtivas.forEach(e => {
      if (e.motorista_id) {
        const atual = pesoMap.get(e.motorista_id) || 0;
        pesoMap.set(e.motorista_id, atual + (e.peso_alocado_kg || 0));
      }
    });
    return pesoMap;
  }, [entregasAtivas]);

  // All drivers are now available (no filter by active deliveries)
  // Capacity check will be done when selecting driver

  // Mutation para aceitar carga
  const acceptCarga = useMutation({
    mutationFn: async ({
      cargaId,
      motoristaId,
      veiculoId,
      pesoAlocadoKg,
      valorFrete,
      embarcadorEmpresaId,
      transportadoraEmpresaId,
    }: {
      cargaId: string;
      motoristaId: string;
      veiculoId: string;
      pesoAlocadoKg: number;
      valorFrete: number;
      embarcadorEmpresaId: number;
      transportadoraEmpresaId: number;
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
      const novoStatus = novoPesoDisponivel <= 0 ? 'totalmente_alocada' : 'parcialmente_alocada';
      const { error: cargaError } = await supabase
        .from('cargas')
        .update({
          status: novoStatus,
          peso_disponivel_kg: Math.max(0, novoPesoDisponivel)
        })
        .eq('id', cargaId);

      if (cargaError) throw cargaError;

      // Create delivery record
      const { data: entregaData, error: entregaError } = await supabase
        .from('entregas')
        .insert({
          carga_id: cargaId,
          motorista_id: motoristaId,
          veiculo_id: veiculoId,
          peso_alocado_kg: pesoAlocadoKg,
          valor_frete: valorFrete,
          status: 'aguardando_coleta',
        })
        .select('id')
        .single();

      if (entregaError) throw entregaError;

      // Create chat for this delivery with all participants
      await createChatForEntrega({
        entregaId: entregaData.id,
        cargaId,
        motoristaId,
        embarcadorEmpresaId,
        transportadoraEmpresaId,
      });
    },
    onSuccess: () => {
      toast.success('Carga aceita com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['cargas_disponiveis'] });
      setIsAcceptDialogOpen(false);
      setSelectedCarga(null);
      setSelectedMotorista('');
      setSelectedVeiculo('');
    },
    onError: (error) => {
      console.error('Erro ao aceitar carga:', error);
      toast.error('Erro ao aceitar carga');
    },
  });

  const filteredCargas = useMemo(() => {
    return cargas.filter((carga) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        carga.codigo.toLowerCase().includes(searchLower) ||
        carga.descricao.toLowerCase().includes(searchLower) ||
        carga.endereco_origem?.cidade?.toLowerCase().includes(searchLower) ||
        carga.endereco_destino?.cidade?.toLowerCase().includes(searchLower) ||
        // Search by sender (embarcador/remetente)
        carga.empresa?.nome?.toLowerCase().includes(searchLower) ||
        // Search by recipient (destinatário)
        carga.destinatario_razao_social?.toLowerCase().includes(searchLower) ||
        carga.destinatario_nome_fantasia?.toLowerCase().includes(searchLower);

      const matchesTipo = filterTipo === 'all' || carga.tipo === filterTipo;

      return matchesSearch && matchesTipo;
    });
  }, [cargas, searchTerm, filterTipo]);

  // Map bounds removed - now handled by Google Maps component

  const handleAcceptClick = (carga: Carga) => {
    setSelectedCarga(carga);
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setPesoAlocadoInput(0);
    setIsAcceptDialogOpen(true);
  };

  // Get vehicles for selected driver
  const selectedMotoristaData = useMemo(() => {
    return motoristas.find((m) => m.id === selectedMotorista);
  }, [motoristas, selectedMotorista]);

  // Get selected vehicle data
  const selectedVeiculoData = useMemo(() => {
    return selectedMotoristaData?.veiculos?.find((v) => v.id === selectedVeiculo);
  }, [selectedMotoristaData, selectedVeiculo]);

  // Calculate total capacity based on carrocerias linked to driver
  const capacidadeCarroceriaTotal = useMemo(() => {
    if (!selectedMotoristaData?.carrocerias?.length) return 0;
    return selectedMotoristaData.carrocerias.reduce((acc, c) => acc + (c.capacidade_kg || 0), 0);
  }, [selectedMotoristaData]);

  // Calculate already used capacity (active deliveries)
  const capacidadeEmUso = useMemo(() => {
    if (!selectedMotorista) return 0;
    return pesoEmUsoPorMotorista.get(selectedMotorista) || 0;
  }, [selectedMotorista, pesoEmUsoPorMotorista]);

  // Available capacity = total - in use
  const capacidadeDisponivel = useMemo(() => {
    return Math.max(0, capacidadeCarroceriaTotal - capacidadeEmUso);
  }, [capacidadeCarroceriaTotal, capacidadeEmUso]);

  // Calculate max weight that can be allocated
  const pesoMaximoAlocar = useMemo(() => {
    if (!selectedCarga) return 0;
    const pesoDisponivel = selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg;
    return Math.min(capacidadeDisponivel, pesoDisponivel);
  }, [selectedCarga, capacidadeDisponivel]);

  // Calculate minimum weight required
  const pesoMinimoRequirido = useMemo(() => {
    if (!selectedCarga) return 0;
    // If carga doesn't allow fractional, must take all available
    if (!selectedCarga.permite_fracionado) {
      return selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg;
    }
    // Otherwise use the minimum fractional weight or 0
    return selectedCarga.peso_minimo_fracionado_kg || 0;
  }, [selectedCarga]);

  // Auto-set peso alocado when driver/vehicle changes
  useMemo(() => {
    if (selectedVeiculo && pesoMaximoAlocar > 0) {
      // Default to max possible
      const defaultPeso = pesoMaximoAlocar;
      setPesoAlocadoInput(defaultPeso);
    }
  }, [selectedVeiculo, pesoMaximoAlocar]);

  // Validate peso input
  const pesoValidationError = useMemo(() => {
    if (!selectedCarga || !selectedVeiculo) return null;
    if (pesoAlocadoInput <= 0) return 'Informe o peso a carregar';
    if (pesoAlocadoInput > pesoMaximoAlocar) {
      return `Peso máximo disponível: ${pesoMaximoAlocar.toLocaleString('pt-BR')} kg`;
    }
    if (pesoAlocadoInput < pesoMinimoRequirido && pesoMinimoRequirido > 0) {
      return `Peso mínimo exigido: ${pesoMinimoRequirido.toLocaleString('pt-BR')} kg`;
    }
    return null;
  }, [selectedCarga, selectedVeiculo, pesoAlocadoInput, pesoMaximoAlocar, pesoMinimoRequirido]);

  // Calculate freight based on allocated weight input
  const calculatedFrete = useMemo(() => {
    if (!selectedCarga?.valor_frete_tonelada || !pesoAlocadoInput) return 0;
    return (pesoAlocadoInput / 1000) * selectedCarga.valor_frete_tonelada;
  }, [selectedCarga, pesoAlocadoInput]);

  const handleConfirmAccept = () => {
    if (!selectedCarga || !selectedMotorista || !selectedVeiculo) {
      toast.error('Selecione motorista e veículo');
      return;
    }

    if (pesoValidationError) {
      toast.error(pesoValidationError);
      return;
    }

    if (!selectedCarga.empresa_id || !empresa?.id) {
      toast.error('Erro ao identificar empresas');
      return;
    }

    acceptCarga.mutate({
      cargaId: selectedCarga.id,
      motoristaId: selectedMotorista,
      veiculoId: selectedVeiculo,
      pesoAlocadoKg: pesoAlocadoInput,
      valorFrete: calculatedFrete,
      embarcadorEmpresaId: selectedCarga.empresa_id,
      transportadoraEmpresaId: empresa.id,
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

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate total freight for a cargo
  const calcularFreteTotal = (carga: Carga) => {
    if (!carga.valor_frete_tonelada) return null;
    const pesoDisponivel = carga.peso_disponivel_kg ?? carga.peso_kg;
    return (pesoDisponivel / 1000) * carga.valor_frete_tonelada;
  };

  // Helper to format company + filial name
  const formatEmpresaFilial = (carga: Carga) => {
    const empresa = carga.empresa?.nome || 'Empresa';
    const filial = carga.filial?.nome;
    return filial ? `${empresa} - ${filial}` : empresa;
  };

  // Carga Card component for reuse
  const CargaCard = ({ carga, isHovered }: { carga: Carga; isHovered?: boolean }) => {
    const pesoDisponivel = carga.peso_disponivel_kg ?? carga.peso_kg;
    const percentDisponivel = (pesoDisponivel / carga.peso_kg) * 100;

    return (
      <Card
        className={`border-border hover:shadow-lg transition-all cursor-pointer ${isHovered ? 'ring-2 ring-primary shadow-lg' : ''}`}
        onMouseEnter={() => setHoveredCargaId(carga.id)}
        onMouseLeave={() => setHoveredCargaId(null)}
        onClick={() => handleAcceptClick(carga)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Destinatário Company Name - First Line */}
          {(carga.destinatario_nome_fantasia || carga.destinatario_razao_social) && (
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Package className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-primary truncate">
                {carga.destinatario_nome_fantasia || carga.destinatario_razao_social}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Company Logo or Initials */}
            <div className="shrink-0 w-10 h-10 rounded-md border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
              {carga.empresa?.logo_url ? (
                <img
                  src={carga.empresa.logo_url}
                  alt={carga.empresa.nome || 'Logo'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {getEmpresaInitials(carga.empresa?.nome)}
                </span>
              )}
            </div>
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

          {/* Route with company names and address details */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex flex-col gap-0.5">
              {/* Origin company name */}
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">
                {formatEmpresaFilial(carga)}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-chart-1 shrink-0" />
                <span className="font-medium text-foreground">{carga.endereco_origem?.cidade || 'N/A'}, {carga.endereco_origem?.estado || ''}</span>
              </div>
              {carga.endereco_origem?.logradouro && (
                <span className="text-muted-foreground ml-5 truncate max-w-[150px]">
                  {carga.endereco_origem.logradouro}{carga.endereco_origem.numero ? `, ${carga.endereco_origem.numero}` : ''}
                </span>
              )}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mx-1" />
            <div className="flex flex-col gap-0.5">
              {/* Destination company name */}
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">
                {carga.destinatario_nome_fantasia || carga.destinatario_razao_social || 'Destinatário'}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-chart-2 shrink-0" />
                <span className="font-medium text-foreground">{carga.endereco_destino?.cidade || 'N/A'}, {carga.endereco_destino?.estado || ''}</span>
              </div>
              {carga.endereco_destino?.logradouro && (
                <span className="text-muted-foreground ml-5 truncate max-w-[150px]">
                  {carga.endereco_destino.logradouro}{carga.endereco_destino.numero ? `, ${carga.endereco_destino.numero}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Weight Progress Bar - Green primary when full, decreasing with availability */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Disponível</span>
              <span className="font-medium text-foreground">
                {(pesoDisponivel / 1000).toFixed(1)} ton / {(carga.peso_kg / 1000).toFixed(1)} ton
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-primary"
                style={{
                  width: `${percentDisponivel}%`,
                  opacity: percentDisponivel >= 75 ? 1 : percentDisponivel >= 50 ? 0.8 : percentDisponivel >= 25 ? 0.6 : 0.4
                }}
              />
            </div>
          </div>

          {/* Details Row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">
                  {pesoDisponivel.toLocaleString('pt-BR')} kg
                </span>
              </span>
              {/* Cubagem */}
              {carga.volume_m3 && carga.volume_m3 > 0 && (
                <span className="flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">
                    {carga.volume_m3.toLocaleString('pt-BR')} m³
                  </span>
                </span>
              )}
            </div>
            {carga.valor_frete_tonelada && (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1 text-sm font-semibold text-chart-2">
                  {formatCurrency(calcularFreteTotal(carga))}
                </div>
                <span className="text-xs text-muted-foreground">
                  ({formatCurrency(carga.valor_frete_tonelada)}/ton)
                </span>
              </div>
            )}
          </div>

          {/* Dates Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {carga.data_coleta_de && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-chart-1" />
                <span>Coleta: {format(new Date(carga.data_coleta_de), 'dd/MM', { locale: ptBR })}</span>
                {carga.data_coleta_ate && carga.data_coleta_ate !== carga.data_coleta_de && (
                  <span> - {format(new Date(carga.data_coleta_ate), 'dd/MM', { locale: ptBR })}</span>
                )}
              </span>
            )}
            {carga.data_entrega_limite && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-chart-2" />
                <span>Entrega: {format(new Date(carga.data_entrega_limite), 'dd/MM', { locale: ptBR })}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8">
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
                  placeholder="Buscar por código, descrição, cidade, embarcador ou destinatário..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 md:pb-0">
            {filteredCargas.map((carga) => (
              <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} />
            ))}
          </div>
        ) : isMobile ? (
          /* Mobile Map View - Full screen Airbnb style */
          <div className="relative h-[calc(100vh-220px)] -mx-4 -mb-4">
            <CargasGoogleMap
              cargas={filteredCargas}
              onCargaClick={handleAcceptClick}
              hoveredCargaId={hoveredCargaId}
              setHoveredCargaId={setHoveredCargaId}
            />
          </div>
        ) : (
          /* Desktop Split View - List + Map (Airbnb style) */
          <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Left - Scrollable List */}
            <div className="w-1/2 lg:w-2/5 overflow-y-auto px-1 py-1 space-y-3">
              {filteredCargas.map((carga) => (
                <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} />
              ))}
            </div>

            {/* Right - Map */}
            <div className="flex-1 rounded-xl overflow-hidden border border-border">
              <CargasGoogleMap
                cargas={filteredCargas}
                onCargaClick={handleAcceptClick}
                hoveredCargaId={hoveredCargaId}
                setHoveredCargaId={setHoveredCargaId}
              />
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
                    {/* Company Logo or Initials */}
                    <div className="shrink-0 w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                      {selectedCarga.empresa?.logo_url ? (
                        <img
                          src={selectedCarga.empresa.logo_url}
                          alt={selectedCarga.empresa.nome || 'Logo'}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-xl font-bold text-muted-foreground">
                          {getEmpresaInitials(selectedCarga.empresa?.nome)}
                        </span>
                      )}
                    </div>
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
                        <RouteGoogleMap
                          origem={{
                            lat: Number(selectedCarga.endereco_origem.latitude),
                            lng: Number(selectedCarga.endereco_origem.longitude),
                            label: selectedCarga.endereco_origem.cidade,
                          }}
                          destino={{
                            lat: Number(selectedCarga.endereco_destino.latitude),
                            lng: Number(selectedCarga.endereco_destino.longitude),
                            label: selectedCarga.endereco_destino.cidade,
                          }}
                          showBadgeOutside={true}
                        />
                      </div>
                      {/* Route Stats with Full Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                            <MapPin className="w-4 h-4" />
                            Origem
                          </div>
                          <p className="text-sm font-medium">{selectedCarga.endereco_origem?.cidade}, {selectedCarga.endereco_origem?.estado}</p>
                          {selectedCarga.endereco_origem?.logradouro && (
                            <p className="text-xs text-muted-foreground">
                              {selectedCarga.endereco_origem.logradouro}
                              {selectedCarga.endereco_origem.numero ? `, ${selectedCarga.endereco_origem.numero}` : ''}
                              {selectedCarga.endereco_origem.bairro ? ` - ${selectedCarga.endereco_origem.bairro}` : ''}
                            </p>
                          )}
                          {selectedCarga.endereco_origem?.cep && (
                            <p className="text-xs text-muted-foreground">CEP: {selectedCarga.endereco_origem.cep}</p>
                          )}
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                            <MapPin className="w-4 h-4" />
                            Destino
                          </div>
                          {/* Destinatário Company */}
                          {selectedCarga.destinatario_nome_fantasia && (
                            <p className="text-sm font-semibold text-foreground mb-0.5">{selectedCarga.destinatario_nome_fantasia}</p>
                          )}
                          <p className="text-sm font-medium">{selectedCarga.endereco_destino?.cidade}, {selectedCarga.endereco_destino?.estado}</p>
                          {selectedCarga.endereco_destino?.logradouro && (
                            <p className="text-xs text-muted-foreground">
                              {selectedCarga.endereco_destino.logradouro}
                              {selectedCarga.endereco_destino.numero ? `, ${selectedCarga.endereco_destino.numero}` : ''}
                              {selectedCarga.endereco_destino.bairro ? ` - ${selectedCarga.endereco_destino.bairro}` : ''}
                            </p>
                          )}
                          {selectedCarga.endereco_destino?.cep && (
                            <p className="text-xs text-muted-foreground">CEP: {selectedCarga.endereco_destino.cep}</p>
                          )}
                        </div>
                      </div>
                      {/* Route badges now displayed inside the map component */}
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
                    <Label>Motorista</Label>
                    <Select
                      value={selectedMotorista}
                      onValueChange={(value) => {
                        setSelectedMotorista(value);
                        // Auto-select the first vehicle if available
                        const motorista = motoristas.find(m => m.id === value);
                        if (motorista?.veiculos?.length === 1) {
                          setSelectedVeiculo(motorista.veiculos[0].id);
                        } else {
                          setSelectedVeiculo('');
                        }
                        setPesoAlocadoInput(0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristas.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum motorista cadastrado
                          </div>
                        ) : (
                          motoristas.map((motorista) => {
                            const capacidadeTotal = motorista.carrocerias?.reduce((acc, c) => acc + (c.capacidade_kg || 0), 0) || 0;
                            const emUso = pesoEmUsoPorMotorista.get(motorista.id) || 0;
                            const disponivel = Math.max(0, capacidadeTotal - emUso);
                            const temCapacidade = disponivel > 0;

                            return (
                              <SelectItem key={motorista.id} value={motorista.id} disabled={!temCapacidade && capacidadeTotal > 0}>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  <span>{motorista.nome_completo}</span>
                                  {capacidadeTotal === 0 ? (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Sem carroceria
                                    </Badge>
                                  ) : temCapacidade ? (
                                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                                      {(disponivel / 1000).toFixed(1)}t disp.
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Lotado
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview do Equipamento Vinculado */}
                  {selectedMotorista && selectedMotoristaData && (
                    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                        <Truck className="w-4 h-4" />
                        Equipamento Vinculado ao Motorista
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Veículo */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Veículo (Cavalo)</Label>
                          {selectedMotoristaData.veiculos?.length === 0 ? (
                            <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Nenhum veículo vinculado
                              </p>
                            </div>
                          ) : (
                            <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Selecione o veículo" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedMotoristaData.veiculos?.map((veiculo) => (
                                  <SelectItem key={veiculo.id} value={veiculo.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{veiculo.placa}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {tipoVeiculoLabels[veiculo.tipo] || veiculo.tipo}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Detalhes do veículo selecionado */}
                          {selectedVeiculoData && (
                            <div className="p-2 bg-background rounded-md border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Placa:</span>
                                <span className="text-sm font-mono font-semibold">{selectedVeiculoData.placa}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Tipo:</span>
                                <span className="text-sm">{tipoVeiculoLabels[selectedVeiculoData.tipo] || selectedVeiculoData.tipo}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Carroceria:</span>
                                <span className="text-sm">{tipoCarroceriaLabels[selectedVeiculoData.carroceria] || selectedVeiculoData.carroceria}</span>
                              </div>
                              {selectedVeiculoData.marca && selectedVeiculoData.modelo && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Modelo:</span>
                                  <span className="text-sm">{selectedVeiculoData.marca} {selectedVeiculoData.modelo}</span>
                                </div>
                              )}
                              {selectedVeiculoData.capacidade_kg && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Capacidade:</span>
                                  <span className="text-sm font-medium">{selectedVeiculoData.capacidade_kg.toLocaleString('pt-BR')} kg</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Carroceria */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Carroceria (Reboque)</Label>
                          {selectedMotoristaData.carrocerias?.length === 0 ? (
                            <div className="p-3 bg-muted/50 rounded-md border">
                              <p className="text-xs text-muted-foreground">Sem carroceria vinculada</p>
                            </div>
                          ) : (
                            selectedMotoristaData.carrocerias?.map((carroceria) => (
                              <div key={carroceria.id} className="p-2 bg-background rounded-md border space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Placa:</span>
                                  <span className="text-sm font-mono font-semibold">{carroceria.placa}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Tipo:</span>
                                  <span className="text-sm">{tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}</span>
                                </div>
                                {carroceria.capacidade_kg && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Capacidade:</span>
                                    <span className="text-sm font-medium">{carroceria.capacidade_kg.toLocaleString('pt-BR')} kg</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Capacidade Total do Conjunto */}
                      {selectedVeiculoData && (
                        <div className="pt-2 border-t border-primary/20">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Capacidade Total do Conjunto:</span>
                            <span className="font-bold text-primary">
                              {(() => {
                                const capacidadeVeiculo = selectedVeiculoData.capacidade_kg || 0;
                                const capacidadeCarrocerias = selectedMotoristaData.carrocerias?.reduce((acc, c) => acc + (c.capacidade_kg || 0), 0) || 0;
                                return (capacidadeVeiculo + capacidadeCarrocerias).toLocaleString('pt-BR');
                              })()} kg
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Weight Allocation - User can now input the weight */}
                  {selectedVeiculo && selectedMotoristaData && (
                    <div className="space-y-4">
                      {/* Input de Peso */}
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Weight className="w-5 h-5 text-primary" />
                          <span className="font-semibold text-foreground">Peso a Carregar (kg)</span>
                        </div>

                        {/* Capacity Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Capacidade total da carroceria:</span>
                            <span className="font-medium">{capacidadeCarroceriaTotal.toLocaleString('pt-BR')} kg</span>
                          </div>
                          {capacidadeEmUso > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span>Em uso (outras entregas):</span>
                              <span className="font-medium">-{capacidadeEmUso.toLocaleString('pt-BR')} kg</span>
                            </div>
                          )}
                          <div className="flex justify-between text-primary font-medium">
                            <span>Capacidade disponível:</span>
                            <span>{capacidadeDisponivel.toLocaleString('pt-BR')} kg</span>
                          </div>
                        </div>

                        {/* Peso Input */}
                        <div className="space-y-2">
                          <Input
                            type="number"
                            value={pesoAlocadoInput || ''}
                            onChange={(e) => setPesoAlocadoInput(Number(e.target.value))}
                            placeholder={`Máx: ${pesoMaximoAlocar.toLocaleString('pt-BR')} kg`}
                            min={pesoMinimoRequirido}
                            max={pesoMaximoAlocar}
                            className="text-lg font-bold"
                          />
                          {pesoMinimoRequirido > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Peso mínimo por entrega: {pesoMinimoRequirido.toLocaleString('pt-BR')} kg
                            </p>
                          )}
                          {!selectedCarga?.permite_fracionado && (
                            <p className="text-xs text-amber-600">
                              Esta carga não permite fracionamento - é necessário levar todo o peso disponível
                            </p>
                          )}
                          {pesoValidationError && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {pesoValidationError}
                            </p>
                          )}
                        </div>

                        {capacidadeDisponivel <= 0 && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Motorista não possui capacidade disponível
                          </p>
                        )}
                      </div>

                      {/* Simulação Visual */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Peso Restante */}
                        <div className="p-4 bg-muted/50 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <Weight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              Após Aceite
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Peso atual disponível:</span>
                              <span>{(selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg).toLocaleString('pt-BR')} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Peso a alocar:</span>
                              <span className="text-primary font-medium">- {pesoAlocadoInput.toLocaleString('pt-BR')} kg</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between text-sm font-semibold">
                              <span>Restará na carga:</span>
                              <span className={(() => {
                                const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoAlocadoInput;
                                return restante <= 0 ? 'text-chart-2' : 'text-foreground';
                              })()}>
                                {(() => {
                                  const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoAlocadoInput;
                                  return Math.max(0, restante).toLocaleString('pt-BR');
                                })()} kg
                              </span>
                            </div>
                            {(() => {
                              const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoAlocadoInput;
                              if (restante <= 0 && pesoAlocadoInput > 0) {
                                return (
                                  <Badge variant="secondary" className="w-full justify-center mt-2 bg-chart-2/20 text-chart-2">
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    Carga será totalmente alocada
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Valor do Frete */}
                        <div className="p-4 bg-chart-2/10 rounded-lg border border-chart-2/30">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-chart-2" />
                            <span className="text-sm font-medium text-chart-2">
                              Frete a Receber
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Preço/tonelada:</span>
                              <span>{formatCurrency(selectedCarga.valor_frete_tonelada)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Peso alocado:</span>
                              <span>{(pesoAlocadoInput / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold">Valor total:</span>
                              <span className="text-2xl font-bold text-chart-2">
                                {formatCurrency(calculatedFrete)}
                              </span>
                            </div>
                          </div>
                        </div>
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
                disabled={!selectedMotorista || !selectedVeiculo || pesoAlocadoInput <= 0 || !!pesoValidationError || acceptCarga.isPending}
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
    </div>
  );
}
