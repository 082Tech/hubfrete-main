import { memo } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { TruckIcon } from '../TruckIcon';
import { DriverHoverCard } from '../DriveHoveredCard';
import type { EntregaMapItem } from '../EntregasGoogleMap';
import { cn } from '@/lib/utils';

interface DriverMarkerProps {
  entrega: EntregaMapItem;
  isHovered: boolean;
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}

const TRUCK_SIZE = 52;
const TWO_MINUTES_MS = 2 * 60 * 1000;

function isRecentUpdate(ts?: number | null): boolean {
  if (!ts) return false;
  return Date.now() - ts < TWO_MINUTES_MS;
}

function formatTimestamp(ts?: number | null): string {
  if (!ts) return '-';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins} min atrás`;
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DriverMarkerComponent({
  entrega,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onSelect,
}: DriverMarkerProps) {
  // Use truck position, fallback to origin
  const lat = entrega.latitude ?? entrega.origemCoords?.lat ?? null;
  const lng = entrega.longitude ?? entrega.origemCoords?.lng ?? null;

  if (lat == null || lng == null) return null;

  const isRecent = isRecentUpdate(entrega.lastLocationUpdate);
  const isOnline = Boolean(entrega.motoristaOnline && isRecent);

  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({
        x: -TRUCK_SIZE / 2,
        y: -TRUCK_SIZE / 2,
      })}
    >
      <div
        className={cn(
          'relative cursor-pointer transition-all duration-200 ease-out',
          isSelected && 'z-50 scale-125',
          isHovered && !isSelected && 'z-40 scale-110'
        )}
        style={{ width: TRUCK_SIZE, height: TRUCK_SIZE }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <TruckIcon
          size={TRUCK_SIZE}
          heading={entrega.heading ?? 0}
          isOnline={isOnline}
        />

        {/* Hover Card */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 animate-fade-in">
            <DriverHoverCard
              entrega={entrega}
              formattedTimestamp={formatTimestamp(entrega.lastLocationUpdate)}
            />
          </div>
        )}
      </div>
    </OverlayView>
  );
}

// Memoize with custom comparison to prevent unnecessary re-renders
export const DriverMarker = memo(DriverMarkerComponent, (prev, next) => {
  return (
    prev.entrega.id === next.entrega.id &&
    prev.entrega.latitude === next.entrega.latitude &&
    prev.entrega.longitude === next.entrega.longitude &&
    prev.entrega.heading === next.entrega.heading &&
    prev.entrega.lastLocationUpdate === next.entrega.lastLocationUpdate &&
    prev.entrega.motoristaOnline === next.entrega.motoristaOnline &&
    prev.isHovered === next.isHovered &&
    prev.isSelected === next.isSelected
  );
});
