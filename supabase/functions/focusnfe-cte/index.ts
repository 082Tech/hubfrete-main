import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FOCUS_NFE_BASE_URL = "https://homologacao.focusnfe.com.br";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_NFE_TOKEN = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!FOCUS_NFE_TOKEN) {
      throw new Error("FOCUS_NFE_TOKEN is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, entrega_id, ref, cte_data, justificativa } = await req.json();

    // Basic Auth header for Focus NFe
    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");

    switch (action) {
      case "emitir": {
        // Emit a CT-e
        if (!ref || !cte_data) {
          return new Response(
            JSON.stringify({ error: "ref and cte_data are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(
          `${FOCUS_NFE_BASE_URL}/v2/cte?ref=${encodeURIComponent(ref)}`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cte_data),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Focus NFe error:", response.status, result);
          return new Response(
            JSON.stringify({ error: "Focus NFe error", details: result, status: response.status }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Save CT-e record in our database if entrega_id is provided
        if (entrega_id) {
          const { error: insertError } = await supabase
            .from("ctes")
            .insert({
              entrega_id,
              numero: null, // Will be updated after authorization
              chave_acesso: null,
              url: null,
              xml_url: null,
              valor: cte_data.valor_total ? parseFloat(cte_data.valor_total) : null,
              focus_ref: ref,
              focus_status: result.status || "processando_autorizacao",
            });

          if (insertError) {
            console.error("Error saving CT-e to database:", insertError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "consultar": {
        // Query CT-e status
        if (!ref) {
          return new Response(
            JSON.stringify({ error: "ref is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(
          `${FOCUS_NFE_BASE_URL}/v2/cte/${encodeURIComponent(ref)}?completa=1`,
          {
            method: "GET",
            headers: { Authorization: authHeader },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: "Focus NFe error", details: result }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If authorized, update our database record
        if (result.status === "autorizado") {
          const { error: updateError } = await supabase
            .from("ctes")
            .update({
              numero: result.numero,
              chave_acesso: result.chave || result.chave_cte,
              url: result.caminho_dacte || null,
              xml_url: result.caminho_xml || null,
              focus_status: "autorizado",
            })
            .eq("focus_ref", ref);

          if (updateError) {
            console.error("Error updating CT-e in database:", updateError);
          }
        } else if (result.status === "erro_autorizacao" || result.status === "denegado") {
          await supabase
            .from("ctes")
            .update({ focus_status: result.status })
            .eq("focus_ref", ref);
        }

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancelar": {
        // Cancel a CT-e
        if (!ref) {
          return new Response(
            JSON.stringify({ error: "ref is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const response = await fetch(
          `${FOCUS_NFE_BASE_URL}/v2/cte/${encodeURIComponent(ref)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              justificativa: justificativa || "Cancelamento de CT-e via sistema",
            }),
          }
        );

        const result = await response.json();

        if (result.status === "cancelado") {
          await supabase
            .from("ctes")
            .update({
              focus_status: "cancelado",
              xml_url: result.caminho_xml || null,
            })
            .eq("focus_ref", ref);
        }

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: response.ok ? 200 : response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: emitir, consultar, cancelar` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (e) {
    console.error("focusnfe-cte error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
