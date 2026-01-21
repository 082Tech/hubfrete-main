import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notificacao {
  id: string;
  user_id: string;
  empresa_id: number | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  dados: Record<string, unknown>;
  link: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchNotificacoes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Type cast to our interface
      const typedData = (data || []).map(item => ({
        ...item,
        tipo: item.tipo as string,
        dados: (item.dados || {}) as Record<string, unknown>,
      })) as Notificacao[];

      setNotificacoes(typedData);
      setUnreadCount(typedData.filter(n => !n.lida).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificacaoId: string) => {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', notificacaoId);

    if (!error) {
      setNotificacoes(prev => 
        prev.map(n => n.id === notificacaoId ? { ...n, lida: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    if (!error) {
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setUnreadCount(0);
    }
  }, []);

  const deleteNotification = useCallback(async (notificacaoId: string) => {
    const notificacao = notificacoes.find(n => n.id === notificacaoId);
    
    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', notificacaoId);

    if (!error) {
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
      if (notificacao && !notificacao.lida) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
    
    return !error;
  }, [notificacoes]);

  const deleteAllNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('notificacoes')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotificacoes([]);
      setUnreadCount(0);
    }
    
    return !error;
  }, []);

  // Initial fetch - only once
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchNotificacoes();
    }
  }, [fetchNotificacoes]);

  // Real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notificacoes-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = {
              ...payload.new,
              tipo: payload.new.tipo as string,
              dados: (payload.new.dados || {}) as Record<string, unknown>,
            } as Notificacao;
            
            setNotificacoes(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  return {
    notificacoes,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotificacoes,
  };
}
