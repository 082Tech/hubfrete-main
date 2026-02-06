import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Headset, Search, Filter, Loader2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListItem } from '@/components/mensagens/ChatListItem';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FINALIZED_STATUSES = ['entregue', 'devolvida', 'cancelada', 'problema'];

interface FloatingChatButtonProps {
  userType: 'embarcador' | 'transportadora';
}

export function FloatingChatButton({ userType }: FloatingChatButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFinalized, setShowFinalized] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Hide on mensagens page
  const isOnMessagesPage = location.pathname.includes('/mensagens');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  
  // Get empresa_id
  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
      if (data) setEmpresaId(data);
    };
    fetchEmpresaId();
  }, []);

  const {
    chats,
    isLoadingChats,
    isLoadingMoreChats,
    hasMoreChats,
    loadMoreChats,
  } = useChats({ userType, empresaId });

  // Count total unread
  const totalUnread = chats.reduce((sum, chat) => sum + (chat.mensagens_nao_lidas || 0), 0);

  // Filter chats
  const filteredChats = chats.filter(chat => {
    const isFinalized = chat.entrega?.status && FINALIZED_STATUSES.includes(chat.entrega.status);
    if (!showFinalized && isFinalized) return false;
    
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const codigo = chat.entrega?.carga?.codigo?.toLowerCase() || '';
    const motorista = chat.entrega?.motorista?.nome_completo?.toLowerCase() || '';
    const embarcador = chat.entrega?.carga?.empresa?.nome?.toLowerCase() || '';
    return codigo.includes(s) || motorista.includes(s) || embarcador.includes(s);
  });

  const handleSelectChat = (chatId: string) => {
    setOpen(false);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      navigate(`/${userType}/mensagens?entrega=${chat.entrega_id}`);
    }
  };

  const handleOpenSupport = () => {
    setOpen(false);
    navigate(`/${userType}/configuracoes`);
  };

  if (isOnMessagesPage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6" ref={popoverRef}>
      {/* Popover */}
      {open && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="p-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Conversas</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-[11px] h-7 px-2"
                  onClick={handleOpenSupport}
                >
                  <Headset className="h-3 w-3" />
                  Suporte
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Filter className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuCheckboxItem
                      checked={!showFinalized}
                      onCheckedChange={() => setShowFinalized(false)}
                    >
                      Conversas ativas
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={showFinalized}
                      onCheckedChange={() => setShowFinalized(true)}
                    >
                      Todas as conversas
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1" style={{ maxHeight: 'calc(70vh - 100px)' }}>
            {isLoadingChats ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ativa'}
                </p>
              </div>
            ) : (
              <>
                {filteredChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={false}
                    onClick={() => handleSelectChat(chat.id)}
                    userType={userType}
                  />
                ))}
                {hasMoreChats && (
                  <div className="flex justify-center py-2">
                    {isLoadingMoreChats ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button variant="ghost" size="sm" onClick={loadMoreChats} className="text-xs text-muted-foreground">
                        Carregar mais
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-12 w-12 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'hover:scale-105 active:scale-95 transition-all duration-200',
          'flex items-center justify-center',
          'mb-14 md:mb-0'
        )}
        aria-label="Abrir mensagens"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && totalUnread > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-background"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </button>
    </div>
  );
}
