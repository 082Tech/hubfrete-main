import { X, MapPin, Package, Truck, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EntregaMapItem } from '../EntregasGoogleMap';
import { cn } from '@/lib/utils';

interface SelectionPanelProps {
  entrega: EntregaMapItem;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  aguardando_coleta: { label: 'Aguardando Coleta', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  em_coleta: { label: 'Em Coleta', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  coletado: { label: 'Coletado', className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  em_transito: { label: 'Em Trânsito', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  em_entrega: { label: 'Em Rota', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  entregue: { label: 'Concluída', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  problema: { label: 'Problema', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function getInitials(name?: string | null): string {
  if (!name) return 'M';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '-';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SelectionPanel({ entrega, onClose }: SelectionPanelProps) {
  const statusConfig = STATUS_CONFIG[entrega.status ?? ''] ?? {
    label: entrega.status ?? 'Desconhecido',
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-background/95 backdrop-blur-sm border rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {entrega.codigo ?? 'Carga'}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Badge */}
        <Badge variant="outline" className={cn('text-xs font-medium', statusConfig.className)}>
          {statusConfig.label}
        </Badge>

        {/* Driver Info */}
        {entrega.motorista && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Avatar className="h-10 w-10 ring-2 ring-background">
              <AvatarImage src={entrega.motoristaFotoUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(entrega.motorista)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entrega.motorista}</p>
              {entrega.placa && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {entrega.placa}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2">
          {entrega.destino && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{entrega.destino}</span>
            </div>
          )}

          {entrega.latitude != null && entrega.longitude != null && (
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-mono text-xs">
                {entrega.latitude.toFixed(5)}, {entrega.longitude.toFixed(5)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Atualizado: {formatTimestamp(entrega.lastLocationUpdate)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Use o chat para contatar o motorista
        </p>
      </div>
    </div>
  );
}
