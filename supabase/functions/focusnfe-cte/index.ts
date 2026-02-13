import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Helper: build CT-e payload from entrega data using real fiscal config
    async function buildCteFromEntrega(entregaId: string, supabaseClient: any) {
      // Fetch entrega with carga, enderecos, motorista, veiculo
      const { data: entrega, error: entregaError } = await supabaseClient
        .from("entregas")
        .select(`
          id, valor_frete,
          motorista:motoristas(nome_completo, cpf, empresa_id),
          veiculo:veiculos(placa, renavam),
          carga:cargas(
            descricao, peso_kg, tipo, valor_mercadoria,
            remetente_razao_social, remetente_cnpj, remetente_inscricao_estadual,
            destinatario_razao_social, destinatario_cnpj, destinatario_inscricao_estadual,
            endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(logradouro, numero, bairro, cidade, estado, cep, codigo_municipio_ibge),
            endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(logradouro, numero, bairro, cidade, estado, cep, codigo_municipio_ibge)
          )
        `)
        .eq("id", entregaId)
        .single();

      if (entregaError || !entrega) {
        throw new Error(`Entrega not found: ${entregaError?.message || "unknown"}`);
      }

      const empresaId = entrega.motorista?.empresa_id;
      if (!empresaId) {
        throw new Error("Motorista não vinculado a uma empresa");
      }

      // Fetch empresa with fiscal fields
      const { data: empresa } = await supabaseClient
        .from("empresas")
        .select("cnpj_matriz, razao_social, nome_fantasia, inscricao_estadual, telefone, email")
        .eq("id", empresaId)
        .single();

      // Fetch filial matriz with structured address
      const { data: filial } = await supabaseClient
        .from("filiais")
        .select("logradouro, numero, bairro, complemento, cidade, estado, cep, telefone, codigo_municipio_ibge, endereco")
        .eq("empresa_id", empresaId)
        .eq("is_matriz", true)
        .single();

      // Fetch config_fiscal
      const { data: configFiscal } = await supabaseClient
        .from("config_fiscal")
        .select("*")
        .eq("empresa_id", empresaId)
        .single();

      // Fetch NF-es for this entrega
      const { data: nfes } = await supabaseClient
        .from("nfes")
        .select("chave_acesso")
        .eq("entrega_id", entregaId)
        .not("chave_acesso", "is", null);

      const nfeChaves = (nfes || []).map((n: any) => n.chave_acesso).filter(Boolean);

      const origem = entrega.carga?.endereco_origem;
      const destino = entrega.carga?.endereco_destino;
      
      // Determine environment
      const isHomologacao = !configFiscal || configFiscal.ambiente === 2;
      const FOCUS_NFE_BASE_URL = isHomologacao
        ? "https://homologacao.focusnfe.com.br"
        : "https://api.focusnfe.com.br";
      const homoMsg = "CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

      // Determine CFOP based on UFs
      const ufOrigem = origem?.estado || "SP";
      const ufDestino = destino?.estado || "SP";
      const cfop = configFiscal
        ? (ufOrigem === ufDestino ? configFiscal.cfop_estadual : configFiscal.cfop_interestadual)
        : "5353";

      // Get numero from config_fiscal (with lock for sequential numbering)
      let numeroCte = 1;
      let serieCte = "1";
      if (configFiscal) {
        numeroCte = configFiscal.proximo_numero_cte || 1;
        serieCte = String(configFiscal.serie_cte || 1);
      }

      // Build payload using real data
      const cnpjEmitente = (empresa?.cnpj_matriz || "").replace(/\D/g, "");
      const ieEmitente = empresa?.inscricao_estadual || "ISENTO";
      const razaoEmitente = isHomologacao ? homoMsg : (empresa?.razao_social || empresa?.nome_fantasia || "");

      const payload: Record<string, any> = {
        // Emitente (transportadora)
        cnpj_emitente: cnpjEmitente,
        nome_emitente: razaoEmitente,
        inscricao_estadual_emitente: ieEmitente,
        logradouro_emitente: filial?.logradouro || filial?.endereco || "RUA TESTE",
        numero_emitente: filial?.numero || "SN",
        bairro_emitente: filial?.bairro || "CENTRO",
        municipio_emitente: filial?.cidade || "SAO PAULO",
        codigo_municipio_emitente: filial?.codigo_municipio_ibge || "3550308",
        uf_emitente: filial?.estado || "SP",
        cep_emitente: (filial?.cep || "01000000").replace(/\D/g, ""),
        telefone_emitente: (filial?.telefone || empresa?.telefone || "").replace(/\D/g, ""),

        // Remetente
        cnpj_remetente: (entrega.carga?.remetente_cnpj || "").replace(/\D/g, ""),
        nome_remetente: isHomologacao ? homoMsg : (entrega.carga?.remetente_razao_social || ""),
        inscricao_estadual_remetente: entrega.carga?.remetente_inscricao_estadual || "ISENTO",
        logradouro_remetente: origem?.logradouro || "RUA TESTE",
        numero_remetente: origem?.numero || "SN",
        bairro_remetente: origem?.bairro || "CENTRO",
        municipio_remetente: origem?.cidade || "SAO PAULO",
        codigo_municipio_remetente: origem?.codigo_municipio_ibge || "3550308",
        uf_remetente: origem?.estado || "SP",
        cep_remetente: (origem?.cep || "01000000").replace(/\D/g, ""),

        // Destinatário
        cnpj_destinatario: (entrega.carga?.destinatario_cnpj || "").replace(/\D/g, ""),
        nome_destinatario: isHomologacao ? homoMsg : (entrega.carga?.destinatario_razao_social || ""),
        inscricao_estadual_destinatario: entrega.carga?.destinatario_inscricao_estadual || "ISENTO",
        logradouro_destinatario: destino?.logradouro || "RUA TESTE",
        numero_destinatario: destino?.numero || "SN",
        bairro_destinatario: destino?.bairro || "CENTRO",
        municipio_destinatario: destino?.cidade || "SAO PAULO",
        codigo_municipio_destinatario: destino?.codigo_municipio_ibge || "3550308",
        uf_destinatario: destino?.estado || "SP",
        cep_destinatario: (destino?.cep || "01000000").replace(/\D/g, ""),

        // Fiscal config
        cfop,
        natureza_operacao: configFiscal?.natureza_operacao || "PRESTACAO DE SERVICO DE TRANSPORTE",
        numero: String(numeroCte),
        serie: serieCte,
        tipo_servico: configFiscal?.tipo_servico ?? 0,
        tomador: configFiscal?.tomador_padrao || "0",

        // ICMS
        icms_situacao_tributaria: configFiscal?.icms_situacao_tributaria || "00",
        icms_base_calculo: entrega.valor_frete?.toString() || "0.00",
        icms_aliquota: configFiscal?.icms_aliquota?.toString() || "0.00",
        icms_valor: configFiscal?.icms_aliquota
          ? ((entrega.valor_frete || 0) * (configFiscal.icms_aliquota / 100)).toFixed(2)
          : "0.00",

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
        uf_placa: ufOrigem,
        renavam: entrega.veiculo?.renavam || "",

        // NF-es referenciadas
        nfes: nfeChaves.map((chave: string) => ({ chave_nfe: chave })),

        // Informações complementares
        informacoes_adicionais_contribuinte: isHomologacao ? homoMsg : "",
      };

      return { payload, valorFrete: entrega.valor_frete, FOCUS_NFE_BASE_URL, configFiscal, empresaId };
    }

    // Basic Auth header for Focus NFe
    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");

    switch (action) {
      case "emitir": {
        if (!ref || !cte_data) {
          return new Response(
            JSON.stringify({ error: "ref and cte_data are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Determine base URL from cte_data or default to homologacao
        const baseUrl = "https://homologacao.focusnfe.com.br";

        const response = await fetch(
          `${baseUrl}/v2/cte?ref=${encodeURIComponent(ref)}`,
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

        if (entrega_id) {
          await supabase
            .from("ctes")
            .insert({
              entrega_id,
              valor: cte_data.valor_total ? parseFloat(cte_data.valor_total) : null,
              focus_ref: ref,
              focus_status: result.status || "processando_autorizacao",
            });
        }

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "consultar": {
        if (!ref) {
          return new Response(
            JSON.stringify({ error: "ref is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Try homologacao first, could also check config_fiscal for ambiente
        const baseUrl = "https://homologacao.focusnfe.com.br";

        const response = await fetch(
          `${baseUrl}/v2/cte/${encodeURIComponent(ref)}?completa=1`,
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

        if (result.status === "autorizado") {
          await supabase
            .from("ctes")
            .update({
              numero: result.numero,
              chave_acesso: result.chave || result.chave_cte,
              url: result.caminho_dacte || null,
              xml_url: result.caminho_xml || null,
              focus_status: "autorizado",
            })
            .eq("focus_ref", ref);
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
        if (!ref) {
          return new Response(
            JSON.stringify({ error: "ref is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const baseUrl = "https://homologacao.focusnfe.com.br";

        const response = await fetch(
          `${baseUrl}/v2/cte/${encodeURIComponent(ref)}`,
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
        if (!entrega_id) {
          return new Response(
            JSON.stringify({ error: "entrega_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const autoRef = ref || `cte-${entrega_id.slice(0, 8)}-${Date.now()}`;

        try {
          const { payload, valorFrete, FOCUS_NFE_BASE_URL, configFiscal, empresaId } =
            await buildCteFromEntrega(entrega_id, supabase);

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
          await supabase
            .from("ctes")
            .insert({
              entrega_id,
              empresa_id: empresaId,
              numero: payload.numero,
              serie: payload.serie,
              valor: valorFrete || null,
              focus_ref: autoRef,
              focus_status: emitResult.status || "processando_autorizacao",
            });

          // Increment proximo_numero_cte
          if (configFiscal) {
            await supabase
              .from("config_fiscal")
              .update({
                proximo_numero_cte: (configFiscal.proximo_numero_cte || 1) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("empresa_id", empresaId);
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
