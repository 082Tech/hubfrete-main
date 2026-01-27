import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EntregasStatusChartProps {
  data: {
    aguardando: number;
    emRota: number;
    entregue: number;
    problema: number;
    cancelada: number;
  };
}

const COLORS = {
  aguardando: 'hsl(var(--chart-4))',
  emRota: 'hsl(var(--chart-2))',
  entregue: 'hsl(var(--chart-1))',
  problema: 'hsl(var(--chart-5))',
  cancelada: 'hsl(var(--destructive))',
};

const LABELS = {
  aguardando: 'Aguardando',
  emRota: 'Em Rota',
  entregue: 'Entregue',
  problema: 'Problema',
  cancelada: 'Cancelada',
};

export function EntregasStatusChart({ data }: EntregasStatusChartProps) {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Status das Entregas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          {total === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhuma entrega registrada
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Quantidade']}
                />
                <Legend 
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
