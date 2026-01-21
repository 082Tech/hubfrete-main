import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mensagem } from './types';

interface MessageBubbleProps {
  message: Mensagem;
  isOwn: boolean;
  showAvatar?: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar = true }: MessageBubbleProps) {
  const getSenderBadgeColor = () => {
    switch (message.sender_tipo) {
      case 'embarcador':
        return 'text-blue-600';
      case 'transportadora':
        return 'text-orange-600';
      case 'motorista':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

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

  const getInitials = () => {
    const words = message.sender_nome.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return message.sender_nome.substring(0, 2).toUpperCase();
  };

  return (
    <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {/* Avatar for other users */}
      {!isOwn && showAvatar && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Simular o avatar para adicionar espaço */}
      {!isOwn && !showAvatar && (
        <div className="h-8 w-8 shrink-0 mt-1">
        </div>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border rounded-bl-md'
        )}
      >
        {/* Always show sender info at top of bubble */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'text-xs font-semibold truncate',
            isOwn ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {message.sender_nome}
          </span>
          <span className={cn(
            'text-[10px] font-medium shrink-0',
            isOwn ? 'text-primary-foreground/70' : getSenderBadgeColor()
          )}>
            {getSenderBadge()}
          </span>
        </div>

        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.conteudo}</p>

        <div className={cn(
          'flex items-center gap-1 mt-1.5',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span className={cn(
            'text-[10px]',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOwn && (
            message.lida
              ? <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />
              : <Check className="h-3.5 w-3.5 text-primary-foreground/70" />
          )}
        </div>
      </div>

      {isOwn && showAvatar && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      )}


      {/* Spacer for own messages to align with avatar space */}
      {isOwn && !showAvatar && <div className="w-8 shrink-0" />}
    </div>
  );
}
