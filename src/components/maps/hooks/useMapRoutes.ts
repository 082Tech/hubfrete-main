import { useState, useEffect, useCallback } from 'react';

interface RouteConfig {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  truckPosition: google.maps.LatLngLiteral | null;
  status: string | null;
  isLoaded: boolean;
}

const SHOW_ROUTE_TO_ORIGIN_STATUSES = ['aguardando_coleta', 'em_coleta'];

export function useMapRoutes(config: RouteConfig) {
  const [routeToOrigin, setRouteToOrigin] = useState<google.maps.DirectionsResult | null>(null);
  const [routeToDestination, setRouteToDestination] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearRoutes = useCallback(() => {
    setRouteToOrigin(null);
    setRouteToDestination(null);
  }, []);

  useEffect(() => {
    clearRoutes();

    const { origin, destination, truckPosition, status, isLoaded } = config;

    if (!isLoaded || !truckPosition) return;

    const service = new google.maps.DirectionsService();
    const shouldGoToOrigin = SHOW_ROUTE_TO_ORIGIN_STATUSES.includes(status ?? '');

    setIsLoading(true);

    const requests: Promise<void>[] = [];

    // Route: Origin → Truck (when awaiting pickup)
    if (shouldGoToOrigin && origin) {
      requests.push(
        new Promise((resolve) => {
          service.route(
            {
              origin,
              destination: truckPosition,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (res, routeStatus) => {
              if (routeStatus === google.maps.DirectionsStatus.OK && res) {
                setRouteToOrigin(res);
              }
              resolve();
            }
          );
        })
      );
    }

    // Route: Truck → Destination (when in transit)
    if (!shouldGoToOrigin && destination) {
      requests.push(
        new Promise((resolve) => {
          service.route(
            {
              origin: truckPosition,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (res, routeStatus) => {
              if (routeStatus === google.maps.DirectionsStatus.OK && res) {
                setRouteToDestination(res);
              }
              resolve();
            }
          );
        })
      );
    }

    Promise.all(requests).finally(() => setIsLoading(false));
  }, [config.origin?.lat, config.origin?.lng, config.destination?.lat, config.destination?.lng, config.truckPosition?.lat, config.truckPosition?.lng, config.status, config.isLoaded, clearRoutes]);

  return {
    routeToOrigin,
    routeToDestination,
    isLoadingRoutes: isLoading,
    clearRoutes,
  };
}
