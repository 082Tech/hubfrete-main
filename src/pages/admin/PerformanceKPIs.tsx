import { useState, useEffect, useMemo } from 'react';
import { Award, Truck, Route, Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  KPICard,
  DriverRankingTable,
  DriverKPI,
  PerformanceCharts,
  PeriodComparison,
} from '@/components/admin/kpis';

export default function PerformanceKPIs() {
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverKPI[]>([]);
  const [sortBy, setSortBy] = useState<'entregas' | 'taxa_atraso' | 'km_rodado'>('entregas');
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');

  // Aggregated stats
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [avgDelayRate, setAvgDelayRate] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  // Period comparison data
  const [currentPeriod, setCurrentPeriod] = useState({ entregas: 0, km_rodado: 0, custo_total: 0, taxa_atraso: 0 });
  const [previousPeriod, setPreviousPeriod] = useState({ entregas: 0, km_rodado: 0, custo_total: 0, taxa_atraso: 0 });

  // Chart data
  const [entregasPorMes, setEntregasPorMes] = useState<{ name: string; value: number }[]>([]);
  const [statusDistribuicao, setStatusDistribuicao] = useState<{ name: string; value: number }[]>([]);
  const [kmPorMes, setKmPorMes] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    async function fetchKPIs() {
      setIsLoading(true);
      try {
        // Fetch motorista_kpis with motorista info
        const { data: kpis, error: kpisError } = await supabase
          .from('motorista_kpis')
          .select(`
            *,
            motoristas (
              id,
              nome_completo,
              foto_url,
              empresa_id,
              empresas (nome)
            )
          `)
          .order('periodo_fim', { ascending: false });

        if (kpisError) throw kpisError;

        // Aggregate by motorista (sum all periods)
        const driverMap = new Map<string, DriverKPI>();

        kpis?.forEach((kpi) => {
          const motorista = kpi.motoristas as any;
          if (!motorista) return;

          const existing = driverMap.get(motorista.id);
          if (existing) {
            existing.entregas_finalizadas += kpi.entregas_finalizadas || 0;
            existing.entregas_atrasadas += kpi.entregas_atrasadas || 0;
            existing.km_rodado += kpi.km_rodado || 0;
            existing.custo_estimado += kpi.custo_estimado || 0;
            // Recalculate average delay rate
            const totalEntregas = existing.entregas_finalizadas;
            if (totalEntregas > 0) {
              existing.taxa_atraso = (existing.entregas_atrasadas / totalEntregas) * 100;
            }
          } else {
            const entregas = kpi.entregas_finalizadas || 0;
            const atrasadas = kpi.entregas_atrasadas || 0;
            driverMap.set(motorista.id, {
              motorista_id: motorista.id,
              nome: motorista.nome_completo,
              foto_url: motorista.foto_url,
              empresa_nome: motorista.empresas?.nome || null,
              entregas_finalizadas: entregas,
              entregas_atrasadas: atrasadas,
              km_rodado: kpi.km_rodado || 0,
              taxa_atraso: entregas > 0 ? (atrasadas / entregas) * 100 : 0,
              tempo_medio_entrega: kpi.tempo_em_rota_minutos || 0,
              custo_estimado: kpi.custo_estimado || 0,
            });
          }
        });

        const driverList = Array.from(driverMap.values());
        setDrivers(driverList);

        // Calculate aggregated stats
        const totals = driverList.reduce(
          (acc, d) => ({
            entregas: acc.entregas + d.entregas_finalizadas,
            km: acc.km + d.km_rodado,
            atrasadas: acc.atrasadas + d.entregas_atrasadas,
            custo: acc.custo + d.custo_estimado,
          }),
          { entregas: 0, km: 0, atrasadas: 0, custo: 0 }
        );

        setTotalEntregas(totals.entregas);
        setTotalKm(totals.km);
        setAvgDelayRate(totals.entregas > 0 ? (totals.atrasadas / totals.entregas) * 100 : 0);
        setTotalCost(totals.custo);

        // Generate chart data - last 6 months
        const months: { name: string; value: number }[] = [];
        const kmMonths: { name: string; value: number }[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthName = format(date, 'MMM', { locale: ptBR });
          const monthStart = startOfMonth(date).toISOString();
          const monthEnd = endOfMonth(date).toISOString();

          const monthKpis = kpis?.filter(
            (k) => k.periodo_inicio >= monthStart && k.periodo_fim <= monthEnd
          ) || [];

          const monthEntregas = monthKpis.reduce((sum, k) => sum + (k.entregas_finalizadas || 0), 0);
          const monthKm = monthKpis.reduce((sum, k) => sum + (k.km_rodado || 0), 0);

          months.push({ name: monthName, value: monthEntregas });
          kmMonths.push({ name: monthName, value: monthKm });
        }

        setEntregasPorMes(months);
        setKmPorMes(kmMonths);

        // Fetch status distribution from entregas
        const { data: entregas } = await supabase
          .from('entregas')
          .select('status');

        const statusCount: Record<string, number> = {};
        entregas?.forEach((e) => {
          const status = e.status || 'unknown';
          statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const statusData = Object.entries(statusCount)
          .map(([name, value]) => ({
            name: name === 'entregue' ? 'Entregue' :
                  name === 'aguardando' ? 'Aguardando' :
                  name === 'saiu_para_coleta' ? 'Coletando' :
                  name === 'saiu_para_entrega' ? 'Em entrega' :
                  name === 'cancelada' ? 'Cancelada' :
                  name === 'problema' ? 'Problema' : name,
            value,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setStatusDistribuicao(statusData);

        // Period comparison
        const currentMonthStart = startOfMonth(new Date()).toISOString();
        const currentMonthEnd = endOfMonth(new Date()).toISOString();
        const prevMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
        const prevMonthEnd = endOfMonth(subMonths(new Date(), 1)).toISOString();

        const currentMonthKpis = kpis?.filter(
          (k) => k.periodo_inicio >= currentMonthStart && k.periodo_fim <= currentMonthEnd
        ) || [];
        const prevMonthKpis = kpis?.filter(
          (k) => k.periodo_inicio >= prevMonthStart && k.periodo_fim <= prevMonthEnd
        ) || [];

        const calcPeriod = (kpiList: typeof kpis) => {
          const entregas = kpiList?.reduce((s, k) => s + (k.entregas_finalizadas || 0), 0) || 0;
          const atrasadas = kpiList?.reduce((s, k) => s + (k.entregas_atrasadas || 0), 0) || 0;
          return {
            entregas,
            km_rodado: kpiList?.reduce((s, k) => s + (k.km_rodado || 0), 0) || 0,
            custo_total: kpiList?.reduce((s, k) => s + (k.custo_estimado || 0), 0) || 0,
            taxa_atraso: entregas > 0 ? (atrasadas / entregas) * 100 : 0,
          };
        };

        setCurrentPeriod(calcPeriod(currentMonthKpis));
        setPreviousPeriod(calcPeriod(prevMonthKpis));

      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchKPIs();
  }, [selectedPeriod]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-7 h-7 text-primary" />
            Performance e KPIs
          </h1>
          <p className="text-sm text-muted-foreground">
            Análise de performance dos motoristas e operação
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
              <SelectItem value="all_time">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <KPICard
          title="Total de Cargas"
          value={totalEntregas.toLocaleString('pt-BR')}
          icon={<Truck className="w-5 h-5 text-primary" />}
          trend={{
            value: currentPeriod.entregas > 0 && previousPeriod.entregas > 0
              ? Math.round(((currentPeriod.entregas - previousPeriod.entregas) / previousPeriod.entregas) * 100)
              : 0,
            isPositive: currentPeriod.entregas >= previousPeriod.entregas,
            label: 'vs mês anterior',
          }}
        />
        <KPICard
          title="Km Rodado"
          value={totalKm.toLocaleString('pt-BR')}
          subtitle="km"
          icon={<Route className="w-5 h-5 text-chart-2" />}
        />
        <KPICard
          title="Taxa de Atraso"
          value={avgDelayRate.toFixed(1)}
          subtitle="%"
          icon={<Clock className="w-5 h-5 text-chart-1" />}
          trend={{
            value: Math.round(previousPeriod.taxa_atraso - currentPeriod.taxa_atraso),
            isPositive: currentPeriod.taxa_atraso <= previousPeriod.taxa_atraso,
            label: 'vs mês anterior',
          }}
        />
        <KPICard
          title="Custo Estimado"
          value={totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={<DollarSign className="w-5 h-5 text-chart-3" />}
        />
      </div>

      {/* Charts */}
      <PerformanceCharts
        entregasPorMes={entregasPorMes}
        statusDistribuicao={statusDistribuicao}
        kmPorMes={kmPorMes}
      />

      {/* Period Comparison */}
      <PeriodComparison
        current={currentPeriod}
        previous={previousPeriod}
        currentLabel={format(new Date(), 'MMM/yy', { locale: ptBR })}
        previousLabel={format(subMonths(new Date(), 1), 'MMM/yy', { locale: ptBR })}
      />

      {/* Ranking Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Ranking de Motoristas</h2>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[180px]">
              <TrendingUp className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entregas">Mais Cargas</SelectItem>
              <SelectItem value="taxa_atraso">Menor Atraso</SelectItem>
              <SelectItem value="km_rodado">Mais Km Rodado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DriverRankingTable drivers={drivers} sortBy={sortBy} isLoading={isLoading} />
      </div>
    </div>
  );
}
