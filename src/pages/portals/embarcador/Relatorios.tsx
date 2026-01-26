// Layout is now handled by PortalLayoutWrapper in App.tsx
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
  Activity
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
  'rascunho': 'Rascunho',
  'publicada': 'Publicada',
  'aceita': 'Aceita',
  'em_coleta': 'Em Coleta',
  'em_transito': 'Em Trânsito',
  'entregue': 'Entregue',
  'cancelada': 'Cancelada',
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
          tipo,
          created_at,
          peso_kg,
          volume_m3,
          valor_mercadoria,
          data_coleta_de,
          data_entrega_limite
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

  // Fetch entregas with valor_frete
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
          valor_frete,
          peso_alocado_kg,
          cargas!inner (
            empresa_id,
            filial_id,
            endereco_destino_id
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

  // Fetch endereços de destino para Top Rotas
  const { data: enderecosDestino = [] } = useQuery({
    queryKey: ['relatorios_enderecos_destino', empresa?.id, filialAtiva?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      // Get cargas IDs first
      const cargaIds = cargas.map(c => c.id);
      if (cargaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('enderecos_carga')
        .select('id, cidade, estado, carga_id')
        .eq('tipo', 'destino')
        .in('carga_id', cargaIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id && cargas.length > 0,
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
    const valorMercadoriaTotal = filteredCargas.reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0);
    const pesoTotal = filteredCargas.reduce((acc, c) => acc + (Number(c.peso_kg) || 0), 0);
    const volumeTotal = filteredCargas.reduce((acc, c) => acc + (Number(c.volume_m3) || 0), 0);
    
    // Frete total das entregas
    const freteTotal = filteredEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0);
    const entregasComFrete = filteredEntregas.filter(e => Number(e.valor_frete) > 0).length;
    const ticketMedio = entregasComFrete > 0 ? freteTotal / entregasComFrete : 0;
    
    // Custo do frete em relação ao valor da mercadoria
    const custoFretePercentual = valorMercadoriaTotal > 0 
      ? (freteTotal / valorMercadoriaTotal) * 100 
      : 0;
    
    const entregues = filteredEntregas.filter(e => e.status === 'entregue').length;
    const emTransito = filteredEntregas.filter(e => e.status === 'em_transito').length;
    const aguardandoColeta = filteredEntregas.filter(e => 
      e.status === 'aguardando_coleta' || e.status === 'em_coleta'
    ).length;
    const problemas = filteredEntregas.filter(e => e.status === 'problema').length;
    
    const taxaConclusao = filteredEntregas.length > 0 
      ? Math.round((entregues / filteredEntregas.length) * 100) 
      : 0;
    
    // Compare with previous period
    const periodDays = differenceInDays(dateRange.end, dateRange.start);
    const prevStart = subDays(dateRange.start, periodDays);
    const prevCargas = cargas.filter(c => {
      const createdAt = parseISO(c.created_at);
      return createdAt >= prevStart && createdAt < dateRange.start;
    });
    const prevValor = prevCargas.reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0);
    
    const prevEntregas = entregas.filter(e => {
      const createdAt = parseISO(e.created_at);
      return createdAt >= prevStart && createdAt < dateRange.start;
    });
    const prevFrete = prevEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0);
    
    const cargasChange = prevCargas.length > 0 
      ? Math.round(((totalCargas - prevCargas.length) / prevCargas.length) * 100)
      : totalCargas > 0 ? 100 : 0;
    
    const valorChange = prevValor > 0 
      ? Math.round(((valorMercadoriaTotal - prevValor) / prevValor) * 100)
      : valorMercadoriaTotal > 0 ? 100 : 0;

    const freteChange = prevFrete > 0 
      ? Math.round(((freteTotal - prevFrete) / prevFrete) * 100)
      : freteTotal > 0 ? 100 : 0;

    // Average per day
    const mediaCargasDia = totalCargas / Math.max(periodDays, 1);
    const mediaValorDia = valorMercadoriaTotal / Math.max(periodDays, 1);
    const mediaFreteDia = freteTotal / Math.max(periodDays, 1);

    return {
      totalCargas,
      cargasChange,
      valorMercadoriaTotal,
      valorChange,
      freteTotal,
      freteChange,
      ticketMedio,
      custoFretePercentual,
      pesoTotal,
      volumeTotal,
      taxaConclusao,
      entregues,
      emTransito,
      aguardandoColeta,
      problemas,
      mediaCargasDia,
      mediaValorDia,
      mediaFreteDia,
      totalEntregas: filteredEntregas.length,
    };
  }, [filteredCargas, filteredEntregas, cargas, entregas, dateRange]);

  // Top Destinos
  const topDestinosData = useMemo(() => {
    const destinoCounts: Record<string, { count: number; frete: number }> = {};
    
    filteredEntregas.forEach(e => {
      const carga = e.cargas as any;
      const enderecoId = carga?.endereco_destino_id;
      const endereco = enderecosDestino.find(ed => ed.id === enderecoId);
      
      if (endereco?.cidade && endereco?.estado) {
        const key = `${endereco.cidade}/${endereco.estado}`;
        if (!destinoCounts[key]) {
          destinoCounts[key] = { count: 0, frete: 0 };
        }
        destinoCounts[key].count += 1;
        destinoCounts[key].frete += Number(e.valor_frete) || 0;
      }
    });

    return Object.entries(destinoCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([destino, data]) => ({
        destino,
        entregas: data.count,
        frete: data.frete,
      }));
  }, [filteredEntregas, enderecosDestino]);

  // Chart: Weekly/Daily activity
  const activityChartData = useMemo(() => {
    const days = [];
    const interval = periodo === '7dias' ? 7 : periodo === '30dias' ? 30 : periodo === '90dias' ? 14 : 12;
    const step = periodo === '90dias' ? 6 : periodo === 'ano' ? 30 : 1;
    
    for (let i = interval - 1; i >= 0; i--) {
      const date = subDays(new Date(), i * step);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, periodo === '7dias' ? 'EEE' : 'dd/MM', { locale: ptBR });
      
      const cargasCount = filteredCargas.filter(c => {
        const cargaDate = format(parseISO(c.created_at), 'yyyy-MM-dd');
        if (step === 1) return cargaDate === dateStr;
        const startDate = subDays(date, step);
        const cargaParsed = parseISO(c.created_at);
        return cargaParsed >= startDate && cargaParsed <= date;
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

  // Chart: Tipo de carga distribution
  const tipoCargaData = useMemo(() => {
    const tipoCounts: Record<string, number> = {};
    filteredCargas.forEach(c => {
      const tipo = c.tipo || 'carga_seca';
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
  }, [filteredCargas]);

  // Chart: Monthly value trend
  const monthlyValueData = useMemo(() => {
    const months: Record<string, { valor: number; cargas: number; peso: number }> = {};
    
    cargas.forEach(c => {
      const month = format(parseISO(c.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { valor: 0, cargas: 0, peso: 0 };
      months[month].valor += Number(c.valor_mercadoria) || 0;
      months[month].cargas += 1;
      months[month].peso += Number(c.peso_kg) || 0;
    });

    return Object.entries(months).slice(-7).map(([mes, data]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      valor: data.valor,
      cargas: data.cargas,
      peso: data.peso,
    }));
  }, [cargas]);

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
      
      const weekCargas = cargas.filter(c => {
        const date = parseISO(c.created_at);
        return date >= weekStart && date < weekEnd;
      });
      
      const weekEntregas = entregas.filter(e => {
        if (!e.entregue_em) return false;
        const date = parseISO(e.entregue_em);
        return date >= weekStart && date < weekEnd;
      });

      weeks.push({
        semana: weekLabel,
        cargas: weekCargas.length,
        entregas: weekEntregas.length,
        valor: weekCargas.reduce((acc, c) => acc + (Number(c.valor_mercadoria) || 0), 0),
      });
    }
    return weeks;
  }, [cargas, entregas]);

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
            {/* Main KPIs Row */}
            {/* Main KPIs Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Cargas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{kpis.totalCargas}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{kpis.mediaCargasDia.toFixed(1)}/dia
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className={`flex items-center text-xs ${kpis.cargasChange >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                        {kpis.cargasChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {kpis.cargasChange >= 0 ? '+' : ''}{kpis.cargasChange}%
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
                      <div className={`flex items-center text-xs ${kpis.freteChange >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
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
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(kpis.ticketMedio)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        por entrega
                      </p>
                    </div>
                    <div className="p-2 bg-chart-4/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-chart-4" />
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
                      <Progress value={kpis.taxaConclusao} className="h-2 mt-2 w-24" />
                    </div>
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <Target className="w-5 h-5 text-chart-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary KPIs - Frete & Mercadoria */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.valorMercadoriaTotal)}</p>
                    <p className="text-xs text-muted-foreground">Valor Mercadoria</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-3/10 rounded-lg">
                    <Activity className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{kpis.custoFretePercentual.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Frete vs Mercad.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-lg">
                    <Weight className="w-5 h-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatWeight(kpis.pesoTotal)}</p>
                    <p className="text-xs text-muted-foreground">Peso Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-5/10 rounded-lg">
                    <Package className="w-5 h-5 text-chart-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{kpis.volumeTotal.toFixed(1)} m³</p>
                    <p className="text-xs text-muted-foreground">Volume Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{kpis.totalEntregas}</p>
                    <p className="text-xs text-muted-foreground">Total Entregas</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpis.entregues}</p>
                    <p className="text-xs text-muted-foreground">Entregues</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-1/10 rounded-lg">
                    <Truck className="w-5 h-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpis.emTransito}</p>
                    <p className="text-xs text-muted-foreground">Em Trânsito</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-lg">
                    <Clock className="w-5 h-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpis.aguardandoColeta}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpis.problemas}</p>
                    <p className="text-xs text-muted-foreground">Problemas</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Atividade
                  </CardTitle>
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
                        <Legend />
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

              {/* Weekly Comparison */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-chart-1" />
                    Comparativo Semanal
                  </CardTitle>
                  <CardDescription>Últimas 4 semanas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={weeklyComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="semana" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
                          formatter={(value: number, name: string) => {
                            if (name === 'valor') return [formatCurrency(value), 'Valor'];
                            return [value, name === 'cargas' ? 'Cargas' : 'Entregas'];
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="cargas" fill="hsl(var(--primary))" name="Cargas" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="entregas" fill="hsl(var(--chart-2))" name="Entregas" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="valor" stroke="hsl(var(--chart-4))" strokeWidth={2} name="valor" dot={{ fill: 'hsl(var(--chart-4))' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Status Distribution */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Status das Cargas</CardTitle>
                  <CardDescription>Distribuição por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] flex items-center justify-center">
                    {statusChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
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
                      <p className="text-muted-foreground text-sm">Sem dados no período</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {statusChartData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} 
                        />
                        <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tipo de Carga Distribution */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Tipos de Carga</CardTitle>
                  <CardDescription>Principais tipos movimentados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    {tipoCargaData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tipoCargaData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            width={80}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Quantidade" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">Sem dados no período</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Status Radial */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Status Entregas</CardTitle>
                  <CardDescription>Situação atual das entregas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] flex items-center justify-center">
                    {deliveryStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                          cx="50%" 
                          cy="50%" 
                          innerRadius="30%" 
                          outerRadius="90%" 
                          data={deliveryStatusData}
                          startAngle={180}
                          endAngle={0}
                        >
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            background={{ fill: 'hsl(var(--muted))' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm">Sem entregas no período</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {deliveryStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.fill }} 
                        />
                        <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Destinos + Value Trend */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Top Destinos */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-chart-3" />
                    Top Destinos
                  </CardTitle>
                  <CardDescription>Principais rotas por entregas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topDestinosData.length > 0 ? (
                      topDestinosData.map((item, index) => (
                        <div key={item.destino} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full shrink-0">
                              {index + 1}º
                            </span>
                            <span className="text-sm truncate">{item.destino}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-muted-foreground">{item.entregas} entregas</span>
                            <span className="text-sm font-medium text-chart-2">{formatCurrency(item.frete)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados de destino</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Value Trend */}
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-chart-2" />
                    Evolução Mensal
                  </CardTitle>
                  <CardDescription>Valor e volume de cargas ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {monthlyValueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyValueData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="mes" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickFormatter={(value) => formatCurrency(value)}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--popover))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === 'Valor') return [formatCurrency(value), 'Valor'];
                              if (name === 'Peso') return [formatWeight(value), 'Peso'];
                              return [value, 'Cargas'];
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="right" dataKey="cargas" fill="hsl(var(--chart-1))" name="Cargas" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="left" type="monotone" dataKey="valor" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Valor" dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Sem dados disponíveis</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
