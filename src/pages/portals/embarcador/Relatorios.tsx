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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Line
} from 'recharts';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { format, subDays, parseISO, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { ReportTabs, FinancialTab, PerformanceTab, OperationalTab } from '@/components/relatorios';
import { DateRangePicker, getDefaultDateRange } from '@/components/relatorios/DateRangePicker';

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
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const { empresa, filialAtiva } = useUserContext();

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
            endereco_destino_id,
            data_entrega_limite
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
    
    const freteTotal = filteredEntregas.reduce((acc, e) => acc + (Number(e.valor_frete) || 0), 0);
    const entregasComFrete = filteredEntregas.filter(e => Number(e.valor_frete) > 0).length;
    const ticketMedio = entregasComFrete > 0 ? freteTotal / entregasComFrete : 0;
    
    const custoFretePercentual = valorMercadoriaTotal > 0 
      ? (freteTotal / valorMercadoriaTotal) * 100 
      : 0;
    
    const entregues = filteredEntregas.filter(e => e.status === 'entregue').length;
    const emTransito = filteredEntregas.filter(e => e.status === 'saiu_para_coleta' || e.status === 'saiu_para_entrega').length;
    const aguardandoColeta = filteredEntregas.filter(e => 
      e.status === 'aguardando'
    ).length;
    const problemas = filteredEntregas.filter(e => e.status === 'problema').length;
    const canceladas = filteredEntregas.filter(e => e.status === 'cancelada').length;
    
    const taxaConclusao = filteredEntregas.length > 0 
      ? Math.round((entregues / filteredEntregas.length) * 100) 
      : 0;
    
    // OTIF calculations
    const entreguesComData = filteredEntregas.filter(e => 
      e.status === 'entregue' && e.entregue_em
    );
    
    let entreguesNoPrazo = 0;
    let totalLeadTime = 0;
    
    entreguesComData.forEach(e => {
      const carga = e.cargas as any;
      if (carga?.data_entrega_limite && e.entregue_em) {
        const limite = parseISO(carga.data_entrega_limite);
        const entregaDate = parseISO(e.entregue_em);
        if (entregaDate <= limite) {
          entreguesNoPrazo++;
        }
      }
      if (e.coletado_em && e.entregue_em) {
        totalLeadTime += differenceInHours(parseISO(e.entregue_em), parseISO(e.coletado_em));
      }
    });
    
    const onTimeDelivery = entreguesComData.length > 0 
      ? Math.round((entreguesNoPrazo / entreguesComData.length) * 100) 
      : 100;
    const inFullDelivery = filteredEntregas.length > 0 
      ? Math.round(((filteredEntregas.length - canceladas) / filteredEntregas.length) * 100)
      : 100;
    const otifScore = Math.round((onTimeDelivery * inFullDelivery) / 100);
    const leadTimeAvg = entreguesComData.length > 0 ? totalLeadTime / entreguesComData.length : 0;
    
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

    const mediaCargasDia = totalCargas / Math.max(periodDays, 1);
    const mediaValorDia = valorMercadoriaTotal / Math.max(periodDays, 1);
    const mediaFreteDia = freteTotal / Math.max(periodDays, 1);
    const custoPorKg = pesoTotal > 0 ? freteTotal / pesoTotal : 0;

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
      canceladas,
      mediaCargasDia,
      mediaValorDia,
      mediaFreteDia,
      totalEntregas: filteredEntregas.length,
      otifScore,
      onTimeDelivery,
      inFullDelivery,
      leadTimeAvg,
      entreguesNoPrazo,
      entreguesAtrasados: entreguesComData.length - entreguesNoPrazo,
      custoPorKg,
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
        dia: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        coletas: cargasCount,
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
    const tipoCounts: Record<string, { count: number; frete: number }> = {};
    filteredCargas.forEach(c => {
      const tipo = c.tipo || 'carga_seca';
      if (!tipoCounts[tipo]) {
        tipoCounts[tipo] = { count: 0, frete: 0 };
      }
      tipoCounts[tipo].count += 1;
    });

    filteredEntregas.forEach(e => {
      // We'd need carga.tipo here, skipping for now
    });

    return Object.entries(tipoCounts)
      .filter(([, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([tipo, data]) => ({
        name: tipoCargaLabels[tipo] || tipo,
        value: data.count,
        tipo: tipoCargaLabels[tipo] || tipo,
        quantidade: data.count,
      }));
  }, [filteredCargas]);

  // Monthly financial data for DRE
  const monthlyFinancialData = useMemo(() => {
    const months: Record<string, { receita: number; custo: number }> = {};
    
    cargas.forEach(c => {
      const month = format(parseISO(c.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { receita: 0, custo: 0 };
      months[month].receita += Number(c.valor_mercadoria) || 0;
    });

    entregas.forEach(e => {
      const month = format(parseISO(e.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { receita: 0, custo: 0 };
      months[month].custo += Number(e.valor_frete) || 0;
    });

    return Object.entries(months).slice(-6).map(([mes, data]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      receita: data.receita,
      custo: data.custo,
      margem: data.receita > 0 ? (data.custo / data.receita) * 100 : 0,
    }));
  }, [cargas, entregas]);

  // OTIF Trend
  const otifTrendData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekEntregas = entregas.filter(e => {
        const date = parseISO(e.created_at);
        return date >= weekStart && date < weekEnd && e.status === 'entregue';
      });
      
      let onTime = 0;
      weekEntregas.forEach(e => {
        const carga = e.cargas as any;
        if (carga?.data_entrega_limite && e.entregue_em) {
          const limite = parseISO(carga.data_entrega_limite);
          const entregaDate = parseISO(e.entregue_em);
          if (entregaDate <= limite) onTime++;
        }
      });
      
      const canceladas = entregas.filter(e => {
        const date = parseISO(e.created_at);
        return date >= weekStart && date < weekEnd && e.status === 'cancelada';
      }).length;
      
      const totalWeek = weekEntregas.length + canceladas;
      const onTimePercent = weekEntregas.length > 0 ? Math.round((onTime / weekEntregas.length) * 100) : 100;
      const inFullPercent = totalWeek > 0 ? Math.round(((totalWeek - canceladas) / totalWeek) * 100) : 100;

      weeks.push({
        periodo: `Sem ${4 - i}`,
        otif: Math.round((onTimePercent * inFullPercent) / 100),
        onTime: onTimePercent,
        inFull: inFullPercent,
      });
    }
    return weeks;
  }, [entregas]);

  // Lead Time Data
  const leadTimeData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekEntregas = entregas.filter(e => {
        const date = parseISO(e.created_at);
        return date >= weekStart && date < weekEnd && e.status === 'entregue' && e.coletado_em && e.entregue_em;
      });
      
      let totalHours = 0;
      weekEntregas.forEach(e => {
        if (e.coletado_em && e.entregue_em) {
          totalHours += differenceInHours(parseISO(e.entregue_em), parseISO(e.coletado_em));
        }
      });

      weeks.push({
        periodo: `Sem ${4 - i}`,
        leadTime: weekEntregas.length > 0 ? Math.round(totalHours / weekEntregas.length) : 0,
        meta: 48,
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

  // Prepare data for tabs
  const financialMetrics = {
    freteBruto: kpis.freteTotal,
    custoOperacional: 0,
    margemBruta: 0,
    margemPercentual: 0,
    ticketMedio: kpis.ticketMedio,
    custoPorKg: kpis.custoPorKg,
    receitaPorKm: 0,
    custoFreteVsMercadoria: kpis.custoFretePercentual,
    freteChange: kpis.freteChange,
    valorMercadoria: kpis.valorMercadoriaTotal,
  };

  const performanceMetrics = {
    otifScore: kpis.otifScore,
    onTimeDelivery: kpis.onTimeDelivery,
    inFullDelivery: kpis.inFullDelivery,
    leadTimeAvg: kpis.leadTimeAvg,
    leadTimeMeta: 48,
    taxaConclusao: kpis.taxaConclusao,
    entreguesNoPrazo: kpis.entreguesNoPrazo,
    entreguesAtrasados: kpis.entreguesAtrasados,
    devolucoesCount: kpis.canceladas,
    devolucoesPercentual: kpis.totalEntregas > 0 ? (kpis.canceladas / kpis.totalEntregas) * 100 : 0,
    ocorrenciasCount: kpis.problemas,
    ocorrenciasPercentual: kpis.totalEntregas > 0 ? (kpis.problemas / kpis.totalEntregas) * 100 : 0,
  };

  const operationalMetrics = {
    veiculosAtivos: 0,
    veiculosTotal: 0,
    motoristasAtivos: 0,
    motoristasTotal: 0,
    kmRodado: 0,
    consumoCombustivel: 0,
    utilizacaoFrota: 0,
    ocupacaoMedia: 0,
    rotasRealizadas: topDestinosData.reduce((acc, r) => acc + r.entregas, 0),
    paradaMédiaMinutos: 0,
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Analise o desempenho das suas operações</p>
          </div>
          <div className="flex gap-3">
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
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
          <ReportTabs>
            {{
              overview: (
                <>
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
                            <p className="text-sm text-muted-foreground">OTIF Score</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{kpis.otifScore}%</p>
                            <Progress value={kpis.otifScore} className="h-2 mt-2 w-24" />
                          </div>
                          <div className="p-2 bg-chart-1/10 rounded-lg">
                            <Target className="w-5 h-5 text-chart-1" />
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
                          <div className="p-2 bg-chart-3/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-chart-3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Secondary KPIs */}
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
                          <p className="text-xs text-muted-foreground">Frete/Mercad.</p>
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

                  {/* Status Cards */}
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

                  {/* Charts */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" />
                          Atividade
                        </CardTitle>
                        <CardDescription>Cargas e entregas no período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={activityChartData}>
                            <defs>
                              <linearGradient id="colorCargasE" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorEntregasE" x1="0" y1="0" x2="0" y2="1">
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
                            <Area type="monotone" dataKey="cargas" name="Cargas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCargasE)" />
                            <Area type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorEntregasE)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Status das Cargas
                        </CardTitle>
                        <CardDescription>Distribuição por status</CardDescription>
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
                </>
              ),
              financial: (
                <FinancialTab 
                  metrics={financialMetrics}
                  monthlyData={monthlyFinancialData}
                  costBreakdown={tipoCargaData.map(t => ({ name: t.name, value: t.value }))}
                  formatCurrency={formatCurrency}
                  portalType="embarcador"
                />
              ),
              performance: (
                <PerformanceTab 
                  metrics={performanceMetrics}
                  otifTrend={otifTrendData}
                  leadTimeData={leadTimeData}
                  portalType="embarcador"
                />
              ),
              operational: (
                <OperationalTab 
                  metrics={operationalMetrics}
                  topRoutes={topDestinosData}
                  vehicleUsage={tipoCargaData}
                  dailyActivity={activityChartData}
                  formatCurrency={formatCurrency}
                  portalType="embarcador"
                />
              ),
            }}
          </ReportTabs>
        )}
      </div>
    </div>
  );
}
