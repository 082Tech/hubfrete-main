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
    if (!FOCUS_NFE_TOKEN) throw new Error("FOCUS_NFE_TOKEN is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, empresa_id, force } = await req.json();

    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");

    // Auto-detect environment: dev Supabase → homologação, prod → produção
    const DEV_PROJECT_REF = "ublyithvarvtqbwmxtyh";
    const isDevEnv = SUPABASE_URL.includes(DEV_PROJECT_REF);
    const FOCUS_BASE_URL = isDevEnv
      ? "https://homologacao.focusnfe.com.br"
      : "https://api.focusnfe.com.br";
    console.log(`FocusNFe environment: ${isDevEnv ? "HOMOLOGAÇÃO" : "PRODUÇÃO"}`);

    switch (action) {
      case "cadastrar": {
        if (!empresa_id) throw new Error("empresa_id is required");

        // 1. Fetch empresa data
        const { data: empresa, error: empError } = await supabase
          .from("empresas")
          .select("id, cnpj_matriz, razao_social, nome_fantasia, inscricao_estadual, telefone, email, \"token-focus\"")
          .eq("id", empresa_id)
          .single();

        if (empError || !empresa) throw new Error("Empresa não encontrada: " + empError?.message);

        // Check if already registered (skip if force=true)
        if (empresa["token-focus"] && !force) {
          // Verify on FocusNFe if actually exists
          const cnpjCheck = (empresa.cnpj_matriz || "").replace(/\D/g, "");
          const verifyRes = await fetch(`${FOCUS_BASE_URL}/v2/empresas/${cnpjCheck}`, {
            method: "GET",
            headers: { "Authorization": authHeader },
          });
          if (verifyRes.ok) {
            return new Response(JSON.stringify({ 
              message: "Empresa já cadastrada na FocusNFe", 
              token: empresa["token-focus"] 
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          // Not found on FocusNFe — clear stale token and proceed with registration
          console.log("Token exists but empresa not found on FocusNFe, re-registering...");
          await supabase.from("empresas").update({ "token-focus": null }).eq("id", empresa_id);
        }

        // 2. Fetch filial matriz for address
        const { data: filial } = await supabase
          .from("filiais")
          .select("logradouro, numero, bairro, complemento, cidade, estado, cep, telefone, codigo_municipio_ibge, endereco")
          .eq("empresa_id", empresa_id)
          .eq("is_matriz", true)
          .single();

        // 3. Fetch certificado digital (if exists)
        const { data: certificado } = await supabase
          .from("certificados_digitais")
          .select("pfx_base64, senha_encriptada")
          .eq("empresa_id", empresa_id)
          .single();

        // 4. Fetch config_fiscal for regime_tributario
        const { data: configFiscal } = await supabase
          .from("config_fiscal")
          .select("regime_tributario_emitente, ambiente")
          .eq("empresa_id", empresa_id)
          .single();

        // 5. Build FocusNFe payload
        const cnpj = (empresa.cnpj_matriz || "").replace(/\D/g, "");
        if (!cnpj || cnpj.length < 14) throw new Error("CNPJ inválido ou não cadastrado");

        const payload: Record<string, any> = {
          nome: empresa.razao_social || empresa.nome_fantasia || "",
          nome_fantasia: empresa.nome_fantasia || empresa.razao_social || "",
          cnpj: cnpj,
          inscricao_estadual: empresa.inscricao_estadual || "",
          regime_tributario: configFiscal?.regime_tributario_emitente || 3,
          logradouro: filial?.logradouro || filial?.endereco || "",
          numero: filial?.numero || "SN",
          complemento: filial?.complemento || "",
          bairro: filial?.bairro || "CENTRO",
          municipio: filial?.cidade || "",
          cep: (filial?.cep || "").replace(/\D/g, ""),
          uf: filial?.estado || "",
          telefone: (filial?.telefone || empresa.telefone || "").replace(/\D/g, ""),
          email: empresa.email || "",
          habilita_cte: true,
          habilita_mdfe: true,
          habilita_nfe: false,
          habilita_nfce: false,
          enviar_email_destinatario: true,
        };

        // Include certificate if available
        if (certificado?.pfx_base64 && certificado?.senha_encriptada) {
          payload.arquivo_certificado_base64 = certificado.pfx_base64;
          payload.senha_certificado = certificado.senha_encriptada;
        }

        console.log("Registering empresa on FocusNFe:", { cnpj, nome: payload.nome });

        // 6. Call FocusNFe API
        const response = await fetch(`${FOCUS_BASE_URL}/v2/empresas`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("FocusNFe registration failed:", result);
          return new Response(JSON.stringify({ 
            error: "Falha ao cadastrar na FocusNFe",
            details: result 
          }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: response.status 
          });
        }

        // 7. Store the returned token
        const focusToken = result.token || result.token_producao || result.token_homologacao;
        
        if (focusToken) {
          await supabase
            .from("empresas")
            .update({ "token-focus": focusToken })
            .eq("id", empresa_id);
          
          console.log("Token stored for empresa:", empresa_id);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Empresa cadastrada na FocusNFe com sucesso",
          focus_data: result 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "atualizar": {
        if (!empresa_id) throw new Error("empresa_id is required");

        // Fetch current token
        const { data: empresa } = await supabase
          .from("empresas")
          .select("cnpj_matriz, razao_social, nome_fantasia, inscricao_estadual, telefone, email, \"token-focus\"")
          .eq("id", empresa_id)
          .single();

        if (!empresa) throw new Error("Empresa não encontrada");
        if (!empresa["token-focus"]) throw new Error("Empresa não cadastrada na FocusNFe ainda");

        const cnpj = (empresa.cnpj_matriz || "").replace(/\D/g, "");

        // Fetch filial and certificado
        const { data: filial } = await supabase
          .from("filiais")
          .select("logradouro, numero, bairro, complemento, cidade, estado, cep, telefone, endereco")
          .eq("empresa_id", empresa_id)
          .eq("is_matriz", true)
          .single();

        const { data: certificado } = await supabase
          .from("certificados_digitais")
          .select("pfx_base64, senha_encriptada")
          .eq("empresa_id", empresa_id)
          .single();

        const { data: configFiscal } = await supabase
          .from("config_fiscal")
          .select("regime_tributario_emitente")
          .eq("empresa_id", empresa_id)
          .single();

        const updatePayload: Record<string, any> = {
          nome: empresa.razao_social || empresa.nome_fantasia || "",
          nome_fantasia: empresa.nome_fantasia || "",
          inscricao_estadual: empresa.inscricao_estadual || "",
          regime_tributario: configFiscal?.regime_tributario_emitente || 3,
          logradouro: filial?.logradouro || filial?.endereco || "",
          numero: filial?.numero || "SN",
          bairro: filial?.bairro || "",
          municipio: filial?.cidade || "",
          cep: (filial?.cep || "").replace(/\D/g, ""),
          uf: filial?.estado || "",
          telefone: (filial?.telefone || empresa.telefone || "").replace(/\D/g, ""),
          email: empresa.email || "",
        };

        if (certificado?.pfx_base64 && certificado?.senha_encriptada) {
          updatePayload.arquivo_certificado_base64 = certificado.pfx_base64;
          updatePayload.senha_certificado = certificado.senha_encriptada;
        }

        const response = await fetch(`${FOCUS_BASE_URL}/v2/empresas/${cnpj}`, {
          method: "PUT",
          headers: { "Authorization": authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const result = await response.json();

        return new Response(JSON.stringify(result), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.ok ? 200 : response.status 
        });
      }

      case "consultar": {
        if (!empresa_id) throw new Error("empresa_id is required");

        const { data: empresa } = await supabase
          .from("empresas")
          .select("cnpj_matriz")
          .eq("id", empresa_id)
          .single();

        if (!empresa) throw new Error("Empresa não encontrada");
        const cnpj = (empresa.cnpj_matriz || "").replace(/\D/g, "");

        const response = await fetch(`${FOCUS_BASE_URL}/v2/empresas/${cnpj}`, {
          method: "GET",
          headers: { "Authorization": authHeader },
        });

        const result = await response.json();
        return new Response(JSON.stringify(result), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      default:
        throw new Error(`Action '${action}' not supported. Use: cadastrar, atualizar, consultar`);
    }

  } catch (error: any) {
    console.error("focusnfe-empresa error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
