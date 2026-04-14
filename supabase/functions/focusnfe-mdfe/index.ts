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
    const FOCUS_NFE_TOKEN_GLOBAL = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!FOCUS_NFE_TOKEN_GLOBAL) throw new Error("FOCUS_NFE_TOKEN is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, viagem_id, ref } = await req.json();

    // AMBIENTE DA API: Alterne entre homologacao e api (produção)
    const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";
    // const FOCUS_BASE_URL = "https://api.focusnfe.com.br";

    // Helper: get empresa-specific FocusNFe token (falls back to global)
    async function getEmpresaToken(empresaId: number): Promise<string> {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("\"token-focus\"")
        .eq("id", empresaId)
        .single();
      
      const token = empresa?.["token-focus"];
      if (token) return token;
      
      console.warn(`Empresa ${empresaId} sem token-focus, usando token global`);
      return FOCUS_NFE_TOKEN_GLOBAL!;
    }

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

        // Get empresa token
        const empresaId = viagem.motorista?.empresa_id;
        if (!empresaId) throw new Error("Motorista não vinculado a uma empresa");
        const empresaToken = await getEmpresaToken(empresaId);
        const authHeader = "Basic " + btoa(empresaToken + ":");

        // 2. Collect CT-e keys
        const ctes = viagem.entregas
          .flatMap((ve: any) => ve.entrega.ctes)
          .filter((cte: any) => cte.status === 'autorizado')
          .map((cte: any) => ({ chave_cte: cte.chave_acesso }));

        if (ctes.length === 0) throw new Error("Nenhum CT-e autorizado encontrado para esta viagem");

        // 3. Build MDF-e Payload
        const uniqueRef = ref || `mdfe-${viagem_id}-${Date.now()}`;

        // Fetch empresa data for emitente
        const { data: empresa } = await supabase
          .from("empresas")
          .select("cnpj_matriz, razao_social, inscricao_estadual")
          .eq("id", empresaId)
          .single();

        const payload = {
          data_emissao: new Date().toISOString(),
          tipo_emitente: 1,
          modal: 1,
          serie: "1",
          numero: viagem.codigo.replace(/\D/g, ""),
          cnpj_emitente: (empresa?.cnpj_matriz || "").replace(/\D/g, ""),
          uf_inicio: "SP",
          uf_fim: "SP",
          placa: viagem.veiculo?.placa,
          uf_placa: viagem.veiculo?.uf,
          rntrc: viagem.veiculo?.antt_rntrc,
          cpf_motorista: viagem.motorista?.cpf,
          nome_motorista: viagem.motorista?.nome_completo,
          inf_ctes: ctes
        };

        const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes?ref=${uniqueRef}`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        
        if (response.ok) {
          // Encerrar manifesto ativo anterior (se houver)
          await supabase
            .from("mdfes")
            .update({ status: "encerrado", encerrado_at: new Date().toISOString() })
            .eq("viagem_id", viagem_id)
            .in("status", ["processando", "autorizado"]);

          await supabase.from("mdfes").insert({
            viagem_id,
            focus_ref: uniqueRef,
            status: result.status || "processando",
            empresa_id: empresaId
          });
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "encerrar": {
        if (!viagem_id) throw new Error("viagem_id is required");

        // Find the active manifesto
        const { data: activeManifesto } = await supabase
          .from("mdfes")
          .select("id, focus_ref, status, empresa_id")
          .eq("viagem_id", viagem_id)
          .in("status", ["processando", "autorizado"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!activeManifesto) throw new Error("Nenhum MDF-e ativo encontrado para encerrar");

        // Get empresa token
        const empresaToken = activeManifesto.empresa_id 
          ? await getEmpresaToken(activeManifesto.empresa_id)
          : FOCUS_NFE_TOKEN_GLOBAL!;
        const authHeader = "Basic " + btoa(empresaToken + ":");

        const encerrarRef = activeManifesto.focus_ref;
        const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${encerrarRef}`, {
          method: "DELETE",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        });

        const result = await response.json();

        await supabase
          .from("mdfes")
          .update({ status: "encerrado", encerrado_at: new Date().toISOString() })
          .eq("id", activeManifesto.id);

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "consultar": {
        if (!ref) throw new Error("ref is required");

        // Try to find empresa_id from the mdfe record
        const { data: mdfe } = await supabase
          .from("mdfes")
          .select("empresa_id")
          .eq("focus_ref", ref)
          .maybeSingle();

        const empresaToken = mdfe?.empresa_id
          ? await getEmpresaToken(mdfe.empresa_id)
          : FOCUS_NFE_TOKEN_GLOBAL!;
        const authHeader = "Basic " + btoa(empresaToken + ":");

        const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${ref}`, {
          method: "GET",
          headers: { "Authorization": authHeader },
        });

        const result = await response.json();
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
