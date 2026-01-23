import { useCallback, useRef } from 'react';

interface FitBoundsOptions {
  padding?: google.maps.Padding | number;
}

const DEFAULT_PADDING: google.maps.Padding = {
  top: 80,
  right: 80,
  bottom: 80,
  left: 80,
};

export function useMapFitBounds(map: google.maps.Map | null) {
  const hasUserInteracted = useRef(false);

  const setUserInteracted = useCallback(() => {
    hasUserInteracted.current = true;
  }, []);

  const resetInteraction = useCallback(() => {
    hasUserInteracted.current = false;
  }, []);

  const fitToRoute = useCallback(
    (route: google.maps.DirectionsResult, options?: FitBoundsOptions) => {
      if (!map || hasUserInteracted.current) return;

      const bounds = new google.maps.LatLngBounds();
      route.routes[0].overview_path.forEach((p) => bounds.extend(p));

      map.fitBounds(bounds, options?.padding ?? DEFAULT_PADDING);
    },
    [map]
  );

  const fitToPoints = useCallback(
    (points: google.maps.LatLngLiteral[], options?: FitBoundsOptions) => {
      if (!map || hasUserInteracted.current || points.length === 0) return;

      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));

      if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, options?.padding ?? DEFAULT_PADDING);
      }
    },
    [map]
  );

  const panTo = useCallback(
    (position: google.maps.LatLngLiteral, zoom?: number) => {
      if (!map) return;

      map.panTo(position);
      if (zoom) {
        map.setZoom(Math.max(map.getZoom() ?? 12, zoom));
      }
    },
    [map]
  );

  return {
    fitToRoute,
    fitToPoints,
    panTo,
    setUserInteracted,
    resetInteraction,
    hasUserInteracted: hasUserInteracted.current,
  };
}
