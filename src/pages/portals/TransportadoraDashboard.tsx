import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Users, 
  Package, 
  TrendingUp,
  MapPin,
  ArrowUpRight
} from 'lucide-react';

const stats = [
  { label: 'Veículos Ativos', value: '15', icon: Truck, color: 'chart-2' },
  { label: 'Motoristas', value: '18', icon: Users, color: 'chart-1' },
  { label: 'Entregas Hoje', value: '23', icon: Package, color: 'chart-3' },
  { label: 'Faturamento (mês)', value: 'R$ 85k', icon: TrendingUp, color: 'chart-4' },
];

const activeVehicles = [
  { placa: 'ABC-1234', motorista: 'João Silva', rota: 'SP → RJ', status: 'Em Rota' },
  { placa: 'DEF-5678', motorista: 'Maria Santos', rota: 'PR → SC', status: 'Em Rota' },
  { placa: 'GHI-9012', motorista: 'Carlos Oliveira', rota: 'MG → DF', status: 'Parado' },
];

export default function TransportadoraDashboard() {
  return (
    <PortalLayout expectedUserType="transportadora">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Portal da Transportadora
            </h1>
            <p className="text-muted-foreground">Gerencie sua frota e motoristas</p>
          </div>
          <Button className="gap-2">
            <MapPin className="w-4 h-4" />
            Ver Mapa
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 bg-[hsl(var(--${stat.color}))]/10 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 text-[hsl(var(--${stat.color}))]`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Vehicles */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Veículos em Operação</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todos <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVehicles.map((vehicle) => (
                <div key={vehicle.placa} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{vehicle.placa}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.motorista}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{vehicle.rota}</p>
                    <p className={`text-xs font-medium ${
                      vehicle.status === 'Em Rota' ? 'text-[hsl(var(--chart-1))]' : 'text-[hsl(var(--chart-4))]'
                    }`}>{vehicle.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
