import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Timeout em milissegundos para considerar motorista offline (2 minutos)
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

export interface MotoristaLocalizacao {
  motorista_id: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  status: boolean | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  altitude: number | null;
  isOnline: boolean;
  updated_at: string | null;
}

interface UseRealtimeLocalizacoesOptions {
  motoristaIds: string[];
  enabled?: boolean;
}

/**
 * Calcula se o motorista está online baseado no updated_at
 * Online = última atualização há menos de 2 minutos
 */
function calculateIsOnline(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const lastUpdate = new Date(updatedAt).getTime();
  const now = Date.now();
  return (now - lastUpdate) < OFFLINE_THRESHOLD_MS;
}

/**
 * Hook that provides real-time driver location updates via Supabase Realtime.
 * Uses a persistent WebSocket connection - no polling needed.
 * Automatically calculates online/offline status based on updated_at timestamp.
 */
export function useRealtimeLocalizacoes({ motoristaIds, enabled = true }: UseRealtimeLocalizacoesOptions) {
  const [localizacoes, setLocalizacoes] = useState<MotoristaLocalizacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .in('motorista_id', stableIds);

      if (error) throw error;
      
      // Map the actual DB columns to our interface
      const mapped = (data || []).map((row: any) => ({
        motorista_id: row.motorista_id,
        latitude: row.latitude,
        longitude: row.longitude,
        timestamp: row.updated_at ? new Date(row.updated_at).getTime() : null,
        status: true, // If there's a record, driver is considered active
        heading: row.heading,
        speed: row.speed,
        accuracy: row.accuracy,
        altitude: row.altitude,
        updated_at: row.updated_at,
        isOnline: calculateIsOnline(row.updated_at),
      }));
      setLocalizacoes(mapped);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [stableIds]);

  // Recalculate online status periodically (every 30 seconds)
  useEffect(() => {
    if (!enabled) return;

    // Recalculate isOnline for all locations
    const recalculateOnlineStatus = () => {
      setLocalizacoes(prev => 
        prev.map(loc => ({
          ...loc,
          isOnline: calculateIsOnline(loc.updated_at),
        }))
      );
    };

    // Check every 30 seconds
    intervalRef.current = setInterval(recalculateOnlineStatus, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

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
      .channel(`locations-realtime-${idsKey.slice(0, 50)}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'locations',
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
            timestamp: record.updated_at ? new Date(record.updated_at).getTime() : null,
            status: true,
            heading: record.heading,
            speed: record.speed,
            accuracy: record.accuracy,
            altitude: record.altitude,
            updated_at: record.updated_at,
            isOnline: calculateIsOnline(record.updated_at),
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
