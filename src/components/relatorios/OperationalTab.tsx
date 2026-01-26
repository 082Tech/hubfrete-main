import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  MapPin, 
  Users, 
  Package,
  Route,
  Fuel,
  Clock,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface OperationalMetrics {
  veiculosAtivos: number;
  veiculosTotal: number;
  motoristasAtivos: number;
  motoristasTotal: number;
  kmRodado: number;
  consumoCombustivel: number;
  utilizacaoFrota: number;
  ocupacaoMedia: number;
  rotasRealizadas: number;
  paradaMédiaMinutos: number;
}

interface TopRoute {
  destino: string;
  entregas: number;
  frete: number;
}

interface VehicleUsage {
  tipo: string;
  quantidade: number;
  utilizacao?: number;
}

interface DailyActivity {
  dia: string;
  coletas: number;
  entregas: number;
}

interface OperationalTabProps {
  metrics: OperationalMetrics;
  topRoutes: TopRoute[];
  vehicleUsage: VehicleUsage[];
  dailyActivity: DailyActivity[];
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

export function OperationalTab({ 
  metrics, 
  topRoutes,
  vehicleUsage,
  dailyActivity,
  formatCurrency,
  portalType 
}: OperationalTabProps) {
  const isTransportadora = portalType === 'transportadora';

  return (
    <>
      {/* Fleet & Drivers KPIs */}
      {isTransportadora && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.veiculosAtivos}/{metrics.veiculosTotal}</p>
                <p className="text-xs text-muted-foreground">Veículos Ativos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.motoristasAtivos}/{metrics.motoristasTotal}</p>
                <p className="text-xs text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Activity className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.utilizacaoFrota}%</p>
                <p className="text-xs text-muted-foreground">Utilização Frota</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Package className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.ocupacaoMedia}%</p>
                <p className="text-xs text-muted-foreground">Ocupação Média</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Routes */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Top Destinos
          </CardTitle>
          <CardDescription>Principais rotas por volume de entregas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem dados de rotas no período
              </p>
            ) : (
              topRoutes.map((route, index) => (
                <div 
                  key={route.destino}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20`, color: CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{route.destino}</p>
                      <p className="text-xs text-muted-foreground">{route.entregas} entregas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-chart-2">{formatCurrency(route.frete)}</p>
                    <p className="text-xs text-muted-foreground">frete total</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Atividade Diária
            </CardTitle>
            <CardDescription>Coletas e entregas por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyActivity}>
                <defs>
                  <linearGradient id="colorColetasOp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEntregasOp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="coletas" 
                  name="Coletas"
                  stroke="hsl(var(--chart-1))" 
                  fillOpacity={1} 
                  fill="url(#colorColetasOp)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="entregas" 
                  name="Entregas"
                  stroke="hsl(var(--chart-2))" 
                  fillOpacity={1} 
                  fill="url(#colorEntregasOp)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Usage (Transportadora) / Cargo Types (Embarcador) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isTransportadora ? <Truck className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-primary" />}
              {isTransportadora ? 'Utilização por Tipo de Veículo' : 'Distribuição por Tipo de Carga'}
            </CardTitle>
            <CardDescription>Análise detalhada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vehicleUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis dataKey="tipo" type="category" tick={{ fontSize: 10 }} width={80} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="quantidade" name="Quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPIs for Transportadora */}
      {isTransportadora && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <Route className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-lg font-bold">{metrics.rotasRealizadas}</p>
                <p className="text-xs text-muted-foreground">Rotas Realizadas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <MapPin className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-lg font-bold">{metrics.kmRodado.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Km Rodados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Fuel className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-lg font-bold">{metrics.consumoCombustivel}L</p>
                <p className="text-xs text-muted-foreground">Consumo Est.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Clock className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{metrics.paradaMédiaMinutos}min</p>
                <p className="text-xs text-muted-foreground">Parada Média</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
