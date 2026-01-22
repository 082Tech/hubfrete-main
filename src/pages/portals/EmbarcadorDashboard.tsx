// Layout is now handled by PortalLayoutWrapper in App.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  DollarSign,
  MapPin,
  MessageCircle,
  BarChart3,
  Sparkles,
  Send,
  ExternalLink,
  Shield,
  Settings
} from 'lucide-react';
import adSeguroTransporte from '@/assets/ad-seguro-transporte.jpg';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Input } from '@/components/ui/input';
import { startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { useMemo, useState } from 'react';

export default function EmbarcadorDashboard() {
  const { empresa, filialAtiva } = useUserContext();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chatMessage, setChatMessage] = useState('');

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

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      navigate('/embarcador/assistente');
    }
  };

  return (
    <div className="p-4 md:p-8">
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
              <DashboardSkeleton />
            ) : (
              <>
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

              {/* Summary Cards */}
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
            </>
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
                    <Settings className="w-5 h-5 text-chart-4" />
                    <span className="text-xs">Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Assistant Card */}
          <div className="lg:col-span-1">
            <Card className="border-border h-full min-h-[400px] flex flex-col bg-gradient-to-br from-accent/30 to-transparent">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-primary rounded-lg">
                      <MessageCircle className="w-4 h-4 text-primary-foreground" />
                    </div>
                    Assistente HubFrete
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/embarcador/assistente')}
                    className="h-8 w-8"
                    title="Abrir em tela cheia"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Converse sobre suas cargas e operações
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4">
                {/* Chat Messages Area */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Sou o Assistente HubFrete
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Converse comigo sobre suas cargas, entregas e muito mais!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                      "Status das minhas cargas"
                    </span>
                    <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                      "Criar nova carga"
                    </span>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  🚧 Em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Advertisement Banner */}
        <Card className="overflow-hidden border-border hover:shadow-lg transition-all cursor-pointer group">
          <a href="https://www.itau.com.br/seguros" target="_blank" rel="noopener noreferrer">
            <div className="relative">
              <img 
                src={adSeguroTransporte} 
                alt="Seguro de Transporte de Cargas" 
                className="w-full h-32 sm:h-40 md:h-[400px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
                <div className="p-6 text-white max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-chart-2" />
                    <span className="text-xs font-medium uppercase tracking-wide text-chart-2">Patrocinado</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-1">Seguro de Carga Itaú</h3>
                  <p className="text-sm text-white/80 hidden sm:block">
                    Proteja suas mercadorias com o melhor seguro do mercado. Cobertura completa para todo tipo de transporte.
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-chart-2 hover:bg-chart-2/90 text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Saiba mais
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}