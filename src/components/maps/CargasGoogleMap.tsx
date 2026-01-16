import { GoogleMap, InfoWindow, MarkerF } from '@react-google-maps/api';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Loader2, Weight, Package } from 'lucide-react';
import { useGoogleMaps, defaultMapContainerStyle, defaultCenter } from './GoogleMapsLoader';

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

// Airbnb-style map with soft natural colors
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#f9fafb' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#e8f5e9' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c8e6c9' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#fef3c7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#fcd34d' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#bfdbfe' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3b82f6' }],
  },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: mapStyles,
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

  const toNumber = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(n) ? n : null;
  }, []);

  // Airbnb-style price marker: white pill with black text, black on hover
  const createMarkerIcon = useCallback(
    (isHovered: boolean, isSelected: boolean, priceText: string) => {
      const scale = isHovered || isSelected ? 1.1 : 1;
      const baseWidth = 64;
      const baseHeight = 28;
      const width = Math.round(baseWidth * scale);
      const height = Math.round(baseHeight * scale);
      const fontSize = Math.round(13 * scale);
      
      const isActive = isSelected || isHovered;
      const bgColor = isActive ? '#222222' : '#ffffff';
      const textColor = isActive ? '#ffffff' : '#222222';
      const borderColor = isActive ? '#222222' : '#dddddd';
      const shadowOpacity = isActive ? 0.3 : 0.15;
      const shadowBlur = isActive ? 6 : 4;
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${baseWidth} ${baseHeight}">
          <defs>
            <filter id="sh" x="-30%" y="-30%" width="160%" height="180%">
              <feDropShadow dx="0" dy="2" stdDeviation="${shadowBlur}" flood-color="#000" flood-opacity="${shadowOpacity}"/>
            </filter>
          </defs>
          <rect x="1" y="1" width="${baseWidth - 2}" height="${baseHeight - 2}" rx="14" 
            fill="${bgColor}" 
            filter="url(#sh)"
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

    const bounds = new google.maps.LatLngBounds();
    cargasComCoordenadas.forEach((carga) => {
      const lat = toNumber(carga.endereco_origem?.latitude);
      const lng = toNumber(carga.endereco_origem?.longitude);
      if (lat !== null && lng !== null) bounds.extend({ lat, lng });
    });

    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, cargasComCoordenadas, toNumber]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle marker click - only open InfoWindow, don't trigger accept dialog
  const handleMarkerClick = useCallback((carga: Carga) => {
    setSelectedCarga(carga);
  }, []);

  // Handle "Aceitar Carga" button inside InfoWindow
  const handleAcceptClick = useCallback(() => {
    if (selectedCarga) {
      onCargaClick(selectedCarga);
      setSelectedCarga(null);
    }
  }, [selectedCarga, onCargaClick]);

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
        onClick={() => setSelectedCarga(null)}
      >
        {/* Price markers (Airbnb-style) */}
        {cargasComCoordenadas.map((carga) => {
          const isHovered = hoveredCargaId === carga.id;
          const isSelected = selectedCarga?.id === carga.id;
          const priceText = carga.valor_frete_tonelada
            ? `R$${Math.round(carga.valor_frete_tonelada)}`
            : '---';

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

        {/* Info Window for selected carga - styled nicely */}
        {selectedCarga && (() => {
          const lat = toNumber(selectedCarga.endereco_origem?.latitude);
          const lng = toNumber(selectedCarga.endereco_origem?.longitude);
          if (lat === null || lng === null) return null;

          const destinatario = selectedCarga.destinatario_nome_fantasia || selectedCarga.destinatario_razao_social;
          const pesoDisponivel = selectedCarga.peso_disponivel_kg ?? selectedCarga.peso_kg;

          return (
            <InfoWindow
              position={{ lat, lng }}
              onCloseClick={() => setSelectedCarga(null)}
              options={{
                pixelOffset: new google.maps.Size(0, -20),
                maxWidth: 320,
              }}
            >
              <div className="p-1" style={{ minWidth: '280px' }}>
                {/* Header with logo */}
                <div className="flex items-start gap-3 mb-3">
                  {selectedCarga.empresa?.logo_url && (
                    <div className="shrink-0 w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                      <img 
                        src={selectedCarga.empresa.logo_url} 
                        alt={selectedCarga.empresa.nome || 'Logo'} 
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-white">
                        {selectedCarga.codigo}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 line-clamp-1">{selectedCarga.descricao}</p>
                    {selectedCarga.empresa?.nome && (
                      <p className="text-xs text-gray-500">{selectedCarga.empresa.nome}</p>
                    )}
                  </div>
                </div>

                {/* Destinatário */}
                {destinatario && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{destinatario}</span>
                  </div>
                )}

                {/* Route */}
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-gray-700">{selectedCarga.endereco_origem?.cidade}, {selectedCarga.endereco_origem?.estado}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-gray-700">{selectedCarga.endereco_destino?.cidade}, {selectedCarga.endereco_destino?.estado}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Weight className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{pesoDisponivel.toLocaleString('pt-BR')} kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(selectedCarga.valor_frete_tonelada)}
                    </span>
                    <span className="text-sm text-gray-500">/ton</span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={handleAcceptClick}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  Ver Detalhes e Aceitar
                </button>
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>

      {/* Status badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
        {cargasComCoordenadas.length} cargas disponíveis
      </div>
    </div>
  );
}
