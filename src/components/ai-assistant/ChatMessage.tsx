import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/lib/chatApi";

interface ChatMessageProps {
  message: ChatMessageType;
  userName?: string;
  userInitials?: string;
}

export function ChatMessage({ message, userName = "Você", userInitials }: ChatMessageProps) {
  const isBot = message.role === "assistant";
  
  // Get initials from userName
  const initials = userInitials || userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div
      className={`flex gap-3 animate-fade-in ${
        isBot ? "justify-start" : "justify-end"
      }`}
    >
      {isBot && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-border">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}

      <div className="flex flex-col max-w-[75%]">
        {/* Name label */}
        <div className={`flex items-center gap-2 mb-1.5 ${isBot ? '' : 'justify-end'}`}>
          <span className="text-xs font-medium text-muted-foreground">
            {isBot ? 'Hubinho' : userName}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isBot 
              ? 'chat-bubble-ai' 
              : 'chat-bubble-user text-primary-foreground'
          }`}
        >
          {isBot ? (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 text-foreground">
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
                    <p className="mb-2 last:mb-0 text-foreground/90">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-primary font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/80">{children}</em>
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
        </div>

        {/* Timestamp */}
        <span className={`text-xs mt-1.5 text-muted-foreground/70 ${isBot ? 'text-left' : 'text-right'}`}>
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {!isBot && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-border flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{initials}</span>
          </div>
        </div>
      )}
    </div>
  );
}
