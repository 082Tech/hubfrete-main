import { useMemo } from 'react';
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { decodePolyline } from '@/lib/polylineUtils';
import type { DeviationPoint } from '@/lib/polylineUtils';

interface RouteDeviationMapOverlayProps {
  /** Google-encoded polyline of the planned route */
  plannedPolyline: string | null;
  /** Actual tracking points with deviation status */
  deviationPoints?: DeviationPoint[];
  /** Show planned route line */
  showPlanned?: boolean;
  /** Show actual route line colored by deviation */
  showActual?: boolean;
}

const DEVIATION_COLORS: Record<string, string> = {
  normal: '#22c55e',     // green
  leve: '#f59e0b',       // amber
  fora_rota: '#ef4444',  // red
};

export function RouteDeviationMapOverlay({
  plannedPolyline,
  deviationPoints = [],
  showPlanned = true,
  showActual = true,
}: RouteDeviationMapOverlayProps) {
  // Decode planned polyline
  const plannedPositions = useMemo(() => {
    if (!plannedPolyline) return [];
    return decodePolyline(plannedPolyline).map(([lat, lng]) => ({ lat, lng }));
  }, [plannedPolyline]);

  // Group actual points into segments by status for colored rendering
  const actualSegments = useMemo(() => {
    if (deviationPoints.length < 2) return [];

    const segments: Array<{
      positions: Array<{ lat: number; lng: number }>;
      status: string;
    }> = [];

    let currentSegment: typeof segments[0] | null = null;

    for (const point of deviationPoints) {
      const pos = { lat: point.latitude, lng: point.longitude };

      if (!currentSegment || currentSegment.status !== point.status_desvio) {
        // Carry over last point for continuity
        if (currentSegment && currentSegment.positions.length > 0) {
          currentSegment = {
            positions: [currentSegment.positions[currentSegment.positions.length - 1], pos],
            status: point.status_desvio,
          };
        } else {
          currentSegment = { positions: [pos], status: point.status_desvio };
        }
        segments.push(currentSegment);
      } else {
        currentSegment.positions.push(pos);
      }
    }

    return segments;
  }, [deviationPoints]);

  // Find notable deviation points (fora_rota) for markers
  const notablePoints = useMemo(() => {
    return deviationPoints.filter((p) => p.status_desvio === 'fora_rota');
  }, [deviationPoints]);

  return (
    <>
      {/* Planned route — blue dashed line */}
      {showPlanned && plannedPositions.length > 1 && (
        <Polyline
          positions={plannedPositions}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 8',
          }}
        />
      )}

      {/* Actual route — colored segments */}
      {showActual && actualSegments.map((seg, i) => (
        <Polyline
          key={`actual-${i}`}
          positions={seg.positions}
          pathOptions={{
            color: DEVIATION_COLORS[seg.status] || '#22c55e',
            weight: 4,
            opacity: 0.9,
          }}
        />
      ))}

      {/* Notable deviation markers */}
      {showActual && notablePoints
        .filter((_, i) => i % Math.max(1, Math.floor(notablePoints.length / 30)) === 0)
        .map((point, i) => (
          <CircleMarker
            key={`dev-${i}`}
            center={[point.latitude, point.longitude]}
            radius={4}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.8,
              weight: 1,
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <p className="font-medium">Fora da rota</p>
                <p>{point.distancia_rota_metros >= 1000
                  ? `${(point.distancia_rota_metros / 1000).toFixed(1)} km`
                  : `${point.distancia_rota_metros} m`} de desvio</p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
    </>
  );
}
