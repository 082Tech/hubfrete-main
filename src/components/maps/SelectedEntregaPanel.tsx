import { X, MapPin, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntregaMapItem } from './EntregasGoogleMap';

export function SelectedEntregaPanel({
    entrega,
    onClose,
}: {
    entrega: EntregaMapItem;
    onClose: () => void;
}) {
    return (
        <div className="absolute top-4 right-4 w-[320px] bg-background border rounded-xl shadow-xl p-4 z-50">
            <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm">
                    Detalhes da Carga
                </div>
                <Button size="icon" variant="ghost" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2 items-center">
                    <Package className="w-4 h-4" />
                    {entrega.codigo}
                </div>

                <div className="flex gap-2 items-center">
                    <MapPin className="w-4 h-4" />
                    {entrega.destino}
                </div>

                <div className="flex gap-2 items-center">
                    <Clock className="w-4 h-4" />
                    Última atualização: {entrega.lastLocationUpdate ?? '-'}
                </div>
            </div>
        </div>
    );
}