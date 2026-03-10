import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Truck, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ViagemEntrega {
  id: string;
  codigo: string;
  status: string;
  origemCidade?: string;
  destinoCidade?: string;
  valor_frete?: number | null;
  carga?: {
    empresa?: { comissao_hubfrete_percent?: number | null } | null;
  };
}

interface ViagemListItemProps {
  viagem: {
    id: string;
    codigo: string;
    status: string;
    created_at: string;
    updated_at?: string;
    
    motorista?: {
      id: string;
      nome_completo: string;
      foto_url?: string | null;
    } | null;
    veiculo?: {
      placa: string;
    } | null;
    entregas: ViagemEntrega[];
  };
  isSelected: boolean;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  programada: { label: 'Programada', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  aguardando: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
};

export function ViagemListItem({ viagem, isSelected, onClick }: ViagemListItemProps) {
  const statusInfo = statusConfig[viagem.status] || statusConfig.em_andamento;
  const isTerminal = ['finalizada', 'cancelada'].includes(viagem.status);
  const referenceDate = isTerminal && viagem.updated_at ? viagem.updated_at : viagem.created_at;
  const tempoDecorrido = formatDistanceToNow(new Date(referenceDate), {
    addSuffix: false,
    locale: ptBR
  });

  // Construir rota a partir das entregas
  const cidades = viagem.entregas
    .map(e => e.destinoCidade)
    .filter((c, idx, arr) => c && arr.indexOf(c) === idx)
    .slice(0, 3);

  const rotaTexto = cidades.length > 0 ? cidades.join(' → ') : 'Sem destinos';

  // Calcular valor líquido total da viagem
  const totalLiquido = viagem.entregas.reduce((sum, e) => {
    if (!e.valor_frete) return sum;
    const comP = e.carga?.empresa?.comissao_hubfrete_percent || 0;
    return sum + Math.round(e.valor_frete * (1 - comP / 100) * 100) / 100;
  }, 0);

  return (
    <div
      className={`flex items-start gap-3 bg-card px-4 py-3 cursor-pointer transition-all hover:bg-muted/50 border-b ${
        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar do Motorista */}
      <Avatar className="h-9 w-9 shrink-0">
        {viagem.motorista?.foto_url && (
          <AvatarImage src={viagem.motorista.foto_url} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {viagem.motorista?.nome_completo?.[0] || <Truck className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Motorista */}
        <span className="font-medium text-sm truncate block">
          {viagem.motorista?.nome_completo || 'Sem motorista'}
        </span>

        {/* Código da Viagem */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5">
            {viagem.codigo}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {viagem.entregas.length} carga{viagem.entregas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Rota */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{rotaTexto}</span>
        </div>

        {/* Veículo */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <FileText className="w-3 h-3" />
            MDF-e
          </span>
          {viagem.veiculo && (
            <span className="text-muted-foreground">
              • {viagem.veiculo.placa}
            </span>
          )}
        </div>
      </div>

      {/* Tempo, Valor & Status */}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-1">{tempoDecorrido}</p>
        {totalLiquido > 0 && (
          <p className="text-xs font-semibold text-primary mb-1">
            R$ {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
        <Badge className={`text-[10px] ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}
