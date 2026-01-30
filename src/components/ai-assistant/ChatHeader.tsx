import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onNewChat: () => void;
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  return (
    <header className="glass-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
        </div>
        
        <div>
          <h1 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            HubFrete AI
            <Sparkles className="w-4 h-4 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Assistente inteligente
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNewChat}
        className="w-10 h-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        title="Nova conversa"
      >
        <RefreshCw className="w-5 h-5" />
      </Button>
    </header>
  );
}
