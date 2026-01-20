import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, User, Truck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Chat } from './types';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  userType: 'embarcador' | 'transportadora';
}

export function ChatListItem({ chat, isSelected, onClick, userType }: ChatListItemProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, 'dd/MM/yy');
  };

  // Determine chat title based on user type
  const getChatTitle = () => {
    if (!chat.entrega) return 'Chat';
    
    if (userType === 'embarcador') {
      // Show transportadora or motorista name
      if (chat.entrega.motorista?.empresa?.nome) {
        return chat.entrega.motorista.empresa.nome;
      }
      return chat.entrega.motorista?.nome_completo || 'Motorista';
    } else {
      // Show embarcador name
      return chat.entrega.carga?.empresa?.nome || 'Embarcador';
    }
  };

  const getSubtitle = () => {
    if (!chat.entrega) return '';
    return `${chat.entrega.carga?.codigo} - ${chat.entrega.carga?.descricao?.substring(0, 30)}...`;
  };

  const getAvatar = () => {
    if (userType === 'embarcador') {
      return chat.entrega?.motorista?.foto_url;
    }
    return undefined;
  };

  const getInitials = () => {
    const title = getChatTitle();
    return title.substring(0, 2).toUpperCase();
  };

  const getIcon = () => {
    if (userType === 'embarcador') {
      if (chat.entrega?.motorista?.empresa) {
        return <Truck className="h-4 w-4" />;
      }
      return <User className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border/50',
        isSelected 
          ? 'bg-primary/10 border-l-2 border-l-primary' 
          : 'hover:bg-muted/50'
      )}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={getAvatar()} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getIcon()}
            <span className="font-medium truncate">{getChatTitle()}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDate(chat.updated_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm text-muted-foreground truncate">
            {chat.ultima_mensagem?.conteudo || getSubtitle()}
          </p>
          {chat.mensagens_nao_lidas && chat.mensagens_nao_lidas > 0 && (
            <Badge variant="default" className="shrink-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
              {chat.mensagens_nao_lidas > 9 ? '9+' : chat.mensagens_nao_lidas}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
