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
    const { nfe_id, chave_acesso } = await req.json();

    if (!nfe_id && !chave_acesso) {
      throw new Error("nfe_id or chave_acesso is required");
    }

    // 1. Get access key if only ID provided
    let chave = chave_acesso;
    if (!chave && nfe_id) {
      const { data: nfe } = await supabase.from("nfes").select("chave_acesso").eq("id", nfe_id).single();
      chave = nfe?.chave_acesso;
    }

    if (!chave) throw new Error("Chave de acesso não encontrada");

    // AMBIENTE DA API: Alterne entre homologacao e api (produção)
    const FOCUS_BASE_URL = "https://homologacao.focusnfe.com.br";
    // const FOCUS_BASE_URL = "https://api.focusnfe.com.br";

    // 2. Call FocusNFe for Manifestação (Ciência da Operação)
    // This also retrieves the official XML from SEFAZ
    const authHeader = "Basic " + btoa(FOCUS_NFE_TOKEN + ":");
    const response = await fetch(`${FOCUS_BASE_URL}/v2/nfes_recebidas/${chave}/manifesto`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tipo_evento: "ciencia_da_operacao" }),
    });

    const result = await response.json();
    
    // 3. Update status in database
    const updateData: any = {
      status_validacao: response.ok ? 'autorizada' : 'rejeitada',
      validado_em: new Date().toISOString(),
    };

    if (!response.ok) {
      updateData.erro_validacao = result.mensagem || JSON.stringify(result);
    } else {
      // If success, FocusNFe will eventually provide the XML
      // For now, we mark as authorized. A webhook should update the XML content later.
      // Or we can try to fetch the XML immediately if available
      const xmlRes = await fetch(`${FOCUS_BASE_URL}/v2/nfes_recebidas/${chave}.xml`, {
        headers: { "Authorization": authHeader }
      });
      
      if (xmlRes.ok) {
        const xmlContent = await xmlRes.text();
        updateData.xml_content = xmlContent;
        
        // Basic parse to extract some fields (simplified for this example)
        // In a real scenario, use a proper XML parser
        const extract = (regex: RegExp) => {
          const match = xmlContent.match(regex);
          return match ? match[1] : null;
        };

        updateData.remetente_cnpj = extract(/<emit>.*?<CNPJ>(.*?)<\/CNPJ>/s);
        updateData.remetente_razao_social = extract(/<emit>.*?<xNome>(.*?)<\/xNome>/s);
        updateData.destinatario_cnpj = extract(/<dest>.*?<CNPJ>(.*?)<\/CNPJ>/s);
        updateData.destinatario_razao_social = extract(/<dest>.*?<xNome>(.*?)<\/xNome>/s);
        updateData.valor_total = extract(/<vNF>(.*?)<\/vNF>/);
        updateData.data_emissao = extract(/<dhEmi>(.*?)<\/dhEmi>/);
      }
    }

    if (nfe_id) {
      await supabase.from("nfes").update(updateData).eq("id", nfe_id);
    }

    return new Response(JSON.stringify({ success: response.ok, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
