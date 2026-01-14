import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    "Qual o status das minhas cargas?",
    "Como criar uma nova carga?",
    "Ver relatórios do mês",
    "Cargas em trânsito",
  ];

  return (
    <PortalLayout expectedUserType="embarcador">
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Assistente HubFrete
          </h1>
          <p className="text-muted-foreground">
            Converse sobre suas cargas, entregas e operações
          </p>
        </div>

        <Card className="flex-1 flex flex-col min-h-0 border-border">
          <CardHeader className="border-b border-border/50 py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <span>HubFrete AI</span>
                <p className="text-xs font-normal text-muted-foreground">Assistente Virtual</p>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/50 border border-border/50 rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Suggested Questions - show only when no user messages yet */}
                {messages.length === 1 && (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground mb-3">Sugestões:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => {
                            setInput(question);
                            inputRef.current?.focus();
                          }}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                🚧 Em desenvolvimento - Respostas simuladas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
