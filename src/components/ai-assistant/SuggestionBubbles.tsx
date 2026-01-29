import { Sparkles, TrendingUp, Package, Truck, HelpCircle } from "lucide-react";

interface SuggestionBubblesProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

const suggestions = [
  {
    icon: Package,
    text: "Qual o status das minhas cargas?",
  },
  {
    icon: TrendingUp,
    text: "Mostre meus relatórios",
  },
  {
    icon: Truck,
    text: "Rastrear entregas em andamento",
  },
  {
    icon: HelpCircle,
    text: "Como publicar uma nova carga?",
  },
];

export function SuggestionBubbles({ onSelect, disabled }: SuggestionBubblesProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center pb-4">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <button
            key={index}
            onClick={() => !disabled && onSelect(suggestion.text)}
            disabled={disabled}
            className="group suggestion-bubble flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Icon className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="text-foreground/80 group-hover:text-foreground transition-colors">
              {suggestion.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}
