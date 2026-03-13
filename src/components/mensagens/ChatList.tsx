import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MessageSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListItem } from './ChatListItem';
import { Chat } from './types';
import { Button } from '@/components/ui/button';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  userType: 'embarcador' | 'transportadora';
}

export function ChatList({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  isLoading, 
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  userType 
}: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get scroll container
  const getScrollContainer = useCallback(() => {
    if (!scrollRef.current) return null;
    return scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Handle scroll for loading more chats
  const handleScroll = useCallback(() => {
    if (!onLoadMore || isLoadingMore || !hasMore) return;
    
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    // Load more when scrolled near bottom (threshold: 200px from bottom)
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMore, getScrollContainer]);

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll, getScrollContainer]);

  // Count finalized chats
  const finalizedCount = chats.filter(chat => 
    chat.entrega?.status && FINALIZED_STATUSES.includes(chat.entrega.status)
  ).length;

  const activeCount = chats.length - finalizedCount;

  const filteredChats = chats.filter(chat => {
    // First filter by finalized status
    const isFinalized = chat.entrega?.status && FINALIZED_STATUSES.includes(chat.entrega.status);
    if (!showFinalized && isFinalized) return false;
    
    // Then filter by search term
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    const codigo = chat.entrega?.carga?.codigo?.toLowerCase() || '';
    const descricao = chat.entrega?.carga?.descricao?.toLowerCase() || '';
    const motorista = chat.entrega?.motorista?.nome_completo?.toLowerCase() || '';
    const embarcador = chat.entrega?.carga?.empresa?.nome?.toLowerCase() || '';
    const transportadora = chat.entrega?.motorista?.empresa?.nome?.toLowerCase() || '';
    
    return codigo.includes(searchLower) || 
           descricao.includes(searchLower) || 
           motorista.includes(searchLower) ||
           embarcador.includes(searchLower) ||
           transportadora.includes(searchLower);
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">Filtro</span>
                {showFinalized && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    Todas
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={!showFinalized}
                onCheckedChange={() => setShowFinalized(false)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Conversas ativas</span>
                  <Badge variant="secondary" className="text-xs ml-2">{activeCount}</Badge>
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showFinalized}
                onCheckedChange={() => setShowFinalized(true)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Todas as conversas</span>
                  <Badge variant="secondary" className="text-xs ml-2">{chats.length}</Badge>
                </div>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma conversa encontrada' : showFinalized ? 'Nenhuma conversa ainda' : 'Nenhuma conversa ativa'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {!searchTerm && !showFinalized && finalizedCount > 0 && (
                <button 
                  onClick={() => setShowFinalized(true)}
                  className="text-primary hover:underline"
                >
                  Ver {finalizedCount} conversa{finalizedCount > 1 ? 's' : ''} finalizada{finalizedCount > 1 ? 's' : ''}
                </button>
              )}
              {!searchTerm && showFinalized && 'As conversas aparecerão aqui quando houver entregas'}
            </p>
          </div>
        ) : (
          <>
            {filteredChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onClick={() => onSelectChat(chat.id)}
                userType={userType}
              />
            ))}
            
            {/* Load more indicator */}
            {hasMore && (
              <div className="flex justify-center py-4">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando...</span>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onLoadMore}
                    className="text-muted-foreground text-xs"
                  >
                    Carregar mais conversas
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}