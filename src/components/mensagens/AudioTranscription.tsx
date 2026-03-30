import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioTranscriptionProps {
  transcription: string;
  isOwn: boolean;
}

export function AudioTranscription({ transcription, isOwn }: AudioTranscriptionProps) {
  const [expanded, setExpanded] = useState(false);

  // Truncate to ~80 chars for collapsed view
  const isLong = transcription.length > 80;
  const preview = isLong ? transcription.slice(0, 80) + '…' : transcription;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-start gap-1.5 text-left w-full group',
          isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )}
      >
        <Sparkles className={cn(
          'h-3 w-3 mt-0.5 shrink-0',
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/70'
        )} />
        <span className="text-[11px] leading-relaxed italic flex-1">
          {expanded ? transcription : preview}
        </span>
        {isLong && (
          expanded ? (
            <ChevronUp className="h-3 w-3 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          )
        )}
      </button>
    </div>
  );
}
