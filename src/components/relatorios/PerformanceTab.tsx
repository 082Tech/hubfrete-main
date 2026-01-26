import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Timer,
  CalendarClock,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadialBarChart, 
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Progress } from '@/components/ui/progress';

interface PerformanceMetrics {
  otifScore: number;
  onTimeDelivery: number;
  inFullDelivery: number;
  leadTimeAvg: number;
  leadTimeMeta: number;
  taxaConclusao: number;
  entreguesNoPrazo: number;
  entreguesAtrasados: number;
  devolucoesCount: number;
  devolucoesPercentual: number;
  ocorrenciasCount: number;
  ocorrenciasPercentual: number;
}

interface OTIFTrendData {
  periodo: string;
  otif: number;
  onTime: number;
  inFull: number;
}

interface LeadTimeData {
  periodo: string;
  leadTime: number;
  meta: number;
}

interface PerformanceTabProps {
  metrics: PerformanceMetrics;
  otifTrend: OTIFTrendData[];
  leadTimeData: LeadTimeData[];
  portalType: 'embarcador' | 'transportadora';
}

export function PerformanceTab({ 
  metrics, 
  otifTrend, 
  leadTimeData,
  portalType 
}: PerformanceTabProps) {
  const otifRadialData = [
    { name: 'OTIF', value: metrics.otifScore, fill: 'hsl(var(--chart-2))' },
  ];

  const performanceRadialData = [
    { name: 'On-Time', value: metrics.onTimeDelivery, fill: 'hsl(var(--chart-1))' },
    { name: 'In-Full', value: metrics.inFullDelivery, fill: 'hsl(var(--chart-3))' },
    { name: 'OTIF', value: metrics.otifScore, fill: 'hsl(var(--chart-2))' },
  ];

  return (
    <>
      {/* OTIF Main Score */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-chart-2" />
              Score OTIF
            </CardTitle>
            <CardDescription>On-Time In-Full Delivery</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  data={otifRadialData} 
                  startAngle={180} 
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-foreground">{metrics.otifScore}%</span>
                <span className="text-sm text-muted-foreground">OTIF</span>
              </div>
            </div>
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">On-Time</span>
                <span className="font-medium">{metrics.onTimeDelivery}%</span>
              </div>
              <Progress value={metrics.onTimeDelivery} className="h-2" />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">In-Full</span>
                <span className="font-medium">{metrics.inFullDelivery}%</span>
              </div>
              <Progress value={metrics.inFullDelivery} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Performance KPIs */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Indicadores de Performance
            </CardTitle>
            <CardDescription>Métricas de qualidade operacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-chart-2/5 rounded-lg border border-chart-2/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-chart-2" />
                  <span className="text-sm font-medium">No Prazo</span>
                </div>
                <p className="text-2xl font-bold text-chart-2">{metrics.entreguesNoPrazo}</p>
                <p className="text-xs text-muted-foreground">entregas</p>
              </div>
              
              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">Atrasadas</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{metrics.entreguesAtrasados}</p>
                <p className="text-xs text-muted-foreground">entregas</p>
              </div>
              
              <div className="p-4 bg-chart-4/5 rounded-lg border border-chart-4/20">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-chart-4" />
                  <span className="text-sm font-medium">Lead Time</span>
                </div>
                <p className="text-2xl font-bold text-chart-4">{metrics.leadTimeAvg.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">média (meta: {metrics.leadTimeMeta}h)</p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Taxa Conclusão</span>
                </div>
                <p className="text-2xl font-bold">{metrics.taxaConclusao}%</p>
                <Progress value={metrics.taxaConclusao} className="h-1.5 mt-1" />
              </div>
              
              <div className="p-4 bg-chart-5/5 rounded-lg border border-chart-5/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-chart-5" />
                  <span className="text-sm font-medium">Devoluções</span>
                </div>
                <p className="text-2xl font-bold">{metrics.devolucoesCount}</p>
                <p className="text-xs text-muted-foreground">{metrics.devolucoesPercentual.toFixed(1)}% do total</p>
              </div>
              
              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">Ocorrências</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{metrics.ocorrenciasCount}</p>
                <p className="text-xs text-muted-foreground">{metrics.ocorrenciasPercentual.toFixed(1)}% do total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* OTIF Trend */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução OTIF
            </CardTitle>
            <CardDescription>Tendência ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={otifTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Legend />
                <Line type="monotone" dataKey="otif" name="OTIF" stroke="hsl(var(--chart-2))" strokeWidth={3} dot />
                <Line type="monotone" dataKey="onTime" name="On-Time" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="inFull" name="In-Full" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Time Analysis */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              Análise de Lead Time
            </CardTitle>
            <CardDescription>Tempo médio vs Meta</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [`${value}h`, name]}
                />
                <Legend />
                <Bar dataKey="leadTime" name="Lead Time" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
