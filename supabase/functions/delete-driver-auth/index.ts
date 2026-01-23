import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user making the request
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { motorista_id } = await req.json();

    if (!motorista_id) {
      return new Response(
        JSON.stringify({ error: 'Missing motorista_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the motorista record to find the user_id (auth user)
    const { data: motorista, error: motoristaError } = await supabaseAdmin
      .from('motoristas')
      .select('id, user_id, empresa_id')
      .eq('id', motorista_id)
      .single();

    if (motoristaError || !motorista) {
      return new Response(
        JSON.stringify({ error: 'Motorista não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify calling user has access to this empresa
    const { data: callerUsuario } = await supabaseAdmin
      .from('usuarios')
      .select(`
        id,
        usuarios_filiais!inner(
          filiais!inner(empresa_id)
        )
      `)
      .eq('auth_user_id', callingUser.id)
      .single();

    const hasAccess = callerUsuario?.usuarios_filiais?.some(
      (uf: any) => uf.filiais?.empresa_id === motorista.empresa_id
    );

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Você não tem acesso a esta empresa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUserId = motorista.user_id;

    // 1. Unlink vehicles
    await supabaseAdmin.from('veiculos').update({ motorista_id: null }).eq('motorista_id', motorista_id);

    // 2. Unlink carrocerias
    await supabaseAdmin.from('carrocerias').update({ motorista_id: null }).eq('motorista_id', motorista_id);

    // 3. Delete ajudantes
    await supabaseAdmin.from('ajudantes').delete().eq('motorista_id', motorista_id);

    // 4. Delete referencias
    await supabaseAdmin.from('motorista_referencias').delete().eq('motorista_id', motorista_id);

    // 5. Delete motorista record
    const { error: deleteMotoristaError } = await supabaseAdmin
      .from('motoristas')
      .delete()
      .eq('id', motorista_id);

    if (deleteMotoristaError) {
      console.error('Error deleting motorista:', deleteMotoristaError);
      throw new Error('Erro ao excluir motorista');
    }

    // 6. Delete user roles
    if (authUserId) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', authUserId);
      
      // 7. Delete usuarios record
      await supabaseAdmin.from('usuarios').delete().eq('auth_user_id', authUserId);

      // 8. Delete auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError);
        // Don't throw - motorista was already deleted, log the orphan
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Motorista excluído com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
