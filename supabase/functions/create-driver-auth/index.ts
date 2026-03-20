import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateDriverRequest {
  email: string;
  password: string;
  nome_completo: string;
  cpf: string;
  telefone?: string;
  uf: string;
  tipo_cadastro: string;
  foto_url?: string;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  cnh_tem_qrcode?: boolean;
  cnh_digital_url?: string;
  comprovante_endereco_url?: string;
  comprovante_endereco_titular_nome?: string;
  comprovante_endereco_titular_doc_url?: string;
  comprovante_vinculo_url?: string;
  possui_ajudante: boolean;
  empresa_id: number;
  ajudante_nome?: string;
  ajudante_cpf?: string;
  ajudante_telefone?: string;
  ajudante_tipo_cadastro?: string;
  ajudante_comprovante_vinculo_url?: string;
  referencias?: Array<{
    tipo: string;
    ordem: number;
    nome: string;
    telefone: string;
    empresa?: string;
    ramo?: string;
  }>;
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

    const body: CreateDriverRequest = await req.json();
    const {
      email,
      password,
      nome_completo,
      cpf,
      telefone,
      uf,
      tipo_cadastro,
      foto_url,
      cnh,
      categoria_cnh,
      validade_cnh,
      cnh_tem_qrcode,
      cnh_digital_url,
      comprovante_endereco_url,
      comprovante_endereco_titular_nome,
      comprovante_endereco_titular_doc_url,
      comprovante_vinculo_url,
      possui_ajudante,
      empresa_id,
      ajudante_nome,
      ajudante_cpf,
      ajudante_telefone,
      ajudante_tipo_cadastro,
      ajudante_comprovante_vinculo_url,
      referencias,
    } = body;

    if (!email || !password || !nome_completo || !cpf || !empresa_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      (uf: any) => uf.filiais?.empresa_id === empresa_id
    );

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === email.toLowerCase());
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if CPF already exists in motoristas
    const cleanCpf = cpf.replace(/\D/g, '');
    const { data: existingMotorista } = await supabaseAdmin
      .from('motoristas')
      .select('id')
      .eq('cpf', cleanCpf)
      .maybeSingle();

    if (existingMotorista) {
      return new Response(
        JSON.stringify({ error: 'Este CPF já está cadastrado como motorista' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Create auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        tipo: 'motorista',
      },
    });

    if (createAuthError || !authData.user) {
      console.error('Error creating auth user:', createAuthError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user account: ' + (createAuthError?.message || 'Unknown error') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUserId = authData.user.id;

    try {
      // 2. Create usuarios record
      const { data: usuarioData, error: usuarioError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          nome: nome_completo,
          email: email.toLowerCase(),
          cargo: 'OPERADOR',
          motorista_autonomo: tipo_cadastro === 'autonomo',
          auth_user_id: authUserId,
        })
        .select('id')
        .single();

      if (usuarioError) {
        console.error('Error creating usuario:', usuarioError);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error('Failed to create user profile');
      }

      // 3. Add user_role for motorista
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUserId,
          role: 'motorista',
        });

      if (roleError) {
        console.error('Error adding user role:', roleError);
      }

      // 4. Also add transportadora role for portal access
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUserId,
          role: 'transportadora',
        });

      // 5. Create motorista record — starts INACTIVE, pending admin approval
      const { data: motoristaData, error: motoristaError } = await supabaseAdmin
        .from('motoristas')
        .insert({
          nome_completo,
          cpf: cleanCpf,
          email: email.toLowerCase(),
          telefone: telefone || null,
          uf,
          tipo_cadastro,
          foto_url: foto_url || null,
          cnh,
          categoria_cnh,
          validade_cnh,
          cnh_tem_qrcode: cnh_tem_qrcode || false,
          cnh_digital_url: cnh_digital_url || null,
          comprovante_endereco_url: comprovante_endereco_url || null,
          comprovante_endereco_titular_nome: comprovante_endereco_titular_nome || null,
          comprovante_endereco_titular_doc_url: comprovante_endereco_titular_doc_url || null,
          comprovante_vinculo_url: comprovante_vinculo_url || null,
          possui_ajudante,
          empresa_id,
          user_id: authUserId,
          ativo: false, // Starts inactive — pending admin approval
        })
        .select('id')
        .single();

      if (motoristaError) {
        console.error('Error creating motorista:', motoristaError);
        await supabaseAdmin.from('usuarios').delete().eq('id', usuarioData.id);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error('Failed to create driver record');
      }

      const motoristaId = motoristaData.id;

      // 6. Create pre_cadastros record for admin approval queue
      const { data: empresaData } = await supabaseAdmin
        .from('empresas')
        .select('nome, nome_fantasia')
        .eq('id', empresa_id)
        .single();

      await supabaseAdmin
        .from('pre_cadastros')
        .insert({
          tipo: 'motorista',
          nome: nome_completo,
          email: email.toLowerCase(),
          telefone: telefone || null,
          cpf: cleanCpf,
          nome_empresa: empresaData?.nome_fantasia || empresaData?.nome || null,
          status: 'pendente',
          auth_user_id: authUserId,
          empresa_id,
          observacoes: `Motorista de frota cadastrado via link de convite. Transportadora: ${empresaData?.nome_fantasia || empresaData?.nome || empresa_id}`,
        });

      // 7. Create referencias if provided
      if (referencias && referencias.length > 0) {
        const refsToInsert = referencias
          .filter(r => r.nome && r.telefone)
          .map(r => ({
            motorista_id: motoristaId,
            tipo: r.tipo,
            ordem: r.ordem,
            nome: r.nome,
            telefone: r.telefone,
            empresa: r.empresa || null,
            ramo: r.ramo || null,
          }));

        if (refsToInsert.length > 0) {
          await supabaseAdmin
            .from('motorista_referencias')
            .insert(refsToInsert);
        }
      }

      // 8. Create ajudante if exists
      if (possui_ajudante && ajudante_nome && ajudante_cpf) {
        await supabaseAdmin
          .from('ajudantes')
          .insert({
            motorista_id: motoristaId,
            nome: ajudante_nome,
            cpf: ajudante_cpf.replace(/\D/g, ''),
            telefone: ajudante_telefone || null,
            tipo_cadastro: ajudante_tipo_cadastro || 'frota',
            comprovante_vinculo_url: ajudante_comprovante_vinculo_url || null,
            ativo: true,
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Driver created successfully',
          motorista_id: motoristaId,
          usuario_id: usuarioData.id,
          auth_user_id: authUserId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (innerError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw innerError;
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
