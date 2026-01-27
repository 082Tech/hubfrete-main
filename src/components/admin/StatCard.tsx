import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: {
    value: number;
    label: string;
  };
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, iconClassName, trend, subtitle }: StatCardProps) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('p-2 rounded-lg', iconClassName || 'bg-primary/10')}>
            <Icon className={cn('w-5 h-5', iconClassName?.includes('text-') ? '' : 'text-primary')} />
          </div>
          {trend && (
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded ml-auto',
              trend.value > 0 
                ? 'bg-chart-1/10 text-chart-1' 
                : trend.value < 0 
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
            )}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
