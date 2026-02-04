import { useState, useEffect, useCallback, useRef } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface UseOSRMRouteResult {
  route: [number, number][] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para buscar rotas reais via OSRM (Open Source Routing Machine)
 * Converte coordenadas [lng, lat] do OSRM para [lat, lng] do Leaflet
 */
export function useOSRMRoute(
  origin: Coordinates | null,
  destination: Coordinates | null
): UseOSRMRouteResult {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) {
      setRoute(null);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // OSRM uses [lng, lat] format
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`OSRM returned ${res.status}`);
      }

      const data = await res.json();

      if (data.code !== 'Ok') {
        throw new Error(data.message || 'OSRM routing failed');
      }

      if (data.routes?.[0]?.geometry?.coordinates) {
        // Convert OSRM [lng, lat] to Leaflet [lat, lng]
        const coords = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        setRoute(coords);
      } else {
        setRoute(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('OSRM fetch error:', err);
      setError(err.message || 'Failed to fetch route');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  useEffect(() => {
    fetchRoute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRoute]);

  return { route, loading, error };
}

/**
 * Hook para buscar múltiplas rotas OSRM em paralelo
 * Útil para mapas com várias rotas simultâneas
 */
export function useMultipleOSRMRoutes(
  routeRequests: Array<{
    id: string;
    origin: Coordinates | null;
    destination: Coordinates | null;
  }>
): Record<string, UseOSRMRouteResult> {
  const [routes, setRoutes] = useState<Record<string, UseOSRMRouteResult>>({});
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    const fetchAllRoutes = async () => {
      // Cancel all previous requests
      Object.values(abortControllersRef.current).forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current = {};

      const newRoutes: Record<string, UseOSRMRouteResult> = {};

      await Promise.all(
        routeRequests.map(async ({ id, origin, destination }) => {
          if (!origin || !destination) {
            newRoutes[id] = { route: null, loading: false, error: null };
            return;
          }

          const controller = new AbortController();
          abortControllersRef.current[id] = controller;

          newRoutes[id] = { route: null, loading: true, error: null };

          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

            const res = await fetch(url, { signal: controller.signal });

            if (!res.ok) {
              throw new Error(`OSRM returned ${res.status}`);
            }

            const data = await res.json();

            if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
              const coords = data.routes[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
              );
              newRoutes[id] = { route: coords, loading: false, error: null };
            } else {
              newRoutes[id] = { route: null, loading: false, error: 'No route found' };
            }
          } catch (err: any) {
            if (err.name === 'AbortError') return;
            newRoutes[id] = { route: null, loading: false, error: err.message };
          }
        })
      );

      setRoutes(newRoutes);
    };

    fetchAllRoutes();

    return () => {
      Object.values(abortControllersRef.current).forEach(controller => {
        controller.abort();
      });
    };
  }, [JSON.stringify(routeRequests)]);

  return routes;
}
