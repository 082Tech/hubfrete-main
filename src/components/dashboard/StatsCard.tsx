import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  color?: 'primary' | 'accent' | 'chart1' | 'chart2' | 'chart3' | 'chart4';
  onClick?: () => void;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon,
  color = 'primary',
  onClick,
}: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent text-accent-foreground',
    chart1: 'bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))]',
    chart2: 'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]',
    chart3: 'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]',
    chart4: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]',
  };

  return (
    <Card 
      className={`border-border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {change > 0 ? (
                  <TrendingUp className="w-4 h-4 text-[hsl(var(--chart-2))]" />
                ) : change < 0 ? (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${
                  change > 0 
                    ? 'text-[hsl(var(--chart-2))]' 
                    : change < 0 
                      ? 'text-destructive' 
                      : 'text-muted-foreground'
                }`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
