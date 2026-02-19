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

    const { action, viagem_id, ref, mdfe_data } = await req.json();

    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");
    
    // AMBIENTE DA API: Alterne entre homologacao e api (produção)
    const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";
    // const FOCUS_BASE_URL = "https://api.focusnfe.com.br";

    switch (action) {
      case "emitir": {
        if (!viagem_id) throw new Error("viagem_id is required");

        // 1. Fetch Viagem data with all related info
        const { data: viagem } = await supabase
          .from("viagens")
          .select(`
            *,
            veiculo:veiculos(*),
            motorista:motoristas(*),
            entregas:viagem_entregas(
              entrega:entregas(
                id,
                ctes(chave_acesso, status)
              )
            )
          `)
          .eq("id", viagem_id)
          .single();

        if (!viagem) throw new Error("Viagem não encontrada");

        // 2. Collect CT-e keys
        const ctes = viagem.entregas
          .flatMap((ve: any) => ve.entrega.ctes)
          .filter((cte: any) => cte.status === 'autorizado')
          .map((cte: any) => ({ chave_cte: cte.chave_acesso }));

        if (ctes.length === 0) throw new Error("Nenhum CT-e autorizado encontrado para esta viagem");

        // 3. Build MDF-e Payload (Simplified)
        const payload = {
          data_emissao: new Date().toISOString(),
          tipo_emitente: 1, // Prestador de serviço de transporte
          modal: 1, // Rodoviário
          serie: "1",
          numero: viagem.codigo.replace(/\D/g, ""),
          cnpj_emitente: "00000000000000", // Should come from empresa
          uf_inicio: "SP",
          uf_fim: "SP",
          placa: viagem.veiculo?.placa,
          uf_placa: viagem.veiculo?.uf,
          rntrc: viagem.veiculo?.antt_rntrc,
          cpf_motorista: viagem.motorista?.cpf,
          nome_motorista: viagem.motorista?.nome_completo,
          inf_ctes: ctes
        };

        const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes?ref=${ref}`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        
        if (response.ok) {
          await supabase.from("mdfes").insert({
            viagem_id,
            focus_ref: ref,
            status: result.status,
            empresa_id: viagem.motorista?.empresa_id
          });
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Action ${action} not supported`);
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
