import { useMemo, useCallback, useState } from 'react';
import { GoogleMap, OverlayView, Polyline, Marker } from '@react-google-maps/api';
import { TruckIcon } from './TruckIcon';

interface Coordinate {
  lat: number;
  lng: number;
}

interface EntregaPoint {
  id: string;
  codigo: string;
  origem: Coordinate | null;
  destino: Coordinate | null;
  status: string;
}

interface ViagemMultiPointMapProps {
  entregas: EntregaPoint[];
  driverLocation: { lat: number; lng: number; heading?: number | null; isOnline?: boolean } | null;
  height?: number;
}

const TRUCK_SIZE = 48;

/**
 * Mapa de viagem multi-ponto para visualização de todas as origens/destinos
 * - Mostra todas as origens (círculos verdes) e destinos (setas vermelhas)
 * - TruckIcon mostrando a posição atual do motorista
 * - Linhas conectando pontos baseadas no status das entregas
 */
export function ViagemMultiPointMap({
  entregas,
  driverLocation,
  height = 280,
}: ViagemMultiPointMapProps) {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  // Coletar todos os pontos para calcular bounds
  const allPoints = useMemo(() => {
    const points: Coordinate[] = [];
    entregas.forEach(e => {
      if (e.origem) points.push(e.origem);
      if (e.destino) points.push(e.destino);
    });
    if (driverLocation) {
      points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
    }
    return points;
  }, [entregas, driverLocation]);

  // Calcular bounds para ajustar o zoom automaticamente
  const mapBounds = useMemo(() => {
    if (allPoints.length === 0) return null;

    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach(p => bounds.extend(p));
    return bounds;
  }, [allPoints]);

  // Centro padrão se não houver coordenadas
  const mapCenter = useMemo(() => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (allPoints.length > 0) return allPoints[0];
    return { lat: -23.55, lng: -46.63 };
  }, [driverLocation, allPoints]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
    if (mapBounds) {
      setTimeout(() => map.fitBounds(mapBounds, { top: 50, right: 50, bottom: 50, left: 50 }), 100);
    }
  }, [mapBounds]);

  // Atualizar bounds quando mudar
  useMemo(() => {
    if (mapRef && mapBounds) {
      mapRef.fitBounds(mapBounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [mapRef, mapBounds]);

  // Offset para centralizar o TruckIcon
  const getTruckOffset = useCallback(() => ({
    x: -TRUCK_SIZE / 2,
    y: -TRUCK_SIZE / 2,
  }), []);

  const isDriverOnline = driverLocation?.isOnline ?? false;

  // Gerar linhas de rota para cada entrega
  const routeLines = useMemo(() => {
    const lines: Array<{ path: Coordinate[]; color: string; dashed: boolean; key: string }> = [];

    entregas.forEach(entrega => {
      // Linha origem → destino (sempre visível)
      if (entrega.origem && entrega.destino) {
        lines.push({
          key: `route-${entrega.id}`,
          path: [entrega.origem, entrega.destino],
          color: '#6366f1', // roxo
          dashed: false,
        });
      }

      // Linha motorista → próximo ponto (baseado no status)
      if (driverLocation) {
        const truckPos = { lat: driverLocation.lat, lng: driverLocation.lng };

        if (entrega.status === 'aguardando' || entrega.status === 'saiu_para_coleta') {
          // Motorista indo para origem
          if (entrega.origem) {
            lines.push({
              key: `truck-origem-${entrega.id}`,
              path: [truckPos, entrega.origem],
              color: '#3b82f6', // azul
              dashed: true,
            });
          }
        } else if (entrega.status === 'saiu_para_entrega') {
          // Motorista indo para destino
          if (entrega.destino) {
            lines.push({
              key: `truck-destino-${entrega.id}`,
              path: [truckPos, entrega.destino],
              color: '#22c55e', // verde
              dashed: true,
            });
          }
        }
      }
    });

    return lines;
  }, [entregas, driverLocation]);

  // Cores para diferentes entregas (para diferenciar quando há múltiplas)
  const getOrigemColor = (index: number) => {
    const colors = ['#22c55e', '#10b981', '#059669', '#047857'];
    return colors[index % colors.length];
  };

  const getDestinoColor = (index: number) => {
    const colors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'];
    return colors[index % colors.length];
  };

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
        {/* Origens - Marcadores verdes */}
        {entregas.map((entrega, index) => (
          entrega.origem && (
            <Marker
              key={`origem-${entrega.id}`}
              position={entrega.origem}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: getOrigemColor(index),
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
              title={`Origem: ${entrega.codigo}`}
            />
          )
        ))}

        {/* Destinos - Marcadores vermelhos */}
        {entregas.map((entrega, index) => (
          entrega.destino && (
            <Marker
              key={`destino-${entrega.id}`}
              position={entrega.destino}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: getDestinoColor(index),
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
              title={`Destino: ${entrega.codigo}`}
            />
          )
        ))}

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

        {/* Linhas de rota */}
        {routeLines.map(line => (
          <Polyline
            key={line.key}
            path={line.path}
            options={line.dashed ? {
              strokeColor: line.color,
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
            } : {
              strokeColor: line.color,
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
