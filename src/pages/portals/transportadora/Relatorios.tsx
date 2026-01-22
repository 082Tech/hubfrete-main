
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
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Weight,
  Target,
  Activity,
  Users
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
  Area,
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from 'recharts';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { format, subDays, parseISO, subMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const statusLabels: Record<string, string> = {
  'aguardando_coleta': 'Aguardando Coleta',
  'em_coleta': 'Em Coleta',
  'coletado': 'Coletado',
  'em_transito': 'Em Trânsito',
  'em_entrega': 'Em Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
  'devolvida': 'Devolvida',
};

const tipoCargaLabels: Record<string, string> = {
  'granel_solido': 'Granel Sólido',
  'granel_liquido': 'Granel Líquido',
  'carga_seca': 'Carga Seca',
  'refrigerada': 'Refrigerada',
  'congelada': 'Congelada',
  'perigosa': 'Perigosa',
  'viva': 'Viva',
  'indivisivel': 'Indivisível',
  'container': 'Container',
};

export default function TransportadoraRelatorios() {
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

  // Fetch veiculos
  const { data: veiculos = [], isLoading: loadingVeiculos } = useQuery({
    queryKey: ['relatorios_veiculos', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, tipo, ativo, motorista_id')
        .eq('empresa_id', empresa.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id,
  });

  // Fetch motoristas
  const { data: motoristas = [], isLoading: loadingMotoristas } = useQuery({
    queryKey: ['relatorios_motoristas', empresa?.id],
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

  // Fetch entregas with carga data
  const { data: entregas = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ['relatorios_entregas_transportadora', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          id,
          status,
          created_at,
          entregue_em,
          coletado_em,
          valor_frete,
          peso_alocado_kg,
          motorista_id,
          veiculo_id,
          cargas (
            id,
            tipo,
            peso_kg,
            valor_mercadoria
          )
        `)
        .in('veiculo_id', veiculos.map(v => v.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id && veiculos.length > 0,
  });

  const isLoading = loadingVeiculos || loadingMotoristas || loadingEntregas;

  // Filter data by period
  const filteredEntregas = useMemo(() => {
    return entregas.filter(e => {
      const createdAt = parseISO(e.created_at);
      return createdAt >= dateRange.start && createdAt <= dateRange.end;
    });
  }, [entregas, dateRange]);

  // KPIs
  const kpis = useMemo(() => {
    const totalEntregas = filteredEntregas.length;
    const freteTotal = filteredEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0);
    const pesoTotal = filteredEntregas.reduce((acc, e) => acc + (Number(e.peso_alocado_kg) || 0), 0);
    
    const entregues = filteredEntregas.filter(e => e.status === 'entregue').length;
    const emTransito = filteredEntregas.filter(e => e.status === 'em_transito').length;
    const aguardandoColeta = filteredEntregas.filter(e => 
      e.status === 'aguardando_coleta' || e.status === 'em_coleta'
    ).length;
    const problemas = filteredEntregas.filter(e => e.status === 'problema').length;
    
    const taxaConclusao = totalEntregas > 0 
      ? Math.round((entregues / totalEntregas) * 100) 
      : 0;
    
    const veiculosAtivos = veiculos.filter(v => v.ativo).length;
    const motoristasAtivos = motoristas.filter(m => m.ativo).length;
    
    // Compare with previous period
    const periodDays = differenceInDays(dateRange.end, dateRange.start);
    const prevStart = subDays(dateRange.start, periodDays);
    const prevEntregas = entregas.filter(e => {
      const createdAt = parseISO(e.created_at);
      return createdAt >= prevStart && createdAt < dateRange.start;
    });
    const prevFrete = prevEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0);
    
    const entregasChange = prevEntregas.length > 0 
      ? Math.round(((totalEntregas - prevEntregas.length) / prevEntregas.length) * 100)
      : totalEntregas > 0 ? 100 : 0;
    
    const freteChange = prevFrete > 0 
      ? Math.round(((freteTotal - prevFrete) / prevFrete) * 100)
      : freteTotal > 0 ? 100 : 0;

    // Average per day
    const mediaEntregasDia = totalEntregas / Math.max(periodDays, 1);
    const mediaFreteDia = freteTotal / Math.max(periodDays, 1);

    return {
      totalEntregas,
      entregasChange,
      freteTotal,
      freteChange,
      pesoTotal,
      taxaConclusao,
      entregues,
      emTransito,
      aguardandoColeta,
      problemas,
      veiculosAtivos,
      veiculosTotal: veiculos.length,
      motoristasAtivos,
      motoristasTotal: motoristas.length,
      mediaEntregasDia,
      mediaFreteDia,
    };
  }, [filteredEntregas, entregas, veiculos, motoristas, dateRange]);

  // Chart: Daily/Weekly activity
  const activityChartData = useMemo(() => {
    const days = [];
    const interval = periodo === '7dias' ? 7 : periodo === '30dias' ? 30 : periodo === '90dias' ? 14 : 12;
    const step = periodo === '90dias' ? 6 : periodo === 'ano' ? 30 : 1;
    
    for (let i = interval - 1; i >= 0; i--) {
      const date = subDays(new Date(), i * step);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, periodo === '7dias' ? 'EEE' : 'dd/MM', { locale: ptBR });
      
      const coletasCount = filteredEntregas.filter(e => {
        if (!e.coletado_em) return false;
        const coletaDate = format(parseISO(e.coletado_em), 'yyyy-MM-dd');
        if (step === 1) return coletaDate === dateStr;
        const startDate = subDays(date, step);
        const coletaParsed = parseISO(e.coletado_em);
        return coletaParsed >= startDate && coletaParsed <= date;
      }).length;
      
      const entregasCount = filteredEntregas.filter(e => {
        if (!e.entregue_em) return false;
        const entregaDate = format(parseISO(e.entregue_em), 'yyyy-MM-dd');
        if (step === 1) return entregaDate === dateStr;
        const startDate = subDays(date, step);
        const entregaParsed = parseISO(e.entregue_em);
        return entregaParsed >= startDate && entregaParsed <= date;
      }).length;

      days.push({
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        coletas: coletasCount,
        entregas: entregasCount,
      });
    }
    return days;
  }, [filteredEntregas, periodo]);

  // Chart: Status distribution
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredEntregas.forEach(e => {
      const status = e.status || 'aguardando_coleta';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
  }, [filteredEntregas]);

  // Chart: Tipo de carga distribution
  const tipoCargaData = useMemo(() => {
    const tipoCounts: Record<string, number> = {};
    filteredEntregas.forEach(e => {
      const tipo = (e.cargas as any)?.tipo || 'carga_seca';
      tipoCounts[tipo] = (tipoCounts[tipo] || 0) + 1;
    });

    return Object.entries(tipoCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tipo, count]) => ({
        name: tipoCargaLabels[tipo] || tipo,
        value: count,
      }));
  }, [filteredEntregas]);

  // Chart: Monthly frete trend
  const monthlyFreteData = useMemo(() => {
    const months: Record<string, { frete: number; entregas: number; peso: number }> = {};
    
    entregas.forEach(e => {
      const month = format(parseISO(e.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { frete: 0, entregas: 0, peso: 0 };
      months[month].frete += Number(e.valor_frete) || 0;
      months[month].entregas += 1;
      months[month].peso += Number(e.peso_alocado_kg) || 0;
    });

    return Object.entries(months).slice(-7).map(([mes, data]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      frete: data.frete,
      entregas: data.entregas,
      peso: data.peso,
    }));
  }, [entregas]);

  // Delivery status for radial chart
  const deliveryStatusData = useMemo(() => {
    const total = filteredEntregas.length;
    if (total === 0) return [];
    
    return [
      { name: 'Entregues', value: kpis.entregues, fill: 'hsl(var(--chart-2))' },
      { name: 'Em Trânsito', value: kpis.emTransito, fill: 'hsl(var(--chart-1))' },
      { name: 'Aguardando', value: kpis.aguardandoColeta, fill: 'hsl(var(--chart-4))' },
      { name: 'Problemas', value: kpis.problemas, fill: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0);
  }, [filteredEntregas, kpis]);

  // Weekly comparison
  const weeklyComparisonData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      const weekLabel = `Sem ${4 - i}`;
      
      const weekEntregas = entregas.filter(e => {
        const date = parseISO(e.created_at);
        return date >= weekStart && date < weekEnd;
      });
      
      const weekEntregues = weekEntregas.filter(e => e.status === 'entregue');

      weeks.push({
        semana: weekLabel,
        total: weekEntregas.length,
        entregues: weekEntregues.length,
        frete: weekEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0),
      });
    }
    return weeks;
  }, [entregas]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const formatWeight = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}t`;
    }
    return `${value.toFixed(0)}kg`;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Analise o desempenho das suas operações de transporte</p>
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
            {/* Main KPIs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Entregas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{kpis.totalEntregas}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{kpis.mediaEntregasDia.toFixed(1)}/dia
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className={`flex items-center text-xs ${kpis.entregasChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpis.entregasChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {kpis.entregasChange >= 0 ? '+' : ''}{kpis.entregasChange}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-gradient-to-br from-chart-2/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Frete Total</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(kpis.freteTotal)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{formatCurrency(kpis.mediaFreteDia)}/dia
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="p-2 bg-chart-2/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-chart-2" />
                      </div>
                      <div className={`flex items-center text-xs ${kpis.freteChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpis.freteChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {kpis.freteChange >= 0 ? '+' : ''}{kpis.freteChange}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Peso Transportado</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{formatWeight(kpis.pesoTotal)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        no período
                      </p>
                    </div>
                    <div className="p-2 bg-chart-4/10 rounded-lg">
                      <Weight className="w-5 h-5 text-chart-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{kpis.taxaConclusao}%</p>
                      <Progress value={kpis.taxaConclusao} className="h-1.5 mt-2 w-24" />
                    </div>
                    <div className="p-2 bg-chart-3/10 rounded-lg">
                      <Target className="w-5 h-5 text-chart-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fleet & Drivers Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpis.veiculosAtivos}/{kpis.veiculosTotal}</p>
                      <p className="text-xs text-muted-foreground">Veículos Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-chart-2/10 rounded-lg">
                      <Users className="w-5 h-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpis.motoristasAtivos}/{kpis.motoristasTotal}</p>
                      <p className="text-xs text-muted-foreground">Motoristas Ativos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <MapPin className="w-5 h-5 text-chart-1" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpis.emTransito}</p>
                      <p className="text-xs text-muted-foreground">Em Trânsito</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpis.problemas}</p>
                      <p className="text-xs text-muted-foreground">Com Problemas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Atividade de Coletas e Entregas
                  </CardTitle>
                  <CardDescription>Coletas e entregas realizadas por dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={activityChartData}>
                      <defs>
                        <linearGradient id="colorColetas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="coletas" 
                        name="Coletas"
                        stroke="hsl(var(--chart-1))" 
                        fillOpacity={1} 
                        fill="url(#colorColetas)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="entregas" 
                        name="Entregas"
                        stroke="hsl(var(--chart-2))" 
                        fillOpacity={1} 
                        fill="url(#colorEntregas)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Status das Entregas
                  </CardTitle>
                  <CardDescription>Distribuição por status atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {statusChartData.map((_, index) => (
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
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Monthly Frete Trend */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Evolução do Frete
                  </CardTitle>
                  <CardDescription>Frete acumulado por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthlyFreteData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 11 }} 
                        className="text-muted-foreground"
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }} 
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'frete') return [formatCurrency(value), 'Frete'];
                          return [value, name === 'entregas' ? 'Entregas' : name];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="frete" name="Frete" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tipo de Carga */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Tipos de Carga Transportados
                  </CardTitle>
                  <CardDescription>Distribuição por tipo de carga</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tipoCargaData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" name="Quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Comparison */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Comparativo Semanal
                </CardTitle>
                <CardDescription>Performance das últimas 4 semanas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Total Entregas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="entregues" name="Concluídas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
