import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Package,
  DollarSign,
  Truck,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { format, subDays, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const statusLabels: Record<string, string> = {
  'rascunho': 'Rascunho',
  'publicada': 'Publicada',
  'aceita': 'Aceita',
  'em_coleta': 'Em Coleta',
  'em_transito': 'Em Trânsito',
  'entregue': 'Entregue',
  'cancelada': 'Cancelada',
};

export default function Relatorios() {
  const [periodo, setPeriodo] = useState('30dias');
  const { empresa, filialAtiva } = useUserContext();

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    switch (periodo) {
      case '7dias':
        start = subDays(now, 7);
        break;
      case '30dias':
        start = subDays(now, 30);
        break;
      case '90dias':
        start = subDays(now, 90);
        break;
      case 'ano':
        start = subMonths(now, 12);
        break;
      default:
        start = subDays(now, 30);
    }
    return { start, end: now };
  }, [periodo]);

  // Fetch cargas with all needed data
  const { data: cargas = [], isLoading: loadingCargas } = useQuery({
    queryKey: ['relatorios_cargas', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      let query = supabase
        .from('cargas')
        .select(`
          id,
          codigo,
          status,
          created_at,
          peso_kg,
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
    queryKey: ['relatorios_entregas', empresa?.id, filialAtiva?.id],
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

  const isLoading = loadingCargas || loadingEntregas;

  // Filter data by period
  const filteredCargas = useMemo(() => {
    return cargas.filter(c => {
      const createdAt = parseISO(c.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
  }, [cargas, dateRange]);

  const filteredEntregas = useMemo(() => {
    return entregas.filter(e => {
      const createdAt = parseISO(e.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
  }, [entregas, dateRange]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCargas = filteredCargas.length;
    const valorTotal = filteredCargas.reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0);
    const entregues = filteredEntregas.filter(e => e.status === 'entregue').length;
    const taxaPontualidade = filteredEntregas.length > 0 
      ? Math.round((entregues / filteredEntregas.length) * 100) 
      : 0;
    
    // Compare with previous period
    const prevStart = subDays(dateRange.start, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const prevCargas = cargas.filter(c => {
      const createdAt = parseISO(c.created_at);
      return createdAt >= prevStart && createdAt < dateRange.start;
    });
    const prevValor = prevCargas.reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0);
    
    const cargasChange = prevCargas.length > 0 
      ? Math.round(((totalCargas - prevCargas.length) / prevCargas.length) * 100)
      : totalCargas > 0 ? 100 : 0;
    
    const valorChange = prevValor > 0 
      ? Math.round(((valorTotal - prevValor) / prevValor) * 100)
      : valorTotal > 0 ? 100 : 0;

    return {
      totalCargas,
      cargasChange,
      valorTotal,
      valorChange,
      taxaPontualidade,
      entregues,
    };
  }, [filteredCargas, filteredEntregas, cargas, dateRange]);

  // Chart: Weekly/Daily activity
  const activityChartData = useMemo(() => {
    const days = [];
    const interval = periodo === '7dias' ? 7 : periodo === '30dias' ? 30 : periodo === '90dias' ? 90 : 365;
    
    for (let i = Math.min(interval - 1, 30); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, periodo === '7dias' ? 'EEE' : 'dd/MM', { locale: ptBR });
      
      const cargasCount = filteredCargas.filter(c => 
        format(parseISO(c.created_at), 'yyyy-MM-dd') === dateStr
      ).length;
      
      const entregasCount = filteredEntregas.filter(e => 
        e.entregue_em && format(parseISO(e.entregue_em), 'yyyy-MM-dd') === dateStr
      ).length;

      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        cargas: cargasCount,
        entregas: entregasCount,
      });
    }
    return days;
  }, [filteredCargas, filteredEntregas, periodo]);

  // Chart: Status distribution
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredCargas.forEach(c => {
      const status = c.status || 'rascunho';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
  }, [filteredCargas]);

  // Chart: Monthly value trend
  const monthlyValueData = useMemo(() => {
    const months: Record<string, number> = {};
    
    cargas.forEach(c => {
      const month = format(parseISO(c.created_at), 'MMM', { locale: ptBR });
      months[month] = (months[month] || 0) + (Number(c.valor_mercadoria) || 0);
    });

    return Object.entries(months).slice(-7).map(([mes, valor]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      valor,
    }));
  }, [cargas]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Analise o desempenho das suas operações</p>
          </div>
          <div className="flex gap-3">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                <SelectItem value="ano">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Cargas</p>
                      <p className="text-2xl font-bold text-foreground">{kpis.totalCargas}</p>
                    </div>
                    <div className={`flex items-center text-sm ${kpis.cargasChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.cargasChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {kpis.cargasChange >= 0 ? '+' : ''}{kpis.cargasChange}%
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(kpis.valorTotal)}</p>
                    </div>
                    <div className={`flex items-center text-sm ${kpis.valorChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.valorChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {kpis.valorChange >= 0 ? '+' : ''}{kpis.valorChange}%
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
                      <p className="text-2xl font-bold text-foreground">{kpis.taxaPontualidade}%</p>
                    </div>
                    <div className="p-2 bg-chart-2/10 rounded-lg">
                      <Truck className="w-4 h-4 text-chart-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Entregas Concluídas</p>
                      <p className="text-2xl font-bold text-foreground">{kpis.entregues}</p>
                    </div>
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <Package className="w-4 h-4 text-chart-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Atividade</CardTitle>
                  <CardDescription>Cargas criadas e entregas no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityChartData}>
                        <defs>
                          <linearGradient id="colorCargasR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorEntregasR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
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
                          fill="url(#colorCargasR)"
                          name="Cargas"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="entregas" 
                          stroke="hsl(var(--chart-2))" 
                          fillOpacity={1} 
                          fill="url(#colorEntregasR)"
                          name="Entregas"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Distribuição por Status
                  </CardTitle>
                  <CardDescription>Status das cargas no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] flex items-center justify-center">
                    {statusChartData.length > 0 ? (
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
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground">Sem dados no período</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {statusChartData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
                        />
                        <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Value Trend */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Valor Movimentado por Mês
                </CardTitle>
                <CardDescription>Evolução do valor das cargas ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {monthlyValueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyValueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="mes" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          formatter={(value: number) => [
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 
                            'Valor'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="valor" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--chart-1))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Sem dados disponíveis</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PortalLayout>
  );
}