import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { ImmersiveBackground } from "@/components/ai-assistant/ImmersiveBackground";
import { SuggestionBubbles } from "@/components/ai-assistant/SuggestionBubbles";
import { WelcomeAnimation } from "@/components/ai-assistant/WelcomeAnimation";
import { sendMessage, generateSessionId, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { Plus, MessageCircle, Clock, ChevronLeft, ChevronRight, Trash2, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAIChatHistory } from "@/hooks/useAIChatHistory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const WELCOME_SHOWN_KEY = 'hubfrete_welcome_shown';

export default function Assistente() {
  const { profile, user } = useAuth();
  const userName = profile?.nome_completo?.split(' ')[0] || 'Você';
  const fullName = profile?.nome_completo || 'Você';
  const userId = profile?.id ? parseInt(profile.id, 10) : null;
  const isMobile = useIsMobile();

  // Check if welcome animation was already shown
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(() => {
    return !sessionStorage.getItem(WELCOME_SHOWN_KEY);
  });

  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const {
    chatSessions,
    isLoading: isLoadingHistory,
    createChatSession,
    saveMessage,
    loadChatMessages,
    getChatBySessionId,
    deleteChatSession,
    updateChatTitle,
    refreshSessions,
  } = useAIChatHistory(userId);

  const getWelcomeMessage = useCallback((): ChatMessageType => ({
    id: 'welcome',
    role: 'assistant',
    content: `Olá, ${userName}! 👋 Sou o **Hubinho**, seu copiloto inteligente de logística. Como posso ajudá-lo hoje?`,
    timestamp: new Date(),
  }), [userName]);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleWelcomeComplete = useCallback(() => {
    sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    setShowWelcomeAnimation(false);
  }, []);

  // Initialize with welcome message after animation completes
  useEffect(() => {
    if (!showWelcomeAnimation && messages.length === 0) {
      setMessages([getWelcomeMessage()]);
    }
  }, [showWelcomeAnimation, getWelcomeMessage, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleNewChat = useCallback(() => {
    sessionStorage.removeItem("hubfrete-session-id");
    const newSessionId = generateSessionId();
    sessionStorage.setItem("hubfrete-session-id", newSessionId);
    setSessionId(newSessionId);
    setCurrentChatId(null);
    setMessages([getWelcomeMessage()]);
    setIsFirstMessage(true);
    setMobileHistoryOpen(false);
    toast.success("Nova conversa iniciada!");
  }, [getWelcomeMessage]);

  const handleSelectChat = useCallback(async (chat: { id: number; sessionid: string; title: string | null }) => {
    sessionStorage.setItem("hubfrete-session-id", chat.sessionid);
    setSessionId(chat.sessionid);
    setCurrentChatId(chat.id);
    setIsFirstMessage(false);
    setMobileHistoryOpen(false);
    
    const loadedMessages = await loadChatMessages(chat.sessionid);
    if (loadedMessages.length > 0) {
      setMessages(loadedMessages);
    } else {
      setMessages([getWelcomeMessage()]);
    }
  }, [loadChatMessages, getWelcomeMessage]);

  const handleDeleteChat = useCallback(async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await deleteChatSession(chatId);
    if (success) {
      toast.success("Conversa excluída!");
      if (currentChatId === chatId) {
        handleNewChat();
      }
    } else {
      toast.error("Erro ao excluir conversa");
    }
  }, [deleteChatSession, currentChatId, handleNewChat]);

  const getJwt = (): string | null => {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        return parsed?.access_token || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleSend = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const jwt = getJwt();
      if (!jwt) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      let chatId = currentChatId;
      if (isFirstMessage && !chatId) {
        const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        chatId = await createChatSession(sessionId, title);
        if (chatId) {
          setCurrentChatId(chatId);
          setIsFirstMessage(false);
        }
      }

      if (chatId) {
        await saveMessage(chatId, sessionId, content, 'user');
      }

      const response = await sendMessage(sessionId, content, jwt);

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (chatId) {
        await saveMessage(chatId, sessionId, response, 'ai');
      }

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const userInitials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Chat history content (reusable for both mobile and desktop)
  const ChatHistoryContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2 bg-gradient-to-r from-primary via-emerald-500 to-teal-400 hover:from-primary/90 hover:via-emerald-500/90 hover:to-teal-400/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          <span>Nova conversa</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoadingHistory ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : chatSessions.length === 0 ? (
          <p className="text-xs text-center py-4 text-muted-foreground">
            Nenhuma conversa ainda
          </p>
        ) : (
          chatSessions.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={`w-full text-left rounded-xl transition-all duration-200 hover:bg-primary/10 group relative p-3 ${
                currentChatId === chat.id ? 'bg-primary/15' : ''
              }`}
            >
              <div className="pr-6">
                <p className="text-sm truncate text-foreground">
                  {chat.title || 'Nova conversa'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(chat.created_at)}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="relative h-[100dvh] overflow-hidden flex flex-col">
      <ImmersiveBackground />
      
      {/* Welcome Animation - First visit only */}
      <AnimatePresence mode="wait">
        {showWelcomeAnimation && (
          <div className="absolute inset-0 z-50">
            <WelcomeAnimation 
              userName={fullName} 
              onComplete={handleWelcomeComplete} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Header - Floating elements */}
      {isMobile && (
        <>
          {/* Centered floating logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="w-10 h-10 overflow-hidden rounded-full flex items-center justify-center portal-glass-sidebar shadow-lg">
              <img 
                alt="Hubinho" 
                className="w-7 h-7 object-cover" 
                src="/lovable-uploads/0656f8e0-c1ac-4bc3-a621-a3867add5a63.png" 
              />
            </div>
          </motion.div>

          {/* Floating hamburger menu */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 z-20"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileHistoryOpen(true)}
              className="h-10 w-10 portal-glass-sidebar shadow-lg hover:bg-primary/10 rounded-full"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </motion.div>
        </>
      )}

      {/* Mobile History Sheet */}
      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-sm p-0 portal-glass-sidebar border-l border-sidebar-border/50">
          <SheetHeader className="px-4 py-4 border-b border-sidebar-border/50">
            <SheetTitle className="text-foreground">Histórico de Conversas</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100%-60px)]">
            <ChatHistoryContent onClose={() => setMobileHistoryOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="relative z-10 flex-1 flex flex-col h-full">
          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto py-6 ${isMobile ? 'pt-16' : ''}`}>
            <div className="px-4 md:px-6 h-full">
              <div className="max-w-3xl mx-auto space-y-6 pb-3">
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    userName={fullName}
                    userInitials={userInitials}
                  />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
          
          {/* Input Area */}
          <div className={`px-4 md:px-6 ${isMobile ? 'pb-20 pt-2' : 'py-4'}`}>
            <div className="max-w-3xl mx-auto">
              {/* Suggestion bubbles - only show when it's a new conversation (desktop only) */}
              {!isMobile && isFirstMessage && !isLoading && (
                <SuggestionBubbles onSelect={handleSend} disabled={isLoading} />
              )}
              <ChatInput onSend={handleSend} disabled={isLoading} hidePoweredBy={isMobile} />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat History (Desktop Only - Floating) */}
        {!isMobile && (
          <div className="relative z-10 py-4 pr-4">
            <div
              className={`h-full flex flex-col portal-glass-sidebar rounded-2xl shadow-xl transition-all duration-300 ${
                historyCollapsed ? 'w-16' : 'w-72'
              }`}
            >
              <div className="px-4 py-4 flex items-center justify-between border-b border-sidebar-border/50 rounded-t-2xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHistoryCollapsed(!historyCollapsed)}
                  className="hover:bg-primary/10 text-muted-foreground"
                >
                  {historyCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                {!historyCollapsed && (
                  <span className="font-semibold text-sm text-foreground">Histórico</span>
                )}
              </div>

              <div className="p-3">
                <Button
                  onClick={handleNewChat}
                  className={`w-full justify-start gap-2 bg-gradient-to-r from-primary via-emerald-500 to-teal-400 hover:from-primary/90 hover:via-emerald-500/90 hover:to-teal-400/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 ${
                    historyCollapsed ? 'px-3' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {!historyCollapsed && <span>Nova conversa</span>}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isLoadingHistory ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : chatSessions.length === 0 ? (
                  !historyCollapsed && (
                    <p className="text-xs text-center py-4 text-muted-foreground">
                      Nenhuma conversa ainda
                    </p>
                  )
                ) : (
                  chatSessions.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full text-left rounded-xl transition-all duration-200 hover:bg-primary/10 group relative ${
                        historyCollapsed ? 'p-3 flex justify-center' : 'p-3'
                      } ${currentChatId === chat.id ? 'bg-primary/15' : ''}`}
                    >
                      {historyCollapsed ? (
                        <MessageCircle 
                          className={`w-4 h-4 ${currentChatId === chat.id ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                      ) : (
                        <div className="pr-6">
                          <p className="text-sm truncate text-foreground">
                            {chat.title || 'Nova conversa'}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(chat.created_at)}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
