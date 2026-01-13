import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  Plus,
  ArrowUpRight
} from 'lucide-react';

const stats = [
  { label: 'Cargas Ativas', value: '12', icon: Package, color: 'chart-2' },
  { label: 'Em Trânsito', value: '8', icon: Truck, color: 'chart-1' },
  { label: 'Aguardando Coleta', value: '4', icon: Clock, color: 'chart-4' },
  { label: 'Entregues (mês)', value: '47', icon: CheckCircle, color: 'chart-3' },
];

const recentLoads = [
  { id: 'CRG-001', destino: 'São Paulo, SP', status: 'Em Trânsito', data: '12/01/2026' },
  { id: 'CRG-002', destino: 'Rio de Janeiro, RJ', status: 'Aguardando', data: '11/01/2026' },
  { id: 'CRG-003', destino: 'Curitiba, PR', status: 'Entregue', data: '10/01/2026' },
];

export default function EmbarcadorDashboard() {
  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Gerencie suas cargas e acompanhe entregas</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Carga
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

        {/* Recent Loads */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cargas Recentes</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLoads.map((load) => (
                <div key={load.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div>
                    <p className="font-medium text-foreground">{load.id}</p>
                    <p className="text-sm text-muted-foreground">{load.destino}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      load.status === 'Entregue' ? 'text-[hsl(var(--chart-1))]' :
                      load.status === 'Em Trânsito' ? 'text-[hsl(var(--chart-2))]' :
                      'text-[hsl(var(--chart-4))]'
                    }`}>{load.status}</p>
                    <p className="text-xs text-muted-foreground">{load.data}</p>
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
