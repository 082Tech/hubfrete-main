import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft,
  Percent,
  Calculator,
  PiggyBank,
  Receipt
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Progress } from '@/components/ui/progress';

interface FinancialMetrics {
  freteBruto: number;
  custoOperacional: number;
  margemBruta: number;
  margemPercentual: number;
  ticketMedio: number;
  custoPorKg: number;
  receitaPorKm: number;
  custoFreteVsMercadoria: number;
  freteChange: number;
  valorMercadoria?: number;
}

interface MonthlyData {
  mes: string;
  receita: number;
  custo: number;
  margem: number;
}

interface CostBreakdown {
  name: string;
  value: number;
}

interface FinancialTabProps {
  metrics: FinancialMetrics;
  monthlyData: MonthlyData[];
  costBreakdown: CostBreakdown[];
  formatCurrency: (value: number) => string;
  portalType: 'embarcador' | 'transportadora';
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function FinancialTab({ 
  metrics, 
  monthlyData, 
  costBreakdown, 
  formatCurrency,
  portalType 
}: FinancialTabProps) {
  const isEmbarcador = portalType === 'embarcador';
  
  return (
    <>
      {/* DRE Summary */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-chart-2" />
            {isEmbarcador ? 'DRE - Custos Logísticos' : 'DRE - Resultado Operacional'}
          </CardTitle>
          <CardDescription>
            {isEmbarcador 
              ? 'Demonstrativo de custos com frete no período'
              : 'Demonstrativo de resultados do período'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main DRE Items */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {isEmbarcador ? 'Valor Total Mercadorias' : 'Receita Bruta (Frete)'}
                  </span>
                  <span className="text-lg font-bold text-chart-2">
                    {formatCurrency(isEmbarcador ? (metrics.valorMercadoria || 0) : metrics.freteBruto)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {isEmbarcador ? 'Custo Total Frete' : 'Custo Operacional'}
                  </span>
                  <span className="text-lg font-bold text-destructive">
                    -{formatCurrency(isEmbarcador ? metrics.freteBruto : metrics.custoOperacional)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <span className="text-sm font-bold">
                    {isEmbarcador ? '% Frete s/ Mercadoria' : 'Margem Bruta'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      {isEmbarcador 
                        ? `${metrics.custoFreteVsMercadoria.toFixed(1)}%`
                        : formatCurrency(metrics.margemBruta)
                      }
                    </span>
                    {!isEmbarcador && (
                      <span className={`text-sm ${metrics.margemPercentual >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                        ({metrics.margemPercentual.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Ticket Médio</span>
                  <span className="text-lg font-bold">{formatCurrency(metrics.ticketMedio)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Custo por Kg</span>
                  <span className="text-lg font-bold">R$ {metrics.custoPorKg.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Variação vs Período Anterior</span>
                  <div className={`flex items-center gap-1 ${metrics.freteChange >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {metrics.freteChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-bold">{metrics.freteChange >= 0 ? '+' : ''}{metrics.freteChange}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly DRE Evolution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução Mensal
            </CardTitle>
            <CardDescription>Receita vs Custo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Legend />
                <Bar dataKey="receita" name={isEmbarcador ? "Valor Mercad." : "Receita"} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name={isEmbarcador ? "Custo Frete" : "Custo"} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="margem" name={isEmbarcador ? "% Frete" : "Margem"} stroke="hsl(var(--primary))" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              {isEmbarcador ? 'Distribuição por Tipo de Carga' : 'Composição de Custos'}
            </CardTitle>
            <CardDescription>Análise detalhada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {costBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              <PiggyBank className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(metrics.freteBruto)}</p>
              <p className="text-xs text-muted-foreground">Frete Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{formatCurrency(metrics.ticketMedio)}</p>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Percent className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{metrics.custoFreteVsMercadoria.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Frete/Mercadoria</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-chart-4/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">R$ {metrics.custoPorKg.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Custo/Kg</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
