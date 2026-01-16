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

// Clean map style with natural colors (vegetation green, water blue)
const mapStyles: google.maps.MapTypeStyle[] = [
  // Base landscape - subtle gray
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f0f0f0' }],
  },
  // Natural landscape - soft green for vegetation
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#e8f4e8' }],
  },
  {
    featureType: 'landscape.natural.landcover',
    elementType: 'geometry',
    stylers: [{ color: '#d4ecd4' }],
  },
  // Water - nice blue
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#a8d4f0' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a90b8' }],
  },
  // Roads
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffd966' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e6b800' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  // Parks - green
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#c8e6c8' }],
  },
  // Hide POI labels for cleaner look
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  // Transit labels off
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Administrative boundaries
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c0c0c0' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#555555' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#777777' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
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

  // Create Airbnb-style price marker icon
  const createMarkerIcon = useCallback(
    (isHovered: boolean, isSelected: boolean) => {
      const bgColor = isSelected ? '#1a1a1a' : isHovered ? '#1a1a1a' : '#0d9668';
      const textColor = '#ffffff';
      const scale = isHovered || isSelected ? 1.1 : 1;
      const shadow = isHovered || isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
      
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(80 * scale)}" height="${Math.round(32 * scale)}" viewBox="0 0 80 32" style="filter: ${shadow}">
          <rect x="1" y="1" width="78" height="30" rx="15" fill="${bgColor}" stroke="${textColor}" stroke-width="2"/>
        </svg>
      `;
      
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
        scaledSize: new google.maps.Size(Math.round(80 * scale), Math.round(32 * scale)),
        anchor: new google.maps.Point(Math.round(40 * scale), Math.round(16 * scale)),
        labelOrigin: new google.maps.Point(Math.round(40 * scale), Math.round(16 * scale)),
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
              icon={createMarkerIcon(isHovered, isSelected)}
              label={{
                text: priceText,
                color: '#ffffff',
                fontSize: isHovered || isSelected ? '13px' : '12px',
                fontWeight: '600',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
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
