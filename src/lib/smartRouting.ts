/**
 * Smart Routing — Dynamic delivery ordering based on distance and urgency.
 * This is a SUGGESTION engine; it does NOT modify the planned route.
 */

import { haversineDistance } from './polylineUtils';

export interface DeliveryForRouting {
  entrega_id: string;
  latitude: number;
  longitude: number;
  /** ISO date string or null */
  prazo_entrega: string | null;
  /** 1 = normal, 2 = alta, 3 = urgente */
  prioridade?: number;
  status?: string;
}

export interface RoutingScore {
  entrega_id: string;
  score: number;
  distancia_km: number;
  urgencia: number;
  prazo_horas_restantes: number | null;
}

export interface SmartRoutingConfig {
  peso_distancia: number;
  peso_urgencia: number;
}

const DEFAULT_CONFIG: SmartRoutingConfig = {
  peso_distancia: 1.0,
  peso_urgencia: 2.0,
};

/**
 * Calculate urgency factor based on remaining time to deadline.
 * Returns 0–10 scale where 10 = most urgent.
 */
function calculateUrgency(prazoEntrega: string | null, prioridade: number = 1): number {
  const basePriority = Math.min(prioridade, 3);

  if (!prazoEntrega) {
    // No deadline — use priority only
    return basePriority;
  }

  const now = Date.now();
  const deadline = new Date(prazoEntrega).getTime();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft <= 0) return 10; // Already overdue
  if (hoursLeft <= 2) return 9;
  if (hoursLeft <= 6) return 7;
  if (hoursLeft <= 12) return 5;
  if (hoursLeft <= 24) return 3;
  if (hoursLeft <= 48) return 2;
  return 1 + (basePriority - 1) * 0.5;
}

/**
 * Calculate the optimal delivery order from the driver's current position.
 * Returns a scored and sorted list (lowest score = deliver first).
 */
export function calculateDeliveryOrder(
  driverLat: number,
  driverLng: number,
  deliveries: DeliveryForRouting[],
  config: SmartRoutingConfig = DEFAULT_CONFIG,
): RoutingScore[] {
  // Filter out already completed/cancelled deliveries
  const active = deliveries.filter(
    (d) => !['entregue', 'cancelada'].includes(d.status ?? ''),
  );

  const scored = active.map((d) => {
    const distMeters = haversineDistance(driverLat, driverLng, d.latitude, d.longitude);
    const distKm = distMeters / 1000;
    const urgencia = calculateUrgency(d.prazo_entrega, d.prioridade);

    const hoursLeft = d.prazo_entrega
      ? (new Date(d.prazo_entrega).getTime() - Date.now()) / (1000 * 60 * 60)
      : null;

    const score =
      distKm * config.peso_distancia + urgencia * config.peso_urgencia;

    return {
      entrega_id: d.entrega_id,
      score: Math.round(score * 10) / 10,
      distancia_km: Math.round(distKm * 10) / 10,
      urgencia: Math.round(urgencia * 10) / 10,
      prazo_horas_restantes: hoursLeft !== null ? Math.round(hoursLeft * 10) / 10 : null,
    };
  });

  // Sort by score ascending (lowest = best next delivery)
  scored.sort((a, b) => a.score - b.score);

  return scored;
}

/** Minimum distance change to trigger recalculation (meters) */
const RECALCULATE_THRESHOLD_METERS = 500;

/**
 * Check if driver has moved enough to warrant recalculation.
 */
export function shouldRecalculate(
  prevLat: number, prevLng: number,
  currentLat: number, currentLng: number,
): boolean {
  return haversineDistance(prevLat, prevLng, currentLat, currentLng) > RECALCULATE_THRESHOLD_METERS;
}
