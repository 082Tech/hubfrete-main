import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { AccessChart, EntregasStatusChart, GrowthChart } from '@/components/admin/charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  Building2, 
  Truck,
  User,
  Package,
  UserPlus,
  ArrowRight,
  MapPin,
  Loader2,
  RefreshCw,
  Calendar,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Stats = {
  empresasEmbarcador: number;
  empresasTransportadora: number;
  motoristas: number;
  cargasPublicadas: number;
  entregasEmAndamento: number;
  entregasConcluidas: number;
  preCadastrosPendentes: number;
  totalUsuarios: number;
  entregasHoje: number;
  volumeFreteTotal: number;
};

type EntregasStatus = {
  aguardando: number;
  emRota: number;
  entregue: number;
  problema: number;
  cancelada: number;
};

type AccessData = {
  date: string;
  acessos: number;
};

type GrowthData = {
  month: string;
  embarcadores: number;
  transportadoras: number;
  motoristas: number;
};

export default function TorreControle() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [entregasStatus, setEntregasStatus] = useState<EntregasStatus | null>(null);
  const [accessData, setAccessData] = useState<AccessData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchEntregasStatus(),
      fetchAccessData(),
      fetchGrowthData(),
    ]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  const fetchStats = async () => {
    try {
      const [
        empresasRes,
        motoristasRes,
        cargasRes,
        entregasRes,
        preCadastrosRes,
        usuariosRes,
        entregasHojeRes,
      ] = await Promise.all([
        supabase.from('empresas').select('tipo', { count: 'exact' }),
        supabase.from('motoristas').select('id', { count: 'exact' }),
        supabase.from('cargas').select('status', { count: 'exact' }).eq('status', 'publicada'),
        supabase.from('entregas').select('status, valor_frete'),
        supabase.from('pre_cadastros').select('id', { count: 'exact' }).eq('status', 'pendente'),
        supabase.from('usuarios').select('id', { count: 'exact' }),
        supabase.from('entregas').select('id', { count: 'exact' }).gte('created_at', format(new Date(), 'yyyy-MM-dd')),
      ]);

      const empresas = empresasRes.data || [];
      const entregas = entregasRes.data || [];

      const volumeFrete = entregas.reduce((sum, e) => sum + (e.valor_frete || 0), 0);

      setStats({
        empresasEmbarcador: empresas.filter(e => e.tipo === 'EMBARCADOR').length,
        empresasTransportadora: empresas.filter(e => e.tipo === 'TRANSPORTADORA').length,
        motoristas: motoristasRes.count || 0,
        cargasPublicadas: cargasRes.count || 0,
        entregasEmAndamento: entregas.filter(e => ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'].includes(e.status || '')).length,
        entregasConcluidas: entregas.filter(e => e.status === 'entregue').length,
        preCadastrosPendentes: preCadastrosRes.count || 0,
        totalUsuarios: usuariosRes.count || 0,
        entregasHoje: entregasHojeRes.count || 0,
        volumeFreteTotal: volumeFrete,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchEntregasStatus = async () => {
    try {
      const { data } = await supabase.from('entregas').select('status');
      
      const statusCount: EntregasStatus = {
        aguardando: 0,
        emRota: 0,
        entregue: 0,
        problema: 0,
        cancelada: 0,
      };

      (data || []).forEach(e => {
        if (e.status === 'aguardando') statusCount.aguardando++;
        else if (e.status === 'saiu_para_coleta' || e.status === 'saiu_para_entrega') statusCount.emRota++;
        else if (e.status === 'entregue') statusCount.entregue++;
        else if (e.status === 'problema') statusCount.problema++;
        else if (e.status === 'cancelada') statusCount.cancelada++;
      });

      setEntregasStatus(statusCount);
    } catch (error) {
      console.error('Erro ao buscar status entregas:', error);
    }
  };

  const fetchAccessData = async () => {
    // Simulate access data - in real app would come from analytics
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    const mockData: AccessData[] = days.map(day => ({
      date: format(day, 'dd/MM', { locale: ptBR }),
      acessos: Math.floor(Math.random() * 150) + 50,
    }));

    setAccessData(mockData);
  };

  const fetchGrowthData = async () => {
    // Get last 6 months
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    try {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('tipo, created_at');
      
      const { data: motoristas } = await supabase
        .from('motoristas')
        .select('created_at');

      const growthByMonth: GrowthData[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const embCount = (empresas || []).filter(e => {
          const created = new Date(e.created_at);
          return e.tipo === 'EMBARCADOR' && created >= monthStart && created <= monthEnd;
        }).length;

        const transCount = (empresas || []).filter(e => {
          const created = new Date(e.created_at);
          return e.tipo === 'TRANSPORTADORA' && created >= monthStart && created <= monthEnd;
        }).length;

        const motCount = (motoristas || []).filter(m => {
          const created = new Date(m.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;

        return {
          month: format(month, 'MMM', { locale: ptBR }),
          embarcadores: embCount,
          transportadoras: transCount,
          motoristas: motCount,
        };
      });

      setGrowthData(growthByMonth);
    } catch (error) {
      console.error('Erro ao buscar dados de crescimento:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-destructive" />
              Torre de Controle
            </h1>
            <p className="text-muted-foreground">
              Visão geral da plataforma • Atualizado às {format(new Date(), 'HH:mm', { locale: ptBR })}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="operations">Operações</TabsTrigger>
              <TabsTrigger value="growth">Crescimento</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Pendências Alert */}
              {stats && stats.preCadastrosPendentes > 0 && (
                <Card className="border-chart-4/50 bg-chart-4/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-chart-4/10 rounded-lg">
                        <Clock className="w-5 h-5 text-chart-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {stats.preCadastrosPendentes} pré-cadastro{stats.preCadastrosPendentes > 1 ? 's' : ''} pendente{stats.preCadastrosPendentes > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">Aguardando análise e aprovação</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/admin/pre-cadastros')}>
                      Analisar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <StatCard
                  title="Embarcadores"
                  value={stats?.empresasEmbarcador || 0}
                  icon={Package}
                  iconClassName="bg-chart-1/10 text-chart-1"
                />
                <StatCard
                  title="Transportadoras"
                  value={stats?.empresasTransportadora || 0}
                  icon={Building2}
                  iconClassName="bg-chart-2/10 text-chart-2"
                />
                <StatCard
                  title="Motoristas"
                  value={stats?.motoristas || 0}
                  icon={User}
                  iconClassName="bg-chart-3/10 text-chart-3"
                />
                <StatCard
                  title="Usuários Totais"
                  value={stats?.totalUsuarios || 0}
                  icon={Users}
                  iconClassName="bg-chart-4/10 text-chart-4"
                />
                <StatCard
                  title="Volume de Frete"
                  value={formatCurrency(stats?.volumeFreteTotal || 0)}
                  icon={DollarSign}
                  iconClassName="bg-chart-1/10 text-chart-1"
                />
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                <AccessChart data={accessData} />
                {entregasStatus && <EntregasStatusChart data={entregasStatus} />}
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card 
                  className="border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate('/admin/pre-cadastros')}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <UserPlus className="w-6 h-6 text-primary" />
                      </div>
                      {stats?.preCadastrosPendentes !== undefined && stats.preCadastrosPendentes > 0 && (
                        <Badge className="bg-chart-4/10 text-chart-4">
                          {stats.preCadastrosPendentes} pendentes
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-4">Pré-Cadastros</CardTitle>
                    <p className="text-sm text-muted-foreground">Aprovar solicitações de acesso</p>
                  </CardHeader>
                </Card>

                <Card 
                  className="border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate('/admin/usuarios')}
                >
                  <CardHeader className="pb-2">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg mt-4">Usuários Admin</CardTitle>
                    <p className="text-sm text-muted-foreground">Gerenciar equipe administrativa</p>
                  </CardHeader>
                </Card>

                <Card 
                  className="border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate('/admin/monitoramento')}
                >
                  <CardHeader className="pb-2">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg mt-4">Monitoramento</CardTitle>
                    <p className="text-sm text-muted-foreground">Rastreamento em tempo real</p>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Operations Tab */}
            <TabsContent value="operations" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Cargas Publicadas"
                  value={stats?.cargasPublicadas || 0}
                  icon={MapPin}
                  iconClassName="bg-primary/10 text-primary"
                />
                <StatCard
                  title="Em Andamento"
                  value={stats?.entregasEmAndamento || 0}
                  icon={Truck}
                  iconClassName="bg-chart-2/10 text-chart-2"
                />
                <StatCard
                  title="Concluídas"
                  value={stats?.entregasConcluidas || 0}
                  icon={CheckCircle}
                  iconClassName="bg-chart-1/10 text-chart-1"
                />
                <StatCard
                  title="Entregas Hoje"
                  value={stats?.entregasHoje || 0}
                  icon={Calendar}
                  iconClassName="bg-chart-3/10 text-chart-3"
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {entregasStatus && <EntregasStatusChart data={entregasStatus} />}
                
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Atividade Recente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 bg-chart-1/10 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-chart-1" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Entrega concluída</p>
                          <p className="text-xs text-muted-foreground">há 5 minutos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 bg-chart-2/10 rounded-lg">
                          <Package className="w-4 h-4 text-chart-2" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Nova carga publicada</p>
                          <p className="text-xs text-muted-foreground">há 12 minutos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 bg-chart-3/10 rounded-lg">
                          <User className="w-4 h-4 text-chart-3" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Novo motorista cadastrado</p>
                          <p className="text-xs text-muted-foreground">há 28 minutos</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Growth Tab */}
            <TabsContent value="growth" className="space-y-6">
              <GrowthChart data={growthData} />
              
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-chart-1" />
                      <CardTitle className="text-base">Crescimento Embarcadores</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.empresasEmbarcador || 0}</p>
                    <p className="text-sm text-muted-foreground">empresas ativas</p>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-chart-2" />
                      <CardTitle className="text-base">Crescimento Transportadoras</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.empresasTransportadora || 0}</p>
                    <p className="text-sm text-muted-foreground">empresas ativas</p>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-chart-3" />
                      <CardTitle className="text-base">Crescimento Motoristas</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats?.motoristas || 0}</p>
                    <p className="text-sm text-muted-foreground">motoristas cadastrados</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
