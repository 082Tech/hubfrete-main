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
    ringClass: 'ring-emerald-500/30',
    letter: 'O',
  },
  destination: {
    icon: Flag,
    bgClass: 'bg-rose-500',
    ringClass: 'ring-rose-500/30',
    letter: 'D',
  },
};

export function RouteMarker({ position, type, label }: RouteMarkerProps) {
  const config = markerConfig[type];
  const Icon = config.icon;

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: -16, y: -40 })}
    >
      <div className="relative group cursor-pointer">
        {/* Marker pin */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shadow-lg ring-4 transition-transform duration-200 group-hover:scale-110',
            config.bgClass,
            config.ringClass
          )}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Pin tail */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 top-7 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent',
            type === 'origin' ? 'border-t-emerald-500' : 'border-t-rose-500'
          )}
        />

        {/* Tooltip */}
        {label && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-popover border rounded-lg shadow-lg px-3 py-1.5 whitespace-nowrap">
              <span className="text-xs font-medium">{label}</span>
            </div>
          </div>
        )}
      </div>
    </OverlayView>
  );
}
