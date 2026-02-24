import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Constantes GNRE
const GNRE_WS_HOMOLOGACAO = "https://www.testegnre.pe.gov.br/gnreWS/services/GnreResultadoLote";
const GNRE_WS_PRODUCAO = "https://www.gnre.pe.gov.br/gnreWS/services/GnreResultadoLote";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { gnre_id, empresa_id } = await req.json();

    if (!gnre_id || !empresa_id) {
        throw new Error("gnre_id e empresa_id são obrigatórios");
    }

    // 1. Buscar a GNRE no banco de dados para pegar o número do recibo
    const { data: gnreData, error: gnreError } = await supabaseClient
      .from("gnres")
      .select("numero_recibo, status")
      .eq("id", gnre_id)
      .eq("empresa_id", empresa_id)
      .single();

    if (gnreError || !gnreData) {
      throw new Error("GNRE não encontrada ou acesso negado.");
    }

    if (gnreData.status !== "processando") {
      return new Response(JSON.stringify({ 
        message: `GNRE já está com status: ${gnreData.status}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const numeroRecibo = gnreData.numero_recibo;

    // 2. Buscar o certificado digital da empresa
    const { data: certData, error: certError } = await supabaseClient
      .from("certificados_digitais")
      .select("pfx_base64")
      .eq("empresa_id", empresa_id)
      .single();

    if (certError || !certData) {
      throw new Error("Certificado Digital não encontrado para a empresa.");
    }

    // 3. Montar o XML de Consulta
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<TConsultaResultadoLoteGNRE xmlns="http://www.gnre.pe.gov.br">
    <ambiente>2</ambiente> <!-- 1 Produção, 2 Homologação -->
    <numeroRecibo>${numeroRecibo}</numeroRecibo>
</TConsultaResultadoLoteGNRE>`;

    // NOTA: Consulta também exige assinatura com certificado ICP-Brasil em requisição SOAP.
    
    // 4. Enviar SOAP Request
    const ambiente = Deno.env.get("GNRE_AMBIENTE") === "producao" ? GNRE_WS_PRODUCAO : GNRE_WS_HOMOLOGACAO;
    
    const soapMessage = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gnr="http://www.gnre.pe.gov.br/webservice/GnreResultadoLote">
   <soapenv:Header>
      <gnr:gnreCabecMsg>
         <gnr:versaoDados>2.00</gnr:versaoDados>
      </gnr:gnreCabecMsg>
   </soapenv:Header>
   <soapenv:Body>
      <gnr:gnreDadosMsg>
         ${xmlBody}
      </gnr:gnreDadosMsg>
   </soapenv:Body>
</soapenv:Envelope>`;

/*
    const response = await fetch(ambiente, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'SOAPAction': 'http://www.gnre.pe.gov.br/webservice/GnreResultadoLote/consultar'
      },
      body: soapMessage
    });
    const responseText = await response.text();
*/

    // MOCK RESPONSE
    // Simulando que a Sefaz processou e autorizou a guia com código de barras
    const isSuccess = Math.random() > 0.2; // 80% de chance de sucesso
    
    let updateData = {};
    if (isSuccess) {
        updateData = {
            status: "autorizada",
            codigo_barras: "858000000010 12345678901 12345678901 12345678901",
            linha_digitavel: "85800000001 0 12345678901 1 12345678901 1 12345678901 1",
            motivo_rejeicao: null
        };
    } else {
        updateData = {
            status: "rejeitada",
            motivo_rejeicao: "Erro de validação Sefaz (Simulado)"
        };
    }

    // 5. Atualizar no Banco de Dados
    const { error: updateError } = await supabaseClient
      .from("gnres")
      .update(updateData)
      .eq("id", gnre_id);

    if (updateError) {
        throw new Error("Erro ao atualizar GNRE no banco: " + updateError.message);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Consulta realizada.", 
        novo_status: updateData.status,
        detalhes: updateData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
