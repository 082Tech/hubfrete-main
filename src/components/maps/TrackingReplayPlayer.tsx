import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Polyline, OverlayView } from '@react-google-maps/api';
import { Play, Pause, RotateCcw, FastForward, Clock, Gauge, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  status: string;
  velocidade: number | null;
  bussola_pos: number | null;
}

interface TrackingReplayPlayerProps {
  points: TrackingPoint[];
  isVisible: boolean;
}

// Calculate bearing between two points (in degrees, 0 = North)
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - 
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  
  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

// Truck SVG icon component
function TruckIcon({ heading, size = 40 }: { heading: number; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `rotate(${heading}deg)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Truck body pointing UP (north) */}
        <path
          d="M12 2L8 6V18C8 19.1 8.9 20 10 20H14C15.1 20 16 19.1 16 18V6L12 2Z"
          fill="#f97316"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        {/* Cabin */}
        <path
          d="M9 6H15V10H9V6Z"
          fill="#ea580c"
          stroke="#ffffff"
          strokeWidth="0.5"
        />
        {/* Front arrow indicator */}
        <path
          d="M12 3L10 5H14L12 3Z"
          fill="#ffffff"
        />
        {/* Wheels */}
        <circle cx="10" cy="17" r="1.5" fill="#374151" stroke="#ffffff" strokeWidth="0.5" />
        <circle cx="14" cy="17" r="1.5" fill="#374151" stroke="#ffffff" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

export function TrackingReplayPlayer({ points, isVisible }: TrackingReplayPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sort points by timestamp
  const sortedPoints = useMemo(() => 
    [...points].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ), [points]
  );

  const currentPoint = sortedPoints[currentIndex];
  const prevPoint = currentIndex > 0 ? sortedPoints[currentIndex - 1] : null;

  // Calculate heading: use bussola_pos if available, otherwise calculate from trajectory
  const currentHeading = useMemo(() => {
    if (!currentPoint) return 0;
    
    // First priority: use compass data if available
    if (currentPoint.bussola_pos != null) {
      return currentPoint.bussola_pos;
    }
    
    // Second priority: calculate from previous point
    if (prevPoint) {
      return calculateBearing(
        prevPoint.latitude,
        prevPoint.longitude,
        currentPoint.latitude,
        currentPoint.longitude
      );
    }
    
    // Third priority: look ahead to next point
    if (currentIndex < sortedPoints.length - 1) {
      const nextPoint = sortedPoints[currentIndex + 1];
      return calculateBearing(
        currentPoint.latitude,
        currentPoint.longitude,
        nextPoint.latitude,
        nextPoint.longitude
      );
    }
    
    return 0;
  }, [currentPoint, prevPoint, currentIndex, sortedPoints]);

  // Create path for polyline - traveled portion
  const traveledPath = useMemo(() => 
    sortedPoints.slice(0, currentIndex + 1).map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
    })), [sortedPoints, currentIndex]
  );

  // Full path (gray background)
  const fullPath = useMemo(() => 
    sortedPoints.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
    })), [sortedPoints]
  );

  // Playback logic
  useEffect(() => {
    if (isPlaying && currentIndex < sortedPoints.length - 1) {
      // Calculate delay based on playback speed
      // Base delay is 100ms, speed multiplier adjusts it
      const delay = 100 / playbackSpeed;
      
      intervalRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, delay);
    } else if (currentIndex >= sortedPoints.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, sortedPoints.length, playbackSpeed]);

  const handlePlayPause = useCallback(() => {
    if (currentIndex >= sortedPoints.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentIndex, sortedPoints.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    setIsPlaying(false);
    setCurrentIndex(value[0]);
  }, []);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 5;
      if (prev === 5) return 10;
      if (prev === 10) return 20;
      return 1;
    });
  }, []);

  // Format speed for display
  const formatSpeed = (speed: number | null) => {
    if (speed == null) return '—';
    return `${Math.round(speed)} km/h`;
  };

  if (!isVisible || sortedPoints.length === 0) return null;

  return (
    <>
      {/* Full path (gray background) */}
      <Polyline
        path={fullPath}
        options={{
          strokeColor: '#9ca3af',
          strokeOpacity: 0.4,
          strokeWeight: 3,
          zIndex: 1,
        }}
      />

      {/* Traveled path (orange) */}
      <Polyline
        path={traveledPath}
        options={{
          strokeColor: '#f97316',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          zIndex: 2,
        }}
      />

      {/* Truck marker at current position */}
      {currentPoint && (
        <OverlayView
          position={{ lat: currentPoint.latitude, lng: currentPoint.longitude }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: -20, y: -20 })}
        >
          <div className="relative">
            <TruckIcon heading={currentHeading} size={40} />
            {/* Shadow effect */}
            <div 
              className="absolute -inset-2 rounded-full bg-orange-500/20 -z-10"
              style={{ filter: 'blur(8px)' }}
            />
          </div>
        </OverlayView>
      )}

      {/* Control Panel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-4 min-w-[360px] max-w-[90vw]">
        {/* Info display */}
        {currentPoint && (
          <div className="flex items-center justify-between mb-3 text-sm gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {format(new Date(currentPoint.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {currentPoint.velocidade != null && (
                <span className="flex items-center gap-1 text-chart-2 font-medium">
                  <Gauge className="w-4 h-4" />
                  {formatSpeed(currentPoint.velocidade)}
                </span>
              )}
              <span className="flex items-center gap-1 text-primary font-medium">
                <Navigation className="w-4 h-4" style={{ transform: `rotate(${currentHeading}deg)` }} />
                {Math.round(currentHeading)}°
              </span>
            </div>
          </div>
        )}

        {/* Progress slider */}
        <div className="mb-3">
          <Slider
            value={[currentIndex]}
            max={sortedPoints.length - 1}
            step={1}
            onValueChange={handleSliderChange}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleReset} title="Reiniciar">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" onClick={handlePlayPause} title={isPlaying ? "Pausar" : "Play"}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={cycleSpeed} title="Velocidade">
              <FastForward className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1 min-w-[32px]">{playbackSpeed}x</span>
          </div>

          <div className="text-xs text-muted-foreground">
            {currentIndex + 1} / {sortedPoints.length} pontos
          </div>
        </div>
      </div>
    </>
  );
}
