import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Users, 
  Package, 
  TrendingUp,
  MapPin,
  ArrowUpRight,
  Loader2,
  Route,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';

export default function TransportadoraDashboard() {
  const { empresa, filialAtiva } = useUserContext();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = profile?.nome_completo?.split(' ')[0] || 'Usuário';

  // Fetch veículos
  const { data: veiculos = [], isLoading: loadingVeiculos } = useQuery({
    queryKey: ['dashboard_veiculos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, ativo, motorista:motoristas(nome_completo)')
        .eq('empresa_id', empresa.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch motoristas
  const { data: motoristas = [], isLoading: loadingMotoristas } = useQuery({
    queryKey: ['dashboard_motoristas', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('motoristas')
        .select('id, nome_completo, ativo')
        .eq('empresa_id', empresa.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ['dashboard_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Get motoristas IDs
      const { data: motoristasData } = await supabase
        .from('motoristas')
        .select('id')
        .eq('empresa_id', empresa.id);

      const motoristaIds = (motoristasData || []).map((m) => m.id);
      if (motoristaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          created_at,
          carga:cargas(codigo, descricao, endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado), endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado)),
          motorista:motoristas(nome_completo),
          veiculo:veiculos(placa)
        `)
        .in('motorista_id', motoristaIds)
        .in('status', ['aguardando_coleta', 'em_coleta', 'coletado', 'em_transito', 'em_entrega'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Stats
  const stats = useMemo(() => {
    const veiculosAtivos = veiculos.filter((v: any) => v.ativo).length;
    const motoristasAtivos = motoristas.filter((m: any) => m.ativo).length;
    const entregasEmAndamento = entregas.length;
    const aguardandoColeta = entregas.filter((e: any) => e.status === 'aguardando_coleta').length;

    return {
      veiculosAtivos,
      motoristasAtivos,
      entregasEmAndamento,
      aguardandoColeta,
    };
  }, [veiculos, motoristas, entregas]);

  const isLoading = loadingVeiculos || loadingMotoristas || loadingEntregas;

  const statusConfig: Record<string, { label: string; color: string }> = {
    aguardando_coleta: { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-600' },
    em_coleta: { label: 'Coletando', color: 'bg-blue-500/10 text-blue-600' },
    coletado: { label: 'Coletado', color: 'bg-indigo-500/10 text-indigo-600' },
    em_transito: { label: 'Em Trânsito', color: 'bg-primary/10 text-primary' },
    em_entrega: { label: 'Entregando', color: 'bg-chart-1/10 text-chart-1' },
  };

  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              {filialAtiva ? `Filial: ${filialAtiva.nome}` : 'Gerencie sua frota e motoristas'}
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate('/transportadora/cargas')}>
            <Package className="w-4 h-4" />
            Ver Cargas Disponíveis
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Veículos Ativos"
              value={stats.veiculosAtivos}
              icon={<Truck className="w-5 h-5" />}
              color="primary"
              onClick={() => navigate('/transportadora/frota')}
            />
            <StatsCard
              title="Motoristas"
              value={stats.motoristasAtivos}
              icon={<Users className="w-5 h-5" />}
              color="chart1"
              onClick={() => navigate('/transportadora/motoristas')}
            />
            <StatsCard
              title="Entregas Ativas"
              value={stats.entregasEmAndamento}
              icon={<Route className="w-5 h-5" />}
              color="chart2"
              onClick={() => navigate('/transportadora/entregas')}
            />
            <StatsCard
              title="Aguardando Coleta"
              value={stats.aguardandoColeta}
              icon={<Clock className="w-5 h-5" />}
              color="chart4"
            />
          </div>
        )}

        {/* Active Deliveries */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entregas em Andamento</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate('/transportadora/entregas')}
            >
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : entregas.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">Nenhuma entrega ativa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aceite cargas disponíveis para começar
                </p>
                <Button onClick={() => navigate('/transportadora/cargas')}>
                  Ver Cargas Disponíveis
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {entregas.map((entrega: any) => {
                  const config = statusConfig[entrega.status] || { label: entrega.status, color: 'bg-muted' };
                  return (
                    <div
                      key={entrega.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {entrega.carga?.codigo || 'N/A'}
                            </p>
                            <Badge className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {entrega.motorista?.nome_completo} • {entrega.veiculo?.placa}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-foreground">
                          {entrega.carga?.endereco_origem?.cidade} → {entrega.carga?.endereco_destino?.cidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entrega.carga?.endereco_origem?.estado} → {entrega.carga?.endereco_destino?.estado}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2 hover:bg-primary/5 hover:border-primary/20"
            onClick={() => navigate('/transportadora/cargas')}
          >
            <Package className="w-6 h-6 text-primary" />
            <span className="text-sm">Cargas Disponíveis</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2 hover:bg-chart-1/5 hover:border-chart-1/20"
            onClick={() => navigate('/transportadora/frota')}
          >
            <Truck className="w-6 h-6 text-chart-1" />
            <span className="text-sm">Minha Frota</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2 hover:bg-chart-2/5 hover:border-chart-2/20"
            onClick={() => navigate('/transportadora/motoristas')}
          >
            <Users className="w-6 h-6 text-chart-2" />
            <span className="text-sm">Motoristas</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-2 hover:bg-chart-4/5 hover:border-chart-4/20"
            onClick={() => navigate('/transportadora/rastreamento')}
          >
            <MapPin className="w-6 h-6 text-chart-4" />
            <span className="text-sm">Rastreamento</span>
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
