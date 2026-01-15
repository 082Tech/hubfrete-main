import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Package,
  MapPin,
  Truck,
  Search,
  Loader2,
  ArrowRight,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Route,
  Phone,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Entrega {
  id: string;
  status: string;
  created_at: string;
  coletado_em: string | null;
  motorista: {
    id: string;
    nome_completo: string;
    telefone: string | null;
  } | null;
  veiculo: {
    id: string;
    placa: string;
    tipo: string;
  } | null;
  carga: {
    id: string;
    codigo: string;
    descricao: string;
    peso_kg: number;
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
  };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  aguardando_coleta: {
    label: 'Aguardando Coleta',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Clock,
  },
  em_coleta: {
    label: 'Em Coleta',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: Package,
  },
  coletado: {
    label: 'Coletado',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    icon: CheckCircle,
  },
  em_transito: {
    label: 'Em Trânsito',
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: Route,
  },
  em_entrega: {
    label: 'Em Entrega',
    color: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
    icon: Truck,
  },
  problema: {
    label: 'Problema',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertCircle,
  },
};

export default function EntregasAndamento() {
  const { empresa } = useUserContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch entregas em andamento (da transportadora)
  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ['entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Buscar motoristas da empresa
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
          status,
          created_at,
          coletado_em,
          motorista:motoristas(id, nome_completo, telefone),
          veiculo:veiculos(id, placa, tipo),
          carga:cargas(
            id,
            codigo,
            descricao,
            peso_kg,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado),
            empresa:empresas!cargas_empresa_id_fkey(nome)
          )
        `)
        .in('motorista_id', motoristaIds)
        .in('status', [
          'aguardando_coleta',
          'em_coleta',
          'coletado',
          'em_transito',
          'em_entrega',
          'problema',
        ])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Entrega[];
    },
    enabled: !!empresa?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const filteredEntregas = useMemo(() => {
    return entregas.filter(
      (e) =>
        e.carga.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.carga.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.motorista?.nome_completo
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        e.veiculo?.placa?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entregas, searchTerm]);

  const stats = useMemo(() => {
    const byStatus = entregas.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: entregas.length,
      aguardandoColeta: byStatus['aguardando_coleta'] || 0,
      emTransito:
        (byStatus['em_transito'] || 0) +
        (byStatus['coletado'] || 0) +
        (byStatus['em_coleta'] || 0),
      emEntrega: byStatus['em_entrega'] || 0,
      problemas: byStatus['problema'] || 0,
    };
  }, [entregas]);

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Entregas em Andamento
            </h1>
            <p className="text-muted-foreground">
              Acompanhe as entregas dos seus motoristas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-chart-2 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Atualizado em tempo real
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.aguardandoColeta}
                </p>
                <p className="text-sm text-muted-foreground">Aguardando</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-1/10 rounded-xl">
                <Route className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.emTransito}
                </p>
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-xl">
                <Truck className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.emEntrega}
                </p>
                <p className="text-sm text-muted-foreground">Em Entrega</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.problemas}
                </p>
                <p className="text-sm text-muted-foreground">Problemas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, motorista, placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Entregas List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEntregas.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma entrega em andamento
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Nenhuma entrega corresponde à busca.'
                  : 'Aceite cargas para começar a gerenciar entregas.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEntregas.map((entrega) => {
              const config = statusConfig[entrega.status] || {
                label: entrega.status,
                color: 'bg-muted text-muted-foreground',
                icon: Package,
              };
              const StatusIcon = config.icon;

              return (
                <Card
                  key={entrega.id}
                  className="border-border hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Carga Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {entrega.carga.codigo}
                          </Badge>
                          <Badge className={`text-xs gap-1 ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground truncate">
                          {entrega.carga.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entrega.carga.empresa?.nome} •{' '}
                          {entrega.carga.peso_kg.toLocaleString('pt-BR')} kg
                        </p>
                      </div>

                      {/* Rota */}
                      <div className="flex items-center gap-2 text-sm min-w-0 lg:min-w-[280px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-chart-1 shrink-0" />
                          <span className="truncate">
                            {entrega.carga.endereco_origem?.cidade},{' '}
                            {entrega.carga.endereco_origem?.estado}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-chart-2 shrink-0" />
                          <span className="truncate">
                            {entrega.carga.endereco_destino?.cidade},{' '}
                            {entrega.carga.endereco_destino?.estado}
                          </span>
                        </div>
                      </div>

                      {/* Motorista & Veículo */}
                      <div className="flex items-center gap-4 min-w-0 lg:min-w-[200px]">
                        {entrega.motorista && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {entrega.motorista.nome_completo}
                              </p>
                              {entrega.veiculo && (
                                <p className="text-xs text-muted-foreground">
                                  {entrega.veiculo.placa}
                                </p>
                              )}
                            </div>
                            {entrega.motorista.telefone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    asChild
                                  >
                                    <a
                                      href={`tel:${entrega.motorista.telefone}`}
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Ligar para motorista
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <div className="text-sm text-muted-foreground lg:text-right lg:min-w-[100px]">
                        {formatDistanceToNow(new Date(entrega.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
