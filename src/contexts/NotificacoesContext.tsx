import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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

interface NotificacoesContextType {
  notificacoes: Notificacao[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificacaoId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificacaoId: string) => Promise<boolean>;
  deleteAllNotifications: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

const NotificacoesContext = createContext<NotificacoesContextType | null>(null);

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotificacoes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

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
    let isMounted = true;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Clean up previous channel if exists
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel('notificacoes-realtime-context')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const newNotification = {
              ...payload.new,
              tipo: payload.new.tipo as string,
              dados: (payload.new.dados || {}) as Record<string, unknown>,
            } as Notificacao;
            
            setNotificacoes(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const updatedNotification = {
              ...payload.new,
              tipo: payload.new.tipo as string,
              dados: (payload.new.dados || {}) as Record<string, unknown>,
            } as Notificacao;
            
            setNotificacoes(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Recalculate unread count
            setNotificacoes(prev => {
              setUnreadCount(prev.filter(n => !n.lida).length);
              return prev;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isMounted) return;
            const deletedId = (payload.old as { id: string }).id;
            
            setNotificacoes(prev => {
              const deleted = prev.find(n => n.id === deletedId);
              if (deleted && !deleted.lida) {
                setUnreadCount(c => Math.max(0, c - 1));
              }
              return prev.filter(n => n.id !== deletedId);
            });
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <NotificacoesContext.Provider
      value={{
        notificacoes,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        refetch: fetchNotificacoes,
      }}
    >
      {children}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoesContext() {
  const context = useContext(NotificacoesContext);
  if (!context) {
    throw new Error('useNotificacoesContext must be used within a NotificacoesProvider');
  }
  return context;
}
