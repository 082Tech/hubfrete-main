import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MotoristaLocalizacao {
  motorista_id: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
  bussola_pos: number | null;
  velocidade: number | null;
  precisao: number | null;
  altitude: number | null;
}

interface UseRealtimeLocalizacoesOptions {
  motoristaIds: string[];
  enabled?: boolean;
}

/**
 * Hook that provides real-time driver location updates via Supabase Realtime.
 * Uses a persistent WebSocket connection - no polling needed.
 * Updated to use motorista_id (UUID) instead of email.
 */
export function useRealtimeLocalizacoes({ motoristaIds, enabled = true }: UseRealtimeLocalizacoesOptions) {
  const [localizacoes, setLocalizacoes] = useState<MotoristaLocalizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Stabilize motoristaIds reference - only change when actual values change
  const idsKey = useMemo(() => [...motoristaIds].sort().join(','), [motoristaIds]);
  const stableIds = useMemo(() => motoristaIds, [idsKey]);

  // Initial fetch of locations
  const fetchLocalizacoes = useCallback(async () => {
    if (stableIds.length === 0) {
      setLocalizacoes([]);
      setIsLoading(false);
      return;
    }

    try {
      // Using type assertion to avoid deep instantiation TS error
      const query = supabase
        .from('localizações')
        .select('*');
      
      const { data, error } = await (query as any).in('motorista_id', stableIds);

      if (error) throw error;
      
      // Map the actual DB columns to our interface
      const mapped = (data || []).map((row: any) => ({
        motorista_id: row.motorista_id,
        latitude: row.latitude,
        longitude: row.longitude,
        timestamp: row.timestamp ? new Date(row.timestamp).getTime() : null,
        status: true, // If there's a record, driver is considered active
        bussola_pos: row.bussola_pos,
        velocidade: row.velocidade,
        precisao: row.precisao,
        altitude: row.altitude,
      }));
      setLocalizacoes(mapped);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [stableIds]);

  // Set up Realtime subscription - uses idsKey to prevent unnecessary reconnects
  useEffect(() => {
    if (!enabled || stableIds.length === 0) {
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
    // Using idsKey in channel name to ensure unique channel per id set
    const channel = supabase
      .channel(`localizacoes-realtime-${idsKey.slice(0, 50)}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'localizações',
        },
        (payload) => {
          const record = payload.new as any;
          
          // Only process if it's one of the motorista IDs we're tracking
          if (!record?.motorista_id || !stableIds.includes(record.motorista_id)) {
            return;
          }

          const mappedRecord: MotoristaLocalizacao = {
            motorista_id: record.motorista_id,
            latitude: record.latitude,
            longitude: record.longitude,
            timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
            status: true,
            bussola_pos: record.bussola_pos,
            velocidade: record.velocidade,
            precisao: record.precisao,
            altitude: record.altitude,
          };

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLocalizacoes(prev => {
              // Update existing or add new
              const existingIndex = prev.findIndex(
                loc => loc.motorista_id === record.motorista_id
              );
              
              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = mappedRecord;
                return updated;
              } else {
                return [...prev, mappedRecord];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as any;
            if (oldRecord?.motorista_id) {
              setLocalizacoes(prev => 
                prev.filter(loc => loc.motorista_id !== oldRecord.motorista_id)
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

    // Cleanup on unmount or when ids change
    return () => {
      if (channelRef.current) {
        console.log('🔌 Disconnecting Realtime for driver locations');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [idsKey, enabled, stableIds, fetchLocalizacoes]);

  // Create a stable Map for quick lookup by motorista_id
  const localizacaoMap = useMemo(() => {
    const map = new Map<string, MotoristaLocalizacao>();
    localizacoes.forEach(loc => {
      if (loc.motorista_id) {
        map.set(loc.motorista_id, loc);
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
