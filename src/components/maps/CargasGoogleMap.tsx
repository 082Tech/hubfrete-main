import { GoogleMap, InfoWindow, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowRight, Loader2, Weight, Package } from 'lucide-react';
import { useGoogleMaps, defaultMapContainerStyle, defaultCenter, airbnbMapStyles } from './GoogleMapsLoader';

interface Carga {
  id: string;
  codigo: string;
  descricao: string;
  peso_kg: number;
  peso_disponivel_kg?: number | null;
  volume_m3?: number | null;
  valor_frete_tonelada: number | null;
  destinatario_nome_fantasia?: string | null;
  destinatario_razao_social?: string | null;
  endereco_origem: {
    cidade: string;
    estado: string;
    latitude: number | string | null;
    longitude: number | string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
  } | null;
  endereco_destino: {
    cidade: string;
    estado: string;
    latitude: number | string | null;
    longitude: number | string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
  } | null;
  empresa?: {
    nome: string;
    logo_url?: string | null;
  } | null;
}

interface CargasGoogleMapProps {
  cargas: Carga[];
  onCargaClick: (carga: Carga) => void;
  hoveredCargaId: string | null;
  setHoveredCargaId: (id: string | null) => void;
}

const formatCurrency = (value: number | null) => {
  if (!value) return 'A combinar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: airbnbMapStyles,
};

