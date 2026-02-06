import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Headset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChatList } from '@/components/mensagens';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FloatingChatButtonProps {
  userType: 'embarcador' | 'transportadora';
}

export function FloatingChatButton({ userType }: FloatingChatButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | undefined>();

  // Hide on mensagens page (already has full chat UI)
  const isOnMessagesPage = location.pathname.includes('/mensagens');
  
  // Get empresa_id
  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
      if (data) setEmpresaId(data);
    };
    fetchEmpresaId();
  }, []);

  const {
    chats,
    isLoadingChats,
    isLoadingMoreChats,
    hasMoreChats,
    loadMoreChats,
  } = useChats({ userType, empresaId });

  // Count total unread
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.mensagens_nao_lidas || 0), 0);

  const handleSelectChat = (chatId: string) => {
    setOpen(false);
    // Find the chat to get entrega_id for URL param
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      navigate(`/${userType}/mensagens?entrega=${chat.entrega_id}`);
    }
  };

  const handleOpenSupport = () => {
    setOpen(false);
    // Navigate to support/chamados - could be extended later
    navigate(`/${userType}/configuracoes`);
  };

  if (isOnMessagesPage) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8',
          'h-14 w-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'hover:scale-105 active:scale-95 transition-all duration-200',
          'flex items-center justify-center',
          // On mobile, raise above bottom nav
          'mb-16 md:mb-0'
        )}
        aria-label="Abrir mensagens"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-background"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </button>

      {/* Chat List Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Mensagens</SheetTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleOpenSupport}
              >
                <Headset className="h-3.5 w-3.5" />
                Suporte
              </Button>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-hidden">
            <ChatList
              chats={chats}
              selectedChatId={null}
              onSelectChat={handleSelectChat}
              isLoading={isLoadingChats}
              isLoadingMore={isLoadingMoreChats}
              hasMore={hasMoreChats}
              onLoadMore={loadMoreChats}
              userType={userType}
            />
          </div>

          {/* Footer with link to full messages page */}
          <div className="p-3 border-t border-border shrink-0">
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => {
                setOpen(false);
                navigate(`/${userType}/mensagens`);
              }}
            >
              Ver todas as conversas
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
