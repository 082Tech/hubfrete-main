import { useState, useRef } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
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
      <div className="glass-input rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={disabled}
            rows={1}
            className="flex-1 min-w-0 px-2 py-2 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none scrollbar-thin text-sm leading-5 h-10 max-h-10 overflow-y-auto"
          />
          
          <Button
            type="submit"
            disabled={!input.trim() || disabled}
            size="icon"
            className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
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
