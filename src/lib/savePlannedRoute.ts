/**
 * Fetches OSRM route for a trip's waypoints and saves the encoded polyline
 * to viagens.rota_planejada_polyline.
 * Called when a trip transitions to em_andamento.
 */

import { supabase } from '@/integrations/supabase/client';
import { encodePolyline } from './polylineUtils';

interface Waypoint {
  lat: number;
  lng: number;
}

/**
 * Fetches the ordered waypoints (origin → destinations) for a trip.
 */
async function fetchViagemWaypoints(viagemId: string): Promise<Waypoint[]> {
  const { data: entregas, error } = await supabase
    .from('viagem_entregas')
    .select(`
      ordem,
      entrega:entregas!inner(
        carga:cargas!inner(
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(latitude, longitude),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(latitude, longitude)
        )
      )
    `)
    .eq('viagem_id', viagemId)
    .order('ordem', { ascending: true });

  if (error || !entregas?.length) return [];

  const waypoints: Waypoint[] = [];
  const seen = new Set<string>();

  for (const ve of entregas) {
    const carga = (ve as any).entrega?.carga;
    if (!carga) continue;

    // Add origin
    const orig = carga.endereco_origem;
    if (orig?.latitude && orig?.longitude) {
      const key = `${orig.latitude},${orig.longitude}`;
      if (!seen.has(key)) {
        seen.add(key);
        waypoints.push({ lat: orig.latitude, lng: orig.longitude });
      }
    }

    // Add destination
    const dest = carga.endereco_destino;
    if (dest?.latitude && dest?.longitude) {
      const key = `${dest.latitude},${dest.longitude}`;
      if (!seen.has(key)) {
        seen.add(key);
        waypoints.push({ lat: dest.latitude, lng: dest.longitude });
      }
    }
  }

  return waypoints;
}

/**
 * Fetches OSRM route for given waypoints and returns encoded polyline.
 */
async function fetchOSRMPolyline(waypoints: Waypoint[]): Promise<{ polyline: string; distanceKm: number; durationMinutes: number } | null> {
  if (waypoints.length < 2) return null;

  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) return null;

  const route = data.routes[0];
  const points: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
  );

  return {
    polyline: encodePolyline(points),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMinutes: Math.round(route.duration / 60),
  };
}

/**
 * Main function: fetches route and saves to viagem.
 * Fire-and-forget — errors are logged but don't block the trip start.
 */
export async function savePlannedRoute(viagemId: string): Promise<void> {
  try {
    const waypoints = await fetchViagemWaypoints(viagemId);
    if (waypoints.length < 2) {
      console.warn('[savePlannedRoute] Not enough waypoints for trip', viagemId);
      return;
    }

    const result = await fetchOSRMPolyline(waypoints);
    if (!result) {
      console.warn('[savePlannedRoute] OSRM returned no route for trip', viagemId);
      return;
    }

    const { error } = await (supabase as any)
      .from('viagens')
      .update({
        rota_planejada_polyline: result.polyline,
        distancia_planejada_km: result.distanceKm,
        tempo_estimado_minutos: result.durationMinutes,
      })
      .eq('id', viagemId);

    if (error) {
      console.error('[savePlannedRoute] Failed to save polyline:', error);
    }
  } catch (err) {
    console.error('[savePlannedRoute] Error:', err);
  }
}
