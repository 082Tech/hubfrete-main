import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlaybackRate, claimPlayback, releasePlayback } from './useAudioPlaybackRate';

interface AudioPlayerProps {
  url: string;
  duration?: number;
  isOwn: boolean;
  compact?: boolean;
}

export function AudioPlayer({ url, duration: propDuration, isOwn, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const { rate, cycleRate } = useAudioPlaybackRate();

  // RAF-based smooth progress updates
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(rafRef.current);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Sync global playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !displayDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * displayDuration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayDuration = duration || propDuration || 0;
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  const barCount = compact ? 32 : 40;
  const bars = useMemo(
    () => Array.from({ length: barCount }, (_, i) => {
      const base = 0.15 + Math.random() * 0.85;
      const wave = Math.sin(i * 0.4) * 0.2 + 0.5;
      return Math.min(1, base * wave + Math.random() * 0.3);
    }),
    [barCount]
  );

  return (
    <div className={cn('flex items-center gap-2', compact ? 'min-w-[200px]' : 'min-w-[240px]')}>
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={togglePlay}
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95',
          compact ? 'h-10 w-10' : 'h-11 w-11',
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="relative">
          <div
            className="flex items-center gap-[1.5px] h-[28px] cursor-pointer"
            onClick={handleSeek}
          >
            {bars.map((height, i) => {
              const barPct = (i / barCount) * 100;
              const isActive = barPct <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-75',
                    isOwn
                      ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                      : isActive ? 'bg-primary' : 'bg-primary/25'
                  )}
                  style={{ height: `${height * 100}%`, minHeight: 2 }}
                />
              );
            })}
          </div>

          {(isPlaying || currentTime > 0) && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm',
                isOwn ? 'bg-primary-foreground' : 'bg-primary'
              )}
              style={{
                left: `${Math.min(progress, 98)}%`,
                marginLeft: -6,
                willChange: 'left',
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={cn(
            'text-[10px] tabular-nums',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {formatTime(isPlaying || currentTime > 0 ? currentTime : displayDuration)}
          </span>

          <div className="flex items-center gap-2">
            {(isPlaying || currentTime > 0) && displayDuration > 0 && (
              <span className={cn(
                'text-[10px] tabular-nums',
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {formatTime(displayDuration)}
              </span>
            )}

            <button
              onClick={cycleRate}
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors',
                isOwn
                  ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary'
              )}
            >
              {rate.toFixed(1).replace('.', ',')}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
