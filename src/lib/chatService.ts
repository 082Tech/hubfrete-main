import { supabase } from '@/integrations/supabase/client';

interface CreateChatParams {
  entregaId: string;
  cargaId: string;
  motoristaId: string;
  embarcadorEmpresaId: number;
  transportadoraEmpresaId?: number;
}

/**
 * Creates a chat room for a delivery with all relevant participants.
 * - Embarcador: The company that owns the cargo
 * - Transportadora: The carrier company (if the driver belongs to one)
 * - Motorista: The driver assigned to the delivery
 */
export async function createChatForEntrega({
  entregaId,
  cargaId,
  motoristaId,
  embarcadorEmpresaId,
  transportadoraEmpresaId,
}: CreateChatParams): Promise<string | null> {
  try {
    // 1. Create the chat linked to the entrega
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({ entrega_id: entregaId })
      .select('id')
      .single();

    if (chatError) {
      console.error('Error creating chat:', chatError);
      return null;
    }

    const chatId = chat.id;

    // 2. Get motorista details to find their user_id
    const { data: motorista } = await supabase
      .from('motoristas')
      .select('user_id, empresa_id')
      .eq('id', motoristaId)
      .single();

    // 3. Get users from embarcador empresa to add as participants
    const { data: embarcadorUsers } = await supabase
      .from('usuarios_filiais')
      .select(`
        usuario_id,
        filiais!inner(empresa_id)
      `)
      .eq('filiais.empresa_id', embarcadorEmpresaId);

    // Get auth_user_ids for embarcador users
    const embarcadorUserIds: string[] = [];
    if (embarcadorUsers && embarcadorUsers.length > 0) {
      const usuarioIds = embarcadorUsers.map(u => u.usuario_id).filter(Boolean);
      if (usuarioIds.length > 0) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, auth_user_id')
          .in('id', usuarioIds);
        
        if (usuarios) {
          embarcadorUserIds.push(...usuarios.map(u => u.auth_user_id).filter(Boolean) as string[]);
        }
      }
    }

    // 4. Get users from transportadora empresa (if exists) to add as participants
    const transportadoraUserIds: string[] = [];
    if (transportadoraEmpresaId) {
      const { data: transportadoraUsers } = await supabase
        .from('usuarios_filiais')
        .select(`
          usuario_id,
          filiais!inner(empresa_id)
        `)
        .eq('filiais.empresa_id', transportadoraEmpresaId);

      if (transportadoraUsers && transportadoraUsers.length > 0) {
        const usuarioIds = transportadoraUsers.map(u => u.usuario_id).filter(Boolean);
        if (usuarioIds.length > 0) {
          const { data: usuarios } = await supabase
            .from('usuarios')
            .select('id, auth_user_id')
            .in('id', usuarioIds);
          
          if (usuarios) {
            transportadoraUserIds.push(...usuarios.map(u => u.auth_user_id).filter(Boolean) as string[]);
          }
        }
      }
    }

    // 5. Build participants array
    const participantes: {
      chat_id: string;
      user_id: string;
      tipo_participante: 'embarcador' | 'transportadora' | 'motorista';
      empresa_id?: number;
      motorista_id?: string;
    }[] = [];

    // Add embarcador users
    for (const userId of embarcadorUserIds) {
      participantes.push({
        chat_id: chatId,
        user_id: userId,
        tipo_participante: 'embarcador',
        empresa_id: embarcadorEmpresaId,
      });
    }

    // Add transportadora users
    for (const userId of transportadoraUserIds) {
      participantes.push({
        chat_id: chatId,
        user_id: userId,
        tipo_participante: 'transportadora',
        empresa_id: transportadoraEmpresaId,
      });
    }

    // Add motorista
    if (motorista?.user_id) {
      participantes.push({
        chat_id: chatId,
        user_id: motorista.user_id,
        tipo_participante: 'motorista',
        motorista_id: motoristaId,
      });
    }

    // 6. Insert all participants (if any)
    if (participantes.length > 0) {
      const { error: participantesError } = await supabase
        .from('chat_participantes')
        .insert(participantes);

      if (participantesError) {
        console.error('Error creating chat participants:', participantesError);
        // Don't fail the whole operation, chat was created
      }
    }

    console.log(`Chat ${chatId} created for entrega ${entregaId} with ${participantes.length} participants`);
    return chatId;

  } catch (error) {
    console.error('Error in createChatForEntrega:', error);
    return null;
  }
}
