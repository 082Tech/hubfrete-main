import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChamadoChat, ChamadoMensagem } from '@/hooks/useChamadosChat';

interface ChamadoChatAreaProps {
  chamado: ChamadoChat | null;
  messages: ChamadoMensagem[];
  isLoading: boolean;
  isSending: boolean;
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_resposta: 'Aguardando',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

export function ChamadoChatArea({
  chamado,
  messages,
  isLoading,
  isSending,
  currentUserId,
  onSendMessage,
  onBack,
  showBackButton,
}: ChamadoChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  if (!chamado) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 h-full">
        <div className="text-center">
          <Headphones className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Selecione um chamado para ver a conversa</p>
        </div>
      </div>
    );
  }

  const isClosed = chamado.status === 'fechado' || chamado.status === 'resolvido';

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 bg-card">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{chamado.titulo}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{chamado.codigo}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {statusLabels[chamado.status] || chamado.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</p>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMe
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    {!isMe && (
                      <p className="font-medium text-xs mb-0.5 opacity-70">{msg.sender_nome}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {!isClosed ? (
        <div className="flex items-center gap-2 p-3 border-t border-border shrink-0 bg-card">
          <Input
            placeholder="Digite uma mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isSending}
          />
          <Button size="icon" onClick={handleSend} disabled={isSending || !inputValue.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="p-3 text-center text-sm text-muted-foreground border-t border-border bg-muted/30">
          Este chamado foi {chamado.status === 'resolvido' ? 'resolvido' : 'fechado'}.
        </div>
      )}
    </div>
  );
}
