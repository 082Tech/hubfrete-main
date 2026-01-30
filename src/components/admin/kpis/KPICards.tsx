import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  className?: string;
}

export function KPICard({ title, value, subtitle, icon, trend, className }: KPICardProps) {
  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.value === 0 ? (
              <Minus className="w-4 h-4 text-muted-foreground" />
            ) : trend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-chart-2" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                trend.value === 0
                  ? 'text-muted-foreground'
                  : trend.isPositive
                  ? 'text-chart-2'
                  : 'text-destructive'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
