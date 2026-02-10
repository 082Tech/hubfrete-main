import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: Record<string, unknown> = {};

    // 1. Create auth users
    const users = [
      { email: "embarcador@teste.com", password: "Teste@123", nome: "Admin Embarcador Teste" },
      { email: "transportadora@teste.com", password: "Teste@123", nome: "Admin Transportadora Teste" },
      { email: "superadmin@teste.com", password: "Teste@123", nome: "Super Admin Teste" },
    ];

    const authUsers: Record<string, string> = {};

    for (const u of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nome: u.nome },
      });
      if (error) {
        results[u.email] = { error: error.message };
        continue;
      }
      authUsers[u.email] = data.user.id;
      results[u.email] = { auth_user_id: data.user.id };
    }

    // 2. Create empresas
    const { data: embarcadora, error: errEmb } = await supabaseAdmin
      .from("empresas")
      .insert({ nome: "Embarcadora Teste Ltda", tipo: "EMBARCADOR", classe: "INDÚSTRIA", cnpj_matriz: "11.111.111/0001-11" })
      .select()
      .single();

    if (errEmb) {
      results.embarcadora = { error: errEmb.message };
    } else {
      results.embarcadora = embarcadora;
    }

    const { data: transportadora, error: errTrans } = await supabaseAdmin
      .from("empresas")
      .insert({ nome: "Transportadora Teste Ltda", tipo: "TRANSPORTADORA", classe: "COMÉRCIO", cnpj_matriz: "22.222.222/0001-22" })
      .select()
      .single();

    if (errTrans) {
      results.transportadora = { error: errTrans.message };
    } else {
      results.transportadora = transportadora;
    }

    // 3. Create filiais (matriz) for each empresa
    if (embarcadora) {
      const { data: filialEmb } = await supabaseAdmin
        .from("filiais")
        .insert({ nome: "Matriz Embarcadora", empresa_id: embarcadora.id, is_matriz: true, ativa: true, cidade: "São Paulo", estado: "SP" })
        .select()
        .single();
      results.filial_embarcadora = filialEmb;

      // 4. Create usuario for embarcadora
      if (authUsers["embarcador@teste.com"] && filialEmb) {
        const { data: userEmb } = await supabaseAdmin
          .from("usuarios")
          .insert({ email: "embarcador@teste.com", nome: "Admin Embarcador Teste", auth_user_id: authUsers["embarcador@teste.com"], cargo: "ADMIN" })
          .select()
          .single();
        results.usuario_embarcador = userEmb;

        if (userEmb) {
          const { data: uf } = await supabaseAdmin
            .from("usuarios_filiais")
            .insert({ usuario_id: userEmb.id, filial_id: filialEmb.id, cargo_na_filial: "ADMIN" })
            .select()
            .single();
          results.vinculo_embarcador = uf;
        }
      }
    }

    if (transportadora) {
      const { data: filialTrans } = await supabaseAdmin
        .from("filiais")
        .insert({ nome: "Matriz Transportadora", empresa_id: transportadora.id, is_matriz: true, ativa: true, cidade: "Rio de Janeiro", estado: "RJ" })
        .select()
        .single();
      results.filial_transportadora = filialTrans;

      if (authUsers["transportadora@teste.com"] && filialTrans) {
        const { data: userTrans } = await supabaseAdmin
          .from("usuarios")
          .insert({ email: "transportadora@teste.com", nome: "Admin Transportadora Teste", auth_user_id: authUsers["transportadora@teste.com"], cargo: "ADMIN" })
          .select()
          .single();
        results.usuario_transportadora = userTrans;

        if (userTrans) {
          const { data: uf } = await supabaseAdmin
            .from("usuarios_filiais")
            .insert({ usuario_id: userTrans.id, filial_id: filialTrans.id, cargo_na_filial: "ADMIN" })
            .select()
            .single();
          results.vinculo_transportadora = uf;
        }
      }
    }

    // 5. Create torre_users (super_admin)
    if (authUsers["superadmin@teste.com"]) {
      const { data: torreUser, error: errTorre } = await supabaseAdmin
        .from("torre_users")
        .insert({
          user_id: authUsers["superadmin@teste.com"],
          email: "superadmin@teste.com",
          nome: "Super Admin Teste",
          role: "super_admin",
          ativo: true,
        })
        .select()
        .single();

      results.torre_user = errTorre ? { error: errTorre.message } : torreUser;
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
