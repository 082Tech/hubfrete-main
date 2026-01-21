import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  Package,
  MessageSquare,
  User,
  Truck,
  FileText,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';

const tipoConfig: Record<string, { icon: React.ElementType; color: string }> = {
  status_entrega_alterado: { icon: Truck, color: 'text-blue-500' },
  nova_mensagem: { icon: MessageSquare, color: 'text-green-500' },
  motorista_adicionado: { icon: User, color: 'text-purple-500' },
  carga_publicada: { icon: Package, color: 'text-orange-500' },
  entrega_aceita: { icon: Check, color: 'text-emerald-500' },
  entrega_concluida: { icon: CheckCheck, color: 'text-emerald-600' },
  cte_anexado: { icon: FileText, color: 'text-amber-500' },
};

interface NotificacoesDropdownProps {
  collapsed?: boolean;
}

export function NotificacoesDropdown({ collapsed = false }: NotificacoesDropdownProps) {
  const navigate = useNavigate();
  const { notificacoes, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotificacoes();

  const handleNotificationClick = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      markAsRead(notificacao.id);
    }
    if (notificacao.link) {
      navigate(notificacao.link);
    }
  };

  const getIcon = (tipo: string) => {
    const config = tipoConfig[tipo] || { icon: Bell, color: 'text-muted-foreground' };
    return config;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'relative',
            collapsed ? 'w-10 h-10' : 'gap-2 px-3'
          )}
        >
          <Bell className="h-5 w-5" />
          {!collapsed && <span>Notificações</span>}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                'absolute px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px]',
                collapsed ? '-top-1 -right-1' : '-top-1 right-0'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 md:w-96"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="py-1">
              {notificacoes.map((notificacao) => {
                const { icon: Icon, color } = getIcon(notificacao.tipo);
                return (
                  <DropdownMenuItem
                    key={notificacao.id}
                    className={cn(
                      'flex items-start gap-3 p-3 cursor-pointer',
                      !notificacao.lida && 'bg-accent/50'
                    )}
                    onClick={() => handleNotificationClick(notificacao)}
                  >
                    <div className={cn('mt-0.5 shrink-0', color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-sm truncate',
                          !notificacao.lida && 'font-semibold'
                        )}>
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(notificacao.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {notificacoes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  // Could navigate to a full notifications page in the future
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
