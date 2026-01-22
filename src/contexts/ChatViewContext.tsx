import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatViewContextType {
  isInChatView: boolean;
  setIsInChatView: (value: boolean) => void;
}

const ChatViewContext = createContext<ChatViewContextType | undefined>(undefined);

export function ChatViewProvider({ children }: { children: ReactNode }) {
  const [isInChatView, setIsInChatView] = useState(false);

  return (
    <ChatViewContext.Provider value={{ isInChatView, setIsInChatView }}>
      {children}
    </ChatViewContext.Provider>
  );
}

export function useChatView() {
  const context = useContext(ChatViewContext);
  if (context === undefined) {
    throw new Error('useChatView must be used within a ChatViewProvider');
  }
  return context;
}
