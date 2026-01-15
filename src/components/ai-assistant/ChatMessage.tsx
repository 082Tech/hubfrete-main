import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/lib/chatApi";

interface ChatMessageProps {
  message: ChatMessageType;
  userName?: string;
}

export function ChatMessage({ message, userName = "Você" }: ChatMessageProps) {
  const isBot = message.role === "assistant";

  return (
    <div
      className={`flex gap-3 animate-fade-in ${
        isBot ? "justify-start" : "justify-end"
      }`}
    >
      {isBot && (
        <div className="flex-shrink-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: 'hsl(var(--ai-accent) / 0.15)',
              border: '1px solid hsl(var(--ai-accent) / 0.3)'
            }}
          >
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}

      <div className="flex flex-col max-w-[75%]">
        {/* Name label */}
        <span 
          className={`text-xs font-medium mb-1 ${isBot ? 'text-left' : 'text-right'}`}
          style={{ color: 'hsl(var(--ai-text-secondary))' }}
        >
          {isBot ? 'HubFrete AI' : userName}
        </span>

        {/* Message bubble */}
        <div
          className="px-4 py-3 rounded-2xl"
          style={isBot ? {
            backgroundColor: 'hsl(var(--ai-sidebar-bg))',
            border: '1px solid hsl(var(--ai-border) / 0.5)',
            borderTopLeftRadius: '4px'
          } : {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            borderTopRightRadius: '4px'
          }}
        >
          {isBot ? (
            <div 
              className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5"
              style={{ color: 'hsl(var(--ai-text-primary))' }}
            >
              <ReactMarkdown
                components={{
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1" style={{ color: 'hsl(var(--ai-text-primary) / 0.9)' }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1" style={{ color: 'hsl(var(--ai-text-primary) / 0.9)' }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ color: 'hsl(var(--ai-text-primary) / 0.9)' }}>{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0" style={{ color: 'hsl(var(--ai-text-primary) / 0.9)' }}>{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-primary font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic" style={{ color: 'hsl(var(--ai-text-primary) / 0.8)' }}>{children}</em>
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
        <span 
          className={`text-xs mt-1 ${isBot ? 'text-left' : 'text-right'}`}
          style={{ color: 'hsl(var(--ai-text-muted))' }}
        >
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {!isBot && (
        <div className="flex-shrink-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: 'hsl(var(--ai-accent) / 0.1)',
              border: '1px solid hsl(var(--ai-border))'
            }}
          >
            <User className="w-5 h-5" style={{ color: 'hsl(var(--ai-text-secondary))' }} />
          </div>
        </div>
      )}
    </div>
  );
}
