import { Activity, Truck, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export default function Monitoramento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Monitoramento
        </h1>
        <p className="text-muted-foreground">Rastreamento em tempo real de entregas e veículos</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="p-4 bg-chart-2/10 rounded-full mb-4">
              <Truck className="w-8 h-8 text-chart-2" />
            </div>
            <CardTitle className="text-lg mb-2">Veículos em Rota</CardTitle>
            <p className="text-sm text-muted-foreground">
              Em breve: Visualização de todos os veículos ativos no mapa
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="p-4 bg-chart-1/10 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-chart-1" />
            </div>
            <CardTitle className="text-lg mb-2">Geofences</CardTitle>
            <p className="text-sm text-muted-foreground">
              Em breve: Alertas automáticos de entrada/saída de áreas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
            <div className="p-4 bg-chart-3/10 rounded-full mb-4">
              <Clock className="w-8 h-8 text-chart-3" />
            </div>
            <CardTitle className="text-lg mb-2">Tempo Real</CardTitle>
            <p className="text-sm text-muted-foreground">
              Em breve: Atualizações instantâneas de status
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2 min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <Activity className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            Mapa de Monitoramento
          </h3>
          <p className="text-muted-foreground max-w-md">
            Esta funcionalidade está em desenvolvimento. Em breve você poderá visualizar 
            todas as entregas e veículos em tempo real diretamente neste painel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
