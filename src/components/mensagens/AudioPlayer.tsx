import { useState, useRef, useEffect } from 'react';
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

  // Generate pseudo-waveform bars
  const barCount = compact ? 28 : 32;
  const bars = useRef(
    Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8)
  ).current;

  return (
    <div className={cn('flex items-center gap-2.5', compact ? 'min-w-[200px]' : 'min-w-[220px]')}>
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        onClick={togglePlay}
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95',
          compact ? 'h-9 w-9' : 'h-10 w-10',
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
      >
        {isPlaying ? (
          <Pause className={cn(compact ? 'h-4 w-4' : 'h-[18px] w-[18px]')} />
        ) : (
          <Play className={cn('ml-0.5', compact ? 'h-4 w-4' : 'h-[18px] w-[18px]')} />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform */}
        <div
          className="flex items-end gap-[2px] h-[22px] cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((height, i) => {
            const barPct = (i / barCount) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors duration-100',
                  isOwn
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                    : isActive ? 'bg-primary' : 'bg-primary/20'
                )}
                style={{ height: `${height * 100}%`, minHeight: 3 }}
              />
            );
          })}
        </div>

        {/* Time */}
        <div className="flex justify-between">
          <span className={cn(
            'text-[10px] tabular-nums',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {formatTime(isPlaying || currentTime > 0 ? currentTime : displayDuration)}
          </span>
          {(isPlaying || currentTime > 0) && (
            <span className={cn(
              'text-[10px] tabular-nums',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {formatTime(displayDuration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
