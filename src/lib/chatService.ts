import { supabase } from '@/integrations/supabase/client';

interface CreateChatParams {
  entregaId: string;
  // Backwards compatible params (no longer needed client-side)
  cargaId?: string;
  motoristaId?: string;
  embarcadorEmpresaId?: number;
  transportadoraEmpresaId?: number;
}

/**
 * Creates (or ensures) a chat room for an entrega.
 *
 * IMPORTANT: this now runs via an Edge Function using the service role key,
 * because client-side inserts can be blocked by RLS in production.
 */
export async function createChatForEntrega({ entregaId }: CreateChatParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-chat-for-entrega', {
      body: { entregaId },
    });

    if (error) {
      // Silently ignore permission errors (403) - expected when user doesn't have access
      // These errors happen during batch migration and are not critical
      return null;
    }

    return (data as { chatId?: string } | null)?.chatId ?? null;
  } catch (err) {
    // Silently handle errors to avoid console spam during migrations
    return null;
  }
}

/**
 * Creates chats for all existing deliveries that don't have one.
 * Useful for migrating existing data.
 */
/**
 * Creates chats for existing deliveries that don't have one.
 * This function is now a no-op since chats are created on-demand when needed.
 * The edge function handles permission checking properly.
 * @deprecated Chats are now created on-demand when opening a delivery chat
 */
export async function createChatsForExistingEntregas(): Promise<number> {
  // No longer automatically create chats for all entregas
  // Chats are created on-demand when a user tries to access them
  // This avoids permission errors and unnecessary API calls
  return 0;
}
