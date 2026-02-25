-- Enable Realtime for mensagens table
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;

-- Also enable for chats table to catch new conversations
ALTER PUBLICATION supabase_realtime ADD TABLE chats;