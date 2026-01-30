import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodData {
  entregas: number;
  km_rodado: number;
  custo_total: number;
  taxa_atraso: number;
}

interface PeriodComparisonProps {
  current: PeriodData;
  previous: PeriodData;
  currentLabel: string;
  previousLabel: string;
}

export function PeriodComparison({
  current,
  previous,
  currentLabel,
  previousLabel,
}: PeriodComparisonProps) {
  const calculateChange = (currentVal: number, previousVal: number) => {
    if (previousVal === 0) return currentVal > 0 ? 100 : 0;
    return ((currentVal - previousVal) / previousVal) * 100;
  };

  const metrics = [
    {
      label: 'Entregas',
      current: current.entregas,
      previous: previous.entregas,
      format: (v: number) => v.toString(),
      positiveIsGood: true,
    },
    {
      label: 'Km Rodado',
      current: current.km_rodado,
      previous: previous.km_rodado,
      format: (v: number) => `${v.toLocaleString('pt-BR')} km`,
      positiveIsGood: true,
    },
    {
      label: 'Custo Total',
      current: current.custo_total,
      previous: previous.custo_total,
      format: (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      positiveIsGood: false, // Lower cost is better
    },
    {
      label: 'Taxa de Atraso',
      current: current.taxa_atraso,
      previous: previous.taxa_atraso,
      format: (v: number) => `${v.toFixed(1)}%`,
      positiveIsGood: false, // Lower delay rate is better
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Comparativo de Período</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {currentLabel} vs {previousLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const change = calculateChange(metric.current, metric.previous);
            const isPositive = metric.positiveIsGood ? change > 0 : change < 0;
            const isNegative = metric.positiveIsGood ? change < 0 : change > 0;

            return (
              <div
                key={metric.label}
                className="p-4 rounded-lg bg-muted/30 border border-border"
              >
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground">
                    {metric.format(metric.current)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {change === 0 ? (
                    <Minus className="w-3 h-3 text-muted-foreground" />
                  ) : isPositive ? (
                    <TrendingUp className="w-3 h-3 text-chart-2" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      change === 0
                        ? 'text-muted-foreground'
                        : isPositive
                        ? 'text-chart-2'
                        : 'text-destructive'
                    )}
                  >
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs anterior</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Anterior: {metric.format(metric.previous)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
