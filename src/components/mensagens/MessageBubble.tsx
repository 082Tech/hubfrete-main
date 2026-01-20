import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mensagem } from './types';

interface MessageBubbleProps {
  message: Mensagem;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const getSenderBadge = () => {
    switch (message.sender_tipo) {
      case 'embarcador':
        return 'Embarcador';
      case 'transportadora':
        return 'Transportadora';
      case 'motorista':
        return 'Motorista';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none'
        )}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">{message.sender_nome}</span>
            <span className="text-xs opacity-70">• {getSenderBadge()}</span>
          </div>
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">{message.conteudo}</p>
        
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span className={cn(
            'text-xs',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOwn && (
            message.lida 
              ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
              : <Check className="h-3 w-3 text-primary-foreground/70" />
          )}
        </div>
      </div>
    </div>
  );
}
