import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Truck,
  Phone,
  MessageCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

const activeDeliveries = [
  { 
    id: 'FRT-001', 
    motorista: 'João Silva',
    telefone: '(11) 99999-1111',
    origem: 'São Paulo, SP', 
    destino: 'Rio de Janeiro, RJ', 
    status: 'em_transito',
    eta: '14:30',
    progresso: 75,
    alerta: null
  },
  { 
    id: 'FRT-002', 
    motorista: 'Maria Santos',
    telefone: '(11) 99999-2222',
    origem: 'Curitiba, PR', 
    destino: 'Florianópolis, SC', 
    status: 'em_transito',
    eta: '16:00',
    progresso: 45,
    alerta: 'desvio_rota'
  },
  { 
    id: 'FRT-003', 
    motorista: 'Carlos Oliveira',
    telefone: '(11) 99999-3333',
    origem: 'Belo Horizonte, MG', 
    destino: 'Brasília, DF', 
    status: 'atrasado',
    eta: '18:30',
    progresso: 30,
    alerta: 'atraso'
  },
  { 
    id: 'FRT-004', 
    motorista: 'Ana Costa',
    telefone: '(11) 99999-4444',
    origem: 'Porto Alegre, RS', 
    destino: 'Curitiba, PR', 
    status: 'entregue',
    eta: '-',
    progresso: 100,
    alerta: null
  },
  { 
    id: 'FRT-005', 
    motorista: 'Pedro Lima',
    telefone: '(11) 99999-5555',
    origem: 'Recife, PE', 
    destino: 'Salvador, BA', 
    status: 'panico',
    eta: '15:45',
    progresso: 60,
    alerta: 'panico'
  },
];

const alerts = [
  { id: 1, tipo: 'panico', mensagem: 'Botão de pânico acionado - FRT-005', tempo: '2 min atrás', urgente: true },
  { id: 2, tipo: 'desvio', mensagem: 'Desvio de rota detectado - FRT-002', tempo: '15 min atrás', urgente: true },
  { id: 3, tipo: 'atraso', mensagem: 'Atraso estimado de 45min - FRT-003', tempo: '30 min atrás', urgente: false },
  { id: 4, tipo: 'sinal', mensagem: 'Perda de sinal GPS - FRT-007', tempo: '1h atrás', urgente: false },
];

export default function TorreControle() {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_transito':
        return <Badge className="bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))] hover:bg-[hsl(var(--chart-2))]/20">Em Trânsito</Badge>;
      case 'entregue':
        return <Badge className="bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))] hover:bg-[hsl(var(--chart-1))]/20">Entregue</Badge>;
      case 'atrasado':
        return <Badge className="bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] hover:bg-[hsl(var(--chart-4))]/20">Atrasado</Badge>;
      case 'panico':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 animate-pulse">PÂNICO</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'panico':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'desvio':
        return <MapPin className="w-4 h-4 text-[hsl(var(--chart-4))]" />;
      case 'atraso':
        return <Clock className="w-4 h-4 text-[hsl(var(--chart-4))]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredDeliveries = activeDeliveries.filter(d => 
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.motorista.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Torre de Controle
            </h1>
            <p className="text-muted-foreground">Monitoramento em tempo real de todas as operações</p>
          </div>
          <Button className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-[hsl(var(--chart-2))]/10 rounded-xl">
                <Truck className="w-6 h-6 text-[hsl(var(--chart-2))]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">23</p>
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-[hsl(var(--chart-1))]/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-[hsl(var(--chart-1))]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">145</p>
                <p className="text-sm text-muted-foreground">Entregues Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-[hsl(var(--chart-4))]/10 rounded-xl">
                <Clock className="w-6 h-6 text-[hsl(var(--chart-4))]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">2</p>
                <p className="text-sm text-muted-foreground">Alertas Urgentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Deliveries List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por ID ou motorista..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Entregas Ativas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredDeliveries.map((delivery) => (
                  <div 
                    key={delivery.id}
                    className={`p-4 rounded-lg border ${
                      delivery.alerta === 'panico' 
                        ? 'border-destructive bg-destructive/5 animate-pulse' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{delivery.id}</span>
                          {getStatusBadge(delivery.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{delivery.motorista}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{delivery.origem}</span>
                      <span>→</span>
                      <span>{delivery.destino}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-foreground">{delivery.progresso}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            delivery.status === 'panico' 
                              ? 'bg-destructive' 
                              : delivery.status === 'atrasado'
                                ? 'bg-[hsl(var(--chart-4))]'
                                : 'bg-primary'
                          }`}
                          style={{ width: `${delivery.progresso}%` }}
                        />
                      </div>
                      {delivery.eta !== '-' && (
                        <p className="text-xs text-muted-foreground">ETA: {delivery.eta}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Alerts Panel */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.urgente 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.tipo)}
                      <div className="flex-1">
                        <p className={`text-sm ${alert.urgente ? 'text-destructive font-medium' : 'text-foreground'}`}>
                          {alert.mensagem}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.tempo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Phone className="w-4 h-4" />
                  Contatar Motorista
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Enviar Mensagem em Massa
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MapPin className="w-4 h-4" />
                  Ver Mapa Completo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
