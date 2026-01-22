import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  invite_token: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's token
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

    const { invite_token }: AcceptInviteRequest = await req.json();

    if (!invite_token) {
      return new Response(
        JSON.stringify({ error: "Token do convite é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("company_invites")
      .select("*")
      .eq("token", invite_token)
      .single();

    if (inviteError || !invite) {
      console.error("Invite not found:", inviteError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite is still pending
    if (invite.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Este convite já foi utilizado ou expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from("company_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Este convite foi enviado para outro email" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const empresaId = parseInt(invite.company_id, 10);

    // Get empresa info
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .select("id, nome, tipo")
      .eq("id", empresaId)
      .single();

    if (empresaError || !empresa) {
      console.error("Empresa not found:", empresaError);
      return new Response(
        JSON.stringify({ error: "Empresa do convite não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or determine filial_id
    let targetFilialId = invite.filial_id;
    
    if (!targetFilialId) {
      // Get the matriz (main branch) of the empresa
      const { data: matriz } = await supabaseAdmin
        .from("filiais")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("is_matriz", true)
        .maybeSingle();

      if (matriz) {
        targetFilialId = matriz.id;
      } else {
        // Fall back to any active filial
        const { data: anyFilial } = await supabaseAdmin
          .from("filiais")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("ativa", true)
          .limit(1)
          .maybeSingle();

        if (anyFilial) {
          targetFilialId = anyFilial.id;
        } else {
          return new Response(
            JSON.stringify({ error: "Nenhuma filial encontrada para esta empresa" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Check if usuario record exists
    let { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // If no usuario record, create one
    if (!usuario) {
      const { data: newUsuario, error: createError } = await supabaseAdmin
        .from("usuarios")
        .insert({
          auth_user_id: user.id,
          email: user.email,
          nome: user.user_metadata?.full_name || user.email?.split("@")[0] || "Novo Usuário",
          cargo: invite.role,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating usuario:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar registro de usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      usuario = newUsuario;
    }

    // Check if already associated with this filial
    const { data: existingAssoc } = await supabaseAdmin
      .from("usuarios_filiais")
      .select("id")
      .eq("usuario_id", usuario.id)
      .eq("filial_id", targetFilialId)
      .maybeSingle();

    if (!existingAssoc) {
      // Create usuarios_filiais association
      const { error: assocError } = await supabaseAdmin
        .from("usuarios_filiais")
        .insert({
          usuario_id: usuario.id,
          filial_id: targetFilialId,
          cargo_na_filial: invite.role,
        });

      if (assocError) {
        console.error("Error creating usuarios_filiais:", assocError);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular usuário à filial" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Add user role
    const appRole = invite.company_type === "embarcador" ? "embarcador" : "transportadora";
    
    // Check if role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", appRole)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: appRole,
        });

      if (roleError) {
        console.error("Error creating user_role:", roleError);
        // Non-fatal, continue
      }
    }

    // Update invite status
    const { error: updateError } = await supabaseAdmin
      .from("company_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Error updating invite status:", updateError);
      // Non-fatal, continue
    }

    console.log("Invite accepted successfully:", {
      user_id: user.id,
      usuario_id: usuario.id,
      empresa_id: empresaId,
      filial_id: targetFilialId,
      role: invite.role,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite aceito com sucesso",
        empresa_nome: empresa.nome,
        empresa_tipo: empresa.tipo,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});