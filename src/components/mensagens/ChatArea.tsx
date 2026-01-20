import { useState, useRef, useEffect } from 'react';
import { Send, Package, User, Truck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageBubble } from './MessageBubble';
import { Chat, Mensagem } from './types';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatAreaProps {
  chat: Chat | null;
  messages: Mensagem[];
  isLoading: boolean;
  isSending: boolean;
  currentUserId: string;
  userType: 'embarcador' | 'transportadora';
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatArea({ 
  chat, 
  messages, 
  isLoading, 
  isSending,
  currentUserId,
  userType,
  onSendMessage,
  onBack,
  showBackButton 
}: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || isSending) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const getChatTitle = () => {
    if (!chat?.entrega) return 'Chat';
    
    if (userType === 'embarcador') {
      if (chat.entrega.motorista?.empresa?.nome) {
        return chat.entrega.motorista.empresa.nome;
      }
      return chat.entrega.motorista?.nome_completo || 'Motorista';
    }
    return chat.entrega.carga?.empresa?.nome || 'Embarcador';
  };

  const getStatusBadge = () => {
    if (!chat?.entrega?.status) return null;
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      aguardando_coleta: { label: 'Aguardando Coleta', variant: 'secondary' },
      em_coleta: { label: 'Em Coleta', variant: 'default' },
      coletado: { label: 'Coletado', variant: 'default' },
      em_transito: { label: 'Em Trânsito', variant: 'default' },
      em_entrega: { label: 'Em Entrega', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'outline' },
      problema: { label: 'Problema', variant: 'destructive' },
      devolvida: { label: 'Devolvida', variant: 'destructive' },
    };
    const status = statusMap[chat.entrega.status];
    if (!status) return null;
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Mensagem[]>);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-center p-8">
        <div className="bg-primary/10 p-6 rounded-full mb-4">
          <Package className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-muted-foreground max-w-sm">
          Escolha uma conversa da lista para visualizar as mensagens e interagir com os participantes da entrega.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getChatTitle().substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{getChatTitle()}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {chat.entrega?.carga?.codigo} - {chat.entrega?.carga?.descricao?.substring(0, 40)}...
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-muted rounded-lg h-16 w-48 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="bg-muted p-4 rounded-full mb-3">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground">Envie a primeira mensagem!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full">
                    <span className="text-xs text-muted-foreground">
                      {formatDateSeparator(msgs[0].created_at)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {msgs.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === currentUserId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
