import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, FileText, ArrowLeftRight, Clock, Truck
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  tipo: string;
  timestamp: string;
  observacao?: string | null;
  user_nome?: string | null;
  entityCodigo?: string;
  entityType?: 'viagem' | 'entrega' | 'oferta';
}

const tipoConfig: Record<string, { label: string; bgColor: string; isDocument?: boolean; isCreation?: boolean; isTrip?: boolean }> = {
  criado: { label: 'Carga criada', bgColor: 'bg-gray-100 dark:bg-gray-900/30', isCreation: true },
  aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  inicio_coleta: { label: 'Saiu para Coleta', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  inicio_rota: { label: 'Saiu para Entrega', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  finalizado: { label: 'Concluída', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelado: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  problema: { label: 'Problema', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  atualizacao: { label: 'Atualização', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  documento_anexado: { label: 'Documento anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  cte_anexado: { label: 'CT-e anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  manifesto_anexado: { label: 'Manifesto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  canhoto_anexado: { label: 'Canhoto anexado', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  nf_anexada: { label: 'Nota Fiscal anexada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isDocument: true },
  // Trip lifecycle
  viagem_criada: { label: 'Viagem criada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isCreation: true, isTrip: true },
  viagem_aguardando: { label: 'Aguardando', bgColor: 'bg-sky-100 dark:bg-sky-900/30', isTrip: true },
  viagem_em_andamento: { label: 'Em Andamento', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isTrip: true },
  viagem_finalizada: { label: 'Finalizada', bgColor: 'bg-green-100 dark:bg-green-900/30', isTrip: true },
  viagem_cancelada: { label: 'Cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30', isTrip: true },
  // Oferta lifecycle
  oferta_publicada: { label: 'Oferta publicada', bgColor: 'bg-blue-100 dark:bg-blue-900/30', isCreation: true },
  carga_gerada: { label: 'Carga gerada', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  carga_cancelada: { label: 'Carga cancelada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  oferta_expirada: { label: 'Oferta expirada', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  oferta_excluida: { label: 'Oferta excluída', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  peso_adicionado: { label: 'Peso adicionado à carga', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  publicada: { label: 'Publicada', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  parcialmente_alocada: { label: 'Parcialmente Alocada', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  totalmente_alocada: { label: 'Totalmente Alocada', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  expirada: { label: 'Expirada', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const iconColor: Record<string, string> = {
  criado: 'text-gray-600 dark:text-gray-400',
  aceite: 'text-amber-600 dark:text-amber-400',
  inicio_coleta: 'text-cyan-600 dark:text-cyan-400',
  inicio_rota: 'text-purple-600 dark:text-purple-400',
  finalizado: 'text-green-600 dark:text-green-400',
  cancelado: 'text-red-600 dark:text-red-400',
  problema: 'text-orange-600 dark:text-orange-400',
  atualizacao: 'text-sky-600 dark:text-sky-400',
  viagem_criada: 'text-blue-600 dark:text-blue-400',
  viagem_aguardando: 'text-sky-600 dark:text-sky-400',
  viagem_em_andamento: 'text-blue-600 dark:text-blue-400',
  viagem_finalizada: 'text-green-600 dark:text-green-400',
  viagem_cancelada: 'text-red-600 dark:text-red-400',
  oferta_publicada: 'text-blue-600 dark:text-blue-400',
  carga_gerada: 'text-green-600 dark:text-green-400',
  carga_cancelada: 'text-red-600 dark:text-red-400',
  oferta_expirada: 'text-orange-600 dark:text-orange-400',
  oferta_excluida: 'text-red-600 dark:text-red-400',
  peso_adicionado: 'text-indigo-600 dark:text-indigo-400',
  publicada: 'text-blue-600 dark:text-blue-400',
  parcialmente_alocada: 'text-indigo-600 dark:text-indigo-400',
  totalmente_alocada: 'text-green-600 dark:text-green-400',
  expirada: 'text-red-600 dark:text-red-400',
};

interface EventTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  emptyMessage?: string;
}

export function EventTimeline({ events, maxItems, emptyMessage = 'Nenhum evento registrado' }: EventTimelineProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (displayEvents.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        <Clock className="w-4 h-4 mr-2" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />
      <div className="space-y-4">
        {displayEvents.map((item) => {
          const config = tipoConfig[item.tipo] || { label: item.tipo.replace(/_/g, ' '), bgColor: 'bg-muted dark:bg-muted/50' };
          const isDocument = config.isDocument || item.tipo.includes('documento') || item.tipo.includes('anexa');
          const isCreation = config.isCreation;
          const isTrip = config.isTrip;
          const color = iconColor[item.tipo] || 'text-muted-foreground';
          const userName = item.user_nome || 'Sistema';

          let actionText: string;
          let labelText: string | null = null;

          if (isCreation) {
            actionText = item.tipo === 'viagem_criada'
              ? ' criou esta viagem'
              : item.entityType === 'oferta'
                ? ' publicou esta oferta'
                : ' criou esta carga';
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

          const contextSuffix = isTrip
            ? ' (viagem)'
            : item.entityType === 'entrega'
              ? ' (entrega)'
              : item.entityType === 'oferta'
                ? ' (oferta)'
                : '';

          return (
            <div key={item.id} className="relative flex items-start gap-3">
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
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm">
                  <span className="font-medium">{userName}</span>
                  <span className="text-muted-foreground">{actionText}</span>
                  {labelText && (
                    <>
                      <span className="font-medium">{labelText}</span>
                      {contextSuffix && <span className="text-muted-foreground text-xs">{contextSuffix}</span>}
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(item.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {item.entityCodigo && <> • {item.entityCodigo}</>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
