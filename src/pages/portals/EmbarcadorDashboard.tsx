import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  Loader2,
  DollarSign,
  MapPin,
  MessageCircle,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { useMemo } from 'react';

export default function EmbarcadorDashboard() {
  const { empresa, filialAtiva } = useUserContext();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = profile?.nome_completo?.split(' ')[0] || 'Usuário';

  // Fetch cargas
  const { data: cargas = [], isLoading: loadingCargas } = useQuery({
    queryKey: ['dashboard_cargas', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      let query = supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          status,
          created_at,
          valor_mercadoria
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false });

      if (filialAtiva?.id) {
        query = query.eq('filial_id', filialAtiva.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch entregas
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ['dashboard_entregas', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      let query = supabase
        .from('entregas')
        .select(`
          id,
          status,
          entregue_em,
          cargas!inner (
            empresa_id,
            filial_id
          )
        `)
        .eq('cargas.empresa_id', empresa.id);

      if (filialAtiva?.id) {
        query = query.eq('cargas.filial_id', filialAtiva.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const activeCargas = cargas.filter(c => 
      c.status && !['entregue', 'cancelada'].includes(c.status)
    ).length;
    
    const emTransito = entregas.filter(e => e.status === 'em_transito').length;
    const aguardandoColeta = entregas.filter(e => 
      e.status === 'aguardando_coleta' || e.status === 'em_coleta'
    ).length;
    
    // Entregas do mês atual
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const entreguesMes = entregas.filter(e => {
      if (e.status !== 'entregue' || !e.entregue_em) return false;
      const entregueDate = parseISO(e.entregue_em);
      return entregueDate >= monthStart && entregueDate <= monthEnd;
    }).length;

    // Valor total de mercadorias ativas
    const valorTotalMercadorias = cargas
      .filter(c => c.status && !['entregue', 'cancelada'].includes(c.status))
      .reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0);

    // Comparação com período anterior
    const last30Days = subDays(now, 30);
    const prev30Days = subDays(now, 60);
    
    const cargasLast30 = cargas.filter(c => parseISO(c.created_at) >= last30Days).length;
    const cargasPrev30 = cargas.filter(c => {
      const date = parseISO(c.created_at);
      return date >= prev30Days && date < last30Days;
    }).length;
    
    const changePercent = cargasPrev30 > 0 
      ? Math.round(((cargasLast30 - cargasPrev30) / cargasPrev30) * 100)
      : cargasLast30 > 0 ? 100 : 0;

    return {
      activeCargas,
      emTransito,
      aguardandoColeta,
      entreguesMes,
      valorTotalMercadorias,
      changePercent,
      totalCargas: cargas.length,
    };
  }, [cargas, entregas]);

  const isLoading = loadingCargas || loadingEntregas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              {filialAtiva ? `Filial: ${filialAtiva.nome}` : 'Visão geral da sua operação'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/embarcador/relatorios')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </Button>
            <NovaCargaDialog />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Cargas Ativas"
                  value={stats.activeCargas}
                  change={stats.changePercent}
                  changeLabel="vs. mês anterior"
                  icon={<Package className="w-5 h-5" />}
                  color="primary"
                />
                <StatsCard
                  title="Em Trânsito"
                  value={stats.emTransito}
                  icon={<Truck className="w-5 h-5" />}
                  color="chart1"
                />
                <StatsCard
                  title="Aguardando Coleta"
                  value={stats.aguardandoColeta}
                  icon={<Clock className="w-5 h-5" />}
                  color="chart4"
                />
                <StatsCard
                  title="Entregues (mês)"
                  value={stats.entreguesMes}
                  icon={<CheckCircle className="w-5 h-5" />}
                  color="chart2"
                />
              </div>
            )}

            {/* Summary Cards */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/embarcador/cargas')}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total de Cargas</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalCargas}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-chart-2/10 rounded-xl">
                      <DollarSign className="w-6 h-6 text-chart-2" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Valor em Cargas Ativas</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(stats.valorTotalMercadorias)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/20"
                    onClick={() => navigate('/embarcador/cargas')}
                  >
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-xs">Ver Cargas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-1/5 hover:border-chart-1/20"
                    onClick={() => navigate('/embarcador/relatorios')}
                  >
                    <BarChart3 className="w-5 h-5 text-chart-1" />
                    <span className="text-xs">Relatórios</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-2/5 hover:border-chart-2/20"
                    onClick={() => navigate('/embarcador/filiais')}
                  >
                    <MapPin className="w-5 h-5 text-chart-2" />
                    <span className="text-xs">Filiais</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex-col gap-2 hover:bg-chart-4/5 hover:border-chart-4/20"
                    onClick={() => navigate('/embarcador/configuracoes')}
                  >
                    <Truck className="w-5 h-5 text-chart-4" />
                    <span className="text-xs">Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Assistant Card */}
          <div className="lg:col-span-1">
            <Card 
              className="border-border h-full min-h-[300px] flex flex-col bg-gradient-to-br from-accent/30 to-transparent cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/embarcador/assistente')}
            >
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-primary rounded-lg">
                    <MessageCircle className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Assistente HubFrete
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Converse sobre suas cargas e operações
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Olá! Sou o Mau Saya
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique para conversar sobre suas cargas, entregas e muito mais!
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    "Status das minhas cargas"
                  </span>
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    "Criar nova carga"
                  </span>
                </div>
                <Button variant="outline" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Iniciar conversa
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}