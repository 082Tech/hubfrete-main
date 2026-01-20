import { useState, useRef, useEffect } from 'react';
import { Send, Package, ChevronRight, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageBubble } from './MessageBubble';
import { ChatDetailsSheet } from './ChatDetailsSheet';
import { Chat, Mensagem } from './types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const getChatAvatar = () => {
    if (!chat?.entrega) return undefined;
    
    if (userType === 'embarcador') {
      return chat.entrega.motorista?.foto_url || chat.entrega.motorista?.empresa?.logo_url;
    }
    return chat.entrega.carga?.empresa?.logo_url;
  };

  const getStatusBadge = () => {
    if (!chat?.entrega?.status) return null;
    const statusMap: Record<string, { label: string; color: string }> = {
      aguardando_coleta: { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-600' },
      em_coleta: { label: 'Em Coleta', color: 'bg-blue-500/10 text-blue-600' },
      coletado: { label: 'Coletado', color: 'bg-indigo-500/10 text-indigo-600' },
      em_transito: { label: 'Em Trânsito', color: 'bg-orange-500/10 text-orange-600' },
      em_entrega: { label: 'Em Entrega', color: 'bg-purple-500/10 text-purple-600' },
      entregue: { label: 'Entregue', color: 'bg-green-500/10 text-green-600' },
      problema: { label: 'Problema', color: 'bg-destructive/10 text-destructive' },
      devolvida: { label: 'Devolvida', color: 'bg-amber-500/10 text-amber-600' },
    };
    const status = statusMap[chat.entrega.status];
    if (!status) return null;
    return <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>;
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 text-center p-8">
        <div className="bg-primary/10 p-8 rounded-full mb-6 shadow-lg">
          <Package className="h-16 w-16 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
        <p className="text-muted-foreground max-w-sm leading-relaxed">
          Escolha uma conversa da lista para visualizar as mensagens e interagir com os participantes da entrega.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Clickable Header */}
      <div 
        className="flex items-center gap-3 p-4 border-b border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setDetailsOpen(true)}
      >
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }} 
            className="shrink-0 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={getChatAvatar()} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getChatTitle().substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{getChatTitle()}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {chat.entrega?.carga?.codigo} • Toque para ver detalhes
          </p>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>

      {/* Messages Area with custom background */}
      <ScrollArea className="flex-1 p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Qzk0OTQiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] bg-muted/10" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}
                <div className="bg-muted rounded-2xl h-16 w-48 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="bg-muted/50 p-6 rounded-full mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-1">Nenhuma mensagem ainda</h4>
            <p className="text-sm text-muted-foreground">Envie a primeira mensagem!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <div className="bg-card border border-border px-4 py-1.5 rounded-full shadow-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDateSeparator(msgs[0].created_at)}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {msgs.map((message, index) => {
                    const prevMessage = msgs[index - 1];
                    const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
                    
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.sender_id === currentUserId}
                        showAvatar={showAvatar}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Modern Style */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[48px] max-h-32 resize-none pr-4 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1"
              rows={1}
            />
          </div>
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="shrink-0 h-12 w-12 rounded-full shadow-md"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Details Sheet */}
      <ChatDetailsSheet
        chat={chat}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        userType={userType}
      />
    </div>
  );
}
