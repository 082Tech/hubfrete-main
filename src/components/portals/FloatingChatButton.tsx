import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Headset, Search, Loader2, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListItem } from '@/components/mensagens/ChatListItem';
import { ChatArea } from '@/components/mensagens/ChatArea';
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
  const [searchTerm, setSearchTerm] = useState('');

  // Only show on gestão/operação pages (not historico)
  const isOnGestaoPage = 
    (location.pathname.endsWith('/transportadora/entregas')) || 
    (location.pathname.endsWith('/embarcador/cargas/em-rota'));
  
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
    selectedChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    isSending,
    currentUserId,
    selectChat,
    sendMessage,
    loadMoreMessages,
  } = useChats({ userType, empresaId });

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.mensagens_nao_lidas || 0), 0);

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const codigo = chat.entrega?.carga?.codigo?.toLowerCase() || '';
    const motorista = chat.entrega?.motorista?.nome_completo?.toLowerCase() || '';
    const empresa = chat.entrega?.carga?.empresa?.nome?.toLowerCase() || '';
    return codigo.includes(searchLower) || motorista.includes(searchLower) || empresa.includes(searchLower);
  });

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
  };

  const handleBack = () => {
    selectChat(''); // Deselect to go back to list
  };

  const handleOpenSupport = () => {
    setOpen(false);
    navigate(`/${userType}/configuracoes`);
  };

  if (!isOnGestaoPage) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed z-50',
          'bottom-3 right-3 md:bottom-5 md:right-5',
          'h-12 w-12 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'hover:scale-105 active:scale-95 transition-all duration-200',
          'flex items-center justify-center',
          'mb-16 md:mb-0'
        )}
        aria-label="Abrir mensagens"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        {!open && totalUnread > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-background"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </button>

      {/* Floating Chat Window */}
      {open && (
        <div
          className={cn(
            'fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden',
            'flex flex-col',
            'w-[22rem] md:w-[26rem] h-[32rem] md:h-[36rem]',
            'bottom-[4.5rem] right-3 md:bottom-[5.5rem] md:right-5',
            'mb-16 md:mb-0'
          )}
        >
          {selectedChat ? (
            /* Chat Conversation View */
            <ChatArea
              chat={selectedChat}
              messages={messages}
              isLoading={isLoadingMessages}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
              isSending={isSending}
              currentUserId={currentUserId}
              userType={userType}
              onSendMessage={sendMessage}
              onLoadMore={loadMoreMessages}
              onBack={handleBack}
              showBackButton={true}
            />
          ) : (
            /* Chat List View */
            <>
              <div className="p-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Mensagens</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7 px-2"
                    onClick={handleOpenSupport}
                  >
                    <Headset className="h-3 w-3" />
                    Suporte
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                {isLoadingChats ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ativa'}
                    </p>
                  </div>
                ) : (
                  filteredChats.map(chat => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isSelected={false}
                      onClick={() => handleSelectChat(chat.id)}
                      userType={userType}
                    />
                  ))
                )}
              </ScrollArea>
            </>
          )}
        </div>
      )}

      {/* Backdrop for mobile */}
      {open && (
        <div 
          className="fixed inset-0 z-40 md:hidden" 
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
