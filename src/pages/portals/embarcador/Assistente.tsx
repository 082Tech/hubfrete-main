import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { AnimatedBackground } from "@/components/ai-assistant/AnimatedBackground";
import { sendMessage, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { MessageSquare, Plus, MessageCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portals/PortalLayout";
import { Button } from "@/components/ui/button";

export default function Assistente() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock chat history - will be replaced with real data
  const chatHistory = [
    { id: "1", title: "Rastreamento de carga", date: "Hoje" },
    { id: "2", title: "Dúvidas sobre frete", date: "Ontem" },
    { id: "3", title: "Cotação de envio", date: "3 dias atrás" },
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
    setMessages([]);
    toast.success("Nova conversa iniciada!");
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
      const response = await sendMessage(sessionId, content);

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
    <PortalLayout expectedUserType="embarcador">
      {/* Full height container without scroll */}
      <div className="relative h-[100dvh] -m-8 overflow-hidden flex">
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Left Sidebar - Chat History */}
        <div 
          className={`relative z-10 h-full flex flex-col transition-all duration-300 ${
            historyCollapsed ? 'w-16' : 'w-64'
          }`}
          style={{ 
            backgroundColor: 'rgba(15, 23, 22, 0.95)',
            borderRight: '1px solid rgba(45, 212, 191, 0.2)'
          }}
        >
          {/* History Header */}
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(45, 212, 191, 0.1)' }}>
            {!historyCollapsed && (
              <span className="text-white font-medium text-sm">Histórico</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryCollapsed(!historyCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-white/10 ml-auto"
            >
              {historyCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <Button
              onClick={handleNewChat}
              className={`w-full justify-start gap-2 bg-teal-600 hover:bg-teal-500 text-white ${
                historyCollapsed ? 'px-3' : ''
              }`}
            >
              <Plus className="w-4 h-4" />
              {!historyCollapsed && <span>Nova conversa</span>}
            </Button>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                className={`w-full text-left rounded-lg transition-all duration-200 hover:bg-white/10 group ${
                  historyCollapsed ? 'p-3 flex justify-center' : 'p-3'
                }`}
              >
                {historyCollapsed ? (
                  <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-white" />
                ) : (
                  <div>
                    <p className="text-white text-sm truncate">{chat.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">{chat.date}</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="relative z-10 flex-1 flex flex-col h-full">
          {/* HubFrete AI Header */}
          <div 
            className="flex items-center gap-3 px-6 py-4"
            style={{ 
              backgroundColor: 'rgba(15, 23, 22, 0.8)',
              borderBottom: '1px solid rgba(45, 212, 191, 0.2)'
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgba(45, 212, 191, 0.2)',
                border: '1px solid rgba(45, 212, 191, 0.4)'
              }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: '#2dd4bf' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">HubFrete AI</h1>
              <p className="text-xs" style={{ color: '#9ca3af' }}>Assistente inteligente</p>
            </div>
          </div>

          {/* Chat Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ 
                    backgroundColor: 'rgba(45, 212, 191, 0.15)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    boxShadow: '0 0 30px rgba(45, 212, 191, 0.2)'
                  }}
                >
                  <MessageSquare className="w-10 h-10" style={{ color: '#2dd4bf' }} />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  <span className="text-white">Bem-vindo ao </span>
                  <span style={{ color: '#2dd4bf' }}>HubFrete AI</span>
                </h2>

                <p className="mb-8 max-w-md" style={{ color: '#9ca3af' }}>
                  Sou seu assistente inteligente. Como posso ajudar você hoje?
                </p>
                
                <div className="grid gap-3 w-full max-w-md">
                  {[
                    "Quais são os serviços disponíveis?",
                    "Como funciona o rastreamento?",
                    "Preciso de ajuda com um envio",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="px-4 py-3 rounded-xl text-sm text-left transition-all duration-300 hover:scale-[1.02]"
                      style={{ 
                        color: '#d1d5db',
                        border: '1px solid rgba(107, 114, 128, 0.5)',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(45, 212, 191, 0.5)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
                        e.currentTarget.style.color = '#d1d5db';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div 
            className="px-6 py-4"
            style={{ 
              backgroundColor: 'rgba(15, 23, 22, 0.6)',
              borderTop: '1px solid rgba(45, 212, 191, 0.1)'
            }}
          >
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
