import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, FileText, ArrowLeftRight, Clock, History
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
  };
  entregas: ViagemEntrega[];
}

const tipoConfig: Record<string, { label: string; bgColor: string; isDocument?: boolean; isCreation?: boolean }> = {
  criado: { label: 'Entrega criada', bgColor: 'bg-gray-100 dark:bg-gray-900/30', isCreation: true },
  aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  inicio_coleta: { label: 'Saiu para Coleta', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  inicio_rota: { label: 'Saiu para Entrega', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  finalizado: { label: 'Entregue', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelado: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  problema: { label: 'Problema', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  documento_anexado: { label: 'Documento anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  cte_anexado: { label: 'CT-e anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  manifesto_anexado: { label: 'Manifesto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  canhoto_anexado: { label: 'Canhoto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  nf_anexada: { label: 'Nota Fiscal anexada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  viagem_criada: { label: 'Viagem iniciada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isCreation: true },
  viagem_finalizada: { label: 'Viagem finalizada', bgColor: 'bg-green-100 dark:bg-green-900/30' },
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
  viagem_finalizada: 'text-green-600 dark:text-green-400',
};

export function ViagemHistorico({ viagem, entregas }: ViagemHistoricoProps) {
  // Build unified timeline
  const timelineItems: Array<{
    id: string;
    timestamp: string;
    tipo: string;
    user_nome: string;
    entityCodigo?: string;
  }> = [];

  // Trip creation event
  timelineItems.push({
    id: `viagem-created-${viagem.id}`,
    timestamp: viagem.created_at,
    tipo: 'viagem_criada',
    user_nome: 'Sistema',
    entityCodigo: viagem.codigo,
  });

  // Trip finalization event
  if (viagem.status === 'finalizada') {
    const lastFinalized = entregas
      .filter(e => e.status === 'entregue')
      .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())[0];
    
    if (lastFinalized) {
      timelineItems.push({
        id: `viagem-finished-${viagem.id}`,
        timestamp: lastFinalized.updated_at || viagem.created_at,
        tipo: 'viagem_finalizada',
        user_nome: 'Sistema',
        entityCodigo: viagem.codigo,
      });
    }
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
      });
    });
  });

  // Sort by timestamp (most recent first)
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
      {/* Vertical connector line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

      <div className="space-y-4">
        {sortedTimeline.map((item) => {
          const config = tipoConfig[item.tipo] || { label: item.tipo.replace(/_/g, ' '), bgColor: 'bg-muted dark:bg-muted/50' };
          const isDocument = config.isDocument || item.tipo.includes('documento') || item.tipo.includes('anexa');
          const isCreation = config.isCreation;
          const color = iconColor[item.tipo] || 'text-muted-foreground';

          return (
            <div key={item.id} className="relative flex items-start gap-3">
              {/* Icon */}
              <div className={`relative z-10 w-8 h-8 rounded-md ${config.bgColor} flex items-center justify-center shrink-0`}>
                {isDocument ? (
                  <FileText className={`w-4 h-4 text-blue-600 dark:text-blue-400`} />
                ) : isCreation ? (
                  <Package className={`w-4 h-4 ${color}`} />
                ) : (
                  <ArrowLeftRight className={`w-4 h-4 ${color}`} />
                )}
              </div>

              {/* Content - matches delivery history style */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm">
                  <span className="font-medium">{item.user_nome}</span>
                  <span className="text-muted-foreground">
                    {isCreation
                      ? (item.tipo === 'viagem_criada' ? ' iniciou esta viagem' : ' criou esta entrega')
                      : isDocument
                        ? ' anexou '
                        : ' definiu o status como '}
                  </span>
                  {!isCreation && <span className="font-medium">{config.label}</span>}
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
