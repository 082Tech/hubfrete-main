import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChatList, ChatArea } from '@/components/mensagens';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

import { useChatView } from '@/contexts/ChatViewContext';

export default function Mensagens() {
  const [searchParams] = useSearchParams();
  const [empresaId, setEmpresaId] = useState<number | undefined>();
  const [showChatList, setShowChatList] = useState(true);
  const hasAutoSelected = useRef(false);
  const { setIsInChatView } = useChatView();

  // Get entrega ID from URL params
  const entregaIdFromUrl = searchParams.get('entrega');

  // Update chat view state when showing/hiding chat
  useEffect(() => {
    setIsInChatView(!showChatList);
    return () => setIsInChatView(false);
  }, [showChatList, setIsInChatView]);

  // Get empresa_id for current user
  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
      if (data) {
        setEmpresaId(data);
      }
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
    isLoadingMoreChats,
    hasMoreMessages,
    hasMoreChats,
    isSending,
    currentUserId,
    selectChat,
    selectChatByEntregaId,
    sendMessage,
    loadMoreMessages,
    loadMoreChats,
  } = useChats({ userType: 'embarcador', empresaId });

  // Auto-select chat from URL param
  useEffect(() => {
    if (entregaIdFromUrl && chats.length > 0 && !hasAutoSelected.current) {
      const selected = selectChatByEntregaId(entregaIdFromUrl);
      if (selected) {
        hasAutoSelected.current = true;
        setShowChatList(false); // Show chat area on mobile
      }
    }
  }, [entregaIdFromUrl, chats, selectChatByEntregaId]);

  // Reset auto-select flag when URL changes
  useEffect(() => {
    if (!entregaIdFromUrl) {
      hasAutoSelected.current = false;
    }
  }, [entregaIdFromUrl]);

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    // On mobile, hide chat list when a chat is selected
    setShowChatList(false);
  };

  const handleBack = () => {
    setShowChatList(true);
  };

  return (
    <div className="fixed inset-0 md:relative md:h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat List - Hidden on mobile when chat is selected */}
        <div className={cn(
          'w-full md:w-80 lg:w-96 shrink-0 h-full overflow-hidden',
          !showChatList && 'hidden md:block'
        )}>
          <ChatList
            chats={chats}
            selectedChatId={selectedChat?.id || null}
            onSelectChat={handleSelectChat}
            isLoading={isLoadingChats}
            isLoadingMore={isLoadingMoreChats}
            hasMore={hasMoreChats}
            onLoadMore={loadMoreChats}
            userType="embarcador"
          />
        </div>

        {/* Chat Area - Hidden on mobile when chat list is shown */}
        <div className={cn(
          'flex-1 h-full overflow-hidden',
          showChatList && 'hidden md:flex'
        )}>
          <ChatArea
            chat={selectedChat}
            messages={messages}
            isLoading={isLoadingMessages}
            isLoadingMore={isLoadingMore}
            hasMoreMessages={hasMoreMessages}
            isSending={isSending}
            currentUserId={currentUserId}
            userType="embarcador"
            onSendMessage={sendMessage}
            onLoadMore={loadMoreMessages}
            onBack={handleBack}
            showBackButton={!showChatList}
          />
        </div>
      </div>
    </div>
  );
}
