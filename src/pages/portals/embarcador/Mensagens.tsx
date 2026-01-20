import { useState, useEffect } from 'react';
import { PortalLayout } from '@/components/portals/PortalLayout';
import { ChatList, ChatArea } from '@/components/mensagens';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Mensagens() {
  const [empresaId, setEmpresaId] = useState<number | undefined>();
  const [showChatList, setShowChatList] = useState(true);

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
    isSending,
    currentUserId,
    selectChat,
    sendMessage,
  } = useChats({ userType: 'embarcador', empresaId });

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    // On mobile, hide chat list when a chat is selected
    setShowChatList(false);
  };

  const handleBack = () => {
    setShowChatList(true);
  };

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="h-[calc(100vh-4rem)] flex">
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
            userType="embarcador"
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
            userType="embarcador"
            onSendMessage={sendMessage}
            onBack={handleBack}
            showBackButton={!showChatList}
          />
        </div>
      </div>
    </PortalLayout>
  );
}
