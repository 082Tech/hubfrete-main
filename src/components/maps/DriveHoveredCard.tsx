import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, Package, Truck, MessageCircle, ArrowRight, Weight, DollarSign, Navigation } from 'lucide-react';

import { EntregaMapItem } from './EntregasGoogleMap';

// Extended type to include delivery count info and extra details
type DriverMapItemWithCount = EntregaMapItem & {
  deliveryCount?: number;
  entregas?: Array<{
    codigo: string;
    status: string;
    origemCidade: string;
    destinoCidade: string;
    peso?: number;
    valor?: number;
  }>;
  speed?: number;
  telefone?: string;
};

function getInitials(name?: string | null) {
  if (!name) return 'M';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const statusColors: Record<string, string> = {
  aguardando: 'bg-amber-500',
  saiu_para_coleta: 'bg-cyan-500',
  saiu_para_entrega: 'bg-purple-500',
  entregue: 'bg-green-500',
  cancelada: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  saiu_para_coleta: 'Em Coleta',
  saiu_para_entrega: 'Em Entrega',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

export function DriverHoverCard({
  entrega,
  formattedTimestamp,
}: {
  entrega: DriverMapItemWithCount;
  formattedTimestamp?: string;
}) {
  const deliveryCount = entrega.deliveryCount ?? 1;
  const hasMultipleDeliveries = deliveryCount > 1;
  const entregas = entrega.entregas || [];

  return (
    <div className="bg-popover border rounded-xl shadow-xl p-4 min-w-[300px] max-w-[360px] z-50">
      {/* Header: Avatar + Nome + Placa */}
      <div className="flex gap-3 items-center">
        <Avatar className="h-11 w-11 ring-2 ring-background">
          <AvatarImage src={entrega.motoristaFotoUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {getInitials(entrega.motorista)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {entrega.motorista || 'Motorista'}
          </div>

          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {entrega.placa && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Truck className="w-2.5 h-2.5 mr-1" />
                {entrega.placa}
              </Badge>
            )}
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
              <Package className="w-2.5 h-2.5 mr-1" />
              {deliveryCount} entrega{deliveryCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status e Atualização */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{formattedTimestamp ?? '-'}</span>
        </div>
        {entrega.speed !== undefined && entrega.speed > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Navigation className="w-3 h-3" />
            <span>{Math.round(entrega.speed)} km/h</span>
          </div>
        )}
      </div>

      {/* Lista de entregas (max 3) */}
      {entregas.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Cargas em andamento
          </span>
          {entregas.slice(0, 3).map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded-md px-2 py-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[e.status] || 'bg-gray-400'}`} />
              <span className="font-mono text-[10px] text-muted-foreground">{e.codigo}</span>
              <span className="text-muted-foreground">•</span>
              <span className="truncate flex-1">{e.origemCidade} → {e.destinoCidade}</span>
            </div>
          ))}
          {entregas.length > 3 && (
            <div className="text-[10px] text-muted-foreground text-center">
              +{entregas.length - 3} mais entregas
            </div>
          )}
        </div>
      )}

      {/* Info da entrega única */}
      {!hasMultipleDeliveries && entrega.destino && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Origem</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <MapPin className="w-3 h-3 text-destructive shrink-0" />
            <span className="truncate">{entrega.destino}</span>
          </div>
          {entrega.codigo && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <Package className="w-3 h-3 shrink-0" />
              <span>Carga {entrega.codigo}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-primary">
          <MessageCircle className="w-3 h-3 shrink-0" />
          <span>Contato via chat</span>
        </div>
        {hasMultipleDeliveries && (
          <span className="text-[10px] text-muted-foreground">
            Clique para ver detalhes
          </span>
        )}
      </div>
    </div>
  );
}