import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthChartProps {
  data: Array<{
    month: string;
    embarcadores: number;
    transportadoras: number;
    motoristas: number;
  }>;
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Crescimento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
              <Bar 
                dataKey="embarcadores" 
                name="Embarcadores"
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="transportadoras" 
                name="Transportadoras"
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="motoristas" 
                name="Motoristas"
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
