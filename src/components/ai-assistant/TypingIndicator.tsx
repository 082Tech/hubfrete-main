import hubinhoLogo from '@/assets/hubinho-logo.png';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-border overflow-hidden">
        <img src={hubinhoLogo} alt="Hubinho" className="w-7 h-7 object-contain" />
      </div>
      
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground mb-1.5">Hubinho</span>
        <div className="chat-bubble-ai px-5 py-4 rounded-2xl">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
            <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
            <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
