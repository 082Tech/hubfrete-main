import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chat, Mensagem } from '@/components/mensagens/types';
import { useToast } from '@/hooks/use-toast';

interface UseChatsOptions {
  userType: 'embarcador' | 'transportadora';
  empresaId?: number;
}

export function useChats({ userType, empresaId }: UseChatsOptions) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch chats based on user type
  const fetchChats = useCallback(async () => {
    if (!empresaId) {
      setIsLoadingChats(false);
      return;
    }
    
    setIsLoadingChats(true);
    try {
      // Fetch chats with related data
      const { data: chatsData, error } = await supabase
        .from('chats')
        .select(`
          id,
          entrega_id,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // For each chat, fetch entrega details
      const chatsWithDetails = await Promise.all(
        (chatsData || []).map(async (chat) => {
          // Fetch entrega with carga and motorista
          const { data: entrega } = await supabase
            .from('entregas')
            .select(`
              id,
              status,
              carga_id,
              motorista_id
            `)
            .eq('id', chat.entrega_id)
            .maybeSingle();

          if (!entrega) return null;

          // Fetch carga
          const { data: carga } = await supabase
            .from('cargas')
            .select('id, codigo, descricao, empresa_id')
            .eq('id', entrega.carga_id)
            .maybeSingle();

          // Fetch empresa (embarcador)
          let empresa = null;
          if (carga?.empresa_id) {
            const { data } = await supabase
              .from('empresas')
              .select('id, nome')
              .eq('id', carga.empresa_id)
              .maybeSingle();
            empresa = data;
          }

          // Fetch motorista
          let motorista = null;
          if (entrega.motorista_id) {
            const { data } = await supabase
              .from('motoristas')
              .select('id, nome_completo, foto_url, empresa_id')
              .eq('id', entrega.motorista_id)
              .maybeSingle();
            motorista = data;

            // If motorista belongs to transportadora, fetch empresa
            if (motorista?.empresa_id) {
              const { data: motoristaEmpresa } = await supabase
                .from('empresas')
                .select('id, nome')
                .eq('id', motorista.empresa_id)
                .maybeSingle();
              if (motoristaEmpresa) {
                motorista = { ...motorista, empresa: motoristaEmpresa };
              }
            }
          }

          // Filter based on user type
          if (userType === 'embarcador' && carga?.empresa_id !== empresaId) {
            return null;
          }
          if (userType === 'transportadora' && motorista?.empresa_id !== empresaId) {
            return null;
          }

          // Fetch last message
          const { data: lastMessage } = await supabase
            .from('mensagens')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages
          const { count } = await supabase
            .from('mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('lida', false)
            .neq('sender_id', currentUserId);

          return {
            ...chat,
            entrega: {
              id: entrega.id,
              status: entrega.status,
              carga: carga ? { ...carga, empresa } : null,
              motorista,
            },
            ultima_mensagem: lastMessage,
            mensagens_nao_lidas: count || 0,
          } as Chat;
        })
      );

      setChats(chatsWithDetails.filter(Boolean) as Chat[]);
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      // Only show error if it's not a "no rows" error (which is expected when there are no chats)
      if (error?.code !== 'PGRST116') {
        toast({
          title: 'Erro ao carregar conversas',
          description: 'Não foi possível carregar as conversas.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoadingChats(false);
    }
  }, [empresaId, userType, currentUserId, toast]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Mensagem[]);

      // Mark messages as read
      await supabase
        .from('mensagens')
        .update({ lida: true })
        .eq('chat_id', chatId)
        .neq('sender_id', currentUserId);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUserId]);

  // Select a chat
  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    setSelectedChat(chat || null);
    if (chat) {
      fetchMessages(chat.id);
    }
  }, [chats, fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedChat || !currentUserId) return;

    setIsSending(true);
    try {
      // Get user info for sender name
      const { data: userData } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('auth_user_id', currentUserId)
        .maybeSingle();

      const { error } = await supabase
        .from('mensagens')
        .insert({
          chat_id: selectedChat.id,
          sender_id: currentUserId,
          sender_nome: userData?.nome || 'Usuário',
          sender_tipo: userType,
          conteudo: content,
        });

      if (error) throw error;

      // Refresh messages
      await fetchMessages(selectedChat.id);
      
      // Update chat list to reflect new message
      fetchChats();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [selectedChat, currentUserId, userType, fetchMessages, fetchChats, toast]);

  // Initial fetch
  useEffect(() => {
    if (empresaId && currentUserId) {
      fetchChats();
    }
  }, [fetchChats, empresaId, currentUserId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedChat) return;

    const channel = supabase
      .channel(`chat-${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Mensagem;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if not from current user
          if (newMessage.sender_id !== currentUserId) {
            supabase
              .from('mensagens')
              .update({ lida: true })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, currentUserId]);

  // Real-time subscription for chat updates
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel('chats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetchChats]);

  return {
    chats,
    selectedChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    isSending,
    currentUserId,
    selectChat,
    sendMessage,
    refetchChats: fetchChats,
  };
}
