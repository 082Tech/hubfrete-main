import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/lib/chatApi";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === "assistant";

  return (
    <div
      className={`flex gap-3 animate-fade-in ${
        isBot ? "justify-start" : "justify-end"
      }`}
    >
      {isBot && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-border">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}

      <div
        className={`max-w-[75%] px-4 py-3 ${
          isBot ? "chat-bubble-bot" : "chat-bubble-user"
        }`}
      >
        {isBot ? (
          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-primary prose-headings:text-foreground prose-headings:font-display">
            <ReactMarkdown
              components={{
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 text-foreground/90">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground/90">{children}</li>
                ),
                p: ({ children }) => (
                  <p className="text-foreground/90 mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="text-primary font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-foreground/80 italic">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        )}
        <span className="block mt-2 text-xs text-muted-foreground/60">
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
          <User className="w-5 h-5 text-foreground/70" />
        </div>
      )}
    </div>
  );
}
