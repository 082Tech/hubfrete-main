import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Package, ChevronRight, ArrowLeft, CheckCircle2, Ban, AlertTriangle, RotateCcw, Loader2, Paperclip, X, ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageBubble } from './MessageBubble';
import { ChatDetailsSheet } from './ChatDetailsSheet';
import { AttachmentPreview } from './AttachmentPreview';
import { Chat, Mensagem, AttachmentPreview as AttachmentPreviewType } from './types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Finalized delivery statuses
const FINALIZED_STATUSES = ['entregue', 'devolvida', 'cancelada', 'problema'];

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/xml',
  'application/xml'
];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface ChatAreaProps {
  chat: Chat | null;
  messages: Mensagem[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  isSending: boolean;
  currentUserId: string;
  userType: 'embarcador' | 'transportadora';
  onSendMessage: (content: string, attachment?: { url: string; nome: string; tipo: string; tamanho: number }) => void;
  onLoadMore?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  compact?: boolean; // Disables header click/details sheet for floating use
}

export function ChatArea({ 
  chat, 
  messages, 
  isLoading, 
  isLoadingMore = false,
  hasMoreMessages = false,
  isSending,
  currentUserId,
  userType,
  onSendMessage,
  onLoadMore,
  onBack,
  showBackButton,
  compact = false,
}: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentPreviewType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const { toast } = useToast();

  // Get scroll container
  const getScrollContainer = useCallback(() => {
    if (!scrollRef.current) return null;
    return scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [getScrollContainer]);

  // Handle scroll for loading more messages
  const handleScroll = useCallback(() => {
    if (!onLoadMore || isLoadingMore || !hasMoreMessages) return;
    
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    // Load more when scrolled near top (threshold: 100px from top)
    if (scrollContainer.scrollTop < 100) {
      prevScrollHeightRef.current = scrollContainer.scrollHeight;
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMoreMessages, getScrollContainer]);

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll, getScrollContainer, chat?.id]);

  // Maintain scroll position when loading older messages
  useEffect(() => {
    if (isLoadingMore) return;
    
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || prevScrollHeightRef.current === 0) return;

    // Calculate new scroll position to maintain view
    const newScrollHeight = scrollContainer.scrollHeight;
    const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
    if (scrollDiff > 0) {
      scrollContainer.scrollTop = scrollDiff;
    }
    prevScrollHeightRef.current = 0;
  }, [messages.length, isLoadingMore, getScrollContainer]);

  // Scroll to bottom when chat changes (initial load)
  useEffect(() => {
    if (chat?.id) {
      isInitialLoadRef.current = true;
      prevMessagesLengthRef.current = 0;
    }
  }, [chat?.id]);

  // Scroll to bottom after initial messages load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && isInitialLoadRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          isInitialLoadRef.current = false;
          prevMessagesLengthRef.current = messages.length;
        });
      });
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Scroll to bottom when new messages arrive (not when loading older)
  useEffect(() => {
    if (!isInitialLoadRef.current && messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo não suportado',
        description: 'Use imagens (JPG, PNG, WebP, GIF), PDFs ou documentos do Office.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é de 50MB.',
        variant: 'destructive',
      });
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const preview = isImage ? URL.createObjectURL(file) : '';
    
    setAttachment({
      file,
      preview,
      type: isImage ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document',
    });
  }, [toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = useCallback(() => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  }, [attachment]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachment) || isSending || isUploading) return;

    let uploadedAttachment: { url: string; nome: string; tipo: string; tamanho: number } | undefined;

    // Upload attachment if exists
    if (attachment) {
      setIsUploading(true);
      try {
        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${chat?.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-anexos')
          .upload(fileName, attachment.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-anexos')
          .getPublicUrl(fileName);

        uploadedAttachment = {
          url: publicUrl,
          nome: attachment.file.name,
          tipo: attachment.file.type,
          tamanho: attachment.file.size,
        };

        // Clean up preview URL
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
        setAttachment(null);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Erro ao enviar arquivo',
          description: 'Não foi possível fazer upload do arquivo.',
          variant: 'destructive',
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSendMessage(newMessage.trim(), uploadedAttachment);
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
      cancelada: { label: 'Cancelada', color: 'bg-muted text-muted-foreground' },
    };
    const status = statusMap[chat.entrega.status];
    if (!status) return null;
    return <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>;
  };

  // Check if delivery is finalized
  const isDeliveryFinalized = useMemo(() => {
    return chat?.entrega?.status && FINALIZED_STATUSES.includes(chat.entrega.status);
  }, [chat?.entrega?.status]);

  // Get finalized message based on status
  const getFinalizedMessage = () => {
    const status = chat?.entrega?.status;
    switch (status) {
      case 'entregue':
        return { 
          icon: CheckCircle2, 
          title: 'Carga concluída!', 
          subtitle: 'Esta carga foi finalizada com sucesso.',
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
        };
      case 'devolvida':
        return { 
          icon: RotateCcw, 
          title: 'Carga devolvida', 
          subtitle: 'Esta carga foi devolvida.',
          color: 'text-amber-600',
          bgColor: 'bg-amber-500/10',
        };
      case 'cancelada':
        return { 
          icon: Ban, 
          title: 'Entrega cancelada', 
          subtitle: 'Esta entrega foi cancelada.',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
        };
      case 'problema':
        return { 
          icon: AlertTriangle, 
          title: 'Entrega com problema', 
          subtitle: 'Esta entrega foi finalizada com problema.',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
        };
      default:
        return null;
    }
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

  const finalizedInfo = getFinalizedMessage();

  return (
    <div className="flex-1 flex flex-col bg-background h-full min-h-0 w-full overflow-hidden">
      {/* Clickable Header */}
      <div 
        className={cn(
          "flex items-center gap-2 md:gap-3 p-3 md:p-4 border-b border-border bg-card shrink-0",
          !compact && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
        onClick={() => !compact && setDetailsOpen(true)}
      >
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }} 
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10 md:h-12 md:w-12 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={getChatAvatar()} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm md:text-base">
            {getChatTitle().substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate text-sm md:text-base">{getChatTitle()}</h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {chat.entrega?.carga?.codigo}{!compact && ' • Toque para ver detalhes'}
          </p>
        </div>
        
        {!compact && <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />}
      </div>

      {/* Messages Area with custom background */}
      <ScrollArea className="flex-1 min-h-0 p-3 md:p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5Qzk0OTQiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] bg-muted/10" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}
                <div className="bg-muted rounded-2xl h-16 w-48 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 && !isDeliveryFinalized ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="bg-muted/50 p-6 rounded-full mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-1">Nenhuma mensagem ainda</h4>
            <p className="text-sm text-muted-foreground">Envie a primeira mensagem!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load more indicator */}
            {hasMoreMessages && (
              <div className="flex justify-center py-2">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando mensagens...</span>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onLoadMore}
                    className="text-muted-foreground text-xs"
                  >
                    Carregar mensagens anteriores
                  </Button>
                )}
              </div>
            )}

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

            {/* Finalized Message Card - inside messages area like iFood */}
            {isDeliveryFinalized && finalizedInfo && (
              <div className="flex justify-center py-6">
                <div className="bg-card border border-border rounded-2xl shadow-sm p-5 max-w-xs w-full">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={cn('p-3 rounded-full', finalizedInfo.bgColor)}>
                      <finalizedInfo.icon className={cn('h-6 w-6', finalizedInfo.color)} />
                    </div>
                    <div>
                      <p className={cn('font-semibold text-base', finalizedInfo.color)}>{finalizedInfo.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{finalizedInfo.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area - Modern Style - Hidden when finalized */}
      {!isDeliveryFinalized && (
        <div className="p-3 md:p-4 border-t border-border bg-card shrink-0">
          {/* Attachment preview */}
          {attachment && (
            <div className="mb-3 flex items-center gap-2">
              <AttachmentPreview
                attachment={attachment}
                onRemove={removeAttachment}
              />
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_ALLOWED_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex items-end gap-2 md:gap-3">
            {/* Attach button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-11 w-11 md:h-12 md:w-12 rounded-full"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = ALLOWED_IMAGE_TYPES.join(',');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Imagem
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = ALLOWED_DOC_TYPES.join(',');
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Documento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 relative min-w-0">
              <Textarea
                ref={textareaRef}
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] md:min-h-[48px] max-h-32 resize-none pr-4 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 text-sm md:text-base"
                rows={1}
              />
            </div>
            <Button 
              onClick={handleSend} 
              disabled={(!newMessage.trim() && !attachment) || isSending || isUploading}
              size="icon"
              className="shrink-0 h-11 w-11 md:h-12 md:w-12 rounded-full shadow-md"
            >
              <Send className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      )}

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
