import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, User, Truck, Building2, MapPin, ArrowRight, Image, FileText, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Chat } from './types';
import textAbbr from '@/utils/textAbbr';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  userType: 'embarcador' | 'transportadora';
}

// Attachment type icons helper
const getAttachmentPreview = (anexoTipo: string | null, anexoNome: string | null) => {
  if (!anexoTipo && !anexoNome) return null;
  
  const tipo = anexoTipo?.toLowerCase() || '';
  
  if (tipo.startsWith('image/')) {
    return { icon: Image, label: '📷 Foto' };
  }
  if (tipo === 'application/pdf') {
    return { icon: FileText, label: '📄 Documento PDF' };
  }
  if (tipo.includes('word') || tipo.includes('document')) {
    return { icon: FileText, label: '📄 Documento' };
  }
  if (tipo.includes('sheet') || tipo.includes('excel')) {
    return { icon: FileText, label: '📊 Planilha' };
  }
  if (tipo.includes('xml')) {
    return { icon: FileText, label: '📄 XML' };
  }
  return { icon: Paperclip, label: '📎 Anexo' };
};

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

  // Get last message preview with attachment support
  const getLastMessagePreview = () => {
    if (!chat.ultima_mensagem) return null;
    
    const msg = chat.ultima_mensagem;
    // Abbreviate sender name to first name only
    const firstName = msg.sender_nome.split(' ')[0];
    const senderName = textAbbr(firstName, 12);
    
    // Check if it's an attachment message
    if (msg.anexo_url || msg.anexo_tipo) {
      const attachment = getAttachmentPreview(msg.anexo_tipo || null, msg.anexo_nome || null);
      if (attachment) {
        return { senderName, content: attachment.label, isAttachment: true };
      }
    }
    
    // Regular text message - abbreviate content
    const content = textAbbr(msg.conteudo, 25);
    return { senderName, content, isAttachment: false };
  };

  const route = getRoute();
  const lastMessagePreview = getLastMessagePreview();
  const chatTitle = textAbbr(getChatTitle(), 22);
  const cargoDesc = textAbbr(chat.entrega?.carga?.descricao || '', 18);

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

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-foreground block truncate">{chatTitle}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDate(chat.updated_at)}
          </span>
        </div>
        
        {/* Cargo code */}
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
            {chat.entrega?.carga?.codigo || 'Carga'}
          </Badge>
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {cargoDesc}
          </span>
        </div>

        {/* Route or last message */}
        {lastMessagePreview ? (
          <p className={cn(
            'text-sm truncate block',
            chat.mensagens_nao_lidas && chat.mensagens_nao_lidas > 0 
              ? 'text-foreground font-medium' 
              : 'text-muted-foreground'
          )}>
            <span className="font-medium">{lastMessagePreview.senderName}:</span>{' '}
            <span className={lastMessagePreview.isAttachment ? 'italic' : ''}>
              {lastMessagePreview.content}
            </span>
          </p>
        ) : route ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
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
