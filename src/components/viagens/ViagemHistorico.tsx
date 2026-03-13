import { Clock } from 'lucide-react';
import { EventTimeline, type TimelineEvent } from '@/components/shared/EventTimeline';

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
  /** Nome do usuário que realizou ações manuais (iniciar, finalizar, cancelar viagem) */
  actionUserName?: string;
}

export function ViagemHistorico({ viagem, entregas, actionUserName }: ViagemHistoricoProps) {
  const timelineItems: TimelineEvent[] = [];
  const baseTime = new Date(viagem.created_at).getTime();

  const firstCreationEvent = entregas
    .flatMap(e => e.eventos || [])
    .find(ev => ev.tipo === 'criado');
  const tripCreatorName = firstCreationEvent?.user_nome || 'Sistema';

  // Trip creation
  timelineItems.push({
    id: `viagem-created-${viagem.id}`,
    timestamp: new Date(baseTime).toISOString(),
    tipo: 'viagem_criada',
    user_nome: tripCreatorName,
    entityCodigo: viagem.codigo,
    entityType: 'viagem',
  });

  // Trip aguardando
  if (['aguardando', 'em_andamento', 'finalizada', 'cancelada'].includes(viagem.status)) {
    timelineItems.push({
      id: `viagem-aguardando-${viagem.id}`,
      timestamp: viagem.started_at || new Date(baseTime + 1).toISOString(),
      tipo: 'viagem_aguardando',
      user_nome: 'Sistema',
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
    });
  }

  // Trip em_andamento (ação do usuário, não do sistema)
  if (['em_andamento', 'finalizada', 'cancelada'].includes(viagem.status) && viagem.started_at) {
    timelineItems.push({
      id: `viagem-em-andamento-${viagem.id}`,
      timestamp: viagem.started_at,
      tipo: 'viagem_em_andamento',
      user_nome: actionUserName || tripCreatorName,
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
    });
  }

  // Trip finalization/cancellation (ação do usuário)
  if (viagem.status === 'finalizada') {
    timelineItems.push({
      id: `viagem-finished-${viagem.id}`,
      timestamp: viagem.ended_at || viagem.updated_at || viagem.created_at,
      tipo: 'viagem_finalizada',
      user_nome: actionUserName || tripCreatorName,
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
    });
  } else if (viagem.status === 'cancelada') {
    timelineItems.push({
      id: `viagem-cancelled-${viagem.id}`,
      timestamp: viagem.updated_at || viagem.created_at,
      tipo: 'viagem_cancelada',
      user_nome: actionUserName || tripCreatorName,
      entityCodigo: viagem.codigo,
      entityType: 'viagem',
    });
  }

  // Delivery events
  entregas.forEach(entrega => {
    (entrega.eventos || []).forEach(evento => {
      timelineItems.push({
        id: evento.id,
        timestamp: evento.timestamp,
        tipo: evento.tipo,
        user_nome: evento.user_nome || 'Sistema',
        entityCodigo: entrega.codigo,
        entityType: 'entrega',
      });
    });
  });

  // Sort descending
  const sortedTimeline = timelineItems.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return <EventTimeline events={sortedTimeline} />;
}
