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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Carga {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  peso_kg: number;
  volume_m3: number | null;
  valor_mercadoria: number | null;
  valor_frete_tonelada: number | null;
  data_coleta_de: string | null;
  data_coleta_ate: string | null;
  requer_refrigeracao: boolean;
  carga_perigosa: boolean;
  carga_fragil: boolean;
  endereco_origem: {
    cidade: string;
    estado: string;
  } | null;
  endereco_destino: {
    cidade: string;
    estado: string;
  } | null;
  empresa: {
    nome: string;
  } | null;
}

interface Motorista {
  id: string;
  nome_completo: string;
  telefone: string | null;
  veiculos: {
    id: string;
    placa: string;
    tipo: string;
    capacidade_kg: number | null;
  }[];
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

export default function CargasDisponiveis() {
  const { empresa } = useUserContext();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  // Fetch cargas publicadas (disponíveis para aceitar)
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
          volume_m3,
          valor_mercadoria,
          valor_frete_tonelada,
          data_coleta_de,
          data_coleta_ate,
          requer_refrigeracao,
          carga_perigosa,
          carga_fragil,
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado),
          empresa:empresas!cargas_empresa_id_fkey(nome)
        `)
        .eq('status', 'publicada')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Carga[];
    },
  });

  // Fetch motoristas da transportadora
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
          veiculos(id, placa, tipo, capacidade_kg)
        `)
        .eq('empresa_id', empresa.id)
        .eq('ativo', true);

      if (error) throw error;
      return (data || []) as Motorista[];
    },
    enabled: !!empresa?.id,
  });

  // Mutation para aceitar carga
  const acceptCarga = useMutation({
    mutationFn: async ({ cargaId, motoristaId, veiculoId }: { cargaId: string; motoristaId: string; veiculoId: string }) => {
      // 1. Atualizar status da carga para 'aceita'
      const { error: cargaError } = await supabase
        .from('cargas')
        .update({ status: 'aceita' })
        .eq('id', cargaId);

      if (cargaError) throw cargaError;

      // 2. Criar registro de entrega
      const { error: entregaError } = await supabase
        .from('entregas')
        .insert({
          carga_id: cargaId,
          motorista_id: motoristaId,
          veiculo_id: veiculoId,
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

  const handleAcceptClick = (carga: Carga) => {
    setSelectedCarga(carga);
    setIsAcceptDialogOpen(true);
  };

  const handleConfirmAccept = () => {
    if (!selectedCarga || !selectedMotorista) return;

    const motorista = motoristas.find((m) => m.id === selectedMotorista);
    const veiculo = motorista?.veiculos?.[0];

    if (!veiculo) {
      toast.error('Motorista não possui veículo cadastrado');
      return;
    }

    acceptCarga.mutate({
      cargaId: selectedCarga.id,
      motoristaId: selectedMotorista,
      veiculoId: veiculo.id,
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cargas Disponíveis</h1>
            <p className="text-muted-foreground">
              Visualize e aceite cargas publicadas pelos embarcadores
            </p>
          </div>
          <Badge variant="outline" className="text-sm w-fit">
            {filteredCargas.length} cargas disponíveis
          </Badge>
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

        {/* Cargas List */}
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCargas.map((carga) => (
              <Card
                key={carga.id}
                className="border-border hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {carga.codigo}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {tipoCargaLabels[carga.tipo] || carga.tipo}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-medium line-clamp-1">
                        {carga.descricao}
                      </CardTitle>
                      {carga.empresa?.nome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {carga.empresa.nome}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
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
                          <TooltipContent>Carga Perigosa</TooltipContent>
                        </Tooltip>
                      )}
                      {carga.carga_fragil && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Boxes className="w-4 h-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Carga Frágil</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rota */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-chart-1" />
                      <span>
                        {carga.endereco_origem?.cidade || 'N/A'},{' '}
                        {carga.endereco_origem?.estado || ''}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-chart-2" />
                      <span>
                        {carga.endereco_destino?.cidade || 'N/A'},{' '}
                        {carga.endereco_destino?.estado || ''}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {carga.peso_kg.toLocaleString('pt-BR')} kg
                      </span>
                    </div>
                    {carga.volume_m3 && (
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{carga.volume_m3} m³</span>
                      </div>
                    )}
                    {carga.data_coleta_de && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(carga.data_coleta_de), 'dd/MM', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                    {carga.valor_frete_tonelada && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-chart-2">
                          {formatCurrency(carga.valor_frete_tonelada)}/ton
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleAcceptClick(carga)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aceitar Carga
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Accept Dialog */}
        <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aceitar Carga</DialogTitle>
              <DialogDescription>
                Selecione o motorista que será responsável por esta carga.
              </DialogDescription>
            </DialogHeader>

            {selectedCarga && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">{selectedCarga.codigo}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCarga.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-chart-1" />
                    <span>
                      {selectedCarga.endereco_origem?.cidade},{' '}
                      {selectedCarga.endereco_origem?.estado}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                    <MapPin className="w-4 h-4 text-chart-2" />
                    <span>
                      {selectedCarga.endereco_destino?.cidade},{' '}
                      {selectedCarga.endereco_destino?.estado}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Motorista</label>
                  <Select
                    value={selectedMotorista}
                    onValueChange={setSelectedMotorista}
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
                        motoristas.map((motorista) => (
                          <SelectItem key={motorista.id} value={motorista.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{motorista.nome_completo}</span>
                              {motorista.veiculos?.[0] && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  {motorista.veiculos[0].placa}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                disabled={!selectedMotorista || acceptCarga.isPending}
              >
                {acceptCarga.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
