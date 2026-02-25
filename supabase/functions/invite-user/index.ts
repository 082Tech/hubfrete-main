import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  company_type: "embarcador" | "transportadora";
  company_id: string;
  filial_id?: number;
  role?: "ADMIN" | "OPERADOR";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the authorization header to identify the inviting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create client with user's token to verify identity
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, company_type, company_id, filial_id, role = "OPERADOR" }: InviteRequest = await req.json();

    if (!email || !company_type || !company_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: email, company_type, company_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const empresaId = parseInt(company_id, 10);
    if (isNaN(empresaId)) {
      return new Response(
        JSON.stringify({ error: "ID da empresa inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the empresa exists and matches the type
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .select("id, tipo, nome")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      console.error("Empresa not found:", empresaError);
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify company type matches
    const expectedTipo = company_type === "embarcador" ? "EMBARCADOR" : "TRANSPORTADORA";
    if (empresa.tipo !== expectedTipo) {
      return new Response(
        JSON.stringify({ error: "Tipo de empresa não corresponde" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the inviting user belongs to this company and has permission
    const { data: inviterUsuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, cargo, auth_user_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!inviterUsuario) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado no sistema" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if inviter belongs to a filial of this empresa
    const { data: inviterFiliais } = await supabaseAdmin
      .from("usuarios_filiais")
      .select(`
        cargo_na_filial,
        filiais!inner(empresa_id)
      `)
      .eq("usuario_id", inviterUsuario.id)
      .eq("filiais.empresa_id", empresaId);

    if (!inviterFiliais || inviterFiliais.length === 0) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para convidar usuários para esta empresa" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only ADMINs can invite
    const isAdmin = inviterFiliais.some((uf: any) => uf.cargo_na_filial === "ADMIN");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem convidar usuários" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If filial_id is provided, verify it belongs to this empresa
    if (filial_id) {
      const { data: filial, error: filialError } = await supabaseAdmin
        .from("filiais")
        .select("id, empresa_id")
        .eq("id", filial_id)
        .eq("empresa_id", empresaId)
        .single();

      if (filialError || !filial) {
        return new Response(
          JSON.stringify({ error: "Filial não encontrada ou não pertence a esta empresa" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if invite already exists and is pending
    const { data: existingInvite } = await supabaseAdmin
      .from("company_invites")
      .select("id, status")
      .eq("email", email.toLowerCase().trim())
      .eq("company_id", empresaId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already part of the company
    const { data: existingUser } = await supabaseAdmin
      .from("usuarios")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      // Check if they're already in this empresa
      const { data: existingAssoc } = await supabaseAdmin
        .from("usuarios_filiais")
        .select(`
          id,
          filiais!inner(empresa_id)
        `)
        .eq("usuario_id", existingUser.id)
        .eq("filiais.empresa_id", empresaId)
        .maybeSingle();

      if (existingAssoc) {
        return new Response(
          JSON.stringify({ error: "Este usuário já faz parte da empresa" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("company_invites")
      .insert({
        email: email.toLowerCase().trim(),
        invited_by: user.id,
        company_type,
        company_id,
        filial_id,
        role,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get origin for redirect URL
    const origin = req.headers.get("origin") || "https://hub-frete.lovable.app";

    // Send invite using Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        data: {
          invited_by: user.id,
          company_type,
          company_id: empresaId,
          invite_id: invite.id,
          invite_token: invite.token,
        },
        redirectTo: `${origin}/login?invite=${invite.token}`,
      }
    );

    if (authError) {
      console.error("Error sending invite email:", authError);

      // Check for common existing user errors
      // Supabase can return "User already registered" or similar.
      // We check broadly for "register" or status 422 which is common for logical issues.
      const isExistingUser =
        authError.message?.toLowerCase().includes("registered") ||
        authError.message?.toLowerCase().includes("exists") ||
        (authError as any).status === 422;

      if (isExistingUser) {
        // User exists, but we can't send a signup email. 
        // We will return success with the link so the admin can copy it.
        console.log("User likely already registered, returning invite link manually.");

        return new Response(
          JSON.stringify({
            success: true,
            message: "Usuário já cadastrado. Copie o link abaixo.",
            invite_id: invite.id,
            invite_link: `${origin}/login?invite=${invite.token}`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete the invite record if email failed for other reasons
      await supabaseAdmin.from("company_invites").delete().eq("id", invite.id);

      return new Response(
        JSON.stringify({ error: `Erro ao enviar convite: ${authError.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invite sent successfully:", {
      email,
      invite_id: invite.id,
      empresa: empresa.nome,
      role
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite enviado com sucesso",
        invite_id: invite.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: `Erro interno do servidor: ${error instanceof Error ? error.message : String(error)}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});