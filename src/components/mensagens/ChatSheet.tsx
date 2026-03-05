import { useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChatArea } from './ChatArea';
import { useChatSheet } from '@/hooks/useChatSheet';
import { Loader2, MessageSquare } from 'lucide-react';

interface ChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregaId: string | null;
  userType: 'embarcador' | 'transportadora';
  empresaId?: number;
}

export function ChatSheet({ 
  open, 
  onOpenChange, 
  entregaId, 
  userType, 
  empresaId 
}: ChatSheetProps) {
  const {
    chat,
    messages,
    isLoadingChat,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    isSending,
    currentUserId,
    openChatByEntregaId,
    sendMessage,
    loadMoreMessages,
    closeChat,
  } = useChatSheet({ userType, empresaId });

  // Load chat when sheet opens with entregaId
  useEffect(() => {
    if (open && entregaId) {
      openChatByEntregaId(entregaId);
    }
    if (!open) {
      closeChat();
    }
  }, [open, entregaId, openChatByEntregaId, closeChat]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Chat da Carga</SheetTitle>
        </SheetHeader>
        
        {isLoadingChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Carregando conversa...</p>
          </div>
        ) : !chat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
            <div className="p-4 bg-muted rounded-full">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="text-sm">Chat não disponível para esta entrega.</p>
          </div>
        ) : (
          <ChatArea
            chat={chat}
            messages={messages}
            isLoading={isLoadingMessages}
            isLoadingMore={isLoadingMore}
            hasMoreMessages={hasMoreMessages}
            isSending={isSending}
            currentUserId={currentUserId}
            userType={userType}
            onSendMessage={sendMessage}
            onLoadMore={loadMoreMessages}
            onBack={handleClose}
            showBackButton={true}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
