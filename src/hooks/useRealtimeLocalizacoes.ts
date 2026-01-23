import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
 * Uses a persistent WebSocket connection - no polling needed.
 */
export function useRealtimeLocalizacoes({ emails, enabled = true }: UseRealtimeLocalizacoesOptions) {
  const [localizacoes, setLocalizacoes] = useState<MotoristaLocalizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Stabilize emails reference - only change when actual values change
  const emailsKey = useMemo(() => [...emails].sort().join(','), [emails]);
  const stableEmails = useMemo(() => emails, [emailsKey]);

  // Initial fetch of locations
  const fetchLocalizacoes = useCallback(async () => {
    if (stableEmails.length === 0) {
      setLocalizacoes([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('localizações')
        .select('email_motorista, latitude, longitude, timestamp, status, heading')
        .in('email_motorista', stableEmails);

      if (error) throw error;
      setLocalizacoes((data || []) as unknown as MotoristaLocalizacao[]);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [stableEmails]);

  // Set up Realtime subscription - uses emailsKey to prevent unnecessary reconnects
  useEffect(() => {
    if (!enabled || stableEmails.length === 0) {
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
    // Using emailsKey in channel name to ensure unique channel per email set
    const channel = supabase
      .channel(`localizacoes-realtime-${emailsKey.slice(0, 50)}`)
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
          if (!record?.email_motorista || !stableEmails.includes(record.email_motorista)) {
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
  }, [emailsKey, enabled, stableEmails, fetchLocalizacoes]);

  // Create a stable Map for quick lookup by email
  const localizacaoMap = useMemo(() => {
    const map = new Map<string, MotoristaLocalizacao>();
    localizacoes.forEach(loc => {
      if (loc.email_motorista) {
        map.set(loc.email_motorista, loc);
      }
    });
    return map;
  }, [localizacoes]);

  return {
    localizacoes,
    localizacaoMap,
    isLoading,
    isConnected,
    refetch: fetchLocalizacoes,
  };
}
