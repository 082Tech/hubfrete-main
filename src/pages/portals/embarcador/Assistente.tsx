import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, User, Sparkles, MessageCircle, Zap, Brain, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PortalLayout } from "@/components/portals/PortalLayout";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Assistente() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente virtual do HubFrete. Como posso ajudá-lo hoje? Posso auxiliar com dúvidas sobre cargas, entregas e muito mais.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const mockResponses = [
    "Entendi! Posso ajudá-lo com informações sobre suas cargas, entregas e operações. O que você gostaria de saber?",
    "Claro! Para rastrear sua entrega, você pode acessar a seção 'Minhas Cargas' no menu lateral. Lá você terá acesso em tempo real à localização de todas as suas cargas.",
    "Para cadastrar uma nova carga, você pode clicar em 'Nova Carga' no dashboard ou acessar 'Minhas Cargas'. Preencha os dados de origem, destino, tipo de carga e prazo desejado.",
    "Os relatórios ficam disponíveis na seção 'Relatórios'. Você pode visualizar gráficos de volume, valor e status das suas cargas com filtros por período.",
    "Posso ajudar com mais alguma coisa? Estou aqui para facilitar sua experiência na plataforma!",
  ];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simula delay de resposta
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: randomResponse },
    ]);
    
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    { text: "Qual o status das minhas cargas?", icon: Truck },
    { text: "Como criar uma nova carga?", icon: Zap },
    { text: "Ver relatórios do mês", icon: Brain },
    { text: "Cargas em trânsito", icon: MessageCircle },
  ];

  return (
    <PortalLayout expectedUserType="embarcador">
      {/* Full-screen container with gradient background */}
      <div className="fixed inset-0 left-0 top-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-cyan-950" />
        
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-teal-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content container */}
      <div className="relative z-10 h-[calc(100vh-8rem)] flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl blur-lg opacity-60 animate-pulse" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-cyan-600 p-4 rounded-2xl shadow-2xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent mb-2">
            HubFrete AI
          </h1>
          <p className="text-slate-400 text-lg">
            Seu assistente inteligente para logística
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 text-sm font-medium">Online • Pronto para ajudar</span>
          </div>
        </div>

        {/* Chat container with glassmorphism */}
        <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-4xl">
          <div className="flex-1 flex flex-col min-h-0 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* Messages area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-6">
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-4",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl blur-md opacity-40" />
                        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-lg",
                        message.role === "user"
                          ? "bg-gradient-to-br from-emerald-500 to-cyan-600 text-white rounded-br-sm"
                          : "bg-white/10 backdrop-blur-md border border-white/10 text-slate-100 rounded-bl-sm"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="h-10 w-10 rounded-xl bg-slate-700/50 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <User className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-4 justify-start">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl blur-md opacity-40" />
                      <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl rounded-bl-sm px-5 py-4 shadow-lg">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Questions - show only when no user messages yet */}
                {messages.length === 1 && (
                  <div className="mt-8">
                    <p className="text-slate-400 text-sm mb-4 text-center">Experimente perguntar:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {suggestedQuestions.map((question, idx) => (
                        <button
                          key={idx}
                          className="group flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-emerald-500/50 rounded-xl text-left transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                          onClick={() => {
                            setInput(question.text);
                            inputRef.current?.focus();
                          }}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 group-hover:from-emerald-500/30 group-hover:to-cyan-500/30 transition-colors">
                            <question.icon className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                            {question.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-xl">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading}
                    className="w-full bg-white/10 border-white/10 text-white placeholder:text-slate-400 rounded-xl py-6 px-5 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="h-auto px-5 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-3 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-medium">
                  🚧 BETA
                </span>
                Respostas simuladas • IA em desenvolvimento
              </p>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
