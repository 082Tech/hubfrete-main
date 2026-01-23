import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Phone, MapPin, Package } from 'lucide-react';

import { EntregaMapItem } from './EntregasGoogleMap';

function getInitials(name?: string | null) {
    if (!name) return 'M';
    return name
        .split(' ')
        .slice(0, 2)
        .map(p => p[0])
        .join('')
        .toUpperCase();
}

export function DriverHoverCard({ entrega, formattedTimestamp }: { entrega: EntregaMapItem, formattedTimestamp?: string }) {
    return (
        <div className="bg-popover border rounded-xl shadow-xl p-4 min-w-[280px] z-50">
            <div className="flex gap-3 items-center">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={entrega.motoristaFotoUrl ?? undefined} />
                    <AvatarFallback>
                        {getInitials(entrega.motorista)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                    <div className="font-semibold text-sm">
                        {entrega.motorista || 'Motorista'}
                    </div>

                    {entrega.status && (
                        <Badge className="mt-1 text-[10px]">
                            {entrega.status}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Última atualização: {formattedTimestamp ?? '-'}
                </div>

                {entrega.telefone && (
                    <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {entrega.telefone}
                    </div>
                )}

                {entrega.destino && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {entrega.destino}
                    </div>
                )}

                {entrega.codigo && (
                    <div className="flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        Carga {entrega.codigo}
                    </div>
                )}
            </div>
        </div>
    );
}