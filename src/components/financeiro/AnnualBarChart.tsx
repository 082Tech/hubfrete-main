import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/reportExport';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface AnnualBarChartProps {
  empresaId: number;
  /** Which side to filter on */
  filterColumn: 'empresa_embarcadora_id' | 'empresa_transportadora_id';
  /** Which value to display: frete bruto or líquido */
  valueField?: 'valor_frete' | 'valor_liquido';
  year?: number;
}

export function AnnualBarChart({ empresaId, filterColumn, valueField = 'valor_frete', year }: AnnualBarChartProps) {
  const currentYear = year ?? new Date().getFullYear();

  const { data: records, isLoading } = useQuery({
    queryKey: ['financeiro-anual', empresaId, filterColumn, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_entregas')
        .select('created_at, valor_frete, valor_liquido')
        .eq(filterColumn, empresaId)
        .gte('created_at', `${currentYear}-01-01`)
        .lte('created_at', `${currentYear}-12-31T23:59:59`);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const chartData = useMemo(() => {
    const months = MONTH_SHORT.map((name, i) => ({ name, total: 0 }));
    if (records) {
      for (const r of records) {
        const month = new Date(r.created_at).getMonth();
        months[month].total += Number(r[valueField] || 0);
      }
    }
    return months;
  }, [records, valueField]);

  const maxValue = Math.max(...chartData.map(d => d.total), 1);

  if (isLoading) return <Skeleton className="h-[200px] w-full" />;

  return (
    <Card className="border-border">
      <CardContent className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-foreground">Visão Anual — {currentYear}</p>
          <p className="text-xs text-muted-foreground">
            Total: {formatCurrency(chartData.reduce((s, d) => s + d.total, 0))}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [formatCurrency(value), 'Total']}
            />
            <Bar
              dataKey="total"
              fill="hsl(141 69% 48%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
