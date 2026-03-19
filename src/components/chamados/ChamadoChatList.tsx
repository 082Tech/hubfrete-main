import { Search, MessageSquare, Headphones, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChamadoChat } from '@/hooks/useChamadosChat';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChamadoChatListProps {
  chamados: ChamadoChat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  aberto: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  aguardando_resposta: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  resolvido: 'bg-green-500/10 text-green-600 border-green-500/30',
  fechado: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_resposta: 'Aguardando',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const categoriaLabels: Record<string, string> = {
  suporte_tecnico: 'Suporte',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  reclamacao: 'Reclamação',
  sugestao: 'Sugestão',
  outros: 'Outros',
};

export function ChamadoChatList({ chamados, selectedId, onSelect, isLoading }: ChamadoChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = chamados.filter(ch => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return ch.codigo.toLowerCase().includes(s) ||
      ch.titulo.toLowerCase().includes(s);
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chamados de Suporte</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar chamado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Headphones className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum chamado encontrado' : 'Nenhum chamado aberto'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {!searchTerm && 'Abra um chamado na Central de Ajuda'}
            </p>
          </div>
        ) : (
          filtered.map(ch => (
            <div
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`flex items-start gap-3 p-4 cursor-pointer border-b border-border hover:bg-muted/50 transition-colors ${
                selectedId === ch.id ? 'bg-muted/80' : ''
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm text-foreground truncate">{ch.titulo}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[ch.status] || ''}`}>
                    {statusLabels[ch.status] || ch.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{ch.codigo}</span>
                </div>
                {ch.ultima_mensagem && (
                  <p className="text-xs text-muted-foreground truncate">
                    {ch.ultima_mensagem.conteudo}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(ch.updated_at), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
