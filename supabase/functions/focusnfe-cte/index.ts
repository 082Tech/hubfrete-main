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
          veiculo:veiculos(placa, renavam, uf),
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
        .select("chave_acesso, status_validacao")
        .eq("entrega_id", entregaId);

      // Validate NF-es
      const unauthorizedNfes = (nfes || []).filter((n: any) => n.status_validacao !== 'autorizada');
      if (unauthorizedNfes.length > 0) {
        throw new Error(`Existem ${unauthorizedNfes.length} NF-es não autorizadas para esta entrega.`);
      }

      const nfeChaves = (nfes || []).map((n: any) => n.chave_acesso).filter(Boolean);

      const origem = entrega.carga?.endereco_origem;
      const destino = entrega.carga?.endereco_destino;
      
      // AMBIENTE DA API: Alterne entre homologacao e api (produção)
      const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";
      // const FOCUS_BASE_URL = "https://api.focusnfe.com.br";
      
      const isHomologacao = FOCUS_BASE_URL.includes("homologacao");
      const homoMsg = "CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

      // Determine CFOP based on UFs
      const ufOrigem = origem?.estado || "SP";
      const ufDestino = destino?.estado || "SP";
      const cfop = configFiscal
        ? (ufOrigem === ufDestino ? configFiscal.cfop_estadual : configFiscal.cfop_interestadual)
        : "5353";

      // Get numero from config_fiscal
      let numeroCte = 1;
      let serieCte = "1";
      if (configFiscal) {
        numeroCte = configFiscal.proximo_numero_cte || 1;
        serieCte = String(configFiscal.serie_cte || 1);
      }

      // Build payload
      const cnpjEmitente = (empresa?.cnpj_matriz || "").replace(/\D/g, "");
      const ieEmitente = empresa?.inscricao_estadual || "ISENTO";
      const razaoEmitente = isHomologacao ? homoMsg : (empresa?.razao_social || empresa?.nome_fantasia || "");

      const payload: Record<string, any> = {
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
        regime_tributario_emitente: configFiscal?.regime_tributario_emitente || 3,

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

        cfop,
        natureza_operacao: configFiscal?.natureza_operacao || "PRESTACAO DE SERVICO DE TRANSPORTE",
        numero: String(numeroCte),
        serie: serieCte,
        tipo_servico: configFiscal?.tipo_servico ?? 0,
        tomador: configFiscal?.tomador_padrao || "0",

        icms_situacao_tributaria: configFiscal?.icms_situacao_tributaria || "00",
        icms_base_calculo: ((entrega.valor_frete || 0) * ((configFiscal?.icms_base_calculo_percentual || 100) / 100)).toFixed(2),
        icms_aliquota: configFiscal?.icms_aliquota?.toString() || "0.00",
        icms_valor: configFiscal?.icms_aliquota
          ? ((entrega.valor_frete || 0) * (configFiscal.icms_aliquota / 100)).toFixed(2)
          : "0.00",

        valor_total: entrega.valor_frete?.toString() || "0.00",
        valor_receber: entrega.valor_frete?.toString() || "0.00",

        produto_predominante: entrega.carga?.descricao?.slice(0, 60) || "MERCADORIA",
        quantidade: "1",
        tipo_medida: "UNIDADE",

        modal: "rodoviario",
        placa: entrega.veiculo?.placa || "",
        uf_placa: entrega.veiculo?.uf || ufOrigem,
        renavam: entrega.veiculo?.renavam || "",

        nfes: nfeChaves.map((chave: string) => ({ chave_nfe: chave })),
        informacoes_adicionais_contribuinte: isHomologacao ? homoMsg : "",
      };

      return { payload, FOCUS_BASE_URL, configFiscal, empresaId };
    }

    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");

    switch (action) {
      case "emitir_automatico": {
        if (!entrega_id) throw new Error("entrega_id is required");
        
        const { payload, FOCUS_BASE_URL, configFiscal } = await buildCteFromEntrega(entrega_id, supabase);
        const refAuto = `CTE-AUTO-${entrega_id.slice(0, 8)}-${Date.now()}`;

        const response = await fetch(`${FOCUS_BASE_URL}/v2/cte?ref=${refAuto}`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
          await supabase.from("ctes").insert({
            entrega_id,
            valor: parseFloat(payload.valor_total),
            focus_ref: refAuto,
            focus_status: result.status || "processando_autorizacao",
          });
          
          await supabase.from("entregas").update({ 
            cte_gerado_automaticamente: true,
            cte_tentativas_geracao: 1
          }).eq("id", entrega_id);
        } else {
          await supabase.from("entregas").update({ 
            cte_ultimo_erro: result.mensagem || JSON.stringify(result),
            cte_tentativas_geracao: 1
          }).eq("id", entrega_id);
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // ... rest of existing actions (emitir, consultar, cancelar)
      default:
        return new Response(JSON.stringify({ error: "Action not supported" }), { status: 400 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
