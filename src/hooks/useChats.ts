import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chat, Mensagem } from '@/components/mensagens/types';
import { useToast } from '@/hooks/use-toast';

interface UseChatsOptions {
  userType: 'embarcador' | 'transportadora';
  empresaId?: number;
}

const MESSAGES_PER_PAGE = 20;
const CHATS_PER_PAGE = 20;

export function useChats({ userType, empresaId }: UseChatsOptions) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const messagesOffsetRef = useRef(0);
  const chatsOffsetRef = useRef(0);
  const { toast } = useToast();

  // Get current user and cache their name
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Cache user name for optimistic updates
        const { data: userData } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        setCurrentUserName(userData?.nome || 'Usuário');
      }
    };
    getUser();
  }, []);

  // Optimized fetch chats - paginates only valid conversations for current portal context
  const fetchChats = useCallback(async (loadMore = false) => {
    if (!empresaId) {
      setIsLoadingChats(false);
      setHasMoreChats(false);
      return;
    }

    if (loadMore) {
      setIsLoadingMoreChats(true);
    } else {
      setIsLoadingChats(true);
      chatsOffsetRef.current = 0;
    }

    try {
      let rawOffset = loadMore ? chatsOffsetRef.current : 0;
      const visibleChats: Chat[] = [];
      let hasMoreRawRows = true;

      // Keep fetching raw pages until we fill one visible page or exhaust DB rows
      while (visibleChats.length < CHATS_PER_PAGE && hasMoreRawRows) {
        const remainingSlots = CHATS_PER_PAGE - visibleChats.length;

        // Step 1: Fetch raw chats page
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select(`
            id,
            entrega_id,
            created_at,
            updated_at,
            entregas!inner (
              id,
              status,
              carga_id,
              motorista_id,
              veiculo_id,
              peso_alocado_kg,
              valor_frete
            )
          `)
          .not('entregas.status', 'in', '("entregue","cancelada","problema")')
          .order('updated_at', { ascending: false })
          .range(rawOffset, rawOffset + remainingSlots - 1);

        if (chatsError) throw chatsError;

        const rawCount = chatsData?.length ?? 0;
        if (rawCount === 0) {
          hasMoreRawRows = false;
          break;
        }

        // Advance raw cursor based on what DB actually returned
        rawOffset += rawCount;
        hasMoreRawRows = rawCount === remainingSlots;

        // Step 2: Collect IDs for batch queries
        const cargaIds = [...new Set(chatsData.map(c => c.entregas?.carga_id).filter(Boolean))];
        const motoristaIds = [...new Set(chatsData.map(c => c.entregas?.motorista_id).filter(Boolean))];
        const veiculoIds = [...new Set(chatsData.map(c => c.entregas?.veiculo_id).filter(Boolean))];
        const chatIds = chatsData.map(c => c.id);

        // Step 3: Batch fetch all related data in parallel
        const [cargasResult, motoristasResult, veiculosResult, lastMessagesResult, unreadCountsResult, participantesResult] = await Promise.all([
          // Cargas with addresses and empresa
          cargaIds.length > 0 ? supabase
            .from('cargas')
            .select(`
              id,
              codigo,
              descricao,
              empresa_id,
              peso_kg,
              tipo,
              data_entrega_limite,
              endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado, logradouro),
              endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado, logradouro)
            `)
            .in('id', cargaIds) : { data: [] },

          // Motoristas with empresa
          motoristaIds.length > 0 ? supabase
            .from('motoristas')
            .select('id, nome_completo, foto_url, telefone, empresa_id')
            .in('id', motoristaIds) : { data: [] },

          // Veiculos
          veiculoIds.length > 0 ? supabase
            .from('veiculos')
            .select('id, placa, tipo')
            .in('id', veiculoIds) : { data: [] },

          // Last message per chat
          Promise.all(chatIds.map(chatId =>
            supabase
              .from('mensagens')
              .select('*')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(r => ({ chatId, message: r.data }))
          )),

          // Unread counts
          Promise.all(chatIds.map(chatId =>
            supabase
              .from('mensagens')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', chatId)
              .eq('lida', false)
              .neq('sender_id', currentUserId)
              .then(r => ({ chatId, count: r.count || 0 }))
          )),

          // Participantes
          supabase
            .from('chat_participantes')
            .select('*')
            .in('chat_id', chatIds),
        ]);

        const cargas = cargasResult.data || [];
        const motoristas = motoristasResult.data || [];
        const veiculos = veiculosResult.data || [];
        const lastMessages = lastMessagesResult as { chatId: string; message: Mensagem | null }[];
        const unreadCounts = unreadCountsResult as { chatId: string; count: number }[];
        const participantes = participantesResult.data || [];

        // Step 4: Fetch empresas for cargas and motoristas in parallel
        const embarcadorEmpresaIds = [...new Set(cargas.map(c => c.empresa_id).filter(Boolean))];
        const transportadoraEmpresaIds = [...new Set(motoristas.map(m => m.empresa_id).filter(Boolean))];
        const allEmpresaIds = [...new Set([...embarcadorEmpresaIds, ...transportadoraEmpresaIds])];

        let empresas: { id: number; nome: string | null; logo_url: string | null }[] = [];
        if (allEmpresaIds.length > 0) {
          const { data } = await supabase
            .from('empresas')
            .select('id, nome, logo_url')
            .in('id', allEmpresaIds);
          empresas = data || [];
        }

        // Step 5: Build lookup maps
        const cargasMap = new Map(cargas.map(c => [c.id, c]));
        const motoristasMap = new Map(motoristas.map(m => [m.id, m]));
        const veiculosMap = new Map(veiculos.map(v => [v.id, v]));
        const empresasMap = new Map(empresas.map(e => [e.id, e]));
        const lastMessagesMap = new Map(lastMessages.map(lm => [lm.chatId, lm.message]));
        const unreadCountsMap = new Map(unreadCounts.map(uc => [uc.chatId, uc.count]));

        // Step 6: Assemble and filter visible chats for this portal
        const assembledBatch = chatsData
          .map((chat) => {
            const entrega = chat.entregas;
            if (!entrega) return null;

            const carga = cargasMap.get(entrega.carga_id);
            const motorista = motoristasMap.get(entrega.motorista_id);
            const veiculo = veiculosMap.get(entrega.veiculo_id);

            if (userType === 'embarcador' && carga?.empresa_id !== empresaId) {
              return null;
            }
            if (userType === 'transportadora' && motorista?.empresa_id !== empresaId) {
              return null;
            }

            const embarcadorEmpresa = carga?.empresa_id ? empresasMap.get(carga.empresa_id) : null;
            const transportadoraEmpresa = motorista?.empresa_id ? empresasMap.get(motorista.empresa_id) : null;

            const chatParticipantes = participantes.filter(p => p.chat_id === chat.id);
            const ultimaMensagem = lastMessagesMap.get(chat.id) || null;

            // Only show chats that have at least one message
            if (!ultimaMensagem) return null;

            return {
              id: chat.id,
              entrega_id: chat.entrega_id,
              created_at: chat.created_at,
              updated_at: chat.updated_at,
              entrega: {
                id: entrega.id,
                status: entrega.status,
                peso_alocado_kg: entrega.peso_alocado_kg,
                valor_frete: entrega.valor_frete,
                carga: carga ? {
                  ...carga,
                  empresa: embarcadorEmpresa,
                  endereco_origem: carga.endereco_origem,
                  endereco_destino: carga.endereco_destino,
                } : null,
                motorista: motorista ? {
                  ...motorista,
                  empresa: transportadoraEmpresa,
                } : null,
                veiculo,
              },
              participantes: chatParticipantes,
              ultima_mensagem: ultimaMensagem,
              mensagens_nao_lidas: unreadCountsMap.get(chat.id) || 0,
            } as Chat;
          })
          .filter(Boolean) as Chat[];

        visibleChats.push(...assembledBatch);

        if (!hasMoreRawRows) {
          break;
        }
      }

      if (loadMore) {
        setChats(prev => [...prev, ...visibleChats]);
      } else {
        setChats(visibleChats);
      }

      chatsOffsetRef.current = rawOffset;

      // Confirm next raw row existence to avoid false-positive button on exact-multiple pages
      let hasMoreChatsToLoad = hasMoreRawRows;
      if (hasMoreRawRows) {
        const { data: nextRow, error: nextRowError } = await supabase
          .from('chats')
          .select('id')
          .order('updated_at', { ascending: false })
          .range(rawOffset, rawOffset);

        if (!nextRowError) {
          hasMoreChatsToLoad = (nextRow?.length ?? 0) > 0;
        }
      }

      setHasMoreChats(hasMoreChatsToLoad);

    } catch (error: any) {
      console.error('Error fetching chats:', error);
      if (error?.code !== 'PGRST116') {
        toast({
          title: 'Erro ao carregar conversas',
          description: 'Não foi possível carregar as conversas.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoadingChats(false);
      setIsLoadingMoreChats(false);
    }
  }, [empresaId, userType, currentUserId, toast]);

  // Load more chats
  const loadMoreChats = useCallback(() => {
    if (!isLoadingMoreChats && hasMoreChats) {
      fetchChats(true);
    }
  }, [fetchChats, isLoadingMoreChats, hasMoreChats]);

  // Fetch initial messages for selected chat (last N messages)
  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    setHasMoreMessages(true);
    messagesOffsetRef.current = 0;
    
    try {
      // Fetch last N messages (most recent first for pagination, then reverse for display)
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PER_PAGE - 1);

      if (error) throw error;
      
      // Reverse to get chronological order for display
      const reversedMessages = (data || []).reverse();
      setMessages(reversedMessages as Mensagem[]);
      messagesOffsetRef.current = data?.length || 0;
      setHasMoreMessages((data?.length || 0) >= MESSAGES_PER_PAGE);

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

  // Load more messages (older messages) when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat || isLoadingMore || !hasMoreMessages) return;
    
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: false })
        .range(messagesOffsetRef.current, messagesOffsetRef.current + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Reverse to get chronological order, prepend to existing messages
        const olderMessages = data.reverse() as Mensagem[];
        setMessages(prev => [...olderMessages, ...prev]);
        messagesOffsetRef.current += data.length;
        setHasMoreMessages(data.length >= MESSAGES_PER_PAGE);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedChat, isLoadingMore, hasMoreMessages]);

  // Select a chat
  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    setSelectedChat(chat || null);
    if (chat) {
      fetchMessages(chat.id);
    }
  }, [chats, fetchMessages]);

  // Select chat by entrega ID
  const selectChatByEntregaId = useCallback((entregaId: string) => {
    const chat = chats.find(c => c.entrega_id === entregaId);
    if (chat) {
      setSelectedChat(chat);
      fetchMessages(chat.id);
      return true;
    }
    return false;
  }, [chats, fetchMessages]);

  // Send a message with optimistic update (no fetch after insert!)
  const sendMessage = useCallback(async (
    content: string,
    attachment?: { url: string; nome: string; tipo: string; tamanho: number }
  ) => {
    if (!selectedChat || !currentUserId) return;

    setIsSending(true);
    
    // Create optimistic message for instant feedback
    const optimisticMessage: Mensagem = {
      id: `temp-${Date.now()}`,
      chat_id: selectedChat.id,
      sender_id: currentUserId,
      sender_nome: currentUserName,
      sender_tipo: userType,
      conteudo: content,
      created_at: new Date().toISOString(),
      lida: true,
      anexo_url: attachment?.url,
      anexo_nome: attachment?.nome,
      anexo_tipo: attachment?.tipo,
      anexo_tamanho: attachment?.tamanho,
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    // Update chat list optimistically (move to top, update last message)
    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id === selectedChat.id) {
          return {
            ...chat,
            ultima_mensagem: optimisticMessage,
            updated_at: optimisticMessage.created_at,
          };
        }
        return chat;
      });
      // Sort by updated_at to move active chat to top
      return updated.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    try {
      const insertData: {
        chat_id: string;
        sender_id: string;
        sender_nome: string;
        sender_tipo: string;
        conteudo: string;
        anexo_url?: string;
        anexo_nome?: string;
        anexo_tipo?: string;
        anexo_tamanho?: number;
      } = {
        chat_id: selectedChat.id,
        sender_id: currentUserId,
        sender_nome: currentUserName,
        sender_tipo: userType,
        conteudo: content,
      };

      if (attachment) {
        insertData.anexo_url = attachment.url;
        insertData.anexo_nome = attachment.nome;
        insertData.anexo_tipo = attachment.tipo;
        insertData.anexo_tamanho = attachment.tamanho;
      }

      const { data, error } = await supabase
        .from('mensagens')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one (Realtime might do this too, but we handle it)
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? (data as Mensagem) : msg
        ));
        
        // Update chat list with real message
        setChats(prev => prev.map(chat => {
          if (chat.id === selectedChat.id) {
            return {
              ...chat,
              ultima_mensagem: data as Mensagem,
              updated_at: data.created_at,
            };
          }
          return chat;
        }));
        
        // Increment offset since we added a new message
        messagesOffsetRef.current += 1;
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [selectedChat, currentUserId, currentUserName, userType, toast]);

  // Initial fetch
  useEffect(() => {
    if (empresaId && currentUserId) {
      fetchChats();
    }
  }, [fetchChats, empresaId, currentUserId]);

  // Real-time subscription for new messages in selected chat
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
          
          // Avoid duplicating: check if message already exists (real or optimistic)
          setMessages(prev => {
            // Check if it's the same message by ID
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            
            // Check if it's replacing an optimistic message (same content + sender)
            const optimisticIndex = prev.findIndex(m => 
              m.id.toString().startsWith('temp-') && 
              m.conteudo === newMessage.conteudo && 
              m.sender_id === newMessage.sender_id
            );
            
            if (optimisticIndex !== -1) {
              // Replace optimistic with real message
              const updated = [...prev];
              updated[optimisticIndex] = newMessage;
              return updated;
            }
            
            // It's a new message from another user, add it
            return [...prev, newMessage];
          });
          
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

  // Real-time subscription for all messages (to update chat list)
  useEffect(() => {
    if (!empresaId || !currentUserId) return;

    const channel = supabase
      .channel('all-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
        },
        (payload) => {
          const newMessage = payload.new as Mensagem;
          
          // Update chat list with new message (only if not from current user to avoid double update)
          if (newMessage.sender_id !== currentUserId) {
            setChats(prev => {
              const chatExists = prev.some(c => c.id === newMessage.chat_id);
              if (!chatExists) {
                // New chat we don't have yet, refetch
                fetchChats();
                return prev;
              }
              
              const updated = prev.map(chat => {
                if (chat.id === newMessage.chat_id) {
                  return {
                    ...chat,
                    ultima_mensagem: newMessage,
                    updated_at: newMessage.created_at,
                    // Increment unread if chat is not selected
                    mensagens_nao_lidas: selectedChat?.id !== chat.id 
                      ? (chat.mensagens_nao_lidas || 0) + 1 
                      : chat.mensagens_nao_lidas,
                  };
                }
                return chat;
              });
              
              // Sort by updated_at
              return updated.sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, currentUserId, selectedChat, fetchChats]);

  // Real-time subscription for new chats
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel('new-chats')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
        },
        () => {
          // Only refetch for new chats, not for every update
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
    refetchChats: fetchChats,
  };
}
