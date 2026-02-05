import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, Truck, MapPin, CheckCircle, XCircle, FileText, Clock, ArrowLeftRight, Route
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  };
  entregas: ViagemEntrega[];
}

const eventoConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  criado: { label: 'Criado', icon: Package, color: 'bg-blue-500' },
  aceite: { label: 'Aceite', icon: CheckCircle, color: 'bg-green-500' },
  inicio_coleta: { label: 'Saiu p/ Coleta', icon: Truck, color: 'bg-cyan-500' },
  inicio_rota: { label: 'Saiu p/ Entrega', icon: MapPin, color: 'bg-purple-500' },
  finalizado: { label: 'Entregue', icon: CheckCircle, color: 'bg-green-600' },
  problema: { label: 'Problema', icon: XCircle, color: 'bg-red-500' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'bg-red-600' },
  documento: { label: 'Documento', icon: FileText, color: 'bg-gray-500' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-500' },
  saiu_para_coleta: { label: 'Saiu p/ Coleta', color: 'bg-cyan-500' },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-500' },
  entregue: { label: 'Entregue', color: 'bg-green-500' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500' },
};

export function ViagemHistorico({ viagem, entregas }: ViagemHistoricoProps) {
  // Construir timeline unificada
  const timelineItems: Array<{
    id: string;
    timestamp: string;
    tipo: string;
    descricao: string;
    entityType: 'viagem' | 'entrega';
    entityCodigo: string;
    user_nome?: string | null;
  }> = [];

  // Evento de criação da viagem
  timelineItems.push({
    id: `viagem-created-${viagem.id}`,
    timestamp: viagem.created_at,
    tipo: 'criado',
    descricao: 'Viagem iniciada',
    entityType: 'viagem',
    entityCodigo: viagem.codigo,
    user_nome: 'Sistema',
  });

  // Evento de finalização da viagem (se aplicável)
  if (viagem.status === 'finalizada') {
    // Usa o timestamp da última entrega finalizada como referência
    const lastFinalized = entregas
      .filter(e => e.status === 'entregue')
      .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())[0];
    
    if (lastFinalized) {
      timelineItems.push({
        id: `viagem-finished-${viagem.id}`,
        timestamp: lastFinalized.updated_at || viagem.created_at,
        tipo: 'finalizado',
        descricao: 'Viagem finalizada',
        entityType: 'viagem',
        entityCodigo: viagem.codigo,
        user_nome: 'Sistema',
      });
    }
  }

  // Eventos das entregas
  entregas.forEach(entrega => {
    (entrega.eventos || []).forEach(evento => {
      timelineItems.push({
        id: evento.id,
        timestamp: evento.timestamp,
        tipo: evento.tipo,
        descricao: evento.observacao || eventoConfig[evento.tipo]?.label || evento.tipo,
        entityType: 'entrega',
        entityCodigo: entrega.codigo,
        user_nome: evento.user_nome,
      });
    });
  });

  // Ordenar por timestamp (mais recentes primeiro)
  const sortedTimeline = timelineItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

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
      {/* Linha vertical conectora */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

      <div className="space-y-3">
        {sortedTimeline.map((item, index) => {
          const config = eventoConfig[item.tipo] || { label: item.tipo, icon: ArrowLeftRight, color: 'bg-gray-500' };
          const IconComponent = config.icon;

          return (
            <div key={item.id} className="relative flex items-start gap-3 pl-1">
              {/* Ícone com borda */}
              <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-md ${config.color} text-white shrink-0`}>
                <IconComponent className="w-3.5 h-3.5" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] px-1.5 py-0 ${item.entityType === 'viagem' ? 'border-primary text-primary' : ''}`}
                  >
                    {item.entityType === 'viagem' ? (
                      <><Route className="w-2.5 h-2.5 mr-1" />{item.entityCodigo}</>
                    ) : (
                      <>{item.entityCodigo}</>
                    )}
                  </Badge>
                  <span className="text-xs font-medium">{config.label}</span>
                </div>

                {item.descricao && item.descricao !== config.label && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.descricao}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{format(new Date(item.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  {item.user_nome && (
                    <>
                      <span>•</span>
                      <span>{item.user_nome}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
