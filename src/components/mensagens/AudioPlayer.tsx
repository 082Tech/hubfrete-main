import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  url: string;
  duration?: number;
  isOwn: boolean;
  compact?: boolean;
}

export function AudioPlayer({ url, duration: propDuration, isOwn, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.5, 2];
    const currentIdx = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIdx + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
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

  // Generate pseudo-waveform bars with varying heights (WhatsApp-style)
  const barCount = compact ? 32 : 40;
  const bars = useMemo(
    () => Array.from({ length: barCount }, (_, i) => {
      // Create a more natural wave pattern
      const base = 0.15 + Math.random() * 0.85;
      const wave = Math.sin(i * 0.4) * 0.2 + 0.5;
      return Math.min(1, base * wave + Math.random() * 0.3);
    }),
    [barCount]
  );

  return (
    <div className={cn('flex items-center gap-2', compact ? 'min-w-[200px]' : 'min-w-[240px]')}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause button - WhatsApp style circle */}
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
        {/* Waveform with progress indicator */}
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

          {/* Progress dot indicator */}
          {(isPlaying || currentTime > 0) && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-[left] duration-100',
                isOwn ? 'bg-primary-foreground' : 'bg-primary'
              )}
              style={{ left: `${Math.min(progress, 98)}%`, marginLeft: -6 }}
            />
          )}
        </div>

        {/* Time and speed controls */}
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

            {/* Playback speed button */}
            <button
              onClick={cyclePlaybackRate}
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors',
                isOwn
                  ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary'
              )}
            >
              {playbackRate.toFixed(1).replace('.', ',')}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
