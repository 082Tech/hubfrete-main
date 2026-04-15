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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FOCUS_NFE_TOKEN_GLOBAL = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!FOCUS_NFE_TOKEN_GLOBAL) throw new Error("FOCUS_NFE_TOKEN is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const DEV_PROJECT_REF = "ublyithvarvtqbwmxtyh";
    const isDevEnv = SUPABASE_URL.includes(DEV_PROJECT_REF);
    const FOCUS_BASE_URL = isDevEnv
      ? "https://homologacao.focusnfe.com.br"
      : "https://api.focusnfe.com.br";

    async function getEmpresaToken(empresaId: number): Promise<string> {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("\"token-focus\", token_focus_homologacao")
        .eq("id", empresaId)
        .single();
      const token = isDevEnv
        ? (empresa?.token_focus_homologacao || empresa?.["token-focus"])
        : (empresa?.["token-focus"] || empresa?.token_focus_homologacao);
      if (token) return token;
      return FOCUS_NFE_TOKEN_GLOBAL!;
    }

    const { action, viagem_id } = await req.json();
    if (!viagem_id) throw new Error("viagem_id is required");

    // Fetch viagem with entregas, enderecos, motorista, veiculo
    const { data: viagem, error: viagemError } = await supabase
      .from("viagens")
      .select(`
        id, codigo, status,
        motorista:motoristas!viagens_motorista_id_fkey(id, nome_completo, cpf, empresa_id),
        veiculo:veiculos!viagens_veiculo_id_fkey(id, placa, renavam, uf, antt_rntrc)
      `)
      .eq("id", viagem_id)
      .single();

    if (viagemError || !viagem) throw new Error("Viagem não encontrada");

    // Fetch entregas via viagem_entregas
    const { data: links } = await supabase
      .from("viagem_entregas")
      .select("entrega_id")
      .eq("viagem_id", viagem_id);

    if (!links?.length) throw new Error("Viagem sem entregas vinculadas");

    const entregaIds = links.map((l: any) => l.entrega_id);

    const { data: entregas } = await supabase
      .from("entregas")
      .select(`
        id, codigo, valor_frete, status,
        carga:cargas(
          descricao, peso_kg, tipo, valor_mercadoria,
          remetente_razao_social, remetente_cnpj, remetente_inscricao_estadual,
          destinatario_razao_social, destinatario_cnpj, destinatario_inscricao_estadual,
          endereco_origem:enderecos_carga!cargas_endereco_origem_id_fkey(logradouro, numero, bairro, cidade, estado, cep, codigo_municipio_ibge),
          endereco_destino:enderecos_carga!cargas_endereco_destino_id_fkey(logradouro, numero, bairro, cidade, estado, cep, codigo_municipio_ibge)
        )
      `)
      .in("id", entregaIds);

    if (!entregas?.length) throw new Error("Nenhuma entrega encontrada");

    // Filter only active (non-cancelled) entregas
    const activeEntregas = entregas.filter((e: any) => e.status !== "cancelada");

    // Check which entregas already have CT-e
    const { data: existingCtes } = await supabase
      .from("ctes")
      .select("entrega_id, focus_status")
      .in("entrega_id", activeEntregas.map((e: any) => e.id));

    const ctesMap: Record<string, any[]> = {};
    (existingCtes || []).forEach((c: any) => {
      if (!ctesMap[c.entrega_id]) ctesMap[c.entrega_id] = [];
      ctesMap[c.entrega_id].push(c);
    });

    // Build preview: which CT-es to generate, grouped MDF-es
    const ctesToGenerate: any[] = [];
    const ctesAlreadyExist: any[] = [];

    for (const entrega of activeEntregas) {
      const existing = ctesMap[entrega.id];
      const hasAuthorized = existing?.some((c: any) => 
        ["autorizado", "processando_autorizacao", "processando"].includes(c.focus_status)
      );

      const ufOrigem = entrega.carga?.endereco_origem?.estado || "??";
      const ufDestino = entrega.carga?.endereco_destino?.estado || "??";

      if (hasAuthorized) {
        ctesAlreadyExist.push({
          entrega_id: entrega.id,
          codigo: entrega.codigo,
          uf_origem: ufOrigem,
          uf_destino: ufDestino,
        });
      } else {
        ctesToGenerate.push({
          entrega_id: entrega.id,
          codigo: entrega.codigo,
          uf_origem: ufOrigem,
          uf_destino: ufDestino,
          valor_frete: entrega.valor_frete,
          descricao: entrega.carga?.descricao,
        });
      }
    }

    // Group for MDF-e by (uf_origem, uf_destino)
    const allEntregasForMdfe = [...ctesAlreadyExist, ...ctesToGenerate];
    const mdfeGroups: Record<string, { uf_origem: string; uf_destino: string; entregas: string[] }> = {};

    for (const item of allEntregasForMdfe) {
      const key = `${item.uf_origem}->${item.uf_destino}`;
      if (!mdfeGroups[key]) {
        mdfeGroups[key] = { uf_origem: item.uf_origem, uf_destino: item.uf_destino, entregas: [] };
      }
      mdfeGroups[key].entregas.push(item.codigo);
    }

    // Check existing MDF-es for this viagem
    const { data: existingMdfes } = await supabase
      .from("mdfes")
      .select("id, status, uf_inicio, uf_fim")
      .eq("viagem_id", viagem_id)
      .in("status", ["processando", "autorizado"]);

    const mdfeGroupsArray = Object.values(mdfeGroups);

    if (action === "preview") {
      return new Response(JSON.stringify({
        ctes_to_generate: ctesToGenerate,
        ctes_already_exist: ctesAlreadyExist,
        mdfe_groups: mdfeGroupsArray,
        existing_mdfes: existingMdfes || [],
        total_ctes: ctesToGenerate.length,
        total_mdfes: mdfeGroupsArray.length,
        viagem_codigo: viagem.codigo,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action !== "gerar") {
      throw new Error("Action must be 'preview' or 'gerar'");
    }

    // ==================== GENERATE ====================
    const empresaId = viagem.motorista?.empresa_id;
    if (!empresaId) throw new Error("Motorista não vinculado a uma empresa");
    const empresaToken = await getEmpresaToken(empresaId);
    const authHeader = "Basic " + btoa(empresaToken + ":");

    const isHomologacao = FOCUS_BASE_URL.includes("homologacao");
    const homoMsg = "CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

    // Fetch empresa data
    const { data: empresa } = await supabase
      .from("empresas")
      .select("cnpj_matriz, razao_social, nome_fantasia, inscricao_estadual, telefone, email")
      .eq("id", empresaId)
      .single();

    // Fetch filial matriz
    const { data: filial } = await supabase
      .from("filiais")
      .select("logradouro, numero, bairro, complemento, cidade, estado, cep, telefone, codigo_municipio_ibge, endereco")
      .eq("empresa_id", empresaId)
      .eq("is_matriz", true)
      .single();

    // Fetch config_fiscal
    const { data: configFiscal } = await supabase
      .from("config_fiscal")
      .select("*")
      .eq("empresa_id", empresaId)
      .single();

    const results: { ctes: any[]; mdfes: any[] } = { ctes: [], mdfes: [] };

    // Step 1: Generate CT-es
    let currentNumero = configFiscal?.proximo_numero_cte || 1;
    const serieCte = String(configFiscal?.serie_cte || 1);

    for (const cteInfo of ctesToGenerate) {
      const entrega = activeEntregas.find((e: any) => e.id === cteInfo.entrega_id);
      if (!entrega) continue;

      // Fetch NF-es for this entrega
      const { data: nfes } = await supabase
        .from("nfes")
        .select("chave_acesso, status_validacao")
        .eq("entrega_id", entrega.id);

      const nfeChaves = (nfes || [])
        .filter((n: any) => n.status_validacao === "autorizada")
        .map((n: any) => n.chave_acesso)
        .filter(Boolean);

      const origem = entrega.carga?.endereco_origem;
      const destino = entrega.carga?.endereco_destino;
      const ufOrigem = origem?.estado || "SP";
      const ufDestino = destino?.estado || "SP";
      const cfop = configFiscal
        ? (ufOrigem === ufDestino ? configFiscal.cfop_estadual : configFiscal.cfop_interestadual)
        : "5353";

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
        uf_remetente: ufOrigem,
        cep_remetente: (origem?.cep || "01000000").replace(/\D/g, ""),

        cnpj_destinatario: (entrega.carga?.destinatario_cnpj || "").replace(/\D/g, ""),
        nome_destinatario: isHomologacao ? homoMsg : (entrega.carga?.destinatario_razao_social || ""),
        inscricao_estadual_destinatario: entrega.carga?.destinatario_inscricao_estadual || "ISENTO",
        logradouro_destinatario: destino?.logradouro || "RUA TESTE",
        numero_destinatario: destino?.numero || "SN",
        bairro_destinatario: destino?.bairro || "CENTRO",
        municipio_destinatario: destino?.cidade || "SAO PAULO",
        codigo_municipio_destinatario: destino?.codigo_municipio_ibge || "3550308",
        uf_destinatario: ufDestino,
        cep_destinatario: (destino?.cep || "01000000").replace(/\D/g, ""),

        cfop,
        natureza_operacao: configFiscal?.natureza_operacao || "PRESTACAO DE SERVICO DE TRANSPORTE",
        numero: String(currentNumero),
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
        placa: viagem.veiculo?.placa || "",
        uf_placa: viagem.veiculo?.uf || ufOrigem,
        renavam: viagem.veiculo?.renavam || "",

        nfes: nfeChaves.map((chave: string) => ({ chave_nfe: chave })),
        informacoes_adicionais_contribuinte: isHomologacao ? homoMsg : "",
      };

      const refCte = `CTE-VGM-${entrega.id.slice(0, 8)}-${Date.now()}`;

      try {
        const response = await fetch(`${FOCUS_BASE_URL}/v2/cte?ref=${refCte}`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
          await supabase.from("ctes").insert({
            entrega_id: entrega.id,
            empresa_id: empresaId,
            valor: parseFloat(payload.valor_total),
            focus_ref: refCte,
            focus_status: result.status || "processando_autorizacao",
            numero: String(currentNumero),
            serie: serieCte,
          });
          currentNumero++;
        }

        results.ctes.push({
          entrega_codigo: entrega.codigo,
          ref: refCte,
          success: response.ok,
          status: result.status,
          error: response.ok ? null : (result.mensagem || JSON.stringify(result)),
        });
      } catch (err: any) {
        results.ctes.push({
          entrega_codigo: entrega.codigo,
          ref: refCte,
          success: false,
          error: err.message,
        });
      }
    }

    // Update proximo_numero_cte
    if (configFiscal && currentNumero > (configFiscal.proximo_numero_cte || 1)) {
      await supabase
        .from("config_fiscal")
        .update({ proximo_numero_cte: currentNumero })
        .eq("empresa_id", empresaId);
    }

    // Step 2: Generate MDF-es grouped by UF
    // Wait a moment for CT-es to process, then fetch authorized ones
    // For now, we generate MDF-e referencing all CT-es (authorized + just-created)
    const { data: allCtes } = await supabase
      .from("ctes")
      .select("id, entrega_id, chave_acesso, focus_status, focus_ref")
      .in("entrega_id", activeEntregas.map((e: any) => e.id));

    for (const group of mdfeGroupsArray) {
      // Find entregas in this group
      const groupEntregaCodigos = group.entregas;
      const groupEntregaIds = activeEntregas
        .filter((e: any) => groupEntregaCodigos.includes(e.codigo))
        .map((e: any) => e.id);

      // Find CT-es for these entregas
      const groupCtes = (allCtes || []).filter((c: any) => 
        groupEntregaIds.includes(c.entrega_id) &&
        ["autorizado", "processando_autorizacao", "processando"].includes(c.focus_status)
      );

      const cteChaves = groupCtes
        .map((c: any) => c.chave_acesso)
        .filter(Boolean);

      // If no chaves yet (CT-es still processing), use refs
      const infCtes = cteChaves.length > 0
        ? cteChaves.map((chave: string) => ({ chave_cte: chave }))
        : [];

      const refMdfe = `MDFE-${viagem.codigo}-${group.uf_origem}${group.uf_destino}-${Date.now()}`;

      const mdfePayload = {
        data_emissao: new Date().toISOString(),
        tipo_emitente: 1,
        modal: 1,
        serie: "1",
        numero: viagem.codigo.replace(/\D/g, "") + mdfeGroupsArray.indexOf(group),
        cnpj_emitente: (empresa?.cnpj_matriz || "").replace(/\D/g, ""),
        inscricao_estadual_emitente: empresa?.inscricao_estadual || "ISENTO",
        nome_emitente: isHomologacao ? "MDF-E EMITIDO EM AMBIENTE DE HOMOLOGACAO" : (empresa?.razao_social || ""),
        uf_inicio: group.uf_origem,
        uf_fim: group.uf_destino,
        municipio_carregamento: filial?.cidade || "SAO PAULO",
        codigo_municipio_carregamento: filial?.codigo_municipio_ibge || "3550308",
        placa: viagem.veiculo?.placa || "",
        uf_placa: viagem.veiculo?.uf || group.uf_origem,
        rntrc: viagem.veiculo?.antt_rntrc || "",
        cpf_motorista: (viagem.motorista?.cpf || "").replace(/\D/g, ""),
        nome_motorista: viagem.motorista?.nome_completo || "",
        inf_ctes: infCtes,
      };

      try {
        const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes?ref=${refMdfe}`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(mdfePayload),
        });

        const result = await response.json();

        if (response.ok) {
          await supabase.from("mdfes").insert({
            viagem_id,
            focus_ref: refMdfe,
            status: result.status || "processando",
            empresa_id: empresaId,
            uf_inicio: group.uf_origem,
            uf_fim: group.uf_destino,
          });
        }

        results.mdfes.push({
          uf_origem: group.uf_origem,
          uf_destino: group.uf_destino,
          entregas: group.entregas,
          ref: refMdfe,
          success: response.ok,
          status: result.status,
          error: response.ok ? null : (result.mensagem || JSON.stringify(result)),
        });
      } catch (err: any) {
        results.mdfes.push({
          uf_origem: group.uf_origem,
          uf_destino: group.uf_destino,
          entregas: group.entregas,
          ref: refMdfe,
          success: false,
          error: err.message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        ctes_generated: results.ctes.filter(c => c.success).length,
        ctes_failed: results.ctes.filter(c => !c.success).length,
        mdfes_generated: results.mdfes.filter(m => m.success).length,
        mdfes_failed: results.mdfes.filter(m => !m.success).length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
