import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user has permission to invite (owns the company)
    const companyTable = company_type === "embarcador" ? "embarcadores" : "transportadoras";
    const { data: company, error: companyError } = await supabaseAdmin
      .from(companyTable)
      .select("id, user_id")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (company.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para convidar usuários para esta empresa" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite already exists
    const { data: existingInvite } = await supabaseAdmin
      .from("company_invites")
      .select("id, status")
      .eq("email", email)
      .eq("company_id", company_id)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("company_invites")
      .insert({
        email,
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invite using Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: user.id,
        company_type,
        company_id,
        invite_id: invite.id,
      },
      redirectTo: `${req.headers.get("origin") || supabaseUrl}/login?invite=${invite.token}`,
    });

    if (authError) {
      console.error("Error sending invite email:", authError);
      // Delete the invite record if email failed
      await supabaseAdmin.from("company_invites").delete().eq("id", invite.id);
      
      return new Response(
        JSON.stringify({ error: `Erro ao enviar convite: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invite sent successfully:", { email, invite_id: invite.id });

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
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});