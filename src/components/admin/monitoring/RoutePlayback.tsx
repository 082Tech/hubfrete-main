import { useState, useEffect, useCallback, useRef } from 'react';
import { Polyline, Marker } from '@react-google-maps/api';
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
  velocidade: number | null;
}

interface RoutePlaybackProps {
  points: TrackingPoint[];
  isVisible: boolean;
  onClose: () => void;
}

export function RoutePlayback({ points, isVisible, onClose }: RoutePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const currentPoint = sortedPoints[currentIndex];

  // Create path for polyline
  const pathCoords = sortedPoints.slice(0, currentIndex + 1).map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
  }));

  // Full path (gray)
  const fullPath = sortedPoints.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
  }));

  // Playback logic
  useEffect(() => {
    if (isPlaying && currentIndex < sortedPoints.length - 1) {
      const delay = 1000 / playbackSpeed;
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

  const toggleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

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

      {/* Traveled path (colored) */}
      <Polyline
        path={pathCoords}
        options={{
          strokeColor: '#f97316',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          zIndex: 2,
        }}
      />

      {/* Current position marker */}
      {currentPoint && (
        <Marker
          position={{ lat: currentPoint.latitude, lng: currentPoint.longitude }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f97316',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }}
          zIndex={10}
        />
      )}

      {/* Control Panel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-4 min-w-[320px]">
        {/* Time display */}
        {currentPoint && (
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(currentPoint.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
            {currentPoint.velocidade !== null && (
              <span className="text-chart-2 font-medium">
                {Math.round(currentPoint.velocidade)} km/h
              </span>
            )}
          </div>
        )}

        {/* Progress slider */}
        <Slider
          value={[currentIndex]}
          max={sortedPoints.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="mb-3"
        />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" onClick={handlePlayPause}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={toggleSpeed}>
              <FastForward className="w-4 h-4" />
              <span className="sr-only">{playbackSpeed}x</span>
            </Button>
            <span className="text-xs text-muted-foreground ml-1">{playbackSpeed}x</span>
          </div>

          <div className="text-xs text-muted-foreground">
            {currentIndex + 1} / {sortedPoints.length} pontos
          </div>
        </div>
      </div>
    </>
  );
}
