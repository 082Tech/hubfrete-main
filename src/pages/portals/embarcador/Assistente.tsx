import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { ImmersiveBackground } from "@/components/ai-assistant/ImmersiveBackground";
import { sendMessage, generateSessionId, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { Sparkles, Plus, MessageCircle, Clock, ChevronLeft, ChevronRight, Trash2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAIChatHistory } from "@/hooks/useAIChatHistory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "next-themes";

export default function Assistente() {
  const { profile, user } = useAuth();
  const userName = profile?.nome_completo?.split(' ')[0] || 'Você';
  const fullName = profile?.nome_completo || 'Você';
  const userId = profile?.id ? parseInt(profile.id, 10) : null;
  const { theme, setTheme } = useTheme();

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
    content: `Olá, ${userName}! 👋\n\nEu sou o **Hubinho**, seu copiloto inteligente de logística.\n\nComo posso ajudá-lo hoje? Se tiver alguma dúvida ou precisa de informações sobre suas cargas, estou à disposição!`,
    timestamp: new Date(),
  }), [userName]);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([getWelcomeMessage()]);
    }
  }, [getWelcomeMessage, messages.length]);

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
    toast.success("Nova conversa iniciada!");
  }, [getWelcomeMessage]);

  const handleSelectChat = useCallback(async (chat: { id: number; sessionid: string; title: string | null }) => {
    sessionStorage.setItem("hubfrete-session-id", chat.sessionid);
    setSessionId(chat.sessionid);
    setCurrentChatId(chat.id);
    setIsFirstMessage(false);
    
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

  return (
    <div className="relative h-[100dvh] overflow-hidden flex">
      <ImmersiveBackground />
      
      {/* Left Sidebar - Chat History */}
      <div className={`relative z-10 h-full flex flex-col glass-sidebar transition-all duration-300 ${
        historyCollapsed ? 'w-16' : 'w-72'
      }`}>
        <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
          {!historyCollapsed && (
            <span className="font-semibold text-sm text-foreground">Histórico</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
            className="ml-auto hover:bg-primary/10 text-muted-foreground"
          >
            {historyCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className={`w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl ${
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

      {/* Main Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="glass-header px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-border">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background" style={{ backgroundColor: 'hsl(142 76% 36%)' }} />
            </div>
            
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Hubinho
                <Sparkles className="w-4 h-4 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Seu copiloto de logística
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            <div className="flex items-center gap-3 pl-3 border-l border-border/50">
              <span className="text-sm font-medium text-foreground hidden sm:block">{fullName}</span>
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{userInitials}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="px-6 h-full">
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
        <div className="px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
