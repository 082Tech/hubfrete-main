import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatList, ChatArea } from '@/components/mensagens';
import { useChats } from '@/hooks/useChats';
import { useChamadosChat } from '@/hooks/useChamadosChat';
import { ChamadoChatList } from '@/components/chamados/ChamadoChatList';
import { ChamadoChatArea } from '@/components/chamados/ChamadoChatArea';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/hooks/useUserContext';
import { useChatView } from '@/contexts/ChatViewContext';
import { Button } from '@/components/ui/button';
import { Package, Headphones } from 'lucide-react';

export default function TransportadoraMensagens() {
  const [searchParams] = useSearchParams();
  const [showChatList, setShowChatList] = useState(true);
  const [activeTab, setActiveTab] = useState<'cargas' | 'suporte'>('cargas');
  const hasAutoSelected = useRef(false);
  const { setIsInChatView } = useChatView();
  const { empresa } = useUserContext();
  const empresaId = empresa?.id;

  const entregaIdFromUrl = searchParams.get('entrega');

  useEffect(() => {
    setIsInChatView(!showChatList);
    return () => setIsInChatView(false);
  }, [showChatList, setIsInChatView]);

  const chatsHook = useChats({ userType: 'transportadora', empresaId });
  const chamadosHook = useChamadosChat();

  useEffect(() => {
    if (entregaIdFromUrl && chatsHook.chats.length > 0 && !hasAutoSelected.current) {
      const selected = chatsHook.selectChatByEntregaId(entregaIdFromUrl);
      if (selected) {
        hasAutoSelected.current = true;
        setShowChatList(false);
        setActiveTab('cargas');
      }
    }
  }, [entregaIdFromUrl, chatsHook.chats, chatsHook.selectChatByEntregaId]);

  useEffect(() => {
    if (!entregaIdFromUrl) hasAutoSelected.current = false;
  }, [entregaIdFromUrl]);

  const handleSelectChat = (chatId: string) => {
    chatsHook.selectChat(chatId);
    setShowChatList(false);
  };

  const handleSelectChamado = (chamadoId: string) => {
    chamadosHook.selectChamado(chamadoId);
    setShowChatList(false);
  };

  const handleBack = () => setShowChatList(true);

  return (
    <div className="fixed inset-0 md:relative md:h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className={cn(
          'w-full md:w-80 lg:w-96 shrink-0 h-full overflow-hidden flex flex-col',
          !showChatList && 'hidden md:flex'
        )}>
          <div className="flex border-b border-border shrink-0 bg-card">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('cargas')}
              className={cn(
                'flex-1 rounded-none gap-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'cargas'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Package className="w-4 h-4" />
              Cargas
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('suporte')}
              className={cn(
                'flex-1 rounded-none gap-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'suporte'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Headphones className="w-4 h-4" />
              Suporte
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'cargas' ? (
              <ChatList
                chats={chatsHook.chats}
                selectedChatId={chatsHook.selectedChat?.id || null}
                onSelectChat={handleSelectChat}
                isLoading={chatsHook.isLoadingChats}
                isLoadingMore={chatsHook.isLoadingMoreChats}
                hasMore={chatsHook.hasMoreChats}
                onLoadMore={chatsHook.loadMoreChats}
                userType="transportadora"
              />
            ) : (
              <ChamadoChatList
                chamados={chamadosHook.chamados}
                selectedId={chamadosHook.selectedChamado?.id || null}
                onSelect={handleSelectChamado}
                isLoading={chamadosHook.isLoadingChamados}
              />
            )}
          </div>
        </div>

        <div className={cn(
          'flex-1 h-full overflow-hidden',
          showChatList && 'hidden md:flex'
        )}>
          {activeTab === 'cargas' ? (
            <ChatArea
              chat={chatsHook.selectedChat}
              messages={chatsHook.messages}
              isLoading={chatsHook.isLoadingMessages}
              isLoadingMore={chatsHook.isLoadingMore}
              hasMoreMessages={chatsHook.hasMoreMessages}
              isSending={chatsHook.isSending}
              currentUserId={chatsHook.currentUserId}
              userType="transportadora"
              onSendMessage={chatsHook.sendMessage}
              onLoadMore={chatsHook.loadMoreMessages}
              onBack={handleBack}
              showBackButton={!showChatList}
            />
          ) : (
            <ChamadoChatArea
              chamado={chamadosHook.selectedChamado}
              messages={chamadosHook.messages}
              isLoading={chamadosHook.isLoadingMessages}
              isSending={chamadosHook.isSending}
              currentUserId={chamadosHook.currentUserId}
              onSendMessage={chamadosHook.sendMessage}
              onBack={handleBack}
              showBackButton={!showChatList}
            />
          )}
        </div>
      </div>
    </div>
  );
}
