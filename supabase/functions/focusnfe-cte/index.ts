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

    // Helper: build CT-e payload from entrega data
    async function buildCteFromEntrega(entregaId: string, supabaseClient: any) {
      // Fetch entrega with carga, enderecos, motorista, veiculo, empresa
      const { data: entrega, error: entregaError } = await supabaseClient
        .from("entregas")
        .select(`
          id, valor_frete,
          motorista:motoristas(nome_completo, cpf, empresa_id),
          veiculo:veiculos(placa, renavam),
          carga:cargas(
            descricao, peso_kg, tipo,
            remetente_razao_social, remetente_cnpj,
            destinatario_razao_social, destinatario_cnpj,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(logradouro, numero, bairro, cidade, estado, cep),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(logradouro, numero, bairro, cidade, estado, cep)
          )
        `)
        .eq("id", entregaId)
        .single();

      if (entregaError || !entrega) {
        throw new Error(`Entrega not found: ${entregaError?.message || "unknown"}`);
      }

      // Fetch empresa (transportadora) CNPJ
      const empresaId = entrega.motorista?.empresa_id;
      let cnpjEmitente = "";
      if (empresaId) {
        const { data: empresa } = await supabaseClient
          .from("empresas")
          .select("cnpj_matriz")
          .eq("id", empresaId)
          .single();
        cnpjEmitente = empresa?.cnpj_matriz || "";
      }

      // Fetch NF-es for this entrega
      const { data: nfes } = await supabaseClient
        .from("nfes")
        .select("chave_acesso")
        .eq("entrega_id", entregaId)
        .not("chave_acesso", "is", null);

      const nfeChaves = (nfes || []).map((n: any) => n.chave_acesso).filter(Boolean);

      const origem = entrega.carga?.endereco_origem;
      const destino = entrega.carga?.endereco_destino;
      const homoMsg = "CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

      // Build minimal CT-e payload for Focus NFe homologação
      const payload: Record<string, any> = {
        // Emitente (transportadora)
        cnpj_emitente: cnpjEmitente.replace(/\D/g, ""),
        nome_emitente: homoMsg,
        inscricao_estadual_emitente: "ISENTO",
        logradouro_emitente: "RUA TESTE",
        numero_emitente: "100",
        bairro_emitente: "CENTRO",
        municipio_emitente: "SAO PAULO",
        uf_emitente: "SP",
        cep_emitente: "01000000",

        // Remetente
        cnpj_remetente: (entrega.carga?.remetente_cnpj || "").replace(/\D/g, ""),
        nome_remetente: homoMsg,
        logradouro_remetente: origem?.logradouro || "RUA TESTE",
        numero_remetente: origem?.numero || "SN",
        bairro_remetente: origem?.bairro || "CENTRO",
        municipio_remetente: origem?.cidade || "SAO PAULO",
        uf_remetente: origem?.estado || "SP",
        cep_remetente: (origem?.cep || "01000000").replace(/\D/g, ""),

        // Destinatário
        cnpj_destinatario: (entrega.carga?.destinatario_cnpj || "").replace(/\D/g, ""),
        nome_destinatario: homoMsg,
        logradouro_destinatario: destino?.logradouro || "RUA TESTE",
        numero_destinatario: destino?.numero || "SN",
        bairro_destinatario: destino?.bairro || "CENTRO",
        municipio_destinatario: destino?.cidade || "SAO PAULO",
        uf_destinatario: destino?.estado || "SP",
        cep_destinatario: (destino?.cep || "01000000").replace(/\D/g, ""),

        // Valores
        valor_total: entrega.valor_frete?.toString() || "0.00",
        valor_receber: entrega.valor_frete?.toString() || "0.00",

        // Mercadoria
        produto_predominante: entrega.carga?.descricao?.slice(0, 60) || "MERCADORIA",
        quantidade: "1",
        tipo_medida: "UNIDADE",

        // Modal rodoviário
        modal: "rodoviario",
        placa: entrega.veiculo?.placa || "",
        uf_placa: origem?.estado || "SP",
        renavam: entrega.veiculo?.renavam || "",

        // NF-es referenciadas
        nfes: nfeChaves.map((chave: string) => ({ chave_nfe: chave })),

        // Informações complementares
        informacoes_adicionais_contribuinte: homoMsg,
      };

      return { payload, valorFrete: entrega.valor_frete };
    }

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

      case "emitir_com_nfes": {
        // Auto-emit CT-e from entrega data + NF-es
        if (!entrega_id) {
          return new Response(
            JSON.stringify({ error: "entrega_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const autoRef = ref || `cte-${entrega_id.slice(0, 8)}-${Date.now()}`;

        try {
          const { payload, valorFrete } = await buildCteFromEntrega(entrega_id, supabase);

          // Call Focus NFe
          const emitResponse = await fetch(
            `${FOCUS_NFE_BASE_URL}/v2/cte?ref=${encodeURIComponent(autoRef)}`,
            {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          const emitResult = await emitResponse.json();

          if (!emitResponse.ok) {
            console.error("Focus NFe emitir_com_nfes error:", emitResponse.status, emitResult);
            return new Response(
              JSON.stringify({ error: "Focus NFe error", details: emitResult }),
              { status: emitResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Save CT-e record
          const { error: insertError } = await supabase
            .from("ctes")
            .insert({
              entrega_id,
              numero: null,
              chave_acesso: null,
              url: null,
              xml_url: null,
              valor: valorFrete || null,
              focus_ref: autoRef,
              focus_status: emitResult.status || "processando_autorizacao",
            });

          if (insertError) {
            console.error("Error saving auto CT-e:", insertError);
          }

          // Link NF-es to this CT-e
          const { data: newCte } = await supabase
            .from("ctes")
            .select("id")
            .eq("focus_ref", autoRef)
            .single();

          if (newCte) {
            await supabase
              .from("nfes")
              .update({ cte_id: newCte.id })
              .eq("entrega_id", entrega_id)
              .is("cte_id", null);
          }

          return new Response(
            JSON.stringify({ success: true, data: emitResult, ref: autoRef }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (buildError) {
          console.error("Error building CT-e payload:", buildError);
          return new Response(
            JSON.stringify({ error: buildError instanceof Error ? buildError.message : "Error building CT-e" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: emitir, emitir_com_nfes, consultar, cancelar` }),
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
