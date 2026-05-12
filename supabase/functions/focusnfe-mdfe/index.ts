import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FOCUS_NFE_TOKEN_GLOBAL = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!FOCUS_NFE_TOKEN_GLOBAL) throw new Error("FOCUS_NFE_TOKEN is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, viagem_id, ref, uf_destino, justificativa } = body;

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
      return token || FOCUS_NFE_TOKEN_GLOBAL!;
    }

    async function emitirMdfe(viagemId: string, ufDestino: string | null) {
      // 1. Buscar viagem com motorista, veículo e CT-es autorizados (filtrados por UF se informada)
      const { data: viagem } = await supabase
        .from("viagens")
        .select(`*, veiculo:veiculos(*), motorista:motoristas(*)`)
        .eq("id", viagemId)
        .single();
      if (!viagem) throw new Error("Viagem não encontrada");

      const empresaId = viagem.motorista?.empresa_id;
      if (!empresaId) throw new Error("Motorista não vinculado a uma empresa");

      // CT-es autorizados desta viagem (e dessa UF, se informada)
      let cteQuery = supabase
        .from("ctes")
        .select("chave_acesso, uf_origem, uf_destino")
        .eq("viagem_id", viagemId)
        .eq("focus_status", "autorizado")
        .not("chave_acesso", "is", null);
      if (ufDestino) cteQuery = cteQuery.eq("uf_destino", ufDestino);

      const { data: ctesData } = await cteQuery;
      const ctes = (ctesData || []).map((c: any) => ({ chave_cte: c.chave_acesso }));
      if (ctes.length === 0) throw new Error(`Nenhum CT-e autorizado encontrado${ufDestino ? ` para UF ${ufDestino}` : ""}`);

      const ufInicio = ctesData?.[0]?.uf_origem || "SP";
      const ufFim = ufDestino || ctesData?.[0]?.uf_destino || ufInicio;

      const empresaToken = await getEmpresaToken(empresaId);
      const authHeader = "Basic " + btoa(empresaToken + ":");

      const { data: empresa } = await supabase
        .from("empresas").select("cnpj_matriz, razao_social, inscricao_estadual").eq("id", empresaId).single();

      const uniqueRef = `MDFE-AUTO-${viagemId.slice(0, 8)}-${ufFim}-${Date.now()}`;
      const numeroMdfe = parseInt((viagem.codigo || "").replace(/\D/g, "") || "1", 10);

      const payload = {
        data_emissao: new Date().toISOString(),
        tipo_emitente: 1,
        modal: 1,
        serie: "1",
        numero: String(numeroMdfe || Math.floor(Date.now() / 1000) % 999999),
        cnpj_emitente: (empresa?.cnpj_matriz || "").replace(/\D/g, ""),
        uf_inicio: ufInicio,
        uf_fim: ufFim,
        placa: viagem.veiculo?.placa,
        uf_placa: viagem.veiculo?.uf,
        rntrc: viagem.veiculo?.antt_rntrc,
        cpf_motorista: viagem.motorista?.cpf,
        nome_motorista: viagem.motorista?.nome_completo,
        inf_ctes: ctes,
      };

      const response = await fetch(`${FOCUS_BASE_URL}/v2/mdfes?ref=${uniqueRef}`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        return { ok: false, status: response.status, result };
      }

      // Polling curto por status final
      let finalStatus = result.status || "processando";
      let chave_acesso = result.chave_mdfe || null;
      let numero = result.numero || null;
      let serie = result.serie || null;
      if (finalStatus !== "autorizado") {
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const poll = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${uniqueRef}`, { headers: { Authorization: authHeader } });
          if (poll.ok) {
            const pj = await poll.json();
            finalStatus = pj.status || finalStatus;
            chave_acesso = pj.chave_mdfe || pj.chave || chave_acesso;
            numero = pj.numero || numero;
            serie = pj.serie || serie;
            if (finalStatus === "autorizado" || finalStatus?.startsWith?.("erro")) break;
          }
        }
      }

      await supabase.from("mdfes").insert({
        viagem_id: viagemId,
        empresa_id: empresaId,
        focus_ref: uniqueRef,
        status: finalStatus,
        chave_acesso,
        numero: numero ? String(numero) : null,
        serie: serie ? String(serie) : null,
        uf_inicio: ufInicio,
        uf_fim: ufFim,
      });

      return { ok: true, status: response.status, result, focus_status: finalStatus, uf_inicio: ufInicio, uf_fim: ufFim };
    }

    async function cancelarMdfeRecord(mdfeId: string, justif: string) {
      const { data: mdfe } = await supabase
        .from("mdfes").select("focus_ref, empresa_id, status").eq("id", mdfeId).single();
      if (!mdfe) throw new Error("MDF-e não encontrado");
      if (mdfe.status === "encerrado") throw new Error("MDF-e já encerrado — não pode ser cancelado");
      if (mdfe.status === "cancelado") return { ok: true, alreadyCancelled: true };

      const tk = mdfe.empresa_id ? await getEmpresaToken(mdfe.empresa_id) : FOCUS_NFE_TOKEN_GLOBAL!;
      const ah = "Basic " + btoa(tk + ":");
      const r = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${mdfe.focus_ref}`, {
        method: "DELETE",
        headers: { Authorization: ah, "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: justif || "Cancelamento solicitado pelo emitente" }),
      });
      const j = await r.json();
      if (r.ok) {
        await supabase.from("mdfes")
          .update({ status: "cancelado", cancelled_at: new Date().toISOString() })
          .eq("id", mdfeId);
      }
      return { ok: r.ok, result: j };
    }

    switch (action) {
      case "emit":
      case "emitir": {
        if (!viagem_id) throw new Error("viagem_id is required");
        // Idempotência: se já existe MDF-e ativo para (viagem, uf), retorna
        let dupQ = supabase.from("mdfes").select("id, focus_ref, status").eq("viagem_id", viagem_id)
          .not("status", "in", '("cancelado","erro")');
        if (uf_destino) dupQ = dupQ.eq("uf_fim", uf_destino);
        const { data: dup } = await dupQ.limit(1);
        if (dup && dup.length > 0) {
          return new Response(JSON.stringify({ skipped: true, motivo: "MDF-e já existe", mdfe: dup[0] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const out = await emitirMdfe(viagem_id, uf_destino || null);
        return new Response(JSON.stringify(out.result || out), {
          status: out.ok ? 200 : (out.status || 400),
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "recriar": {
        // Cancela o MDF-e ativo para (viagem, uf) e emite um novo agrupando os CT-es atuais
        if (!viagem_id) throw new Error("viagem_id is required");
        if (!justificativa || justificativa.length < 15) {
          throw new Error("justificativa (mínimo 15 caracteres) é obrigatória pela SEFAZ");
        }

        let q = supabase.from("mdfes").select("id, status, uf_fim").eq("viagem_id", viagem_id)
          .not("status", "in", '("cancelado","erro","encerrado")');
        if (uf_destino) q = q.eq("uf_fim", uf_destino);
        const { data: ativos } = await q;
        if (!ativos || ativos.length === 0) throw new Error("Nenhum MDF-e ativo para recriar");

        const cancelResults: any[] = [];
        for (const m of ativos) {
          const c = await cancelarMdfeRecord(m.id, justificativa);
          cancelResults.push({ mdfe_id: m.id, ...c });
        }

        const ufFimAlvo = uf_destino || ativos[0].uf_fim;
        const out = await emitirMdfe(viagem_id, ufFimAlvo);
        return new Response(JSON.stringify({ cancelados: cancelResults, novo: out }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "cancelar": {
        const mdfeId = body.mdfe_id;
        if (!mdfeId) throw new Error("mdfe_id is required");
        const out = await cancelarMdfeRecord(mdfeId, justificativa || "");
        return new Response(JSON.stringify(out), {
          status: out.ok ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "encerrar": {
        if (!viagem_id) throw new Error("viagem_id is required");
        const { data: ativos } = await supabase.from("mdfes")
          .select("id, focus_ref, empresa_id, status")
          .eq("viagem_id", viagem_id)
          .in("status", ["processando", "autorizado"]);
        if (!ativos || ativos.length === 0) throw new Error("Nenhum MDF-e ativo encontrado para encerrar");

        const out: any[] = [];
        for (const m of ativos) {
          const tk = m.empresa_id ? await getEmpresaToken(m.empresa_id) : FOCUS_NFE_TOKEN_GLOBAL!;
          const ah = "Basic " + btoa(tk + ":");
          // Encerramento de MDF-e na Focus = endpoint específico (não DELETE)
          const r = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${m.focus_ref}/encerrar`, {
            method: "POST",
            headers: { Authorization: ah, "Content-Type": "application/json" },
          });
          const j = await r.json();
          if (r.ok) {
            await supabase.from("mdfes")
              .update({ status: "encerrado", encerrado_at: new Date().toISOString() })
              .eq("id", m.id);
          }
          out.push({ mdfe_id: m.id, ok: r.ok, result: j });
        }
        return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "consultar": {
        if (!ref) throw new Error("ref is required");
        const { data: mdfe } = await supabase.from("mdfes").select("empresa_id").eq("focus_ref", ref).maybeSingle();
        const tk = mdfe?.empresa_id ? await getEmpresaToken(mdfe.empresa_id) : FOCUS_NFE_TOKEN_GLOBAL!;
        const ah = "Basic " + btoa(tk + ":");
        const r = await fetch(`${FOCUS_BASE_URL}/v2/mdfes/${ref}`, { headers: { Authorization: ah } });
        const j = await r.json();
        if (j.status) {
          await supabase.from("mdfes").update({
            status: j.status,
            chave_acesso: j.chave_mdfe || null,
            numero: j.numero ? String(j.numero) : null,
          }).eq("focus_ref", ref);
        }
        return new Response(JSON.stringify(j), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
