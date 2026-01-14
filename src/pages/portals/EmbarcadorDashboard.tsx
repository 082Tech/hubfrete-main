import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  Loader2,
  DollarSign,
  MapPin
} from 'lucide-react';
import { NovaCargaDialog } from '@/components/cargas/NovaCargaDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';

const statusLabels: Record<string, { label: string; color: string }> = {
  'rascunho': { label: 'Rascunho', color: 'bg-muted text-muted-foreground border-border' },
  'publicada': { label: 'Publicada', color: 'bg-primary/10 text-primary border-primary/20' },
  'aceita': { label: 'Aceita', color: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
  'em_coleta': { label: 'Em Coleta', color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
  'em_transito': { label: 'Em Trânsito', color: 'bg-chart-1/10 text-chart-1 border-chart-1/20' },
  'entregue': { label: 'Entregue', color: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
  'cancelada': { label: 'Cancelada', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function EmbarcadorDashboard() {
  const { empresa, filialAtiva } = useUserContext();
  const navigate = useNavigate();

  // Fetch cargas with more details
  const { data: cargas = [], isLoading: loadingCargas } = useQuery({
    queryKey: ['dashboard_cargas', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      let query = supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          descricao,
          status,
          created_at,
          peso_kg,
          valor_mercadoria,
          enderecos_carga (
            tipo,
            cidade,
            estado
          )
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
          created_at,
          entregue_em,
          coletado_em,
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

    // Comparação com período anterior (últimos 30 dias vs 30 dias anteriores)
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
    };
  }, [cargas, entregas]);

  // Chart data: Cargas por status
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    cargas.forEach(c => {
      const status = c.status || 'rascunho';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status]?.label || status,
      value: count,
      status,
    }));
  }, [cargas]);

  // Chart data: Cargas nos últimos 7 dias
  const weeklyChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEE', { locale: ptBR });
      
      const cargasCount = cargas.filter(c => 
        format(parseISO(c.created_at), 'yyyy-MM-dd') === dateStr
      ).length;
      
      const entregasCount = entregas.filter(e => 
        e.entregue_em && format(parseISO(e.entregue_em), 'yyyy-MM-dd') === dateStr
      ).length;

      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        cargas: cargasCount,
        entregas: entregasCount,
      });
    }
    return days;
  }, [cargas, entregas]);

  // Get recent cargas (last 5)
  const recentCargas = useMemo(() => {
    return cargas.slice(0, 5).map(carga => {
      const destino = carga.enderecos_carga?.find((e: any) => e.tipo === 'destino');
      const origem = carga.enderecos_carga?.find((e: any) => e.tipo === 'origem');
      return {
        id: carga.codigo,
        destino: destino ? `${destino.cidade}, ${destino.estado}` : '-',
        origem: origem ? `${origem.cidade}, ${origem.estado}` : '-',
        status: carga.status || 'rascunho',
        data: format(parseISO(carga.created_at), 'dd/MM/yyyy'),
        peso: carga.peso_kg,
      };
    });
  }, [cargas]);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {filialAtiva ? `Filial: ${filialAtiva.nome}` : 'Visão geral da empresa'}
            </p>
          </div>
          <NovaCargaDialog />
        </div>

        {/* Main Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Secondary Stats */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-chart-2/10 rounded-xl">
                  <DollarSign className="w-5 h-5 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Valor em Cargas Ativas</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(stats.valorTotalMercadorias)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total de Cargas</p>
                  <p className="text-2xl font-bold text-foreground">{cargas.length}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/embarcador/cargas')}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Section */}
        {!isLoading && cargas.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Atividade Semanal</CardTitle>
                <CardDescription>Cargas criadas e entregas nos últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyChartData}>
                      <defs>
                        <linearGradient id="colorCargas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cargas" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorCargas)"
                        name="Cargas Criadas"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="entregas" 
                        stroke="hsl(var(--chart-2))" 
                        fillOpacity={1} 
                        fill="url(#colorEntregas)"
                        name="Entregas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                <CardDescription>Status atual das suas cargas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        formatter={(value: number) => [`${value} cargas`, 'Quantidade']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Section: Recent Items */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cargas Recentes</CardTitle>
              <CardDescription>Últimas cargas cadastradas</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => navigate('/embarcador/cargas')}
            >
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentCargas.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma carga cadastrada ainda</p>
                <p className="text-sm text-muted-foreground">Clique em "Nova Carga" para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentCargas.map((load) => {
                  const statusInfo = statusLabels[load.status] || statusLabels['rascunho'];
                  return (
                    <div 
                      key={load.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/embarcador/cargas')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{load.id}</p>
                          <Badge variant="outline" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="truncate">{load.origem}</span>
                          <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{load.destino}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-medium text-foreground">
                          {load.peso ? `${Number(load.peso).toLocaleString('pt-BR')} kg` : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">{load.data}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
