import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { ChatList, ChatArea } from '@/components/mensagens';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { createChatsForExistingEntregas } from '@/lib/chatService';

export default function TransportadoraMensagens() {
  const [searchParams] = useSearchParams();
  const [empresaId, setEmpresaId] = useState<number | undefined>();
  const [showChatList, setShowChatList] = useState(true);
  const hasCreatedChats = useRef(false);
  const hasAutoSelected = useRef(false);

  // Get entrega ID from URL params
  const entregaIdFromUrl = searchParams.get('entrega');

  // Get empresa_id for current user
  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
      if (data) {
        setEmpresaId(data);
        
        // Create chats for existing entregas (one-time migration)
        if (!hasCreatedChats.current) {
          hasCreatedChats.current = true;
          createChatsForExistingEntregas().then(count => {
            if (count > 0) {
              console.log(`Created ${count} chats for existing deliveries`);
            }
          });
        }
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
    isSending,
    currentUserId,
    selectChat,
    selectChatByEntregaId,
    sendMessage,
  } = useChats({ userType: 'transportadora', empresaId });

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
    <PortalLayout expectedUserType="transportadora" fullWidth>
      <div className="h-screen flex">
        {/* Chat List - Hidden on mobile when chat is selected */}
        <div className={cn(
          'w-full md:w-80 lg:w-96 shrink-0 h-full',
          !showChatList && 'hidden md:block'
        )}>
          <ChatList
            chats={chats}
            selectedChatId={selectedChat?.id || null}
            onSelectChat={handleSelectChat}
            isLoading={isLoadingChats}
            userType="transportadora"
          />
        </div>

        {/* Chat Area - Hidden on mobile when chat list is shown */}
        <div className={cn(
          'flex-1 h-full',
          showChatList && 'hidden md:flex'
        )}>
          <ChatArea
            chat={selectedChat}
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            currentUserId={currentUserId}
            userType="transportadora"
            onSendMessage={sendMessage}
            onBack={handleBack}
            showBackButton={!showChatList}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
