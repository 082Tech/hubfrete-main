import { useState, useEffect, useCallback, useRef } from 'react';

interface RouteConfig {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  truckPosition: google.maps.LatLngLiteral | null;
  status: string | null;
  isLoaded: boolean;
}

const SHOW_ROUTE_TO_ORIGIN_STATUSES = ['aguardando_coleta', 'em_coleta'];

// Minimum distance change (in degrees) to trigger route recalculation
const MIN_POSITION_CHANGE = 0.001; // ~100m

function hasPositionChanged(
  prev: google.maps.LatLngLiteral | null,
  next: google.maps.LatLngLiteral | null
): boolean {
  if (!prev && !next) return false;
  if (!prev || !next) return true;
  
  const latDiff = Math.abs(prev.lat - next.lat);
  const lngDiff = Math.abs(prev.lng - next.lng);
  
  return latDiff > MIN_POSITION_CHANGE || lngDiff > MIN_POSITION_CHANGE;
}

export function useMapRoutes(config: RouteConfig) {
  const [routeToOrigin, setRouteToOrigin] = useState<google.maps.DirectionsResult | null>(null);
  const [routeToDestination, setRouteToDestination] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track previous values to avoid unnecessary API calls
  const prevConfigRef = useRef<{
    truckPosition: google.maps.LatLngLiteral | null;
    status: string | null;
  }>({ truckPosition: null, status: null });

  const clearRoutes = useCallback(() => {
    setRouteToOrigin(null);
    setRouteToDestination(null);
  }, []);

  useEffect(() => {
    const { origin, destination, truckPosition, status, isLoaded } = config;

    // Early exit if not ready
    if (!isLoaded || !truckPosition) {
      clearRoutes();
      return;
    }

    const prevConfig = prevConfigRef.current;
    const positionChanged = hasPositionChanged(prevConfig.truckPosition, truckPosition);
    const statusChanged = prevConfig.status !== status;

    // Skip if nothing significant changed
    if (!positionChanged && !statusChanged && (routeToOrigin || routeToDestination)) {
      return;
    }

    // Update ref
    prevConfigRef.current = { truckPosition, status };

    const service = new google.maps.DirectionsService();
    const shouldGoToOrigin = SHOW_ROUTE_TO_ORIGIN_STATUSES.includes(status ?? '');

    // Clear opposite route when status changes direction
    if (statusChanged) {
      clearRoutes();
    }

    setIsLoading(true);

    // Route: Truck → Origin (when awaiting pickup)
    if (shouldGoToOrigin && origin) {
      service.route(
        {
          origin: truckPosition,
          destination: origin,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (res, routeStatus) => {
          if (routeStatus === google.maps.DirectionsStatus.OK && res) {
            setRouteToOrigin(res);
          }
          setIsLoading(false);
        }
      );
    }
    // Route: Truck → Destination (when in transit/delivery)
    else if (!shouldGoToOrigin && destination) {
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
          setIsLoading(false);
        }
      );
    } else {
      setIsLoading(false);
    }
  }, [
    config.origin?.lat,
    config.origin?.lng,
    config.destination?.lat,
    config.destination?.lng,
    config.truckPosition?.lat,
    config.truckPosition?.lng,
    config.status,
    config.isLoaded,
    clearRoutes,
    routeToOrigin,
    routeToDestination,
  ]);

  return {
    routeToOrigin,
    routeToDestination,
    isLoadingRoutes: isLoading,
    clearRoutes,
  };
}
