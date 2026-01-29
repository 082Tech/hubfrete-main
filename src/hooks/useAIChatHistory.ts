import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/lib/chatApi';

export interface AIChatSession {
  id: number;
  sessionid: string;
  title: string | null;
  created_at: string;
  user_id: number | null;
}

export interface AIChatMessage {
  id: number;
  chat_id: number | null;
  sessionid: string | null;
  message: string | null;
  author: 'user' | 'ai' | null;
  created_at: string;
}

export function useAIChatHistory(userId: number | null) {
  const [chatSessions, setChatSessions] = useState<AIChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all chat sessions for the user
  const fetchChatSessions = useCallback(async () => {
    if (!userId) {
      setChatSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ai_chat')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat sessions:', error);
        return;
      }

      setChatSessions(data || []);
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create a new chat session
  const createChatSession = useCallback(async (sessionId: string, title?: string): Promise<number | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('ai_chat')
        .insert({
          sessionid: sessionId,
          user_id: userId,
          title: title || 'Nova conversa',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating chat session:', error);
        return null;
      }

      // Refresh sessions list
      await fetchChatSessions();
      
      return data?.id || null;
    } catch (err) {
      console.error('Error creating chat session:', err);
      return null;
    }
  }, [userId, fetchChatSessions]);

  // Save a message to the database
  const saveMessage = useCallback(async (
    chatId: number,
    sessionId: string,
    message: string,
    author: 'user' | 'ai'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_chat_messages')
        .insert({
          chat_id: chatId,
          sessionid: sessionId,
          message,
          author,
        });

      if (error) {
        console.error('Error saving message:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error saving message:', err);
      return false;
    }
  }, []);

  // Load messages for a specific chat session
  const loadChatMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('sessionid', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        return [];
      }

      // Convert to ChatMessage format
      return (data || []).map((msg) => ({
        id: msg.id.toString(),
        role: msg.author === 'ai' ? 'assistant' : 'user',
        content: msg.message || '',
        timestamp: new Date(msg.created_at),
      })) as ChatMessage[];
    } catch (err) {
      console.error('Error loading chat messages:', err);
      return [];
    }
  }, []);

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: number, title: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_chat')
        .update({ title })
        .eq('id', chatId);

      if (error) {
        console.error('Error updating chat title:', error);
        return false;
      }

      await fetchChatSessions();
      return true;
    } catch (err) {
      console.error('Error updating chat title:', err);
      return false;
    }
  }, [fetchChatSessions]);

  // Delete a chat session
  const deleteChatSession = useCallback(async (chatId: number): Promise<boolean> => {
    try {
      // First delete all messages
      const { error: msgError } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('chat_id', chatId);

      if (msgError) {
        console.error('Error deleting chat messages:', msgError);
        return false;
      }

      // Then delete the chat session
      const { error } = await supabase
        .from('ai_chat')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('Error deleting chat session:', error);
        return false;
      }

      await fetchChatSessions();
      return true;
    } catch (err) {
      console.error('Error deleting chat session:', err);
      return false;
    }
  }, [fetchChatSessions]);

  // Get chat by sessionId
  const getChatBySessionId = useCallback(async (sessionId: string): Promise<AIChatSession | null> => {
    try {
      const { data, error } = await supabase
        .from('ai_chat')
        .select('*')
        .eq('sessionid', sessionId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is ok
          console.error('Error getting chat by session:', error);
        }
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error getting chat by session:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchChatSessions();
  }, [fetchChatSessions]);

  return {
    chatSessions,
    isLoading,
    createChatSession,
    saveMessage,
    loadChatMessages,
    updateChatTitle,
    deleteChatSession,
    getChatBySessionId,
    refreshSessions: fetchChatSessions,
  };
}
