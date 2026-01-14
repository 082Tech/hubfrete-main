import { useState, useRef, useEffect } from "react";
import { ChatHeader } from "@/components/ai-assistant/ChatHeader";
import { ChatMessage } from "@/components/ai-assistant/ChatMessage";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { TypingIndicator } from "@/components/ai-assistant/TypingIndicator";
import { AnimatedBackground } from "@/components/ai-assistant/AnimatedBackground";
import { sendMessage, getOrCreateSessionId, type ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portals/PortalLayout";

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
    <PortalLayout expectedUserType="embarcador">
      {/* Container that fills the content area with dark background */}
      <div className="relative min-h-[calc(100vh)] -m-8 overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Main content */}
        <div className="relative z-10 h-[calc(100vh)] max-w-4xl bg-black/90 h-[800px] rounded-md mt-20 mx-auto flex flex-col p-4 md:p-6">
          {/* Chat Header */}
          <ChatHeader onNewChat={handleNewChat} />
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-border mb-6">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>

                <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
                  Bem-vindo ao HubFrete AI
                </h2>

                <p className="text-white/70 mb-8 max-w-md">
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
                      className="glass px-4 py-3 rounded-xl text-sm text-left text-white/70 hover:text-white hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] border border-white/20 bg-white/10 backdrop-blur-sm"
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
          
          {/* Input Area */}
          <div className="mt-auto pt-4">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
