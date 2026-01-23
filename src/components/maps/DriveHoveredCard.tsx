import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Phone, MapPin, Package, Truck } from 'lucide-react';

import { EntregaMapItem } from './EntregasGoogleMap';

// Extended type to include delivery count info
type DriverMapItemWithCount = EntregaMapItem & {
  deliveryCount?: number;
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

export function DriverHoverCard({
  entrega,
  formattedTimestamp,
}: {
  entrega: DriverMapItemWithCount;
  formattedTimestamp?: string;
}) {
  const hasMultipleDeliveries = (entrega.deliveryCount ?? 1) > 1;

  return (
    <div className="bg-popover border rounded-xl shadow-xl p-4 min-w-[280px] max-w-[320px] z-50">
      <div className="flex gap-3 items-center">
        <Avatar className="h-10 w-10 ring-2 ring-background">
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

            {hasMultipleDeliveries && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                <Package className="w-2.5 h-2.5 mr-1" />
                {entrega.deliveryCount} entregas
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Atualizado: {formattedTimestamp ?? '-'}</span>
        </div>

        {entrega.telefone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{entrega.telefone}</span>
          </div>
        )}

        {!hasMultipleDeliveries && entrega.destino && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{entrega.destino}</span>
          </div>
        )}

        {!hasMultipleDeliveries && entrega.codigo && (
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3 shrink-0" />
            <span>Carga {entrega.codigo}</span>
          </div>
        )}
      </div>

      {hasMultipleDeliveries && (
        <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground text-center">
          Clique para ver entregas deste motorista
        </div>
      )}
    </div>
  );
}