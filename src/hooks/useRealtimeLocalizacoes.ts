import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MotoristaLocalizacao {
  email_motorista: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
  heading: number | null;
}

interface UseRealtimeLocalizacoesOptions {
  emails: string[];
  enabled?: boolean;
}

/**
 * Hook that provides real-time driver location updates via Supabase Realtime.
 * Replaces polling with a persistent WebSocket connection.
 */
export function useRealtimeLocalizacoes({ emails, enabled = true }: UseRealtimeLocalizacoesOptions) {
  const [localizacoes, setLocalizacoes] = useState<MotoristaLocalizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initial fetch of locations
  const fetchLocalizacoes = useCallback(async () => {
    if (emails.length === 0) {
      setLocalizacoes([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('localizações')
        .select('email_motorista, latitude, longitude, timestamp, status, heading')
        .in('email_motorista', emails);

      if (error) throw error;
      setLocalizacoes((data || []) as unknown as MotoristaLocalizacao[]);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [emails]);

  // Set up Realtime subscription
  useEffect(() => {
    if (!enabled || emails.length === 0) {
      setLocalizacoes([]);
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchLocalizacoes();

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new Realtime channel for location updates
    const channel = supabase
      .channel('localizacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'localizações',
        },
        (payload) => {
          const record = payload.new as MotoristaLocalizacao;
          
          // Only process if it's one of the emails we're tracking
          if (!record?.email_motorista || !emails.includes(record.email_motorista)) {
            return;
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLocalizacoes(prev => {
              // Update existing or add new
              const existingIndex = prev.findIndex(
                loc => loc.email_motorista === record.email_motorista
              );
              
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = record;
                return updated;
              } else {
                return [...prev, record];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as MotoristaLocalizacao;
            if (oldRecord?.email_motorista) {
              setLocalizacoes(prev => 
                prev.filter(loc => loc.email_motorista !== oldRecord.email_motorista)
              );
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🔌 Realtime connected for driver locations');
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when emails change
    return () => {
      if (channelRef.current) {
        console.log('🔌 Disconnecting Realtime for driver locations');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [emails, enabled, fetchLocalizacoes]);

  // Create a Map for quick lookup by email
  const localizacaoMap = new Map<string, MotoristaLocalizacao>();
  localizacoes.forEach(loc => {
    if (loc.email_motorista) {
      localizacaoMap.set(loc.email_motorista, loc);
    }
  });

  return {
    localizacoes,
    localizacaoMap,
    isLoading,
    isConnected,
    refetch: fetchLocalizacoes,
  };
}
