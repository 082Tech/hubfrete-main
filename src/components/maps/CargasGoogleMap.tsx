import { GoogleMap, OverlayView, InfoWindow } from '@react-google-maps/api';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';
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

// Clean, modern map style with subtle colors
const mapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e8f5' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5d99ab' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e5f2e5' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'administrative.locality',
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
    <GoogleMap
      mapContainerStyle={defaultMapContainerStyle}
      center={defaultCenter}
      zoom={4}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* Price markers using OverlayView */}
      {cargasComCoordenadas.map((carga) => {
        const isHovered = hoveredCargaId === carga.id;
        const priceText = carga.valor_frete_tonelada
          ? `R$${Math.round(carga.valor_frete_tonelada)}`
          : '---';

        const lat = toNumber(carga.endereco_origem?.latitude);
        const lng = toNumber(carga.endereco_origem?.longitude);
        if (lat === null || lng === null) return null;

        return (
          <OverlayView
            key={carga.id}
            position={{ lat, lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={() => setSelectedCarga(carga)}
              onMouseEnter={() => setHoveredCargaId(carga.id)}
              onMouseLeave={() => setHoveredCargaId(null)}
              className={
                `cursor-pointer px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap ` +
                `shadow-lg border-2 border-background transition-all duration-200 ` +
                (isHovered
                  ? 'bg-foreground text-background scale-110 z-50'
                  : 'bg-primary text-primary-foreground')
              }
              style={{
                transform: 'translate(-50%, -50%)',
              }}
            >
              {priceText}/ton
            </div>
          </OverlayView>
        );
      })}

      {/* Info Window for selected carga */}
      {(() => {
        if (!selectedCarga) return null;
        const lat = toNumber(selectedCarga.endereco_origem?.latitude);
        const lng = toNumber(selectedCarga.endereco_origem?.longitude);
        if (lat === null || lng === null) return null;

        return (
          <InfoWindow
            position={{ lat, lng }}
            onCloseClick={() => setSelectedCarga(null)}
          >
            <div className="p-2 min-w-[200px]">
              <p className="font-semibold text-sm">{selectedCarga.codigo}</p>
              <p className="text-xs text-muted-foreground mb-2">{selectedCarga.descricao}</p>
              <div className="flex items-center gap-1 text-xs mb-2">
                <MapPin className="w-3 h-3 text-primary" />
                <span>{selectedCarga.endereco_origem?.cidade}</span>
                <ArrowRight className="w-3 h-3" />
                <MapPin className="w-3 h-3 text-destructive" />
                <span>{selectedCarga.endereco_destino?.cidade}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">{selectedCarga.peso_kg.toLocaleString('pt-BR')} kg</span>
                <span className="font-semibold text-primary text-sm">
                  {formatCurrency(selectedCarga.valor_frete_tonelada)}/ton
                </span>
              </div>
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  onCargaClick(selectedCarga);
                  setSelectedCarga(null);
                }}
              >
                Aceitar Carga
              </Button>
            </div>
          </InfoWindow>
        );
      })()}
    </GoogleMap>
  );
}
