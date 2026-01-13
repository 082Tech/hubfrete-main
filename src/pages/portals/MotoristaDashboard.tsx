import { PortalLayout } from '@/components/portals/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  MapPin, 
  DollarSign, 
  Star,
  Search,
  ArrowUpRight,
  Navigation
} from 'lucide-react';

const stats = [
  { label: 'Viagens (mês)', value: '12', icon: MapPin, color: 'chart-2' },
  { label: 'Km Rodados', value: '4.850', icon: Navigation, color: 'chart-1' },
  { label: 'Ganhos (mês)', value: 'R$ 8.5k', icon: DollarSign, color: 'chart-3' },
  { label: 'Avaliação', value: '4.8', icon: Star, color: 'chart-4' },
];

const availableLoads = [
  { id: 'CRG-101', origem: 'São Paulo, SP', destino: 'Rio de Janeiro, RJ', valor: 'R$ 850', distancia: '430 km' },
  { id: 'CRG-102', origem: 'Campinas, SP', destino: 'Curitiba, PR', valor: 'R$ 1.200', distancia: '520 km' },
  { id: 'CRG-103', origem: 'Santos, SP', destino: 'Belo Horizonte, MG', valor: 'R$ 980', distancia: '580 km' },
];

export default function MotoristaDashboard() {
  return (
    <PortalLayout expectedUserType="motorista">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, Motorista!
            </h1>
            <p className="text-muted-foreground">Encontre cargas e gerencie suas viagens</p>
          </div>
          <Button className="gap-2">
            <Search className="w-4 h-4" />
            Buscar Cargas
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

        {/* Available Loads */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cargas Disponíveis Próximas</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableLoads.map((load) => (
                <div key={load.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{load.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {load.origem} → {load.destino}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{load.valor}</p>
                    <p className="text-xs text-muted-foreground">{load.distancia}</p>
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
