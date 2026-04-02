import { useState, useEffect, useRef, useCallback } from 'react';
import {
  calculateDeliveryOrder,
  shouldRecalculate,
  type DeliveryForRouting,
  type RoutingScore,
  type SmartRoutingConfig,
} from '@/lib/smartRouting';

interface UseSmartRoutingOptions {
  driverLat: number | null;
  driverLng: number | null;
  deliveries: DeliveryForRouting[];
  config?: SmartRoutingConfig;
  enabled?: boolean;
}

export function useSmartRouting({
  driverLat,
  driverLng,
  deliveries,
  config,
  enabled = true,
}: UseSmartRoutingOptions) {
  const [orderedDeliveries, setOrderedDeliveries] = useState<RoutingScore[]>([]);
  const prevPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const recalculate = useCallback(() => {
    if (driverLat == null || driverLng == null || deliveries.length === 0) {
      setOrderedDeliveries([]);
      return;
    }

    const result = calculateDeliveryOrder(driverLat, driverLng, deliveries, config);
    setOrderedDeliveries(result);
    prevPositionRef.current = { lat: driverLat, lng: driverLng };
  }, [driverLat, driverLng, deliveries, config]);

  useEffect(() => {
    if (!enabled || driverLat == null || driverLng == null) return;

    const prev = prevPositionRef.current;
    if (!prev) {
      recalculate();
      return;
    }

    if (shouldRecalculate(prev.lat, prev.lng, driverLat, driverLng)) {
      recalculate();
    }
  }, [driverLat, driverLng, enabled, recalculate]);

  // Recalculate when deliveries list changes
  useEffect(() => {
    if (enabled && driverLat != null && driverLng != null) {
      recalculate();
    }
  }, [deliveries.length, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    orderedDeliveries,
    recalculate,
  };
}
