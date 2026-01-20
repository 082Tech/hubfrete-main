import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, User, Truck, Building2, MapPin, ArrowRight } from 'lucide-react';
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
    return format(date, 'dd/MM');
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

  const getRoute = () => {
    if (!chat.entrega?.carga) return null;
    const origem = chat.entrega.carga.endereco_origem;
    const destino = chat.entrega.carga.endereco_destino;
    if (!origem || !destino) return null;
    return { origem, destino };
  };

  const getAvatar = () => {
    if (userType === 'embarcador') {
      return chat.entrega?.motorista?.foto_url || chat.entrega?.motorista?.empresa?.logo_url;
    }
    return chat.entrega?.carga?.empresa?.logo_url;
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
    return <Building2 className="h-4 w-4" />;
  };

  const route = getRoute();

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex gap-3 p-4 cursor-pointer transition-all border-b border-border/50',
        isSelected 
          ? 'bg-primary/5 border-l-4 border-l-primary' 
          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
      )}
    >
      {/* Avatar with unread badge */}
      <div className="relative shrink-0">
        <Avatar className={cn(
          'h-14 w-14 ring-2',
          isSelected ? 'ring-primary' : 'ring-transparent'
        )}>
          <AvatarImage src={getAvatar()} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        {/* Unread badge - top right corner */}
        {(chat.mensagens_nao_lidas ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            {chat.mensagens_nao_lidas! > 9 ? '9+' : chat.mensagens_nao_lidas}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold truncate text-foreground">{getChatTitle()}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDate(chat.updated_at)}
          </span>
        </div>
        
        {/* Cargo code */}
        <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
            {chat.entrega?.carga?.codigo || 'Carga'}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {chat.entrega?.carga?.descricao || ''}
          </span>
        </div>

        {/* Route or last message */}
        {chat.ultima_mensagem ? (
          <p className={cn(
            'text-sm truncate',
            chat.mensagens_nao_lidas && chat.mensagens_nao_lidas > 0 
              ? 'text-foreground font-medium' 
              : 'text-muted-foreground'
          )}>
            {chat.ultima_mensagem.conteudo}
          </p>
        ) : route ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{route.origem.cidade}</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="truncate">{route.destino.cidade}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
