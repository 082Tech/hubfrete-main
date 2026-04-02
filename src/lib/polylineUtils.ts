/**
 * Utilities for polyline encoding/decoding and point-to-polyline distance calculation.
 * Used for route deviation auditing (planned vs actual).
 */

/** Decode a Google-encoded polyline string into an array of [lat, lng] pairs */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/** Encode an array of [lat, lng] pairs into a Google-encoded polyline */
export function encodePolyline(points: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const dLat = Math.round(lat * 1e5) - prevLat;
    const dLng = Math.round(lng * 1e5) - prevLng;
    prevLat += dLat;
    prevLng += dLng;
    encoded += encodeValue(dLat) + encodeValue(dLng);
  }

  return encoded;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

/** Haversine distance in meters between two lat/lng points */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance in meters from a point to a line segment (on a sphere, approximated).
 * Uses cross-track distance formula for short segments.
 */
function pointToSegmentDistance(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const dAP = haversineDistance(aLat, aLng, pLat, pLng);
  const dAB = haversineDistance(aLat, aLng, bLat, bLng);
  const dBP = haversineDistance(bLat, bLng, pLat, pLng);

  // Degenerate segment
  if (dAB < 1) return dAP;

  // Project point onto segment using dot product ratio
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  // Use flat approximation for performance (valid at this scale)
  const cosLat = Math.cos(toRad((aLat + bLat) / 2));
  const ax = aLng * cosLat;
  const ay = aLat;
  const bx = bLng * cosLat;
  const by = bLat;
  const px = pLng * cosLat;
  const py = pLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));

  const projLng = (ax + t * abx) / cosLat;
  const projLat = ay + t * aby;

  return haversineDistance(pLat, pLng, projLat, projLng);
}

/**
 * Calculate the minimum distance from a point to a polyline (array of [lat, lng]).
 * Returns distance in meters.
 */
export function distanceToPolyline(
  lat: number,
  lng: number,
  polyline: [number, number][],
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineDistance(lat, lng, polyline[0][0], polyline[0][1]);
  }

  let minDist = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = pointToSegmentDistance(
      lat, lng,
      polyline[i][0], polyline[i][1],
      polyline[i + 1][0], polyline[i + 1][1],
    );
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

export type DeviationStatus = 'normal' | 'leve' | 'fora_rota';

/** Classify a distance from the route */
export function classifyDeviation(distanceMeters: number): DeviationStatus {
  if (distanceMeters <= 100) return 'normal';
  if (distanceMeters <= 500) return 'leve';
  return 'fora_rota';
}

export interface DeviationPoint {
  latitude: number;
  longitude: number;
  distancia_rota_metros: number;
  status_desvio: DeviationStatus;
  tracked_at: string;
  tracking_historico_id?: string;
}

/**
 * Analyze all tracking points against a planned polyline.
 * Returns classified deviation points.
 */
export function analyzeRouteDeviation(
  trackingPoints: Array<{
    id?: string;
    latitude: number;
    longitude: number;
    tracked_at: string;
  }>,
  encodedPolyline: string,
): DeviationPoint[] {
  const polyline = decodePolyline(encodedPolyline);

  return trackingPoints.map((point) => {
    const dist = distanceToPolyline(point.latitude, point.longitude, polyline);
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      distancia_rota_metros: Math.round(dist),
      status_desvio: classifyDeviation(dist),
      tracked_at: point.tracked_at,
      tracking_historico_id: point.id,
    };
  });
}

export interface DeviationMetrics {
  percentual_fora_rota: number;
  maior_distancia_desvio_metros: number;
  tempo_total_fora_rota_minutos: number;
  total_pontos_analisados: number;
  total_pontos_fora_rota: number;
  total_pontos_leve_desvio: number;
  trechos_desvio: Array<{
    inicio: { lat: number; lng: number; tracked_at: string };
    fim: { lat: number; lng: number; tracked_at: string };
    distancia_max_metros: number;
    duracao_minutos: number;
  }>;
}

/**
 * Compute consolidated deviation metrics from analyzed points.
 */
export function computeDeviationMetrics(points: DeviationPoint[]): DeviationMetrics {
  if (points.length === 0) {
    return {
      percentual_fora_rota: 0,
      maior_distancia_desvio_metros: 0,
      tempo_total_fora_rota_minutos: 0,
      total_pontos_analisados: 0,
      total_pontos_fora_rota: 0,
      total_pontos_leve_desvio: 0,
      trechos_desvio: [],
    };
  }

  let maxDist = 0;
  let foraRota = 0;
  let leve = 0;
  let tempoForaMs = 0;

  const trechos: DeviationMetrics['trechos_desvio'] = [];
  let currentTrecho: {
    inicio: DeviationPoint;
    fim: DeviationPoint;
    maxDist: number;
  } | null = null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.distancia_rota_metros > maxDist) maxDist = p.distancia_rota_metros;

    if (p.status_desvio === 'fora_rota') {
      foraRota++;
      if (!currentTrecho) {
        currentTrecho = { inicio: p, fim: p, maxDist: p.distancia_rota_metros };
      } else {
        currentTrecho.fim = p;
        if (p.distancia_rota_metros > currentTrecho.maxDist) {
          currentTrecho.maxDist = p.distancia_rota_metros;
        }
      }
    } else {
      if (p.status_desvio === 'leve') leve++;
      if (currentTrecho) {
        const durMs = new Date(currentTrecho.fim.tracked_at).getTime() - new Date(currentTrecho.inicio.tracked_at).getTime();
        tempoForaMs += durMs;
        trechos.push({
          inicio: { lat: currentTrecho.inicio.latitude, lng: currentTrecho.inicio.longitude, tracked_at: currentTrecho.inicio.tracked_at },
          fim: { lat: currentTrecho.fim.latitude, lng: currentTrecho.fim.longitude, tracked_at: currentTrecho.fim.tracked_at },
          distancia_max_metros: currentTrecho.maxDist,
          duracao_minutos: Math.round(durMs / 60000),
        });
        currentTrecho = null;
      }
    }
  }

  // Close last trecho if still open
  if (currentTrecho) {
    const durMs = new Date(currentTrecho.fim.tracked_at).getTime() - new Date(currentTrecho.inicio.tracked_at).getTime();
    tempoForaMs += durMs;
    trechos.push({
      inicio: { lat: currentTrecho.inicio.latitude, lng: currentTrecho.inicio.longitude, tracked_at: currentTrecho.inicio.tracked_at },
      fim: { lat: currentTrecho.fim.latitude, lng: currentTrecho.fim.longitude, tracked_at: currentTrecho.fim.tracked_at },
      distancia_max_metros: currentTrecho.maxDist,
      duracao_minutos: Math.round(durMs / 60000),
    });
  }

  return {
    percentual_fora_rota: Math.round((foraRota / points.length) * 1000) / 10,
    maior_distancia_desvio_metros: Math.round(maxDist),
    tempo_total_fora_rota_minutos: Math.round(tempoForaMs / 60000),
    total_pontos_analisados: points.length,
    total_pontos_fora_rota: foraRota,
    total_pontos_leve_desvio: leve,
    trechos_desvio: trechos,
  };
}