export default function CargasGoogleMap({
  cargas,
  onCargaClick,
  hoveredCargaId,
  setHoveredCargaId,
}: CargasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  const toNumber = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
  }, []);

  // Airbnb-style price marker: white pill, green on hover
  const createMarkerIcon = useCallback(
    (isHovered: boolean, isSelected: boolean, priceText: string) => {
      const scale = isHovered || isSelected ? 1.08 : 1;
      const baseWidth = 80;
      const baseHeight = 28;
      const width = Math.round(baseWidth * scale);
      const height = Math.round(baseHeight * scale);
      const fontSize = Math.round(12 * scale);
      
      const isActive = isSelected || isHovered;
      const bgColor = isActive ? '#10b981' : '#ffffff';
      const textColor = isActive ? '#ffffff' : '#222222';
      const borderColor = isActive ? '#10b981' : '#e5e7eb';
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${baseWidth} ${baseHeight}">
          <rect x="1" y="1" width="${baseWidth - 2}" height="${baseHeight - 2}" rx="${(baseHeight - 2) / 2}" 
            fill="${bgColor}" 
            stroke="${borderColor}" 
            stroke-width="1"/>
          <text x="${baseWidth / 2}" y="${baseHeight / 2 + 1}" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            fill="${textColor}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="${fontSize}" 
            font-weight="600">${priceText}</text>
        </svg>
      `;
      
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
        scaledSize: new google.maps.Size(width, height),
        anchor: new google.maps.Point(width / 2, height / 2),
      } as google.maps.Icon;
    },
    []
  );

  // Filter cargas with valid coordinates
  const cargasComCoordenadas = useMemo(() => {
    return cargas.filter((c) => {
      const lat = toNumber(c.endereco_origem?.latitude);
      const lng = toNumber(c.endereco_origem?.longitude);
      return lat !== null && lng !== null;
    });
  }, [cargas, toNumber]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Fit bounds when map loads or cargas change
  useEffect(() => {
    if (!map || cargasComCoordenadas.length === 0) return;

    // If there's a selected carga with route, fit to route bounds
    if (selectedCarga && directions) return;

    const bounds = new google.maps.LatLngBounds();
    cargasComCoordenadas.forEach((carga) => {
      const lat = toNumber(carga.endereco_origem?.latitude);
      const lng = toNumber(carga.endereco_origem?.longitude);
      if (lat !== null && lng !== null) bounds.extend({ lat, lng });
    });

    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, cargasComCoordenadas, toNumber, selectedCarga, directions]);

  // Calculate route when a carga is selected
  useEffect(() => {
    let cancelled = false;

    if (!isLoaded || !selectedCarga) {
      setDirections(null);
      setRouteInfo(null);
      return;
    }

    const origemLat = toNumber(selectedCarga.endereco_origem?.latitude);
    const origemLng = toNumber(selectedCarga.endereco_origem?.longitude);
    const destLat = toNumber(selectedCarga.endereco_destino?.latitude);
    const destLng = toNumber(selectedCarga.endereco_destino?.longitude);

    if (origemLat === null || origemLng === null || destLat === null || destLng === null) {
      setDirections(null);
      setRouteInfo(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: origemLat, lng: origemLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;

        // If the user already deselected while the request was in-flight
        if (!selectedCarga) return;

        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const route = result.routes[0];
          if (route && route.legs[0]) {
            const leg = route.legs[0];
            setRouteInfo({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });
          }

          // Fit bounds to show route
          if (map && result.routes[0]?.bounds) {
            map.fitBounds(result.routes[0].bounds, { top: 80, right: 50, bottom: 50, left: 50 });
          }
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isLoaded, selectedCarga, toNumber, map]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle marker click - select carga and show route
  const handleMarkerClick = useCallback((carga: Carga) => {
    setSelectedCarga(carga);
  }, []);

  // Handle "Aceitar Carga" button inside InfoWindow
  const handleAcceptClick = useCallback(() => {
    if (selectedCarga) {
      onCargaClick(selectedCarga);
      setSelectedCarga(null);
      setDirections(null);
      setRouteInfo(null);
    }
  }, [selectedCarga, onCargaClick]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedCarga(null);
    setDirections(null);
    setRouteInfo(null);

    // Hard cleanup: @react-google-maps/api can sometimes leave the polyline behind
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
      directionsRenderer.setMap(null);
    }
  }, [directionsRenderer]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-muted-foreground">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
        onClick={() => {
          setSelectedCarga(null);
          setDirections(null);
          setRouteInfo(null);
          if (directionsRenderer) {
            directionsRenderer.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
            directionsRenderer.setMap(null);
          }
        }}
      >
        {/* Directions route - key forces remount on change */}
        {selectedCarga && directions && (
          <DirectionsRenderer
            key={selectedCarga.id}
            directions={directions}
            onLoad={(renderer) => setDirectionsRenderer(renderer)}
            onUnmount={() => setDirectionsRenderer(null)}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#10b981',
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}

        {/* Price markers (Airbnb-style) */}
        {cargasComCoordenadas.map((carga) => {
          const isHovered = hoveredCargaId === carga.id;
          const isSelected = selectedCarga?.id === carga.id;
          const priceText = carga.valor_frete_tonelada
            ? `R$${Math.round(carga.valor_frete_tonelada)}/ton`
            : 'A combinar';

          const lat = toNumber(carga.endereco_origem?.latitude);
          const lng = toNumber(carga.endereco_origem?.longitude);
          if (lat === null || lng === null) return null;

          return (
            <MarkerF
              key={carga.id}
              position={{ lat, lng }}
              icon={createMarkerIcon(isHovered, isSelected, priceText)}
              onMouseOver={() => setHoveredCargaId(carga.id)}
              onMouseOut={() => setHoveredCargaId(null)}
              onClick={() => handleMarkerClick(carga)}
              zIndex={isSelected ? 1000 : isHovered ? 999 : 1}
            />
          );
        })}

        {/* Destination marker - Google Maps style red pin with transparent center */}
        {selectedCarga && directions && (() => {
          const destLat = toNumber(selectedCarga.endereco_destino?.latitude);
          const destLng = toNumber(selectedCarga.endereco_destino?.longitude);
          if (destLat === null || destLng === null) return null;

          // SVG for red pin with transparent/white center dot
           const pinSvg = `
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
               <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#EA4335"/>
               <circle cx="14" cy="14" r="5" fill="none" stroke="#FFFFFF" stroke-width="2"/>
             </svg>
           `;

          return (
            <MarkerF
              key={`dest-${selectedCarga.id}`}
              position={{ lat: destLat, lng: destLng }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg.trim())}`,
                scaledSize: new google.maps.Size(28, 40),
                anchor: new google.maps.Point(14, 40),
              }}
              zIndex={998}
            />
          );
        })()}
      </GoogleMap>

      {/* Status badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
        {cargasComCoordenadas.length} cargas disponíveis
      </div>

      {/* Route info + cargo card when selected */}
      {selectedCarga && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-border p-4 max-w-md">
          {/* Header with logo */}
          <div className="flex items-start gap-3 mb-3">
            {selectedCarga.empresa?.logo_url && (
              <div className="shrink-0 w-12 h-12 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                <img 
                  src={selectedCarga.empresa.logo_url} 
                  alt={selectedCarga.empresa.nome || 'Logo'} 
                  className="w-full h-full object-contain p-1"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-foreground text-background">
                  {selectedCarga.codigo}
                </span>
                {routeInfo && (
                  <span className="text-xs text-muted-foreground">
                    {routeInfo.distance} • {routeInfo.duration}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm text-foreground line-clamp-1">{selectedCarga.descricao}</p>
              {selectedCarga.empresa?.nome && (
                <p className="text-xs text-muted-foreground">{selectedCarga.empresa.nome}</p>
              )}
            </div>
            <button 
              onClick={handleClearSelection}
              className="shrink-0 p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Rota + empresas + endereços */}
          <div className="space-y-2 mb-3 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-medium text-foreground">Remetente</span>
              </div>
              <div className="pl-4">
                <div className="text-foreground">
                  {selectedCarga.empresa?.nome || '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedCarga.endereco_origem?.logradouro || ''}{selectedCarga.endereco_origem?.numero ? `, ${selectedCarga.endereco_origem?.numero}` : ''}
                  {selectedCarga.endereco_origem?.bairro ? ` • ${selectedCarga.endereco_origem?.bairro}` : ''}
                  {(selectedCarga.endereco_origem?.cidade || selectedCarga.endereco_origem?.estado) ? ` • ${selectedCarga.endereco_origem?.cidade || ''}${selectedCarga.endereco_origem?.estado ? `/${selectedCarga.endereco_origem?.estado}` : ''}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="w-4 h-4" />
              <span className="text-xs">rota</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="font-medium text-foreground">Destinatário</span>
              </div>
              <div className="pl-4">
                <div className="text-foreground">
                  {selectedCarga.destinatario_nome_fantasia || selectedCarga.destinatario_razao_social || '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedCarga.endereco_destino?.logradouro || ''}{selectedCarga.endereco_destino?.numero ? `, ${selectedCarga.endereco_destino?.numero}` : ''}
                  {selectedCarga.endereco_destino?.bairro ? ` • ${selectedCarga.endereco_destino?.bairro}` : ''}
                  {(selectedCarga.endereco_destino?.cidade || selectedCarga.endereco_destino?.estado) ? ` • ${selectedCarga.endereco_destino?.cidade || ''}${selectedCarga.endereco_destino?.estado ? `/${selectedCarga.endereco_destino?.estado}` : ''}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{(selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg).toLocaleString('pt-BR')} kg</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">
                {formatCurrency(selectedCarga.valor_frete_tonelada)}
              </span>
              <span className="text-sm text-muted-foreground">/ton</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleAcceptClick}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-lg transition-colors"
          >
            Ver Detalhes e Aceitar
          </button>
        </div>
      )}
    </div>
  );
}
