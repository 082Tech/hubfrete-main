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
    console.log('Creating chat for entrega:', { entregaId, cargaId, motoristaId, embarcadorEmpresaId, transportadoraEmpresaId });

    // 1. Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('entrega_id', entregaId)
      .single();

    if (existingChat) {
      console.log('Chat already exists:', existingChat.id);
      return existingChat.id;
    }

    // 2. Create the chat linked to the entrega
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
    console.log('Chat created:', chatId);

    // 3. Get motorista details to find their user_id
    const { data: motorista } = await supabase
      .from('motoristas')
      .select('user_id, empresa_id')
      .eq('id', motoristaId)
      .single();

    console.log('Motorista data:', motorista);

    // 4. Get users from embarcador empresa (using simpler query approach)
    const embarcadorUserIds: string[] = [];
    
    // First get filiais for embarcador
    const { data: embarcadorFiliais } = await supabase
      .from('filiais')
      .select('id')
      .eq('empresa_id', embarcadorEmpresaId);

    if (embarcadorFiliais && embarcadorFiliais.length > 0) {
      const filialIds = embarcadorFiliais.map(f => f.id);
      
      // Get usuarios_filiais for these filiais
      const { data: usuariosFiliais } = await supabase
        .from('usuarios_filiais')
        .select('usuario_id')
        .in('filial_id', filialIds);

      if (usuariosFiliais && usuariosFiliais.length > 0) {
        const usuarioIds = usuariosFiliais.map(uf => uf.usuario_id).filter(Boolean) as number[];
        
        // Get auth_user_ids
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('auth_user_id')
          .in('id', usuarioIds);

        if (usuarios) {
          embarcadorUserIds.push(...usuarios.map(u => u.auth_user_id).filter(Boolean) as string[]);
        }
      }
    }

    console.log('Embarcador users:', embarcadorUserIds);

    // 5. Get users from transportadora empresa (if exists)
    const transportadoraUserIds: string[] = [];
    if (transportadoraEmpresaId) {
      // First get filiais for transportadora
      const { data: transportadoraFiliais } = await supabase
        .from('filiais')
        .select('id')
        .eq('empresa_id', transportadoraEmpresaId);

      if (transportadoraFiliais && transportadoraFiliais.length > 0) {
        const filialIds = transportadoraFiliais.map(f => f.id);
        
        // Get usuarios_filiais for these filiais
        const { data: usuariosFiliais } = await supabase
          .from('usuarios_filiais')
          .select('usuario_id')
          .in('filial_id', filialIds);

        if (usuariosFiliais && usuariosFiliais.length > 0) {
          const usuarioIds = usuariosFiliais.map(uf => uf.usuario_id).filter(Boolean) as number[];
          
          // Get auth_user_ids
          const { data: usuarios } = await supabase
            .from('usuarios')
            .select('auth_user_id')
            .in('id', usuarioIds);

          if (usuarios) {
            transportadoraUserIds.push(...usuarios.map(u => u.auth_user_id).filter(Boolean) as string[]);
          }
        }
      }
    }

    console.log('Transportadora users:', transportadoraUserIds);

    // 6. Build participants array
    const participantes: {
      chat_id: string;
      user_id: string;
      tipo_participante: string;
      empresa_id?: number;
      motorista_id?: string;
    }[] = [];

    // Add embarcador users (avoid duplicates)
    const addedUserIds = new Set<string>();
    for (const userId of embarcadorUserIds) {
      if (!addedUserIds.has(userId)) {
        addedUserIds.add(userId);
        participantes.push({
          chat_id: chatId,
          user_id: userId,
          tipo_participante: 'embarcador',
          empresa_id: embarcadorEmpresaId,
        });
      }
    }

    // Add transportadora users (avoid duplicates)
    for (const userId of transportadoraUserIds) {
      if (!addedUserIds.has(userId)) {
        addedUserIds.add(userId);
        participantes.push({
          chat_id: chatId,
          user_id: userId,
          tipo_participante: 'transportadora',
          empresa_id: transportadoraEmpresaId,
        });
      }
    }

    // Add motorista (avoid duplicates)
    if (motorista?.user_id && !addedUserIds.has(motorista.user_id)) {
      addedUserIds.add(motorista.user_id);
      participantes.push({
        chat_id: chatId,
        user_id: motorista.user_id,
        tipo_participante: 'motorista',
        motorista_id: motoristaId,
      });
    }

    console.log('Participants to insert:', participantes);

    // 7. Insert all participants (if any)
    if (participantes.length > 0) {
      const { error: participantesError } = await supabase
        .from('chat_participantes')
        .insert(participantes);

      if (participantesError) {
        console.error('Error creating chat participants:', participantesError);
        // Don't fail the whole operation, chat was created
      } else {
        console.log('Participants created successfully');
      }
    }

    console.log(`Chat ${chatId} created for entrega ${entregaId} with ${participantes.length} participants`);
    return chatId;

  } catch (error) {
    console.error('Error in createChatForEntrega:', error);
    return null;
  }
}

/**
 * Creates chats for all existing deliveries that don't have one.
 * Useful for migrating existing data.
 */
export async function createChatsForExistingEntregas(): Promise<number> {
  try {
    // Get all entregas without chats
    const { data: entregas, error } = await supabase
      .from('entregas')
      .select(`
        id,
        carga_id,
        motorista_id,
        carga:cargas(empresa_id),
        motorista:motoristas(empresa_id)
      `)
      .not('motorista_id', 'is', null);

    if (error) {
      console.error('Error fetching entregas:', error);
      return 0;
    }

    // Get existing chats
    const { data: existingChats } = await supabase
      .from('chats')
      .select('entrega_id');

    const existingEntregaIds = new Set((existingChats || []).map(c => c.entrega_id));

    let created = 0;
    for (const entrega of entregas || []) {
      if (existingEntregaIds.has(entrega.id)) continue;

      const carga = entrega.carga as { empresa_id: number } | null;
      const motorista = entrega.motorista as { empresa_id: number | null } | null;

      if (!carga?.empresa_id || !entrega.motorista_id) continue;

      const chatId = await createChatForEntrega({
        entregaId: entrega.id,
        cargaId: entrega.carga_id,
        motoristaId: entrega.motorista_id,
        embarcadorEmpresaId: carga.empresa_id,
        transportadoraEmpresaId: motorista?.empresa_id || undefined,
      });

      if (chatId) created++;
    }

    console.log(`Created ${created} chats for existing entregas`);
    return created;
  } catch (error) {
    console.error('Error in createChatsForExistingEntregas:', error);
    return 0;
  }
}
