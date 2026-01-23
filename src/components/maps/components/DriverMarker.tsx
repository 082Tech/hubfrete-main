import { memo, useCallback, useMemo } from 'react';
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
  // Stable position calculation
  const position = useMemo(() => {
    const lat = entrega.latitude ?? entrega.origemCoords?.lat ?? null;
    const lng = entrega.longitude ?? entrega.origemCoords?.lng ?? null;
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [entrega.latitude, entrega.longitude, entrega.origemCoords?.lat, entrega.origemCoords?.lng]);

  // Stable offset function
  const getPixelOffset = useCallback(() => ({
    x: -TRUCK_SIZE / 2,
    y: -TRUCK_SIZE / 2,
  }), []);

  // Stable click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  // Computed values
  const isRecent = isRecentUpdate(entrega.lastLocationUpdate);
  const isOnline = Boolean(entrega.motoristaOnline && isRecent);
  const formattedTime = formatTimestamp(entrega.lastLocationUpdate);

  if (!position) return null;

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={getPixelOffset}
    >
      <div
        className={cn(
          'relative cursor-pointer transition-transform duration-150 ease-out will-change-transform',
          isSelected && 'z-50 scale-125',
          isHovered && !isSelected && 'z-40 scale-110'
        )}
        style={{ width: TRUCK_SIZE, height: TRUCK_SIZE }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={handleClick}
      >
        <TruckIcon
          size={TRUCK_SIZE}
          heading={entrega.heading ?? 0}
          isOnline={isOnline}
        />

        {/* Hover Card */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 animate-fade-in pointer-events-none">
            <DriverHoverCard
              entrega={entrega}
              formattedTimestamp={formattedTime}
            />
          </div>
        )}
      </div>
    </OverlayView>
  );
}

// Strict memoization to prevent re-renders during Realtime updates
export const DriverMarker = memo(DriverMarkerComponent, (prev, next) => {
  // Only re-render if these specific values change
  if (prev.isHovered !== next.isHovered) return false;
  if (prev.isSelected !== next.isSelected) return false;
  
  const prevE = prev.entrega;
  const nextE = next.entrega;
  
  return (
    prevE.id === nextE.id &&
    prevE.latitude === nextE.latitude &&
    prevE.longitude === nextE.longitude &&
    prevE.heading === nextE.heading &&
    prevE.motoristaOnline === nextE.motoristaOnline &&
    // Use 30s threshold for timestamp comparison to reduce re-renders
    Math.abs((prevE.lastLocationUpdate ?? 0) - (nextE.lastLocationUpdate ?? 0)) < 30000
  );
});
