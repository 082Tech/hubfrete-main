import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAssistantChat } from "./AIAssistantChat";

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
        <span className="sr-only">Assistente de IA</span>
        
        {/* Pulse animation */}
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 animate-pulse" />
      </Button>

      {/* Chat Dialog */}
      <AIAssistantChat open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
