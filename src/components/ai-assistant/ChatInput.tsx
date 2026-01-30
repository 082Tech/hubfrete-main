import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  hidePoweredBy?: boolean;
}

export function ChatInput({ onSend, disabled, hidePoweredBy }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="glass-input rounded-2xl p-2 shadow-lg">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={disabled}
              rows={1}
              className="w-full px-2 md:px-3 py-2 md:py-2.5 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none scrollbar-thin text-sm leading-5"
            />
          </div>
          
          <Button
            type="submit"
            disabled={!input.trim() || disabled}
            size="icon"
            className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
      
      {!hidePoweredBy && (
        <p className="text-center text-xs text-muted-foreground/50 mt-2 md:mt-3">
          Powered by <span className="text-primary/70 font-medium">Hubinho</span>
        </p>
      )}
    </form>
  );
}
