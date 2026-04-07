import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const {
      email,
      password,
      nome,
      razaoSocial,
      nomeFantasia,
      cnpj,
      inscricaoEstadual,
      telefone,
      cidade,
      estado,
      endereco,
      cep,
      tipo, // 'embarcador' or 'transportadora'
    } = await req.json()

    if (!email || !password || !nome || !razaoSocial || !cnpj || !tipo) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: nome },
    })

    if (authError) {
      // Check for duplicate email
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já está cadastrado. Tente fazer login.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw authError
    }

    const userId = authData.user!.id
    const tipoEmpresa = tipo === 'embarcador' ? 'EMBARCADOR' : 'TRANSPORTADORA'
    const classeEmpresa = tipo === 'embarcador' ? 'COMÉRCIO' : 'TRANSPORTADORA'

    // 2. Create empresa with status 'em_analise'
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        tipo: tipoEmpresa,
        classe: classeEmpresa,
        nome: nomeFantasia || razaoSocial,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        cnpj_matriz: cnpj,
        inscricao_estadual: inscricaoEstadual || null,
        telefone: telefone || null,
        email: email,
        status: 'em_analise',
      })
      .select('id')
      .single()

    if (empresaError) throw empresaError

    // 3. Create filial matriz
    const { data: filial, error: filialError } = await supabaseAdmin
      .from('filiais')
      .insert({
        empresa_id: empresa.id,
        nome: 'Matriz',
        cnpj: cnpj,
        is_matriz: true,
        ativa: true,
        cidade: cidade || null,
        estado: estado || null,
        endereco: endereco ? `${endereco}` : null,
        cep: cep || null,
      })
      .select('id')
      .single()

    if (filialError) throw filialError

    // 4. Create usuario
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_user_id: userId,
        email: email,
        nome: nome,
        cargo: 'Administrador',
        motorista_autonomo: false,
      })
      .select('id')
      .single()

    if (usuarioError) throw usuarioError

    // 5. Link usuario to filial
    const { error: ufError } = await supabaseAdmin
      .from('usuarios_filiais')
      .insert({
        usuario_id: usuario.id,
        filial_id: filial.id,
        cargo_na_filial: 'Administrador',
      })

    if (ufError) throw ufError

    // 6. Create user role
    const role = tipo === 'embarcador' ? 'embarcador' : 'transportadora'
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
      })

    if (roleError) throw roleError

    // 7. Insert into pre_cadastros for tracking
    await supabaseAdmin
      .from('pre_cadastros')
      .insert({
        tipo: tipo,
        nome: nome,
        email: email,
        telefone: telefone || null,
        cnpj: cnpj,
        nome_empresa: nomeFantasia || razaoSocial,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        inscricao_estadual: inscricaoEstadual || null,
        cidade: cidade || null,
        estado: estado || null,
        endereco: endereco || null,
        cep: cep || null,
        auth_user_id: userId,
        empresa_id: empresa.id,
        status: 'pendente',
      })

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        empresa_id: empresa.id,
        message: 'Cadastro realizado! Faça login para acessar a plataforma.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Signup error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao processar cadastro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})