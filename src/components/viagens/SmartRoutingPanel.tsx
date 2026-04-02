import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, Clock, MapPin, Zap } from 'lucide-react';
import type { RoutingScore } from '@/lib/smartRouting';

interface SmartRoutingPanelProps {
  orderedDeliveries: RoutingScore[];
  entregaLabels?: Record<string, string>;
}

export function SmartRoutingPanel({ orderedDeliveries, entregaLabels = {} }: SmartRoutingPanelProps) {
  if (orderedDeliveries.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma entrega pendente para roteirizar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Ordem Sugerida de Entregas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Baseado na distância e urgência. Não altera a rota planejada.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {orderedDeliveries.map((d, index) => {
            const label = entregaLabels[d.entrega_id] || d.entrega_id.substring(0, 8);
            const isUrgent = d.urgencia >= 7;
            const isOverdue = d.prazo_horas_restantes !== null && d.prazo_horas_restantes <= 0;

            return (
              <div
                key={d.entrega_id}
                className="flex items-center gap-3 rounded-lg border p-2.5 text-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {d.distancia_km} km
                    </span>
                    {d.prazo_horas_restantes !== null && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" />
                        {isOverdue ? 'Atrasada' : `${d.prazo_horas_restantes}h`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isUrgent && (
                    <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
                      <Zap className="h-2.5 w-2.5" />
                      Urgente
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] h-5">
                    Score: {d.score}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
