import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChamadoChat {
  id: string;
  codigo: string;
  titulo: string;
  categoria: string;
  status: string;
  created_at: string;
  updated_at: string;
  ultima_mensagem?: ChamadoMensagem | null;
  mensagens_nao_lidas?: number;
}

export interface ChamadoMensagem {
  id: string;
  chamado_id: string;
  conteudo: string;
  sender_id: string;
  sender_nome: string;
  sender_tipo: string;
  anexo_url?: string | null;
  anexo_nome?: string | null;
  created_at: string;
}

const MSGS_PER_PAGE = 20;

export function useChamadosChat() {
  const [chamados, setChamados] = useState<ChamadoChat[]>([]);
  const [selectedChamado, setSelectedChamado] = useState<ChamadoChat | null>(null);
  const [messages, setMessages] = useState<ChamadoMensagem[]>([]);
  const [isLoadingChamados, setIsLoadingChamados] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserType, setCurrentUserType] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: nome_data } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        setCurrentUserName((nome_data as any)?.nome || 'Usuário');

        // Determine user type from empresa via filiais
        const { data: uf } = await supabase.rpc('get_user_filial_empresa_tipo', { p_user_id: user.id }).maybeSingle();
        // Fallback: just query directly
        const { data: ufRows } = await supabase
          .from('usuarios_filiais')
          .select('filial_id')
          .eq('auth_user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (uf?.filial_id) {
          const { data: filial } = await supabase
            .from('filiais')
            .select('empresa_id')
            .eq('id', uf.filial_id)
            .maybeSingle();
          
          if (filial?.empresa_id) {
            const { data: emp } = await supabase
              .from('empresas')
              .select('tipo')
              .eq('id', filial.empresa_id)
              .maybeSingle();
            setCurrentUserType(emp?.tipo === 'TRANSPORTADORA' ? 'transportadora' : 'embarcador');
          }
        }
      }
    };
    getUser();
  }, []);

  const fetchChamados = useCallback(async () => {
    setIsLoadingChamados(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .eq('solicitante_user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch last message for each chamado
      const chamadosWithMsg = await Promise.all(
        (data || []).map(async (ch) => {
          const { data: lastMsg } = await supabase
            .from('chamado_mensagens')
            .select('*')
            .eq('chamado_id', ch.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: ch.id,
            codigo: ch.codigo,
            titulo: ch.titulo,
            categoria: ch.categoria,
            status: ch.status,
            created_at: ch.created_at,
            updated_at: ch.updated_at,
            ultima_mensagem: lastMsg as ChamadoMensagem | null,
          } as ChamadoChat;
        })
      );

      setChamados(chamadosWithMsg);
    } catch (err) {
      console.error('Error fetching chamados:', err);
    } finally {
      setIsLoadingChamados(false);
    }
  }, []);

  useEffect(() => {
    fetchChamados();
  }, [fetchChamados]);

  const fetchMessages = useCallback(async (chamadoId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chamado_mensagens')
        .select('*')
        .eq('chamado_id', chamadoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChamadoMensagem[]);
    } catch (err) {
      console.error('Error fetching chamado messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const selectChamado = useCallback((chamadoId: string) => {
    const ch = chamados.find(c => c.id === chamadoId);
    setSelectedChamado(ch || null);
    if (ch) fetchMessages(ch.id);
  }, [chamados, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedChamado || !currentUserId || !content.trim()) return;
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('chamado_mensagens')
        .insert({
          chamado_id: selectedChamado.id,
          conteudo: content.trim(),
          sender_id: currentUserId,
          sender_nome: currentUserName,
          sender_tipo: currentUserType || 'embarcador',
        });

      if (error) throw error;

      // Refetch messages
      await fetchMessages(selectedChamado.id);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  }, [selectedChamado, currentUserId, currentUserName, currentUserType, fetchMessages, toast]);

  // Real-time subscription for selected chamado
  useEffect(() => {
    if (!selectedChamado) return;

    const channel = supabase
      .channel(`chamado-chat-${selectedChamado.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chamado_mensagens',
        filter: `chamado_id=eq.${selectedChamado.id}`,
      }, (payload) => {
        const newMsg = payload.new as ChamadoMensagem;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChamado]);

  return {
    chamados,
    selectedChamado,
    messages,
    isLoadingChamados,
    isLoadingMessages,
    isSending,
    currentUserId,
    selectChamado,
    sendMessage,
    refetch: fetchChamados,
  };
}
