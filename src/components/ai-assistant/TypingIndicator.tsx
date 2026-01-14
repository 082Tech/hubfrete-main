import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-border">
        <Bot className="w-5 h-5 text-primary" />
      </div>
      
      <div className="chat-bubble-bot px-5 py-4">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
          <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
          <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
        </div>
      </div>
    </div>
  );
}
