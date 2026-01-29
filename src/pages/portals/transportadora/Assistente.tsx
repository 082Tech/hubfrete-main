import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { AnimatedBackground } from "@/components/ai-assistant/AnimatedBackground";
import { sendMessage, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { Sparkles, Plus, MessageCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function AssistenteTransportadora() {
  const { profile } = useAuth();
  const userName = profile?.nome_completo?.split(' ')[0] || 'Você';

  // Welcome message from Hubinho
  const getWelcomeMessage = (): ChatMessageType => ({
    id: 'welcome',
    role: 'assistant',
    content: `Opa, ${userName}! 👋\n\nEu sou o **Hubinho**, seu copiloto inteligente de logística.\n\nMe conta o que você precisa que eu te ajudo no caminho 🚦`,
    timestamp: new Date(),
  });

  const [messages, setMessages] = useState<ChatMessageType[]>([getWelcomeMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatHistory = [
    { id: "1", title: "Status da frota", date: "Hoje" },
    { id: "2", title: "Cargas disponíveis", date: "Ontem" },
    { id: "3", title: "Entregas pendentes", date: "3 dias atrás" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleNewChat = () => {
    sessionStorage.removeItem("hubfrete-session-id");
    const newSessionId = getOrCreateSessionId();
    setSessionId(newSessionId);
    setMessages([getWelcomeMessage()]);
    toast.success("Nova conversa iniciada!");
  };

  // Get JWT from local storage
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

      const response = await sendMessage(sessionId, content, jwt);

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative h-[100dvh] overflow-hidden flex">
        <AnimatedBackground />
        
        {/* Left Sidebar - Chat History */}
        <div 
          className={`relative z-10 h-full flex flex-col transition-all duration-300 ${
            historyCollapsed ? 'w-16' : 'w-64'
          }`}
          style={{ 
            backgroundColor: 'hsl(var(--ai-sidebar-bg))',
            borderRight: '1px solid hsl(var(--ai-border))'
          }}
        >
          <div 
            className="px-4 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid hsl(var(--ai-border) / 0.5)' }}
          >
            {!historyCollapsed && (
              <span 
                className="font-medium text-sm"
                style={{ color: 'hsl(var(--ai-text-primary))' }}
              >
                Histórico
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryCollapsed(!historyCollapsed)}
              className="ml-auto hover:bg-[hsl(var(--ai-accent)/0.1)]"
              style={{ color: 'hsl(var(--ai-text-secondary))' }}
            >
              {historyCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          <div className="p-3">
            <Button
              onClick={handleNewChat}
              className={`w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground ${
                historyCollapsed ? 'px-3' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
              {!historyCollapsed && <span>Nova conversa</span>}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                className={`w-full text-left rounded-lg transition-all duration-200 hover:bg-[hsl(var(--ai-accent)/0.1)] group ${
                  historyCollapsed ? 'p-3 flex justify-center' : 'p-3'
                }`}
              >
                {historyCollapsed ? (
                  <MessageCircle 
                    className="w-4 h-4 group-hover:text-primary" 
                    style={{ color: 'hsl(var(--ai-text-muted))' }}
                  />
                ) : (
                  <div>
                    <p 
                      className="text-sm truncate"
                      style={{ color: 'hsl(var(--ai-text-primary))' }}
                    >
                      {chat.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" style={{ color: 'hsl(var(--ai-text-muted))' }} />
                      <span 
                        className="text-xs"
                        style={{ color: 'hsl(var(--ai-text-muted))' }}
                      >
                        {chat.date}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="relative z-10 flex-1 flex flex-col h-full">
          <div 
            className="flex items-center gap-3 px-6 py-3"
            style={{ 
              backgroundColor: 'hsl(var(--ai-header-bg))',
              borderBottom: '1px solid hsl(var(--ai-border))'
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                backgroundColor: 'hsl(var(--ai-accent) / 0.15)',
                border: '1px solid hsl(var(--ai-accent) / 0.3)'
              }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 
                className="text-lg font-bold"
                style={{ color: 'hsl(var(--ai-text-primary))' }}
              >
                Hubinho
              </h1>
              <p 
                className="text-xs"
                style={{ color: 'hsl(var(--ai-text-secondary))' }}
              >
                Seu copiloto de logística
              </p>
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto py-4"
            style={{ 
              backgroundColor: 'hsl(var(--ai-bg-base) / 0.85)'
            }}
          >
            <div className="px-6 h-full">
              <div className="max-w-3xl mx-auto space-y-6 pb-3">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} userName={userName} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
          
          <div 
            className="px-6 py-4"
            style={{ 
              backgroundColor: 'hsl(var(--ai-input-bg) / 0.9)',
              borderTop: '1px solid hsl(var(--ai-border) / 0.5)'
            }}
          >
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
