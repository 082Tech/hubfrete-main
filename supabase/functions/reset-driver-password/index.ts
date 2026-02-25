import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  motorista_id: number;
  new_password: string;
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the calling user
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

    const body: ResetPasswordRequest = await req.json();
    const { motorista_id, new_password } = body;

    if (!motorista_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get motorista
    const { data: motorista, error: motoristaError } = await supabaseAdmin
      .from('motoristas')
      .select('id, user_id, empresa_id, nome_completo')
      .eq('id', motorista_id)
      .single();

    if (motoristaError || !motorista) {
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!motorista.user_id) {
      return new Response(
        JSON.stringify({ error: 'Driver does not have an auth account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller has access to this empresa
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
        JSON.stringify({ error: 'You do not have access to this driver' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      motorista.user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset successfully for ${motorista.nome_completo}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
