import { memo } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { MapPin, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteMarkerProps {
  position: google.maps.LatLngLiteral;
  type: 'origin' | 'destination';
  label?: string;
}

const markerConfig = {
  origin: {
    icon: MapPin,
    bgClass: 'bg-emerald-500',
    shadowClass: 'shadow-emerald-500/40',
    letter: 'O',
  },
  destination: {
    icon: Flag,
    bgClass: 'bg-rose-500',
    shadowClass: 'shadow-rose-500/40',
    letter: 'D',
  },
};

function RouteMarkerComponent({ position, type, label }: RouteMarkerProps) {
  const config = markerConfig[type];
  const Icon = config.icon;

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: -14, y: -14 })}
    >
      <div className="relative group cursor-pointer">
        {/* Marker circle */}
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110',
            config.bgClass,
            config.shadowClass
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Tooltip on hover */}
        {label && (
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-popover border rounded-lg shadow-lg px-2.5 py-1 whitespace-nowrap">
              <span className="text-xs font-medium">{label}</span>
            </div>
          </div>
        )}
      </div>
    </OverlayView>
  );
}

export const RouteMarker = memo(RouteMarkerComponent, (prev, next) => {
  return (
    prev.position.lat === next.position.lat &&
    prev.position.lng === next.position.lng &&
    prev.type === next.type
  );
});
