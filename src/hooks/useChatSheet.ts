import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chat, Mensagem } from '@/components/mensagens/types';
import { useToast } from '@/hooks/use-toast';

interface UseChatSheetOptions {
  userType: 'embarcador' | 'transportadora';
  empresaId?: number;
}

const MESSAGES_PER_PAGE = 20;

/**
 * Lightweight hook for ChatSheet component.
 * Fetches chat data for a single entrega on demand.
 */
export function useChatSheet({ userType, empresaId }: UseChatSheetOptions) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const messagesOffsetRef = useRef(0);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
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

  // Open chat by entrega ID
  const openChatByEntregaId = useCallback(async (entregaId: string) => {
    if (!currentUserId) return null;
    
    setIsLoadingChat(true);
    setChat(null);
    setMessages([]);
    messagesOffsetRef.current = 0;
    
    try {
      // Find or create chat for this entrega
      const { data: chatData, error: chatError } = await supabase
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
        .eq('entrega_id', entregaId)
        .maybeSingle();

      if (chatError) throw chatError;
      
      if (!chatData) {
        // Chat doesn't exist yet, try to create it
        const { data, error } = await supabase.functions.invoke('create-chat-for-entrega', {
          body: { entregaId },
        });
        
        if (error) {
          console.error('Error creating chat:', error);
          toast({
            title: 'Chat não disponível',
            description: 'Não foi possível abrir o chat para esta entrega.',
            variant: 'destructive',
          });
          setIsLoadingChat(false);
          return null;
        }
        
        // Refetch the chat
        const { data: newChatData } = await supabase
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
          .eq('entrega_id', entregaId)
          .maybeSingle();
          
        if (!newChatData) {
          setIsLoadingChat(false);
          return null;
        }
        
        return await buildChatObject(newChatData);
      }
      
      return await buildChatObject(chatData);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast({
        title: 'Erro ao abrir chat',
        description: 'Não foi possível carregar a conversa.',
        variant: 'destructive',
      });
      setIsLoadingChat(false);
      return null;
    }
  }, [empresaId, currentUserId, toast]);

  // Build full chat object with related data
  const buildChatObject = async (chatData: any): Promise<Chat | null> => {
    try {
      const entrega = chatData.entregas;
      if (!entrega) return null;

      // Fetch related data in parallel
      const [cargaResult, motoristaResult, veiculoResult] = await Promise.all([
        entrega.carga_id ? supabase
          .from('cargas')
          .select(`
            id, 
            codigo, 
            descricao, 
            empresa_id,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(cidade, estado),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(cidade, estado)
          `)
          .eq('id', entrega.carga_id)
          .maybeSingle() : { data: null },
        
        entrega.motorista_id ? supabase
          .from('motoristas')
          .select('id, nome_completo, foto_url, telefone, empresa_id')
          .eq('id', entrega.motorista_id)
          .maybeSingle() : { data: null },
        
        entrega.veiculo_id ? supabase
          .from('veiculos')
          .select('id, placa, tipo')
          .eq('id', entrega.veiculo_id)
          .maybeSingle() : { data: null },
      ]);

      const carga = cargaResult.data;
      const motorista = motoristaResult.data;
      const veiculo = veiculoResult.data;

      // Fetch empresas
      const empresaIds = [
        carga?.empresa_id,
        motorista?.empresa_id,
      ].filter(Boolean);
      
      let empresas: any[] = [];
      if (empresaIds.length > 0) {
        const { data } = await supabase
          .from('empresas')
          .select('id, nome, logo_url')
          .in('id', empresaIds);
        empresas = data || [];
      }
      
      const empresasMap = new Map(empresas.map(e => [e.id, e]));

      const assembledChat: Chat = {
        id: chatData.id,
        entrega_id: chatData.entrega_id,
        created_at: chatData.created_at,
        updated_at: chatData.updated_at,
        entrega: {
          id: entrega.id,
          status: entrega.status,
          peso_alocado_kg: entrega.peso_alocado_kg,
          valor_frete: entrega.valor_frete,
          carga: carga ? {
            ...carga,
            empresa: carga.empresa_id ? empresasMap.get(carga.empresa_id) : null,
          } : null,
          motorista: motorista ? {
            ...motorista,
            empresa: motorista.empresa_id ? empresasMap.get(motorista.empresa_id) : null,
          } : null,
          veiculo,
        },
        participantes: [],
        ultima_mensagem: null,
        mensagens_nao_lidas: 0,
      };

      setChat(assembledChat);
      await fetchMessages(chatData.id);
      setIsLoadingChat(false);
      return assembledChat;
    } catch (error) {
      console.error('Error building chat:', error);
      setIsLoadingChat(false);
      return null;
    }
  };

  // Fetch messages for a chat
  const fetchMessages = async (chatId: string) => {
    setIsLoadingMessages(true);
    setHasMoreMessages(true);
    messagesOffsetRef.current = 0;
    
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PER_PAGE - 1);

      if (error) throw error;
      
      const reversedMessages = (data || []).reverse();
      setMessages(reversedMessages as Mensagem[]);
      messagesOffsetRef.current = data?.length || 0;
      setHasMoreMessages((data?.length || 0) >= MESSAGES_PER_PAGE);

      // Mark as read
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
  };

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!chat || isLoadingMore || !hasMoreMessages) return;
    
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .range(messagesOffsetRef.current, messagesOffsetRef.current + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
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
  }, [chat, isLoadingMore, hasMoreMessages]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    attachment?: { url: string; nome: string; tipo: string; tamanho: number }
  ) => {
    if (!chat || !currentUserId) return;

    setIsSending(true);
    
    const optimisticMessage: Mensagem = {
      id: `temp-${Date.now()}`,
      chat_id: chat.id,
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

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const insertData: any = {
        chat_id: chat.id,
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

      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? (data as Mensagem) : msg
        ));
        messagesOffsetRef.current += 1;
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [chat, currentUserId, currentUserName, userType, toast]);

  // Close/reset chat
  const closeChat = useCallback(() => {
    setChat(null);
    setMessages([]);
    messagesOffsetRef.current = 0;
  }, []);

  // Real-time subscription for messages
  useEffect(() => {
    if (!chat) return;

    const channel = supabase
      .channel(`chat-sheet-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Mensagem;
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            
            const optimisticIndex = prev.findIndex(m => 
              m.id.toString().startsWith('temp-') && 
              m.conteudo === newMessage.conteudo && 
              m.sender_id === newMessage.sender_id
            );
            
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMessage;
              return updated;
            }
            
            return [...prev, newMessage];
          });
          
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
  }, [chat, currentUserId]);

  return {
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
  };
}
