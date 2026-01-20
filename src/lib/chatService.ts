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
      console.error('Error invoking create-chat-for-entrega:', error);
      return null;
    }

    return (data as { chatId?: string } | null)?.chatId ?? null;
  } catch (err) {
    console.error('Error in createChatForEntrega:', err);
    return null;
  }
}

/**
 * Creates chats for all existing deliveries that don't have one.
 * Useful for migrating existing data.
 */
export async function createChatsForExistingEntregas(): Promise<number> {
  try {
    // Get all entregas that have motorista assigned
    const { data: entregas, error } = await supabase
      .from('entregas')
      .select('id')
      .not('motorista_id', 'is', null);

    if (error) {
      console.error('Error fetching entregas:', error);
      return 0;
    }

    // Get existing chats
    const { data: existingChats } = await supabase.from('chats').select('entrega_id');
    const existingEntregaIds = new Set((existingChats || []).map((c) => c.entrega_id));

    let created = 0;
    for (const entrega of entregas || []) {
      if (existingEntregaIds.has(entrega.id)) continue;

      const chatId = await createChatForEntrega({ entregaId: entrega.id });
      if (chatId) created++;
    }

    return created;
  } catch (err) {
    console.error('Error in createChatsForExistingEntregas:', err);
    return 0;
  }
}
