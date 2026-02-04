import { useMemo, useCallback, useState } from 'react';
import { GoogleMap, OverlayView, Polyline, Marker } from '@react-google-maps/api';
import { TruckIcon } from './TruckIcon';

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  isOnline?: boolean;
}

interface DetailPanelMapProps {
  origemCoords: google.maps.LatLngLiteral | null;
  destinoCoords: google.maps.LatLngLiteral | null;
  driverLocation: DriverLocation | null;
  status: string;
  height?: number;
}

const TWO_MINUTES_MS = 2 * 60 * 1000;

function isRecentUpdate(timestamp?: number | null): boolean {
  if (!timestamp) return false;
  return Date.now() - timestamp < TWO_MINUTES_MS;
}

const TRUCK_SIZE = 48;

/**
 * Mapa do painel de detalhes da Operação Diária
 * - Mostra origem (verde), destino (vermelho) e motorista (TruckIcon)
 * - Rotas tracejadas baseadas no status:
 *   - aguardando/saiu_para_coleta: caminhão → origem (tracejado) + origem → destino (sólido)
 *   - saiu_para_entrega: caminhão → destino (tracejado)
 */
export function DetailPanelMap({
  origemCoords,
  destinoCoords,
  driverLocation,
  status,
  height = 300,
}: DetailPanelMapProps) {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  // Calcular bounds para ajustar o zoom automaticamente
  const mapBounds = useMemo(() => {
    const points: google.maps.LatLngLiteral[] = [];
    if (origemCoords) points.push(origemCoords);
    if (destinoCoords) points.push(destinoCoords);
    if (driverLocation) points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    
    if (points.length === 0) return null;

    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    return bounds;
  }, [origemCoords, destinoCoords, driverLocation]);

  // Centro padrão se não houver coordenadas
  const mapCenter = useMemo(() => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (origemCoords) return origemCoords;
    if (destinoCoords) return destinoCoords;
    return { lat: -23.55, lng: -46.63 };
  }, [driverLocation, origemCoords, destinoCoords]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
    if (mapBounds) {
      setTimeout(() => map.fitBounds(mapBounds, { top: 40, right: 40, bottom: 40, left: 40 }), 100);
    }
  }, [mapBounds]);

  // Atualizar bounds quando mudar
  useMemo(() => {
    if (mapRef && mapBounds) {
      mapRef.fitBounds(mapBounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [mapRef, mapBounds]);

  // Determinar quais rotas mostrar baseado no status
  const showRouteToOrigin = status === 'aguardando' || status === 'saiu_para_coleta';
  const showRouteOriginToDestino = status === 'aguardando' || status === 'saiu_para_coleta';
  const showRouteToDestino = status === 'saiu_para_entrega';

  // Rotas
  const truckToOriginPath = useMemo(() => {
    if (!showRouteToOrigin || !driverLocation || !origemCoords) return null;
    return [{ lat: driverLocation.lat, lng: driverLocation.lng }, origemCoords];
  }, [showRouteToOrigin, driverLocation, origemCoords]);

  const originToDestinoPath = useMemo(() => {
    if (!showRouteOriginToDestino || !origemCoords || !destinoCoords) return null;
    return [origemCoords, destinoCoords];
  }, [showRouteOriginToDestino, origemCoords, destinoCoords]);

  const truckToDestinoPath = useMemo(() => {
    if (!showRouteToDestino || !driverLocation || !destinoCoords) return null;
    return [{ lat: driverLocation.lat, lng: driverLocation.lng }, destinoCoords];
  }, [showRouteToDestino, driverLocation, destinoCoords]);

  // Offset para centralizar o TruckIcon
  const getTruckOffset = useCallback(() => ({
    x: -TRUCK_SIZE / 2,
    y: -TRUCK_SIZE / 2,
  }), []);

  const isDriverOnline = driverLocation?.isOnline ?? false;

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={10}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {/* Origem - Marcador verde */}
        {origemCoords && (
          <Marker
            position={origemCoords}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
            title="Origem"
          />
        )}

        {/* Destino - Marcador vermelho */}
        {destinoCoords && (
          <Marker
            position={destinoCoords}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
            title="Destino"
          />
        )}

        {/* TruckIcon do motorista */}
        {driverLocation && (
          <OverlayView
            position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={getTruckOffset}
          >
            <div style={{ width: TRUCK_SIZE, height: TRUCK_SIZE }}>
              <TruckIcon
                size={TRUCK_SIZE}
                heading={driverLocation.heading ?? 0}
                isOnline={isDriverOnline}
              />
            </div>
          </OverlayView>
        )}

        {/* Rota tracejada: Caminhão → Origem (quando aguardando ou saiu_para_coleta) */}
        {truckToOriginPath && (
          <Polyline
            path={truckToOriginPath}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0,
              strokeWeight: 3,
              icons: [{
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 1,
                  strokeWeight: 3,
                  scale: 3,
                },
                offset: '0',
                repeat: '15px',
              }],
              geodesic: true,
            }}
          />
        )}

        {/* Rota sólida: Origem → Destino (quando aguardando ou saiu_para_coleta) */}
        {originToDestinoPath && (
          <Polyline
            path={originToDestinoPath}
            options={{
              strokeColor: '#6366f1',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {/* Rota tracejada: Caminhão → Destino (quando saiu_para_entrega) */}
        {truckToDestinoPath && (
          <Polyline
            path={truckToDestinoPath}
            options={{
              strokeColor: '#22c55e',
              strokeOpacity: 0,
              strokeWeight: 3,
              icons: [{
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 1,
                  strokeWeight: 3,
                  scale: 3,
                },
                offset: '0',
                repeat: '15px',
              }],
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
