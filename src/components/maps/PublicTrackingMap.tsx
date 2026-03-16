import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { useMemo, useState } from 'react';
import { GoogleMapsLoader, airbnbMapStyles, defaultMapContainerStyle } from './GoogleMapsLoader';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPinOff } from 'lucide-react';
import { TruckIcon } from './TruckIcon';

interface PublicTrackingMapProps {
    latitude?: number;
    longitude?: number;
    lastUpdate?: string | null;
}

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: airbnbMapStyles,
    gestureHandling: 'greedy',
};

const disabledMapOptions: google.maps.MapOptions = {
    ...mapOptions,
    gestureHandling: 'none',
    zoomControl: false,
    fullscreenControl: false,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
};

function MapContent({ latitude, longitude, lastUpdate }: PublicTrackingMapProps) {
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const hasLocation = latitude !== undefined && longitude !== undefined;

    const center = useMemo(() => {
        if (hasLocation) {
            return { lat: latitude, lng: longitude };
        }
        // Default center (Brazil)
        return { lat: -15.7801, lng: -47.9292 };
    }, [latitude, longitude, hasLocation]);

    return (
        <div className="relative w-full h-full">
            <GoogleMap
                mapContainerStyle={defaultMapContainerStyle}
                center={center}
                zoom={hasLocation ? 14 : 4}
                options={hasLocation ? mapOptions : disabledMapOptions}
                onLoad={setMap}
            >
                {hasLocation && (
                    <>
                        <OverlayView
                            position={center}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            getPixelPositionOffset={() => ({ x: -24, y: -24 })}
                        >
                            <div title={`Atualizado ${lastUpdate ? formatDistanceToNow(new Date(lastUpdate), { locale: ptBR, addSuffix: true }) : ''}`}>
                                <TruckIcon heading={0} isOnline={true} size={48} />
                            </div>
                        </OverlayView>

                        {lastUpdate && (
                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-3 py-1 rounded-md shadow text-xs font-medium text-gray-700">
                                Atualizado {formatDistanceToNow(new Date(lastUpdate), { locale: ptBR, addSuffix: true })}
                            </div>
                        )}
                    </>
                )}
            </GoogleMap>

            {!hasLocation && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-white/90 p-4 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center gap-2 text-center max-w-[250px]">
                        <div className="p-3 bg-gray-100 rounded-full">
                            <MapPinOff className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">Localização não disponível</p>
                            <p className="text-xs text-gray-500">O rastreamento do veículo não foi iniciado ou o sinal foi perdido.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PublicTrackingMap(props: PublicTrackingMapProps) {
    return (
        <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative">
            <GoogleMapsLoader>
                <MapContent {...props} />
            </GoogleMapsLoader>
        </div>
    );
}
