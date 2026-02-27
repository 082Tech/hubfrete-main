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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  Route,
  Scale,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdvancedSearchPopover, AdvancedSearchFilters, emptyFilters } from '@/components/cargas/AdvancedSearchPopover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import CargasGoogleMap from '@/components/maps/CargasGoogleMap';
import RouteGoogleMap from '@/components/maps/RouteGoogleMap';
import { createChatForEntrega } from '@/lib/chatService';
import { ViagemSelector } from '@/components/viagens';

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
  tipo_precificacao: string | null;
  valor_frete_m3: number | null;
  valor_frete_fixo: number | null;
  valor_frete_km: number | null;
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
  foto_url?: string | null;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>(emptyFilters);
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterTiposVeiculo, setFilterTiposVeiculo] = useState<string[]>([]);
  const [tiposVeiculoInitialized, setTiposVeiculoInitialized] = useState(false);
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('');
  const [selectedCarroceria, setSelectedCarroceria] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // NEW: State for multi-carroceria (Bitrem/Rodotrem)
  const [selectedCarroceriasMulti, setSelectedCarroceriasMulti] = useState<string[]>([]);
  const [pesoPorCarroceria, setPesoPorCarroceria] = useState<Record<string, number>>({});

  const [openMotoristaCombobox, setOpenMotoristaCombobox] = useState(false);

  const [selectedViagemId, setSelectedViagemId] = useState<string | null>(null);
  const [isViagemBlocked, setIsViagemBlocked] = useState(false);
  const [isCreatingViagem, setIsCreatingViagem] = useState(false);
  const [pesoAlocadoInput, setPesoAlocadoInput] = useState<number>(0);
  const [previsaoColeta, setPrevisaoColeta] = useState<string>('');
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<'list' | 'map'>(() => {
    try {
      const saved = localStorage.getItem('hubfrete_cargas_view_mode');
      if (saved === 'list' || saved === 'map') return saved;
    } catch { }
    return isMobile ? 'list' : 'map';
  });
  const setViewMode = (mode: 'list' | 'map') => {
    setViewModeState(mode);
    try { localStorage.setItem('hubfrete_cargas_view_mode', mode); } catch { }
  };
  const [hoveredCargaId, setHoveredCargaId] = useState<string | null>(null);
  const [distancias, setDistancias] = useState<Map<string, { distance: string; duration: string }>>(new Map());
  const equipmentSectionRef = useRef<HTMLDivElement>(null);
  const viagemSectionRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevVisibleCountRef = useRef(15);

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
          tipo_precificacao,
          valor_frete_m3,
          valor_frete_fixo,
          valor_frete_km,
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
        .in('status', ['publicada', 'parcialmente_alocada'] as any)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Calculate distances for all cargas using OSRM
  useEffect(() => {
    const fetchDistances = async () => {
      const cargasSemDistancia = cargas.filter(c => !distancias.has(c.id));

      for (const carga of cargasSemDistancia) {
        const origem = carga.endereco_origem;
        const destino = carga.endereco_destino;

        if (!origem?.latitude || !origem?.longitude || !destino?.latitude || !destino?.longitude) {
          continue;
        }

        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}?overview=false`
          );
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceKm = (route.distance / 1000).toFixed(0);
            const durationHours = Math.floor(route.duration / 3600);
            const durationMinutes = Math.round((route.duration % 3600) / 60);

            setDistancias(prev => {
              const updated = new Map(prev);
              updated.set(carga.id, {
                distance: `${distanceKm} km`,
                duration: durationHours > 0 ? `${durationHours}h ${durationMinutes}min` : `${durationMinutes}min`
              });
              return updated;
            });
          }
        } catch (error) {
          console.error('Error fetching route for carga', carga.id, error);
        }
      }
    };

    if (cargas.length > 0) {
      fetchDistances();
    }
  }, [cargas]);

  // Fetch veículos da frota para determinar tipos disponíveis
  const { data: veiculosFrota = [] } = useQuery({
    queryKey: ['veiculos_frota', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('veiculos')
        .select('id, tipo')
        .eq('empresa_id', empresa.id as any)
        .eq('ativo', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Tipos de veículo únicos da frota
  const tiposVeiculoFrota: string[] = useMemo(() => {
    const tipos = new Set(veiculosFrota.map(v => v.tipo));
    return Array.from(tipos) as string[];
  }, [veiculosFrota]);

  // Auto-selecionar filtros baseado na frota ao carregar
  useEffect(() => {
    if (!tiposVeiculoInitialized && tiposVeiculoFrota.length > 0) {
      setFilterTiposVeiculo(tiposVeiculoFrota);
      setTiposVeiculoInitialized(true);
    }
  }, [tiposVeiculoFrota, tiposVeiculoInitialized]);

  // Fetch motoristas da transportadora
  const { data: motoristas = [] } = useQuery({
    queryKey: ['motoristas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome_completo, telefone, foto_url')
        .eq('empresa_id', empresa.id as any)
        .eq('ativo', true);

      if (error) throw error;
      return (data || []) as Motorista[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch ALL vehicles from company (company-wide, not driver-specific)
  const { data: veiculosEmpresa = [] } = useQuery({
    queryKey: ['veiculos_empresa_aceite', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, carroceria, capacidade_kg, marca, modelo, carroceria_integrada, foto_url')
        .eq('empresa_id', empresa.id as any)
        .eq('ativo', true);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!empresa?.id,
  });

  // Fetch ALL carrocerias from company
  const { data: carroceriasEmpresa = [] } = useQuery({
    queryKey: ['carrocerias_empresa_aceite', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('carrocerias')
        .select('id, placa, tipo, capacidade_kg, marca, modelo, foto_url')
        .eq('empresa_id', empresa.id as any)
        .eq('ativo', true);
      if (error) throw error;
      return (data || []) as any[];
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
        .select('motorista_id, veiculo_id, carroceria_id, peso_alocado_kg')
        .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'])
        .not('motorista_id', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch nome do usuário logado para registrar eventos
  const { data: usuarioLogado } = useQuery({
    queryKey: ['usuario_logado_nome', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data } = await (supabase
        .from('usuarios')
        .select('nome')
        .eq('auth_user_id', user.id)
        .maybeSingle() as any);

      return data;
    },
    enabled: !!user?.id,
  });
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

  // Peso em uso por equipamento (para abater capacidade corretamente)
  const pesoEmUsoPorVeiculo = useMemo(() => {
    const map = new Map<string, number>();
    entregasAtivas.forEach((e: any) => {
      if (!e.veiculo_id) return;
      const atual = map.get(e.veiculo_id) || 0;
      map.set(e.veiculo_id, atual + (e.peso_alocado_kg || 0));
    });
    return map;
  }, [entregasAtivas]);

  const pesoEmUsoPorCarroceria = useMemo(() => {
    const map = new Map<string, number>();
    entregasAtivas.forEach((e: any) => {
      if (!e.carroceria_id) return;
      const atual = map.get(e.carroceria_id) || 0;
      map.set(e.carroceria_id, atual + (e.peso_alocado_kg || 0));
    });
    return map;
  }, [entregasAtivas]);

  // All drivers are now available (no filter by active deliveries)
  // Capacity check will be done when selecting driver

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * MUTATION: ACEITAR CARGA (Accept Load)
   * ═══════════════════════════════════════════════════════════════════════
   *
   * PARÂMETROS RECEBIDOS:
   * ─────────────────────
   * - cargaId          (string)       → ID da carga sendo aceita
   * - motoristaId      (string)       → ID do motorista designado
   * - veiculoId        (string)       → ID do veículo selecionado
   * - carroceriaId     (string|null)  → ID da carroceria (null se veículo tem carroceria_integrada)
   * - pesoAlocadoKg    (number)       → Peso que o motorista vai carregar (em kg)
   * - valorFrete       (number)       → Frete calculado: (pesoAlocadoKg / 1000) × valor_frete_tonelada
   * - embarcadorEmpresaId  (number)   → empresa_id do embarcador (dono da carga)
   * - transportadoraEmpresaId (number)→ empresa_id da transportadora logada
   * - viagemId         (string|null)  → ID de viagem existente (se motorista já tem viagem 'programada'/'aguardando')
   * - userId           (string|null)  → auth.uid() do usuário logado
   * - userName         (string)       → Nome do operador para registro em eventos
   *
   * VALIDAÇÕES FEITAS ANTES DA CHAMADA (handleConfirmAccept):
   * ─────────────────────────────────────────────────────────
   * 1. Motorista, veículo e carroceria (se aplicável) devem estar selecionados
   * 2. Peso alocado deve respeitar:
   *    - Mínimo: peso_minimo_fracionado_kg (se permite_fracionado) ou peso total (se não permite)
   *    - Máximo: MIN(capacidade_disponivel_equipamento, peso_disponivel_carga)
   * 3. Capacidade do equipamento é calculada em tempo real:
   *    - Se veículo tem carroceria_integrada → usa capacidade_kg do veículo
   *    - Senão → usa capacidade_kg da carroceria selecionada
   *    - Deduz peso já em uso (entregas ativas do mesmo equipamento)
   * 4. Motorista com viagem 'em_andamento' é BLOQUEADO (não pode aceitar novas cargas)
   * 5. empresa_id de ambos os lados deve estar presente
   *
   * O QUE A MUTATION FAZ (passo a passo):
   * ─────────────────────────────────────
   * ETAPA 1 — ABATE PESO NA CARGA
   *   → Lê peso_disponivel_kg atual da carga
   *   → Subtrai pesoAlocadoKg → novo peso disponível
   *   → Define status: 'totalmente_alocada' (se ≤0) ou 'parcialmente_alocada'
   *   → UPDATE na tabela 'cargas'
   *
   * ETAPA 2 — CRIA A ENTREGA
   *   → INSERT em 'entregas' com status 'aguardando'
   *   → Campos: carga_id, motorista_id, veiculo_id, carroceria_id, peso_alocado_kg, valor_frete
   *   → O código da entrega (ex: CRG-2026-0001-E01) é gerado por trigger no banco
   *
   * ETAPA 3 — REGISTRA EVENTOS NA TIMELINE
   *   → Evento 'criado': registra quem criou a entrega (userId + userName)
   *   → Evento 'aceite': registra status inicial pelo Sistema (+1ms para ordenação)
   *
   * ETAPA 4 — VIAGEM (AUTOMÁTICA)
   *   → SE viagemId foi passado (viagem 'programada'/'aguardando' já existe):
   *       • Busca próxima ordem (MAX(ordem) + 1)
   *       • INSERT em viagem_entregas vinculando entrega à viagem existente
   *   → SE viagemId é null (sem viagem ativa):
   *       • INSERT em 'viagens' com status 'aguardando', started_at = now()
   *       • O código (VGM-YYYY-NNNN) é gerado por trigger no banco
   *       • INSERT em viagem_entregas com ordem = 1
   *
   * ETAPA 5 — CRIA CHAT
   *   → Cria chat vinculado à entrega com participantes:
   *     embarcador (empresa_id) + transportadora (empresa_id) + motorista
   *
   * RESULTADO:
   *   → Retorna { entregaId, viagemId }
   *   → Invalida queries: cargas_disponiveis, viagens_motorista, entregas_ativas_motoristas
   *
   * NOTA: O abate de capacidade do equipamento (veículo/carroceria) NÃO é feito
   * no banco — é calculado em tempo real no frontend via mapas de ocupação
   * (pesoEmUsoPorVeiculo / pesoEmUsoPorCarroceria) somando entregas ativas.
   * ═══════════════════════════════════════════════════════════════════════
   */
  const acceptCarga = useMutation({
    mutationFn: async ({
      cargaId,
      motoristaId,
      veiculoId,
      carroceriaId,
      pesoAlocadoKg,
      valorFrete,
      embarcadorEmpresaId,
      transportadoraEmpresaId,
      viagemId,
      userId,
      userName,
      previsaoColeta,
      carroceriasAlocadas,
    }: {
      cargaId: string;
      motoristaId: string;
      carroceriaId: string | null;
      veiculoId: string;
      pesoAlocadoKg: number;
      valorFrete: number;
      embarcadorEmpresaId: number;
      transportadoraEmpresaId: number;
      viagemId: string | null;
      userId: string | null;
      userName: string;
      previsaoColeta: string;
      carroceriasAlocadas?: any;
    }) => {
      // Get current cargo to update peso_disponivel_kg
      const { data: cargaAtualResult, error: fetchError } = await supabase
        .from('cargas')
        .select('peso_disponivel_kg, peso_kg')
        .eq('id', cargaId)
        .single();

      if (fetchError) throw fetchError;

      const cargaAtual = cargaAtualResult as any;
      const pesoDisponivel = cargaAtual?.peso_disponivel_kg ?? cargaAtual?.peso_kg ?? 0;
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

      // Check if driver already has an active delivery for this load
      const { data: entregaExistente, error: checkError } = await (supabase as any)
        .from('entregas')
        .select('*')
        .eq('carga_id', cargaId)
        .eq('motorista_id', motoristaId)
        .in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'])
        .maybeSingle();

      if (checkError) throw checkError;

      if (entregaExistente) {
        // Merge weights and vehicles instead of duplicating
        const updatePayload: any = {
          peso_alocado_kg: Number(entregaExistente.peso_alocado_kg || 0) + Number(pesoAlocadoKg),
          valor_frete: Number(entregaExistente.valor_frete || 0) + Number(valorFrete),
        };

        if (carroceriasAlocadas && carroceriasAlocadas.length > 0) {
          const existingCarrocerias = Array.isArray(entregaExistente.carrocerias_alocadas)
            ? [...entregaExistente.carrocerias_alocadas]
            : [];

          carroceriasAlocadas.forEach((ca: any) => {
            const existingCa = existingCarrocerias.find((ec: any) => ec.carroceria_id === ca.carroceria_id);
            if (existingCa) {
              existingCa.peso_kg = Number(existingCa.peso_kg || 0) + Number(ca.peso_kg || 0);
            } else {
              existingCarrocerias.push(ca);
            }
          });
          updatePayload.carrocerias_alocadas = existingCarrocerias;
        }

        const { data: updatedEntrega, error: updateError } = await supabase
          .from('entregas')
          .update(updatePayload)
          .eq('id', entregaExistente.id)
          .select('id')
          .single();

        if (updateError) throw updateError;

        // Registrar evento de atualização
        await supabase.from('entrega_eventos').insert({
          entrega_id: updatedEntrega.id,
          tipo: 'atualizacao',
          timestamp: new Date().toISOString(),
          observacao: `Peso adicional alocado (mais ${pesoAlocadoKg} kg)`,
          user_id: userId,
          user_nome: userName,
        });

        // Since it's an existing assignment, return early (bypassing chat/viagem duplication)
        return { entregaId: updatedEntrega.id, viagemId: viagemId };
      }

      // Create delivery record with simplified status enum
      const { data: entregaData, error: entregaError } = await supabase
        .from('entregas')
        .insert({
          carga_id: cargaId,
          motorista_id: motoristaId,
          veiculo_id: veiculoId,
          carroceria_id: carroceriaId,
          peso_alocado_kg: pesoAlocadoKg,
          valor_frete: valorFrete,
          previsao_coleta: previsaoColeta ? new Date(previsaoColeta).toISOString() : null,
          status: 'aguardando',
          created_by: userId,
          carrocerias_alocadas: carroceriasAlocadas || null,
        } as any)
        .select('id')
        .single();

      if (entregaError) throw entregaError;

      // Registrar eventos iniciais na timeline
      const now = new Date();

      // Evento 1: Criação da entrega (pelo usuário)
      await supabase.from('entrega_eventos').insert({
        entrega_id: entregaData.id,
        tipo: 'criado',
        timestamp: now.toISOString(),
        observacao: 'Entrega criada',
        user_id: userId,
        user_nome: userName,
      });

      // Evento 2: Status inicial "Aguardando" (pelo Sistema)
      await supabase.from('entrega_eventos').insert({
        entrega_id: entregaData.id,
        tipo: 'criado' as const,
        timestamp: new Date(now.getTime() + 1).toISOString(), // +1ms para ordenação
        observacao: 'Status inicial definido automaticamente',
        user_id: null,
        user_nome: 'Sistema',
      } as any);

      // Handle viagem - create new or add to existing
      let finalViagemId = viagemId;

      if (!viagemId) {
        // Create new viagem directly
        // Note: codigo is auto-generated by trigger generate_viagem_codigo
        // Criar viagem com status 'aguardando' - pronta para execução imediata
        const { data: novaViagem, error: viagemError } = await supabase
          .from('viagens')
          .insert({
            motorista_id: motoristaId,
            veiculo_id: veiculoId,
            carroceria_id: carroceriaId,
            status: 'aguardando' as const,
            started_at: new Date().toISOString(),
            codigo: '', // Will be overwritten by trigger
          })
          .select('id, codigo')
          .single() as any;

        if (viagemError) {
          console.error('Erro ao criar viagem:', viagemError);
          // Don't throw - viagem is optional for now, delivery was already created
        } else {
          finalViagemId = novaViagem.id;

          // Link entrega to the new viagem
          const { error: vinculoError } = await supabase
            .from('viagem_entregas')
            .insert({
              viagem_id: novaViagem.id,
              entrega_id: entregaData.id,
              ordem: 1,
            });

          if (vinculoError) {
            console.error('Erro ao vincular entrega à viagem:', vinculoError);
          }
        }
      } else {
        // Add entrega to existing viagem
        // Get current max ordem
        const { data: maxOrdem } = await supabase
          .from('viagem_entregas')
          .select('ordem')
          .eq('viagem_id', viagemId)
          .order('ordem', { ascending: false })
          .limit(1)
          .single();

        const novaOrdem = (maxOrdem?.ordem || 0) + 1;

        const { error: vinculoError } = await supabase
          .from('viagem_entregas')
          .insert({
            viagem_id: viagemId,
            entrega_id: entregaData.id,
            ordem: novaOrdem,
          });

        if (vinculoError) {
          console.error('Erro ao vincular entrega à viagem:', vinculoError);
        }
      }

      // Create chat for this delivery with all participants
      await createChatForEntrega({
        entregaId: entregaData.id,
        cargaId,
        motoristaId,
        embarcadorEmpresaId,
        transportadoraEmpresaId,
      });

      return { entregaId: entregaData.id, viagemId: finalViagemId };
    },
    onSuccess: (data) => {
      const viagemMsg = data.viagemId ? ' e vinculada à viagem' : '';
      toast.success(`Carga aceita com sucesso${viagemMsg}!`);
      queryClient.invalidateQueries({ queryKey: ['cargas_disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['viagens_motorista'] });
      queryClient.invalidateQueries({ queryKey: ['entregas_ativas_motoristas', empresa?.id] });
      setIsAcceptDialogOpen(false);
      setSelectedCarga(null);
      setSelectedMotorista('');
      setSelectedVeiculo('');
      setSelectedCarroceria(null);
      setSelectedCarroceriasMulti([]);
      setPesoPorCarroceria({});
      setSelectedViagemId(null);
    },
    onError: (error) => {
      console.error('Erro ao aceitar carga:', error);
      toast.error('Erro ao aceitar carga');
    },
  });

  const filteredCargas = useMemo(() => {
    return cargas.filter((carga) => {
      // Check if any advanced filter is active
      const hasAdvancedFilters = Object.values(advancedFilters).some(v => v.length > 0);

      // If no advanced filters, just apply tipo and veiculo filters
      if (!hasAdvancedFilters) {
        const matchesTipo = filterTipo === 'all' || carga.tipo === filterTipo;

        let matchesTipoVeiculo = true;
        if (filterTiposVeiculo.length > 0) {
          const requisitos = carga.veiculo_requisitos as VeiculoRequisitos | null;
          if (requisitos?.tipos_veiculo && requisitos.tipos_veiculo.length > 0) {
            matchesTipoVeiculo = filterTiposVeiculo.some(tipo =>
              requisitos.tipos_veiculo!.includes(tipo)
            );
          }
        }

        return matchesTipo && matchesTipoVeiculo;
      }

      // Apply advanced filters
      const matchesCodigo = !advancedFilters.codigo ||
        carga.codigo.toLowerCase().includes(advancedFilters.codigo.toLowerCase());

      const matchesDescricao = !advancedFilters.descricao ||
        carga.descricao?.toLowerCase().includes(advancedFilters.descricao.toLowerCase());

      const matchesCidadeOrigem = !advancedFilters.cidadeOrigem ||
        carga.endereco_origem?.cidade?.toLowerCase().includes(advancedFilters.cidadeOrigem.toLowerCase());

      const matchesEstadoOrigem = !advancedFilters.estadoOrigem ||
        carga.endereco_origem?.estado?.toLowerCase() === advancedFilters.estadoOrigem.toLowerCase();

      const matchesCidadeDestino = !advancedFilters.cidadeDestino ||
        carga.endereco_destino?.cidade?.toLowerCase().includes(advancedFilters.cidadeDestino.toLowerCase());

      const matchesEstadoDestino = !advancedFilters.estadoDestino ||
        carga.endereco_destino?.estado?.toLowerCase() === advancedFilters.estadoDestino.toLowerCase();

      const matchesEmbarcador = !advancedFilters.embarcador ||
        carga.empresa?.nome?.toLowerCase().includes(advancedFilters.embarcador.toLowerCase());

      const matchesDestinatario = !advancedFilters.destinatario ||
        carga.destinatario_razao_social?.toLowerCase().includes(advancedFilters.destinatario.toLowerCase()) ||
        carga.destinatario_nome_fantasia?.toLowerCase().includes(advancedFilters.destinatario.toLowerCase());

      const matchesCnpjDestinatario = !advancedFilters.cnpjDestinatario ||
        carga.destinatario_cnpj?.replace(/\D/g, '').includes(advancedFilters.cnpjDestinatario.replace(/\D/g, ''));

      const matchesTipo = filterTipo === 'all' || carga.tipo === filterTipo;

      // Filtro por tipo de veículo
      let matchesTipoVeiculo = true;
      if (filterTiposVeiculo.length > 0) {
        const requisitos = carga.veiculo_requisitos as VeiculoRequisitos | null;
        if (requisitos?.tipos_veiculo && requisitos.tipos_veiculo.length > 0) {
          matchesTipoVeiculo = filterTiposVeiculo.some(tipo =>
            requisitos.tipos_veiculo!.includes(tipo)
          );
        }
      }

      return matchesCodigo && matchesDescricao && matchesCidadeOrigem && matchesEstadoOrigem &&
        matchesCidadeDestino && matchesEstadoDestino && matchesEmbarcador &&
        matchesDestinatario && matchesCnpjDestinatario && matchesTipo && matchesTipoVeiculo;
    });
  }, [cargas, advancedFilters, filterTipo, filterTiposVeiculo]);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(15); prevVisibleCountRef.current = 15; }, [advancedFilters, filterTipo, filterTiposVeiculo]);

  const visibleCargas = useMemo(() => filteredCargas.slice(0, visibleCount), [filteredCargas, visibleCount]);
  const hasMore = visibleCount < filteredCargas.length;

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    prevVisibleCountRef.current = visibleCount;
    const scrollEl = scrollContainerRef.current;
    const savedScrollTop = scrollEl?.scrollTop ?? 0;
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 15, filteredCargas.length));
      setIsLoadingMore(false);
      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = savedScrollTop;
      });
    }, 400);
  };

  const handleAcceptClick = (carga: Carga) => {
    setSelectedCarga(carga);
    setSelectedMotorista('');
    setSelectedVeiculo('');
    setPesoAlocadoInput(0);
    setIsAcceptDialogOpen(true);
  };

  // Get selected driver data
  const selectedMotoristaData = useMemo(() => {
    return motoristas.find((m) => m.id === selectedMotorista);
  }, [motoristas, selectedMotorista]);

  // Get selected vehicle data (from company-wide list)
  const selectedVeiculoData = useMemo(() => {
    return veiculosEmpresa.find((v: any) => v.id === selectedVeiculo);
  }, [veiculosEmpresa, selectedVeiculo]);

  // Derive if current vehicle is multi-trailer
  const isMultiTrailer = useMemo(() => {
    if (!selectedVeiculoData) return false;
    return selectedVeiculoData?.tipo === 'bitrem' || selectedVeiculoData?.tipo === 'rodotrem';
  }, [selectedVeiculoData]);

  // Derived total requested weight
  const pesoTotalAlocado = useMemo(() => {
    if (isMultiTrailer) {
      return Object.values(pesoPorCarroceria).reduce((a, b) => a + (b || 0), 0);
    }
    return pesoAlocadoInput;
  }, [isMultiTrailer, pesoPorCarroceria, pesoAlocadoInput]);

  const selectedCarroceriaData = useMemo(() => {
    if (!selectedCarroceria) return null;
    return carroceriasEmpresa.find((c: any) => c.id === selectedCarroceria) || null;
  }, [carroceriasEmpresa, selectedCarroceria]);

  // Auto-select carroceria if only one is available company-wide
  useEffect(() => {
    if (!selectedVeiculoData) return;

    const veiculo = selectedVeiculoData as any;
    if (veiculo?.carroceria_integrada) {
      if (selectedCarroceria !== null) setSelectedCarroceria(null);
      return;
    }

    if (carroceriasEmpresa.length === 1 && !selectedCarroceria) {
      setSelectedCarroceria(carroceriasEmpresa[0].id);
    }
  }, [selectedVeiculoData, selectedCarroceria, carroceriasEmpresa]);

  // Capacidade baseada no equipamento selecionado (carroceria OU veículo integrado)
  const capacidadeEquipamentoTotal = useMemo(() => {
    if (!selectedVeiculoData) return 0;

    const veiculo = selectedVeiculoData as any;
    if (veiculo?.carroceria_integrada) {
      return veiculo.capacidade_kg || 0;
    }

    if (isMultiTrailer && selectedCarroceriasMulti.length > 0) {
      return selectedCarroceriasMulti.reduce((total, carId) => {
        const carroceria = carroceriasEmpresa.find((c: any) => c.id === carId);
        return total + (carroceria?.capacidade_kg || 0);
      }, 0);
    }

    return selectedCarroceriaData?.capacidade_kg || 0;
  }, [selectedVeiculoData, selectedCarroceriaData, isMultiTrailer, selectedCarroceriasMulti, carroceriasEmpresa]);

  const capacidadeEquipamentoEmUso = useMemo(() => {
    if (!selectedVeiculoData) return 0;

    const veiculo = selectedVeiculoData as any;
    if (veiculo?.carroceria_integrada) {
      return pesoEmUsoPorVeiculo.get(selectedVeiculoData.id) || 0;
    }

    if (!selectedCarroceria) return 0;
    return pesoEmUsoPorCarroceria.get(selectedCarroceria) || 0;
  }, [selectedVeiculoData, selectedCarroceria, pesoEmUsoPorVeiculo, pesoEmUsoPorCarroceria]);

  const capacidadeEquipamentoDisponivel = useMemo(() => {
    return Math.max(0, capacidadeEquipamentoTotal - capacidadeEquipamentoEmUso);
  }, [capacidadeEquipamentoTotal, capacidadeEquipamentoEmUso]);

  // Calculate max weight that can be allocated
  const pesoMaximoAlocar = useMemo(() => {
    if (!selectedCarga) return 0;
    const pesoDisponivel = selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg;
    return Math.min(capacidadeEquipamentoDisponivel, pesoDisponivel);
  }, [selectedCarga, capacidadeEquipamentoDisponivel]);

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
    if (!selectedCarga) return 0;

    // Se for frete fixo, o valor é o mesmo independentemente do peso
    if (selectedCarga.tipo_precificacao === 'fixo' && selectedCarga.valor_frete_fixo) {
      return selectedCarga.valor_frete_fixo;
    }

    // Senão, calcula baseado no peso alocado
    if (!selectedCarga.valor_frete_tonelada || !pesoAlocadoInput) return selectedCarga.valor_frete_fixo || 0;
    return (pesoAlocadoInput / 1000) * selectedCarga.valor_frete_tonelada;
  }, [selectedCarga, pesoAlocadoInput]);

  const handleConfirmAccept = () => {
    if (!selectedCarga || !selectedMotorista || !selectedVeiculo) {
      toast.error('Selecione motorista e veículo');
      return;
    }

    // Se o veículo NÃO tem carroceria integrada, é obrigatório definir a carroceria
    const veiculo = selectedVeiculoData as any;
    if (!veiculo?.carroceria_integrada) {
      if (carroceriasEmpresa.length > 0 && !selectedCarroceria && !isMultiTrailer) {
        toast.error('Selecione a carroceria');
        return;
      }
      if (isMultiTrailer && selectedCarroceriasMulti.length === 0) {
        toast.error('Selecione ao menos uma carroceria');
        return;
      }
      if (carroceriasEmpresa.length === 0) {
        toast.error('Nenhuma carroceria cadastrada na empresa');
        return;
      }
    }

    if (pesoValidationError) {
      toast.error(pesoValidationError);
      return;
    }

    if (!selectedCarga.empresa_id || !empresa?.id) {
      toast.error('Erro ao identificar empresas');
      return;
    }

    if (!previsaoColeta) {
      toast.error('Informe a previsão de coleta');
      return;
    }

    acceptCarga.mutate({
      cargaId: selectedCarga.id,
      motoristaId: selectedMotorista,
      veiculoId: selectedVeiculo,
      carroceriaId: selectedCarroceria,
      pesoAlocadoKg: pesoAlocadoInput,
      valorFrete: calculatedFrete,
      embarcadorEmpresaId: selectedCarga.empresa_id,
      transportadoraEmpresaId: empresa.id,
      viagemId: selectedViagemId,
      userId: user?.id ?? null,
      userName: usuarioLogado?.nome || user?.email || 'Sistema',
      previsaoColeta,
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
    if (carga.tipo_precificacao === 'fixo' && carga.valor_frete_fixo) {
      return carga.valor_frete_fixo;
    }
    if (carga.valor_frete_tonelada) {
      const pesoDisponivel = carga.peso_disponivel_kg ?? carga.peso_kg;
      return (pesoDisponivel / 1000) * carga.valor_frete_tonelada;
    }
    return carga.valor_frete_fixo || null;
  };

  // Helper to format company + filial name
  const formatEmpresaFilial = (carga: Carga) => {
    const empresa = carga.empresa?.nome || 'Empresa';
    const filial = carga.filial?.nome;
    return filial ? `${empresa} - ${filial}` : empresa;
  };

  // Carga Card component for reuse
  const CargaCard = ({ carga, isHovered, uniformHeight = false, isNew = false }: { carga: Carga; isHovered?: boolean; uniformHeight?: boolean; isNew?: boolean }) => {
    const pesoDisponivel = carga.peso_disponivel_kg ?? carga.peso_kg;
    const percentDisponivel = (pesoDisponivel / carga.peso_kg) * 100;
    const veiculoRequisitos = carga.veiculo_requisitos as VeiculoRequisitos | null;

    return (
      <Card
        className={`border-border hover:shadow-lg transition-all cursor-pointer ${uniformHeight ? 'h-full flex flex-col' : ''} ${isHovered ? 'ring-2 ring-primary shadow-lg' : ''} ${isNew ? 'animate-fade-in' : ''}`}
        style={isNew ? { animationDuration: '0.4s', animationFillMode: 'both' } : undefined}
        onMouseEnter={() => setHoveredCargaId(carga.id)}
        onMouseLeave={() => setHoveredCargaId(null)}
        onClick={() => handleAcceptClick(carga)}
      >
        <CardContent className={`p-4 ${uniformHeight ? 'flex flex-col flex-1' : 'space-y-3'}`}>
          {/* Destinatário Company Name - First Line */}
          <div className={`flex items-center gap-2 pb-2 border-b border-border ${uniformHeight ? 'min-h-[36px]' : ''}`}>
            <Package className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm text-primary truncate">
              {carga.destinatario_nome_fantasia || carga.destinatario_razao_social || 'Destinatário não informado'}
            </span>
          </div>

          {/* Header - Fixed height section */}
          <div className={`flex items-start gap-3 py-3 ${uniformHeight ? 'min-h-[80px]' : ''}`}>
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
                {/* Badge de tipo de veículo requerido - single line truncate */}
                {veiculoRequisitos?.tipos_veiculo && veiculoRequisitos.tipos_veiculo.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 max-w-[140px]">
                    <Truck className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {veiculoRequisitos.tipos_veiculo.map(t => tipoVeiculoLabels[t] || t).join(', ')}
                    </span>
                  </Badge>
                )}
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

          {/* Route with company names - Fixed height */}
          <div className={`flex items-center gap-2 text-xs ${uniformHeight ? 'min-h-[60px]' : ''}`}>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              {/* Origin company name */}
              <span className="text-xs text-muted-foreground font-medium truncate">
                {formatEmpresaFilial(carga)}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-chart-1 shrink-0" />
                <span className="font-medium text-foreground truncate">{carga.endereco_origem?.cidade || 'N/A'}, {carga.endereco_origem?.estado || ''}</span>
              </div>
              <span className="text-muted-foreground ml-5 truncate text-[10px]">
                {carga.endereco_origem?.logradouro ? `${carga.endereco_origem.logradouro}${carga.endereco_origem.numero ? `, ${carga.endereco_origem.numero}` : ''}` : '-'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mx-1" />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              {/* Destination company name */}
              <span className="text-xs text-muted-foreground font-medium truncate">
                {carga.destinatario_nome_fantasia || carga.destinatario_razao_social || 'Destinatário'}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-chart-2 shrink-0" />
                <span className="font-medium text-foreground truncate">{carga.endereco_destino?.cidade || 'N/A'}, {carga.endereco_destino?.estado || ''}</span>
              </div>
              <span className="text-muted-foreground ml-5 truncate text-[10px]">
                {carga.endereco_destino?.logradouro ? `${carga.endereco_destino.logradouro}${carga.endereco_destino.numero ? `, ${carga.endereco_destino.numero}` : ''}` : '-'}
              </span>
            </div>
          </div>

          {/* Distance Badge - Fixed height */}
          <div className={`flex items-center gap-2 ${uniformHeight ? 'h-[28px]' : ''} my-1`}>
            {distancias.has(carga.id) ? (
              <>
                <Badge variant="secondary" className="gap-1">
                  <Route className="w-3 h-3" />
                  {distancias.get(carga.id)?.distance}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ~{distancias.get(carga.id)?.duration}
                </span>
              </>
            ) : uniformHeight ? (
              <span className="text-xs text-muted-foreground italic">Calculando distância...</span>
            ) : null}
          </div>

          {/* Spacer to push bottom content down - only in uniform height mode */}
          {uniformHeight && <div className="flex-1" />}

          {/* Weight Progress Bar - Always at same position */}
          <div className="space-y-1.5 pt-2">
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

          {/* Details Row - Fixed position at bottom */}
          <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-border gap-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">
                  {pesoDisponivel.toLocaleString('pt-BR')} kg
                </span>
              </span>

              {/* Carregamento Mínimo */}
              <div className="flex items-center">
                {carga.peso_minimo_fracionado_kg ? (
                  <Tooltip>
                    <TooltipTrigger className="cursor-help flex items-center gap-1 text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
                      <Scale className="w-3 h-3" />
                      Mín: {carga.peso_minimo_fracionado_kg.toLocaleString('pt-BR')} kg
                    </TooltipTrigger>
                    <TooltipContent>Carregamento mínimo exigido por entrega</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger className="cursor-help flex items-center gap-1 text-[10px] bg-muted/60 text-muted-foreground font-medium px-1.5 py-0.5 rounded">
                      <Scale className="w-3 h-3" />
                      S/ Mínimo
                    </TooltipTrigger>
                    <TooltipContent>Esta carga não exige um carregamento mínimo fracionado</TooltipContent>
                  </Tooltip>
                )}
              </div>

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
            {(() => {
              const totalFrete = calcularFreteTotal(carga);
              if (totalFrete === null) return null;

              return (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1 text-sm font-semibold text-chart-2">
                    {formatCurrency(totalFrete)}
                  </div>
                  {carga.valor_frete_tonelada ? (
                    <span className="text-xs text-muted-foreground">
                      ({formatCurrency(carga.valor_frete_tonelada)}/ton)
                    </span>
                  ) : carga.tipo_precificacao === 'fixo' ? (
                    <span className="text-xs text-muted-foreground">
                      (Valor Fixo)
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* Dates Row - Fixed at bottom */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
            {carga.data_coleta_de ? (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-chart-1" />
                <span>Coleta: {format(new Date(carga.data_coleta_de + 'T00:00:00'), 'dd/MM', { locale: ptBR })}</span>
                {carga.data_coleta_ate && carga.data_coleta_ate !== carga.data_coleta_de && (
                  <span> - {format(new Date(carga.data_coleta_ate + 'T00:00:00'), 'dd/MM', { locale: ptBR })}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground/50">
                <Calendar className="w-3.5 h-3.5" />
                <span>Coleta: -</span>
              </span>
            )}
            {carga.data_entrega_limite ? (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-chart-2" />
                <span>Entrega: {format(new Date(carga.data_entrega_limite + 'T00:00:00'), 'dd/MM', { locale: ptBR })}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground/50">
                <Calendar className="w-3.5 h-3.5" />
                <span>Entrega: -</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div ref={scrollContainerRef} className="p-4 md:p-8 h-full overflow-auto">
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
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <AdvancedSearchPopover
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                />
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

              {/* Filtro de Tipo de Veículo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  <span>Minha frota:</span>
                  {tiposVeiculoFrota.length === 0 && (
                    <span className="text-xs italic">Nenhum veículo cadastrado</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(tipoVeiculoLabels) as [string, string][]).map(([value, label]) => {
                    const isInFleet = tiposVeiculoFrota.includes(value);
                    const isSelected = filterTiposVeiculo.includes(value);

                    return (
                      <Badge
                        key={value}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                          }`}
                        onClick={() => {
                          if (isSelected) {
                            setFilterTiposVeiculo(prev => prev.filter(t => t !== value));
                          } else {
                            setFilterTiposVeiculo(prev => [...prev, value]);
                          }
                        }}
                      >
                        {label}
                        {isInFleet && (
                          <CheckCircle className={`w-3 h-3 ml-1 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                        )}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  {filterTiposVeiculo.length < tiposVeiculoFrota.length && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setFilterTiposVeiculo(tiposVeiculoFrota)}
                    >
                      Selecionar todos da minha frota
                    </Button>
                  )}
                  {filterTiposVeiculo.length > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      onClick={() => setFilterTiposVeiculo([])}
                    >
                      Mostrar todas as cargas
                    </Button>
                  )}
                </div>
              </div>
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
              <p className="text-muted-foreground mb-4">
                {Object.values(advancedFilters).some(v => v.length > 0) || filterTipo !== 'all' || filterTiposVeiculo.length > 0
                  ? 'Nenhuma carga corresponde aos filtros aplicados.'
                  : 'Não há cargas publicadas no momento. Volte mais tarde.'}
              </p>
              {filterTiposVeiculo.length > 0 && cargas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterTiposVeiculo([])}
                >
                  Mostrar todas as {cargas.length} cargas
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 md:pb-0 items-stretch" style={{ overflow: 'visible' }}>
            {visibleCargas.map((carga, index) => (
              <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} uniformHeight isNew={index >= prevVisibleCountRef.current} />
            ))}
            {(hasMore || isLoadingMore) && (
              <div className="col-span-full flex justify-center py-4">
                {isLoadingMore ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <Button variant="outline" onClick={loadMore}>Carregar mais</Button>
                )}
              </div>
            )}
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
          <div className="flex gap-4 h-[calc(100vh-300px)] min-h-[500px]">
            {/* Left - Scrollable List */}
            <div className="w-1/2 lg:w-2/5 overflow-y-auto px-1 py-1 space-y-3">
              {visibleCargas.map((carga, index) => (
                <CargaCard key={carga.id} carga={carga} isHovered={hoveredCargaId === carga.id} isNew={index >= prevVisibleCountRef.current} />
              ))}
              {(hasMore || isLoadingMore) && (
                <div className="flex justify-center py-4">
                  {isLoadingMore ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Button variant="outline" size="sm" onClick={loadMore}>
                      Carregar mais ({filteredCargas.length - visibleCount} restantes)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Right - Map (all markers always visible) */}
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
        <Dialog open={isAcceptDialogOpen} onOpenChange={(open) => { setIsAcceptDialogOpen(open); if (!open) setWizardStep(1); }}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Aceitar Carga</DialogTitle>
              <DialogDescription>
                {wizardStep === 1 && 'Etapa 1 de 3 — Detalhes da carga'}
                {wizardStep === 2 && 'Etapa 2 de 3 — Selecione equipamento e motorista'}
                {wizardStep === 3 && 'Etapa 3 de 3 — Peso, previsão e confirmação'}
              </DialogDescription>
              {/* Step indicator */}
              <div className="flex items-center gap-2 pt-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className={cn("h-1.5 flex-1 rounded-full transition-colors", step <= wizardStep ? 'bg-primary' : 'bg-muted')} />
                ))}
              </div>
            </DialogHeader>

            {selectedCarga && (
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 mb-4">
                  {/* === STEP 1: Detalhes da Carga === */}
                  {wizardStep === 1 && (<div className="space-y-4">
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

                  </div>)}

                  {/* === STEP 2: Equipamento + Motorista === */}
                  {wizardStep === 2 && (<div className="space-y-4">
                  {/* Driver Selection */}
                  <div className="space-y-2 px-1">
                    <Label>Motorista</Label>
                    <Popover open={openMotoristaCombobox} onOpenChange={setOpenMotoristaCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openMotoristaCombobox}
                          className="w-full justify-between mt-1 h-12"
                        >
                          {selectedMotorista ? (
                            <div className="flex items-center gap-3 w-full overflow-hidden">
                              {motoristas.find((m) => m.id === selectedMotorista)?.foto_url ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={motoristas.find((m) => m.id === selectedMotorista)?.foto_url as string} />
                                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <div className="flex flex-col items-start truncate overflow-hidden">
                                <span className="font-medium text-sm truncate w-full text-left">
                                  {motoristas.find((m) => m.id === selectedMotorista)?.nome_completo}
                                </span>
                                <span className="text-xs text-muted-foreground truncate w-full text-left">
                                  ID: {motoristas.find((m) => m.id === selectedMotorista)?.id.substring(0, 8)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-normal">Selecione o motorista...</span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar motorista..." />
                          <CommandList className="max-h-[250px] overflow-y-auto">
                            <CommandEmpty>Nenhum motorista encontrado.</CommandEmpty>
                            <CommandGroup>
                              {motoristas.map((motorista) => {
                                const emUso = pesoEmUsoPorMotorista.get(motorista.id) || 0;

                                return (
                                  <CommandItem
                                    key={motorista.id}
                                    value={`${motorista.nome_completo} ${motorista.id}`}
                                    onSelect={() => {
                                      setSelectedMotorista(motorista.id);
                                      // Auto-select first company vehicle
                                      if (veiculosEmpresa.length > 0) {
                                        const veiculo = veiculosEmpresa[0] as any;
                                        setSelectedVeiculo(veiculo.id);
                                        if (veiculo.carroceria_integrada) {
                                          setSelectedCarroceria(null);
                                        } else if (carroceriasEmpresa.length > 0) {
                                          setSelectedCarroceria(carroceriasEmpresa[0].id);
                                        } else {
                                          setSelectedCarroceria(null);
                                        }
                                      } else {
                                        setSelectedVeiculo('');
                                        setSelectedCarroceria(null);
                                      }
                                      setPesoAlocadoInput(0);
                                      setPesoPorCarroceria({});
                                      setSelectedCarroceriasMulti([]);
                                      setSelectedViagemId(null);
                                      setIsViagemBlocked(false);
                                      setOpenMotoristaCombobox(false);

                                      // Scroll to equipment section after driver selection
                                      setTimeout(() => {
                                        equipmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 100);
                                    }}
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      {motorista.foto_url ? (
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={motorista.foto_url} />
                                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                          <User className="h-4 w-4 text-primary" />
                                        </div>
                                      )}
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium text-sm truncate">{motorista.nome_completo}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                                          ID: {motorista.id.substring(0, 8)}
                                        </span>
                                      </div>
                                      <div className="ml-auto flex shrink-0 items-center justify-end">
                                        {emUso > 0 ? (
                                          <Badge variant="outline" className="text-[10px] text-muted-foreground truncate">
                                            {(emUso / 1000).toFixed(1)}t em uso
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary truncate">
                                            Disponível
                                          </Badge>
                                        )}
                                        <Check
                                          className={cn(
                                            "ml-2 h-4 w-4 text-primary",
                                            selectedMotorista === motorista.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Preview do Equipamento Vinculado */}
                  {selectedMotorista && (
                    <div ref={equipmentSectionRef} className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                        <Truck className="w-4 h-4" />
                        Equipamento da Empresa
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Veículo */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Veículo (Cavalo)</Label>
                          {veiculosEmpresa.length === 0 ? (
                            <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Nenhum veículo cadastrado na empresa
                              </p>
                            </div>
                          ) : selectedVeiculoData ? (
                            <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background cursor-not-allowed opacity-80">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedVeiculoData.placa}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tipoVeiculoLabels[selectedVeiculoData.tipo] || selectedVeiculoData.tipo}
                                </span>
                              </div>
                            </div>
                          ) : null}

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
                          {/* Se veículo tem carroceria integrada, mostrar isso */}
                          {(selectedVeiculoData as any)?.carroceria_integrada ? (
                            <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                              <p className="text-xs text-primary font-medium">Carroceria integrada ao veículo</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Capacidade: {(selectedVeiculoData as any)?.capacidade_kg?.toLocaleString('pt-BR') || 0} kg
                              </p>
                            </div>
                          ) : carroceriasEmpresa.length === 0 ? (
                            <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Nenhuma carroceria cadastrada na empresa
                              </p>
                            </div>
                          ) : carroceriasEmpresa.length === 1 && !isMultiTrailer ? (
                            // Single carroceria - just display it
                            <div className="p-2 bg-background rounded-md border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Placa:</span>
                                <span className="text-sm font-mono font-semibold">{carroceriasEmpresa[0].placa}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Tipo:</span>
                                <span className="text-sm">{tipoCarroceriaLabels[carroceriasEmpresa[0].tipo] || carroceriasEmpresa[0].tipo}</span>
                              </div>
                              {carroceriasEmpresa[0].capacidade_kg && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Capacidade:</span>
                                  <span className="text-sm font-medium">{carroceriasEmpresa[0].capacidade_kg.toLocaleString('pt-BR')} kg</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Multiple carrocerias - show Select (or Checkboxes if Bitrem/Rodotrem)
                            <>
                              {isMultiTrailer ? (
                                <div className="space-y-3">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Selecione até 3 carrocerias da empresa:
                                  </div>
                                  <div className="space-y-2 border rounded-md p-2 bg-background">
                                    {carroceriasEmpresa.map((carroceria: any) => {
                                      const isSelected = selectedCarroceriasMulti.includes(carroceria.id);
                                      return (
                                        <div key={carroceria.id} className="flex flex-col gap-2 p-2 bg-muted/30 rounded-md border border-border">
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  if (selectedCarroceriasMulti.length >= 3) {
                                                    toast.error('Máximo de 3 carrocerias permitidas');
                                                    return;
                                                  }
                                                  setSelectedCarroceriasMulti([...selectedCarroceriasMulti, carroceria.id]);
                                                  setPesoPorCarroceria(prev => ({ ...prev, [carroceria.id]: 0 }));
                                                } else {
                                                  setSelectedCarroceriasMulti(prev => prev.filter(id => id !== carroceria.id));
                                                  setPesoPorCarroceria(prev => {
                                                    const next = { ...prev };
                                                    delete next[carroceria.id];
                                                    return next;
                                                  });
                                                }
                                              }}
                                            />
                                            <div className="flex flex-col">
                                              <span className="font-mono text-sm font-semibold">{carroceria.placa}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}
                                              </span>
                                            </div>
                                            <div className="ml-auto text-xs font-medium text-primary">
                                              Cap: {carroceria.capacidade_kg?.toLocaleString('pt-BR')} kg
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <div className="pl-7 pr-2">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium">Peso (kg):</span>
                                                <Input
                                                  type="number"
                                                  className="h-7 text-xs bg-background"
                                                  placeholder="Ex: 15000"
                                                  value={pesoPorCarroceria[carroceria.id] || ''}
                                                  onChange={(e) => {
                                                    const val = Math.floor(Number(e.target.value));
                                                    setPesoPorCarroceria(prev => ({ ...prev, [carroceria.id]: val }));
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Select
                                    value={selectedCarroceria || ''}
                                    onValueChange={(value) => setSelectedCarroceria(value || null)}
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Selecione a carroceria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {carroceriasEmpresa.map((carroceria: any) => (
                                        <SelectItem key={carroceria.id} value={carroceria.id}>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{carroceria.placa}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {tipoCarroceriaLabels[carroceria.tipo] || carroceria.tipo}
                                            </span>
                                            {carroceria.capacidade_kg && (
                                              <span className="text-xs text-primary">
                                                {carroceria.capacidade_kg.toLocaleString('pt-BR')} kg
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {/* Show selected carroceria details */}
                                  {selectedCarroceria && (() => {
                                    const carroceria = carroceriasEmpresa.find((c: any) => c.id === selectedCarroceria);
                                    if (!carroceria) return null;
                                    return (
                                      <div className="p-2 bg-background rounded-md border space-y-1">
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
                                    );
                                  })()}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  </div>)}

                  {/* === STEP 3: Viagem + Peso + Confirmação === */}
                  {wizardStep === 3 && (<div className="space-y-4">
                  {/* Viagem Selection */}
                  {selectedMotorista && selectedVeiculo && (
                    <div ref={viagemSectionRef}>
                      <ViagemSelector
                        motoristaId={selectedMotorista}
                        onViagemSelect={setSelectedViagemId}
                        selectedViagemId={selectedViagemId}
                        onBlockedChange={setIsViagemBlocked}
                      />
                    </div>
                  )}

                  {/* Weight Allocation */}
                  {selectedVeiculo && (
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
                            <span>Capacidade total do equipamento:</span>
                            <span className="font-medium">{capacidadeEquipamentoTotal.toLocaleString('pt-BR')} kg</span>
                          </div>
                          {capacidadeEquipamentoEmUso > 0 && (
                            <div className="flex justify-between text-amber-600">
                              <span>Em uso (outras entregas):</span>
                              <span className="font-medium">-{capacidadeEquipamentoEmUso.toLocaleString('pt-BR')} kg</span>
                            </div>
                          )}
                          <div className="flex justify-between text-primary font-medium">
                            <span>Capacidade disponível:</span>
                            <span>{capacidadeEquipamentoDisponivel.toLocaleString('pt-BR')} kg</span>
                          </div>
                        </div>

                        {isMultiTrailer && selectedCarroceriasMulti.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Resumo do Split (Total: {pesoTotalAlocado.toLocaleString('pt-BR')} kg)</p>
                            {selectedCarga?.permite_fracionado === false && (
                              <p className="text-xs text-amber-600">
                                Esta carga não permite fracionamento - o somatório deve igualar o peso da carga.
                              </p>
                            )}
                            {pesoValidationError && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {pesoValidationError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              step="1"
                              value={pesoTotalAlocado || ''}
                              onChange={(e) => setPesoAlocadoInput(Math.floor(Number(e.target.value)))}
                              placeholder={`Máx: ${pesoMaximoAlocar.toLocaleString('pt-BR')} kg`}
                              min={pesoMinimoRequirido}
                              max={pesoMaximoAlocar}
                              className="text-lg font-bold"
                              disabled={isMultiTrailer}
                            />
                            {pesoMinimoRequirido > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Peso mínimo por entrega: {pesoMinimoRequirido.toLocaleString('pt-BR')} kg
                              </p>
                            ) : selectedCarga?.permite_fracionado ? (
                              <p className="text-xs text-muted-foreground">
                                Sem mínimo de carregamento exigido
                              </p>
                            ) : null}
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
                        )}

                        {/* Data Previsão Coleta */}
                        <div className="space-y-2 pt-2 border-t">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Previsão de Coleta
                          </label>
                          <Input
                            type="datetime-local"
                            value={previsaoColeta}
                            onChange={(e) => setPrevisaoColeta(e.target.value)}
                            className="w-full text-base font-medium"
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Informe quando o motorista prevê chegar para coletar a carga.
                          </p>
                        </div>

                        {capacidadeEquipamentoDisponivel <= 0 && (
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
                              <span className="text-primary font-medium">- {pesoTotalAlocado.toLocaleString('pt-BR')} kg</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between text-sm font-semibold">
                              <span>Restará na carga:</span>
                              <span className={(() => {
                                const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoTotalAlocado;
                                return restante <= 0 ? 'text-chart-2' : 'text-foreground';
                              })()}>
                                {(() => {
                                  const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoTotalAlocado;
                                  return Math.max(0, restante).toLocaleString('pt-BR');
                                })()} kg
                              </span>
                            </div>
                            {(() => {
                              const restante = (selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg) - pesoTotalAlocado;
                              if (restante <= 0 && pesoTotalAlocado > 0) {
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
                              <span className="font-medium">{(pesoTotalAlocado / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ton</span>
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
                  </div>)}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                  Voltar
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => { setIsAcceptDialogOpen(false); setWizardStep(1); }}
              >
                Cancelar
              </Button>
              {wizardStep < 3 ? (
                <Button
                  onClick={() => setWizardStep(s => s + 1)}
                  disabled={wizardStep === 2 && (!selectedMotorista || !selectedVeiculo)}
                  className="gap-2"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmAccept}
                  disabled={!selectedMotorista || !selectedVeiculo || pesoTotalAlocado <= 0 || !!pesoValidationError || isViagemBlocked || acceptCarga.isPending}
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
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
