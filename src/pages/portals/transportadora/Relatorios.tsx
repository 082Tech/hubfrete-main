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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
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
  'aguardando': 'Aguardando',
  'saiu_para_coleta': 'Saiu para Coleta',
  'saiu_para_entrega': 'Saiu para Entrega',
  'entregue': 'Entregue',
  'problema': 'Problema',
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

const tipoVeiculoLabels: Record<string, string> = {
  'truck': 'Truck',
  'toco': 'Toco',
  'tres_quartos': '3/4',
  'vuc': 'VUC',
  'carreta': 'Carreta',
  'carreta_ls': 'Carreta LS',
  'bitrem': 'Bitrem',
  'rodotrem': 'Rodotrem',
  'vanderleia': 'Vanderléia',
  'bitruck': 'Bitruck',
};

export default function TransportadoraRelatorios() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const { empresa, filialAtiva } = useUserContext();

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
            valor_mercadoria,
            data_entrega_limite,
            endereco_destino_id
          )
        `)
        .in('veiculo_id', veiculos.map(v => v.id));

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id && veiculos.length > 0,
  });

  // Fetch endereços de destino
  const { data: enderecosDestino = [] } = useQuery({
    queryKey: ['relatorios_enderecos_destino_transp', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];

      const cargaIds = entregas.map(e => (e.cargas as any)?.id).filter(Boolean);
      if (cargaIds.length === 0) return [];

      const { data, error } = await supabase
        .from('enderecos_carga')
        .select('id, cidade, estado, carga_id')
        .eq('tipo', 'destino')
        .in('carga_id', cargaIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa?.id && entregas.length > 0,
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
    const valorMercadoriaTotal = filteredEntregas.reduce((acc, e) => {
      const carga = e.cargas as any;
      return acc + (Number(carga?.valor_mercadoria) || 0);
    }, 0);
    
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
    
    const taxaConclusao = totalEntregas > 0 
      ? Math.round((entregues / totalEntregas) * 100) 
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
    const inFullDelivery = totalEntregas > 0 
      ? Math.round(((totalEntregas - canceladas) / totalEntregas) * 100)
      : 100;
    const otifScore = Math.round((onTimeDelivery * inFullDelivery) / 100);
    const leadTimeAvg = entreguesComData.length > 0 ? totalLeadTime / entreguesComData.length : 0;
    
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

    const mediaEntregasDia = totalEntregas / Math.max(periodDays, 1);
    const mediaFreteDia = freteTotal / Math.max(periodDays, 1);
    const custoPorKg = pesoTotal > 0 ? freteTotal / pesoTotal : 0;
    
    // Fleet utilization
    const veiculosComEntrega = new Set(filteredEntregas.map(e => e.veiculo_id)).size;
    const utilizacaoFrota = veiculos.length > 0 
      ? Math.round((veiculosComEntrega / veiculos.length) * 100)
      : 0;

    return {
      totalEntregas,
      entregasChange,
      freteTotal,
      freteChange,
      pesoTotal,
      valorMercadoriaTotal,
      ticketMedio,
      custoFretePercentual,
      taxaConclusao,
      entregues,
      emTransito,
      aguardandoColeta,
      problemas,
      canceladas,
      veiculosAtivos,
      veiculosTotal: veiculos.length,
      motoristasAtivos,
      motoristasTotal: motoristas.length,
      mediaEntregasDia,
      mediaFreteDia,
      otifScore,
      onTimeDelivery,
      inFullDelivery,
      leadTimeAvg,
      entreguesNoPrazo,
      entreguesAtrasados: entreguesComData.length - entreguesNoPrazo,
      custoPorKg,
      utilizacaoFrota,
    };
  }, [filteredEntregas, entregas, veiculos, motoristas, dateRange]);

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

  // Chart: Daily/Weekly activity
  const activityChartData = useMemo(() => {
    const totalDays = differenceInDays(dateRange.end, dateRange.start) || 1;
    const maxPoints = 30;
    const step = Math.max(1, Math.ceil(totalDays / maxPoints));
    const days = [];
    
    for (let i = 0; i <= totalDays; i += step) {
      const date = subDays(dateRange.end, totalDays - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, totalDays <= 7 ? 'EEE' : 'dd/MM', { locale: ptBR });
      
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
        dia: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        coletas: coletasCount,
        entregas: entregasCount,
      });
    }
    return days;
  }, [filteredEntregas, dateRange]);

  // Chart: Status distribution
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredEntregas.forEach(e => {
      const status = e.status || 'aguardando';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
  }, [filteredEntregas]);

  // Chart: Vehicle type distribution
  const vehicleTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    veiculos.forEach(v => {
      const tipo = v.tipo || 'truck';
      typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, count]) => ({
        tipo: tipoVeiculoLabels[tipo] || tipo,
        quantidade: count,
      }));
  }, [veiculos]);

  // Monthly financial data for DRE
  const monthlyFinancialData = useMemo(() => {
    const months: Record<string, { receita: number; custo: number }> = {};
    
    entregas.forEach(e => {
      const month = format(parseISO(e.created_at), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { receita: 0, custo: 0 };
      months[month].receita += Number(e.valor_frete) || 0;
      // Custo estimado como 70% do frete (simplificação)
      months[month].custo += (Number(e.valor_frete) || 0) * 0.7;
    });

    return Object.entries(months).slice(-6).map(([mes, data]) => ({
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      receita: data.receita,
      custo: data.custo,
      margem: data.receita - data.custo,
    }));
  }, [entregas]);

  // Cost breakdown by tipo de carga
  const costBreakdownData = useMemo(() => {
    const tipoCounts: Record<string, number> = {};
    filteredEntregas.forEach(e => {
      const carga = e.cargas as any;
      const tipo = carga?.tipo || 'carga_seca';
      tipoCounts[tipo] = (tipoCounts[tipo] || 0) + (Number(e.valor_frete) || 0);
    });

    return Object.entries(tipoCounts)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tipo, value]) => ({
        name: tipoCargaLabels[tipo] || tipo,
        value,
      }));
  }, [filteredEntregas]);

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
    custoOperacional: kpis.freteTotal * 0.7,
    margemBruta: kpis.freteTotal * 0.3,
    margemPercentual: 30,
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
    veiculosAtivos: kpis.veiculosAtivos,
    veiculosTotal: kpis.veiculosTotal,
    motoristasAtivos: kpis.motoristasAtivos,
    motoristasTotal: kpis.motoristasTotal,
    kmRodado: 0,
    consumoCombustivel: 0,
    utilizacaoFrota: kpis.utilizacaoFrota,
    ocupacaoMedia: 75,
    rotasRealizadas: topDestinosData.reduce((acc, r) => acc + r.entregas, 0),
    paradaMédiaMinutos: 45,
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Analise o desempenho das suas operações de transporte</p>
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
                            <div className={`flex items-center text-xs ${kpis.entregasChange >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
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
                          <div className="p-2 bg-chart-4/10 rounded-lg">
                            <Weight className="w-5 h-5 text-chart-4" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{formatWeight(kpis.pesoTotal)}</p>
                            <p className="text-xs text-muted-foreground">Peso Transportado</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-chart-3/10 rounded-lg">
                            <Activity className="w-5 h-5 text-chart-3" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{kpis.utilizacaoFrota}%</p>
                            <p className="text-xs text-muted-foreground">Utilização Frota</p>
                          </div>
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
                          Atividade de Coletas e Entregas
                        </CardTitle>
                        <CardDescription>Coletas e entregas realizadas por dia</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={activityChartData}>
                            <defs>
                              <linearGradient id="colorColetasT" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorEntregasT" x1="0" y1="0" x2="0" y2="1">
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
                            <Area type="monotone" dataKey="coletas" name="Coletas" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorColetasT)" />
                            <Area type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorEntregasT)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

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
                </>
              ),
              financial: (
                <FinancialTab 
                  metrics={financialMetrics}
                  monthlyData={monthlyFinancialData}
                  costBreakdown={costBreakdownData}
                  formatCurrency={formatCurrency}
                  portalType="transportadora"
                />
              ),
              performance: (
                <PerformanceTab 
                  metrics={performanceMetrics}
                  otifTrend={otifTrendData}
                  leadTimeData={leadTimeData}
                  portalType="transportadora"
                />
              ),
              operational: (
                <OperationalTab 
                  metrics={operationalMetrics}
                  topRoutes={topDestinosData}
                  vehicleUsage={vehicleTypeData}
                  dailyActivity={activityChartData}
                  formatCurrency={formatCurrency}
                  portalType="transportadora"
                />
              ),
            }}
          </ReportTabs>
        )}
      </div>
    </div>
  );
}
