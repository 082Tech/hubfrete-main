import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { useGoogleMaps, defaultMapContainerStyle, defaultCenter, defaultOptions } from './GoogleMapsLoader';

interface Carga {
  id: string;
  codigo: string;
  descricao: string;
  peso_kg: number;
  valor_frete_tonelada: number | null;
  endereco_origem: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  endereco_destino: {
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
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

export default function CargasGoogleMap({
  cargas,
  onCargaClick,
  hoveredCargaId,
  setHoveredCargaId,
}: CargasGoogleMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);

  // Filter cargas with valid coordinates
  const cargasComCoordenadas = useMemo(() => {
    return cargas.filter(
      (c) => c.endereco_origem?.latitude && c.endereco_origem?.longitude
    );
  }, [cargas]);

  // Fit bounds when map loads or cargas change
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  useEffect(() => {
    if (!map || cargasComCoordenadas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    cargasComCoordenadas.forEach((carga) => {
      if (carga.endereco_origem?.latitude && carga.endereco_origem?.longitude) {
        bounds.extend({
          lat: carga.endereco_origem.latitude,
          lng: carga.endereco_origem.longitude,
        });
      }
    });
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, cargasComCoordenadas]);

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
      options={defaultOptions}
    >
      {cargasComCoordenadas.map((carga) => {
        const isHovered = hoveredCargaId === carga.id;
        const priceText = carga.valor_frete_tonelada
          ? `R$${Math.round(carga.valor_frete_tonelada)}`
          : '---';

        return (
          <Marker
            key={carga.id}
            position={{
              lat: carga.endereco_origem!.latitude!,
              lng: carga.endereco_origem!.longitude!,
            }}
            label={{
              text: `${priceText}/ton`,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 0,
            }}
            onClick={() => setSelectedCarga(carga)}
            onMouseOver={() => setHoveredCargaId(carga.id)}
            onMouseOut={() => setHoveredCargaId(null)}
          />
        );
      })}

      {/* Custom markers with price labels */}
      {cargasComCoordenadas.map((carga) => {
        const isHovered = hoveredCargaId === carga.id;
        const priceText = carga.valor_frete_tonelada
          ? `R$${Math.round(carga.valor_frete_tonelada)}`
          : '---';

        return (
          <PriceMarker
            key={`price-${carga.id}`}
            carga={carga}
            isHovered={isHovered}
            onClick={() => setSelectedCarga(carga)}
            onMouseEnter={() => setHoveredCargaId(carga.id)}
            onMouseLeave={() => setHoveredCargaId(null)}
          />
        );
      })}

      {selectedCarga && selectedCarga.endereco_origem?.latitude && (
        <InfoWindow
          position={{
            lat: selectedCarga.endereco_origem.latitude,
            lng: selectedCarga.endereco_origem.longitude!,
          }}
          onCloseClick={() => setSelectedCarga(null)}
        >
          <div className="p-2 min-w-[200px]">
            <p className="font-semibold text-sm">{selectedCarga.codigo}</p>
            <p className="text-xs text-gray-600 mb-2">{selectedCarga.descricao}</p>
            <div className="flex items-center gap-1 text-xs mb-2">
              <MapPin className="w-3 h-3 text-green-600" />
              <span>{selectedCarga.endereco_origem?.cidade}</span>
              <ArrowRight className="w-3 h-3" />
              <MapPin className="w-3 h-3 text-red-600" />
              <span>{selectedCarga.endereco_destino?.cidade}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">{selectedCarga.peso_kg.toLocaleString('pt-BR')} kg</span>
              <span className="font-semibold text-green-600 text-sm">
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
      )}
    </GoogleMap>
  );
}

// Custom Price Marker Component using OverlayView
import { OverlayView } from '@react-google-maps/api';

interface PriceMarkerProps {
  carga: Carga;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function PriceMarker({ carga, isHovered, onClick, onMouseEnter, onMouseLeave }: PriceMarkerProps) {
  if (!carga.endereco_origem?.latitude || !carga.endereco_origem?.longitude) {
    return null;
  }

  const priceText = carga.valor_frete_tonelada
    ? `R$${Math.round(carga.valor_frete_tonelada)}`
    : '---';

  return (
    <OverlayView
      position={{
        lat: carga.endereco_origem.latitude,
        lng: carga.endereco_origem.longitude,
      }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          cursor-pointer px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap
          shadow-lg border-2 border-white transition-all duration-200
          ${isHovered 
            ? 'bg-foreground text-background scale-110 z-50' 
            : 'bg-primary text-primary-foreground'
          }
        `}
        style={{
          transform: 'translate(-50%, -50%)',
        }}
      >
        {priceText}/ton
      </div>
    </OverlayView>
  );
}
