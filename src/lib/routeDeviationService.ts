/**
 * Service for persisting route deviation audits and metrics to Supabase.
 * Processes tracking data AFTER the trip (batch mode).
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchAllTrackingHistoricoByViagemId } from './fetchAllTrackingHistorico';
import { analyzeRouteDeviation, computeDeviationMetrics, type DeviationPoint } from './polylineUtils';

/**
 * Run the full deviation audit for a completed trip.
 * 1. Fetch all tracking points
 * 2. Analyze deviations against planned polyline
 * 3. Persist individual deviation records
 * 4. Compute and persist consolidated metrics
 */
export async function processRouteDeviationAudit(
  viagemId: string,
  encodedPolyline: string,
): Promise<{ success: boolean; pointsAnalyzed: number; error?: string }> {
  try {
    // 1. Fetch tracking points
    const trackingPoints = await fetchAllTrackingHistoricoByViagemId(viagemId);

    if (trackingPoints.length === 0) {
      return { success: true, pointsAnalyzed: 0 };
    }

    // 2. Analyze deviations
    const deviationPoints = analyzeRouteDeviation(
      trackingPoints.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        tracked_at: p.tracked_at,
      })),
      encodedPolyline,
    );

    // 3. Persist deviation records in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < deviationPoints.length; i += BATCH_SIZE) {
      const batch = deviationPoints.slice(i, i + BATCH_SIZE).map((dp) => ({
        viagem_id: viagemId,
        tracking_historico_id: dp.tracking_historico_id || null,
        latitude: dp.latitude,
        longitude: dp.longitude,
        distancia_rota_metros: dp.distancia_rota_metros,
        status_desvio: dp.status_desvio,
        tracked_at: dp.tracked_at,
      }));

      const { error } = await supabase
        .from('desvio_auditoria')
        .insert(batch as any);

      if (error) throw error;
    }

    // 4. Compute and persist metrics
    const metrics = computeDeviationMetrics(deviationPoints);

    const { error: metricsError } = await supabase
      .from('viagem_metricas_desvio')
      .upsert({
        viagem_id: viagemId,
        percentual_fora_rota: metrics.percentual_fora_rota,
        maior_distancia_desvio_metros: metrics.maior_distancia_desvio_metros,
        tempo_total_fora_rota_minutos: metrics.tempo_total_fora_rota_minutos,
        total_pontos_analisados: metrics.total_pontos_analisados,
        total_pontos_fora_rota: metrics.total_pontos_fora_rota,
        total_pontos_leve_desvio: metrics.total_pontos_leve_desvio,
        trechos_desvio: metrics.trechos_desvio as any,
      } as any, { onConflict: 'viagem_id' });

    if (metricsError) throw metricsError;

    return { success: true, pointsAnalyzed: deviationPoints.length };
  } catch (err: any) {
    console.error('[routeDeviationService] Error:', err);
    return { success: false, pointsAnalyzed: 0, error: err.message };
  }
}

/**
 * Fetch deviation metrics for a trip.
 */
export async function fetchDeviationMetrics(viagemId: string) {
  const { data, error } = await supabase
    .from('viagem_metricas_desvio')
    .select('*')
    .eq('viagem_id', viagemId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetch deviation audit points for a trip (for map visualization).
 */
export async function fetchDeviationAuditPoints(viagemId: string) {
  const rows: DeviationPoint[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('desvio_auditoria')
      .select('latitude, longitude, distancia_rota_metros, status_desvio, tracked_at')
      .eq('viagem_id', viagemId)
      .order('tracked_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    const batch = (data ?? []) as any as DeviationPoint[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}
