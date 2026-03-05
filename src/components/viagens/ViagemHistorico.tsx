import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, FileText, ArrowLeftRight, Clock, History, Truck
} from 'lucide-react';

interface Evento {
  id: string;
  tipo: string;
  timestamp: string;
  observacao: string | null;
  user_nome: string | null;
}

interface ViagemEntrega {
  id: string;
  codigo: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  eventos?: Evento[];
}

interface ViagemHistoricoProps {
  viagem: {
    id: string;
    codigo: string;
    status: string;
    created_at: string;
    updated_at?: string;
    started_at?: string | null;
    ended_at?: string | null;
  };
  entregas: ViagemEntrega[];
}

const tipoConfig: Record<string, { label: string; bgColor: string; isDocument?: boolean; isCreation?: boolean; isTrip?: boolean }> = {
  criado: { label: 'Carga criada', bgColor: 'bg-gray-100 dark:bg-gray-900/30', isCreation: true },
  aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  inicio_coleta: { label: 'Saiu para Coleta', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  inicio_rota: { label: 'Saiu para Entrega', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  finalizado: { label: 'Concluída', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelado: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  problema: { label: 'Problema', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  documento_anexado: { label: 'Documento anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  cte_anexado: { label: 'CT-e anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  manifesto_anexado: { label: 'Manifesto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  canhoto_anexado: { label: 'Canhoto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  nf_anexada: { label: 'Nota Fiscal anexada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  // Trip lifecycle events
  viagem_criada: { label: 'Viagem criada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isCreation: true, isTrip: true },
  viagem_aguardando: { label: 'Aguardando', bgColor: 'bg-sky-100 dark:bg-sky-900/30', isTrip: true },
  viagem_em_andamento: { label: 'Em Andamento', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isTrip: true },
  viagem_finalizada: { label: 'Finalizada', bgColor: 'bg-green-100 dark:bg-green-900/30', isTrip: true },
  viagem_cancelada: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30', isTrip: true },
};

const iconColor: Record<string, string> = {
  criado: 'text-gray-600 dark:text-gray-400',
  aceite: 'text-amber-600 dark:text-amber-400',
  inicio_coleta: 'text-cyan-600 dark:text-cyan-400',
  inicio_rota: 'text-purple-600 dark:text-purple-400',
  finalizado: 'text-green-600 dark:text-green-400',
  cancelado: 'text-red-600 dark:text-red-400',
  problema: 'text-orange-600 dark:text-orange-400',
  viagem_criada: 'text-blue-600 dark:text-blue-400',
  viagem_aguardando: 'text-sky-600 dark:text-sky-400',
  viagem_em_andamento: 'text-blue-600 dark:text-blue-400',
  viagem_finalizada: 'text-green-600 dark:text-green-400',
  viagem_cancelada: 'text-red-600 dark:text-red-400',
};

interface TimelineItem {
  id: string;
  timestamp: string;
  tipo: string;
  user_nome: string;
  entityCodigo?: string;
  entityType: 'viagem' | 'entrega';
  _sortOrder: number;
}

export function ViagemHistorico({ viagem, entregas }: ViagemHistoricoProps) {
  // Build unified timeline
  const timelineItems: TimelineItem[] = [];
  const baseTime = new Date(viagem.created_at).getTime();

  // Derive trip creator from the first delivery's 'criado' event
  const firstCreationEvent = entregas
    .flatMap(e => e.eventos || [])
    .find(ev => ev.tipo === 'criado');
  const tripCreatorName = firstCreationEvent?.user_nome || 'Sistema';

  // 1. Trip creation event (earliest)
  timelineItems.push({
    id: `viagem-created-${viagem.id}`,
    timestamp: new Date(baseTime).toISOString(),
    tipo: 'viagem_criada',
    user_nome: tripCreatorName,
    entityCodigo: viagem.codigo,
    entityType: 'viagem',
    _sortOrder: 0,
  });

  // 2. Trip status aguardando (right after creation)
  if (['aguardando', 'em_andamento', 'finalizada', 'cancelada'].includes(viagem.status)) {
    timelineItems.push({
      id: `viagem-aguardando-${viagem.id}`,
      timestamp: viagem.started_at || new Date(baseTime + 1).toISOString(),
      tipo: 'viagem_aguardando',
      user_nome: 'Sistema',
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
      _sortOrder: 1,
    });
  }

  // 3. Trip in progress (em_andamento)
  if (['em_andamento', 'finalizada', 'cancelada'].includes(viagem.status) && viagem.started_at) {
    timelineItems.push({
      id: `viagem-em-andamento-${viagem.id}`,
      timestamp: viagem.started_at,
      tipo: 'viagem_em_andamento',
      user_nome: 'Sistema',
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
      _sortOrder: 2,
    });
  }

  // 4. Trip finalization/cancellation
  if (viagem.status === 'finalizada') {
    timelineItems.push({
      id: `viagem-finished-${viagem.id}`,
      timestamp: viagem.ended_at || viagem.updated_at || viagem.created_at,
      tipo: 'viagem_finalizada',
      user_nome: 'Sistema',
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
      _sortOrder: 100,
    });
  } else if (viagem.status === 'cancelada') {
    timelineItems.push({
      id: `viagem-cancelled-${viagem.id}`,
      timestamp: viagem.updated_at || viagem.created_at,
      tipo: 'viagem_cancelada',
      user_nome: 'Sistema',
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
      _sortOrder: 100,
    });
  }

  // 5. Delivery events (with sort order based on their timestamp relative to viagem)
  entregas.forEach(entrega => {
    (entrega.eventos || []).forEach(evento => {
      timelineItems.push({
        id: evento.id,
        timestamp: evento.timestamp,
        tipo: evento.tipo,
        user_nome: evento.user_nome || 'Sistema',
        entityCodigo: entrega.codigo,
        entityType: 'entrega',
        _sortOrder: 10,
      });
    });
  });

  // Sort: by timestamp ascending (oldest first = top), then by _sortOrder ascending for same-time events
  const sortedTimeline = timelineItems.sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (Math.abs(timeDiff) < 100) {
      // Same moment (~100ms window): use sort order (lower = earlier in timeline)
      return a._sortOrder - b._sortOrder;
    }
    return timeDiff;
  });

  if (sortedTimeline.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        <Clock className="w-4 h-4 mr-2" />
        Nenhum evento registrado
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

      <div className="space-y-4">
        {sortedTimeline.map((item) => {
          const config = tipoConfig[item.tipo] || { label: item.tipo.replace(/_/g, ' '), bgColor: 'bg-muted dark:bg-muted/50' };
          const isDocument = config.isDocument || item.tipo.includes('documento') || item.tipo.includes('anexa');
          const isCreation = config.isCreation;
          const isTrip = config.isTrip;
          const color = iconColor[item.tipo] || 'text-muted-foreground';

          // Build descriptive text
          let actionText: string;
          let labelText: string | null = null;

          if (isCreation) {
            actionText = item.tipo === 'viagem_criada'
              ? ' criou esta viagem'
              : ' criou esta entrega';
          } else if (isDocument) {
            actionText = ' anexou ';
            labelText = config.label;
          } else if (isTrip) {
            actionText = ' definiu o status como ';
            labelText = config.label;
          } else {
            actionText = ' definiu o status como ';
            labelText = config.label;
          }

          // Context suffix
          const contextSuffix = isTrip ? ' (viagem)' : item.entityType === 'entrega' ? ' (entrega)' : '';

          return (
            <div key={item.id} className="relative flex items-start gap-3">
              {/* Icon */}
              <div className={`relative z-10 w-8 h-8 rounded-md ${config.bgColor} flex items-center justify-center shrink-0`}>
                {isDocument ? (
                  <FileText className={`w-4 h-4 text-blue-600 dark:text-blue-400`} />
                ) : isCreation ? (
                  <Package className={`w-4 h-4 ${color}`} />
                ) : isTrip ? (
                  <Truck className={`w-4 h-4 ${color}`} />
                ) : (
                  <ArrowLeftRight className={`w-4 h-4 ${color}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm">
                  <span className="font-medium">{item.user_nome}</span>
                  <span className="text-muted-foreground">{actionText}</span>
                  {labelText && (
                    <>
                      <span className="font-medium">{labelText}</span>
                      <span className="text-muted-foreground text-xs">{contextSuffix}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(item.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {item.entityCodigo && (
                    <> • {item.entityCodigo}</>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
