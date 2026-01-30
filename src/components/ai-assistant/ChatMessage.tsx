import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@/lib/chatApi";
import { useIsMobile } from "@/hooks/use-mobile";
interface ChatMessageProps {
  message: ChatMessageType;
  userName?: string;
  userInitials?: string;
}
export function ChatMessage({
  message,
  userName = "Você",
  userInitials
}: ChatMessageProps) {
  const isBot = message.role === "assistant";
  const isMobile = useIsMobile();

  // Get initials from userName
  const initials = userInitials || userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return <div className={`flex gap-2 md:gap-3 animate-fade-in ${isBot ? "justify-start items-center" : "justify-end"}`}>
      {isBot && !isMobile && <div className="flex-shrink-0 self-center">
          <div className="w-10 h-10 overflow-hidden rounded-full flex items-center justify-center relative group">
            <img alt="Hubinho" className="w-7 h-7 object-cover absolute transition-opacity duration-300 group-hover:opacity-0" src="/lovable-uploads/0656f8e0-c1ac-4bc3-a621-a3867add5a63.png" />
            <img alt="Hubinho hover" className="w-7 h-7 object-cover absolute opacity-0 transition-opacity duration-300 group-hover:opacity-100" src="/lovable-uploads/hubinho-hover.png" />
          </div>
        </div>}

      <div className={`flex flex-col ${isMobile ? 'max-w-[90%]' : 'max-w-[75%]'}`}>

        {/* Message bubble */}
        <div className={`px-4 py-3 ${isBot ? 'chat-bubble-ai' : 'chat-bubble-user rounded-2xl text-primary-foreground'}`}>
          {isBot ? <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5 text-foreground">
              <ReactMarkdown components={{
            ul: ({
              children
            }) => <ul className="list-disc list-inside space-y-1 text-foreground/90">
                      {children}
                    </ul>,
            ol: ({
              children
            }) => <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                      {children}
                    </ol>,
            li: ({
              children
            }) => <li className="text-foreground/90">{children}</li>,
            p: ({
              children
            }) => <p className="mb-2 last:mb-0 text-foreground/90">{children}</p>,
            strong: ({
              children
            }) => <strong className="text-primary font-semibold">{children}</strong>,
            em: ({
              children
            }) => <em className="italic text-foreground/80">{children}</em>,
            code: ({
              children
            }) => <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>,
            a: ({
              href,
              children
            }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                      {children}
                    </a>
          }}>
                {message.content}
              </ReactMarkdown>
            </div> : <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>}
        </div>

        {/* Timestamp */}
        <span className={`text-xs mt-1.5 text-muted-foreground/70 ${isBot ? 'text-left' : 'text-right'}`}>
          {message.timestamp.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}
        </span>
      </div>

      {!isBot && !isMobile && <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border items-center justify-center flex flex-row px-0 mx-0 my-[25px] gap-0 border-primary-foreground">
            <span className="text-sm font-semibold text-primary">{initials}</span>
          </div>
        </div>}
    </div>;
}