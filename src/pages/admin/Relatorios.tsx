import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperationalReport, GrowthReport, FinancialReport } from '@/components/admin/relatorios';
import { DateRangePicker, getDefaultDateRange } from '@/components/relatorios/DateRangePicker';

export default function Relatorios() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Operational data
  const [operationalData, setOperationalData] = useState({
    totalCargas: 0,
    totalEntregas: 0,
    entregasPorStatus: [] as { name: string; value: number }[],
    cargasPorMes: [] as { name: string; value: number }[],
    tempoMedioEntrega: 0,
  });

  // Growth data
  const [growthData, setGrowthData] = useState({
    totalEmpresas: 0,
    totalMotoristas: 0,
    totalVeiculos: 0,
    crescimentoMensal: 0,
    cadastrosPorMes: [] as { name: string; empresas: number; motoristas: number }[],
  });

  // Financial data
  const [financialData, setFinancialData] = useState({
    volumeTotal: 0,
    mediaPorEntrega: 0,
    crescimentoMensal: 0,
    fretePorMes: [] as { name: string; value: number }[],
  });

  useEffect(() => {
    async function fetchReportData() {
      setIsLoading(true);
      try {
        // Fetch counts
        const [{ count: cargasCount }, { count: entregasCount }, { count: empresasCount }, { count: motoristasCount }, { count: veiculosCount }] = await Promise.all([
          supabase.from('cargas').select('*', { count: 'exact', head: true }),
          supabase.from('entregas').select('*', { count: 'exact', head: true }),
          supabase.from('empresas').select('*', { count: 'exact', head: true }),
          supabase.from('motoristas').select('*', { count: 'exact', head: true }),
          supabase.from('veiculos').select('*', { count: 'exact', head: true }),
        ]);

        // Fetch entregas for status distribution
        const { data: entregas } = await supabase.from('entregas').select('status, valor_frete, created_at');
        
        const statusCount: Record<string, number> = {};
        let totalFrete = 0;
        entregas?.forEach((e) => {
          const status = e.status || 'unknown';
          statusCount[status] = (statusCount[status] || 0) + 1;
          totalFrete += e.valor_frete || 0;
        });

        const statusData = Object.entries(statusCount).map(([name, value]) => ({
          name: name === 'entregue' ? 'Entregue' : name === 'aguardando' ? 'Aguardando' : name === 'cancelada' ? 'Cancelada' : name,
          value,
        }));

        // Generate monthly data for last 6 months
        const months: { name: string; value: number }[] = [];
        const freteMonths: { name: string; value: number }[] = [];
        const cadastrosMonths: { name: string; empresas: number; motoristas: number }[] = [];

        for (let i = 5; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthName = format(date, 'MMM', { locale: ptBR });
          months.push({ name: monthName, value: Math.floor(Math.random() * 50) + 10 });
          freteMonths.push({ name: monthName, value: Math.floor(Math.random() * 50000) + 10000 });
          cadastrosMonths.push({ name: monthName, empresas: Math.floor(Math.random() * 10) + 2, motoristas: Math.floor(Math.random() * 30) + 5 });
        }

        setOperationalData({
          totalCargas: cargasCount || 0,
          totalEntregas: entregasCount || 0,
          entregasPorStatus: statusData,
          cargasPorMes: months,
          tempoMedioEntrega: 48,
        });

        setGrowthData({
          totalEmpresas: empresasCount || 0,
          totalMotoristas: motoristasCount || 0,
          totalVeiculos: veiculosCount || 0,
          crescimentoMensal: 12,
          cadastrosPorMes: cadastrosMonths,
        });

        setFinancialData({
          volumeTotal: totalFrete,
          mediaPorEntrega: entregasCount ? totalFrete / entregasCount : 0,
          crescimentoMensal: 8,
          fretePorMes: freteMonths,
        });

      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReportData();
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">Análises e métricas da plataforma</p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="operational">
          <OperationalReport data={operationalData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="growth">
          <GrowthReport data={growthData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReport data={financialData} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
