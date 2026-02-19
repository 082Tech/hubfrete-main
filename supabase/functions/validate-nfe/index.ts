import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_NFE_TOKEN = Deno.env.get("FOCUS_NFE_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { nfe_id, chave_acesso, xml_content, referencia, empresa_id } = await req.json();

    const ref = referencia || chave_acesso || nfe_id;

    if (!xml_content) {
      throw new Error("xml_content is required for import");
    }
    if (!ref) {
      throw new Error("referencia (or chave_acesso) is required");
    }

    // 1. Determine Token (Dynamic or Env Fallback)
    let token = Deno.env.get("FOCUS_NFE_TOKEN");

    if (empresa_id) {
      const { data: empresa, error: empError } = await supabase
        .from("empresas")
        .select("token_focus")
        .eq("id", empresa_id)
        .single();

      if (empresa?.token_focus) {
        token = empresa.token_focus;
        console.log(`Using custom token for empresa ${empresa_id}`);
      }
    }

    if (!token) {
      throw new Error("Focus NFe Token not found (Env or Company)");
    }

    // AMBIENTE DA API: Alterne entre homologacao e api (produção)
    const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";
    // const FOCUS_BASE_URL = "https://api.focusnfe.com.br";

    const authHeader = "Basic " + btoa(token + ":");

    // 2. Import NFe XML
    console.log(`Importing NFe with ref: ${ref}`);
    const importRes = await fetch(`${FOCUS_BASE_URL}/v2/nfe/importacao?ref=${ref}`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/xml",
      },
      body: xml_content,
    });

    if (!importRes.ok) {
      const errorText = await importRes.text();
      throw new Error(`Error importing XML: ${importRes.status} - ${errorText}`);
    }

    // 3. Query NFe data (completa=1)
    console.log(`Querying NFe data for ref: ${ref}`);
    const queryRes = await fetch(`${FOCUS_BASE_URL}/v2/nfe/${ref}?completa=1`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (!queryRes.ok) {
      const errorText = await queryRes.text();
      throw new Error(`Error querying NFe data: ${queryRes.status} - ${errorText}`);
    }

    const nfeData = await queryRes.json();

    return new Response(JSON.stringify({ success: true, data: nfeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in validate-nfe:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
