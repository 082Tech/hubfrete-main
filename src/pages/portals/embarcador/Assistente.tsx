import { useState, useRef, useEffect } from "react";
import { ChatHeader } from "@/components/ai-assistant/ChatHeader";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { AnimatedBackground } from "@/components/ai-assistant/AnimatedBackground";
import { sendMessage, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function Assistente() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8">
      <AnimatedBackground />
      
      <div className="relative z-10 w-full max-w-2xl flex flex-col h-[90vh] max-h-[800px]">
        <ChatHeader onNewChat={handleNewChat} />
        
        <div className="flex-1 mt-4 glass-card overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 glow-border">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                  Bem-vindo ao <span className="gradient-text">HubFrete AI</span>
                </h2>
                <p className="text-muted-foreground max-w-sm">
                  Sou seu assistente inteligente. Como posso ajudar você hoje?
                </p>
                
                <div className="mt-8 grid gap-3 w-full max-w-md">
                  {[
                    "Quais são os serviços disponíveis?",
                    "Como funciona o rastreamento?",
                    "Preciso de ajuda com um envio",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="glass px-4 py-3 rounded-xl text-sm text-left text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          <div className="p-4 border-t border-border/50">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
