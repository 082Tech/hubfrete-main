import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantChat({ open, onOpenChange }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou a assistente virtual da HubFrete. Como posso ajudá-lo hoje? Posso auxiliar com dúvidas sobre cargas, entregas, cotações e muito mais.",
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

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const mockResponses = [
    "Entendi! Posso ajudá-lo com informações sobre suas cargas, entregas e cotações. O que você gostaria de saber?",
    "Claro! Para rastrear sua entrega, você pode acessar a seção 'Acompanhar Entregas' no menu lateral. Lá você terá acesso em tempo real à localização de todas as suas cargas.",
    "As cotações ficam disponíveis na seção 'Cotações'. Você pode comparar propostas de diferentes transportadoras e aceitar a que melhor atender suas necessidades.",
    "Para cadastrar uma nova carga, acesse 'Minhas Cargas' e clique em 'Nova Carga'. Preencha os dados de origem, destino, tipo de carga e prazo desejado.",
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

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] max-h-[70vh]">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Assistente IA</h3>
              <p className="text-xs text-primary-foreground/80">HubFrete</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/40 border border-border/30 rounded-bl-md"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-muted/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/40 border border-border/30 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1 rounded-full"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
