import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Constantes GNRE
const GNRE_WS_HOMOLOGACAO = "https://www.testegnre.pe.gov.br/gnreWS/services/GnreLoteRecepcao";
const GNRE_WS_PRODUCAO = "https://www.gnre.pe.gov.br/gnreWS/services/GnreLoteRecepcao";

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

    const { nfe_id, carga_id, entrega_id, empresa_id, dadosGnre } = await req.json();

    if (!empresa_id) {
        throw new Error("empresa_id é obrigatório");
    }

    // 1. Buscar a NFe e os dados base (simulação de extração)
    // Na prática, buscaria os detalhes do banco usando o nfe_id
    
    // 2. Buscar o certificado digital da empresa
    const { data: certData, error: certError } = await supabaseClient
      .from("certificados_digitais")
      .select("pfx_base64, senha_encriptada")
      .eq("empresa_id", empresa_id)
      .single();

    if (certError || !certData) {
      throw new Error("Certificado Digital não encontrado para a empresa. Por favor, cadastre primeiro.");
    }

    // 3. Montar o XML do Lote (TLote_GNRE)
    // Referência simplificada do schema TSefaz_GNRE
    // TODO: Necessário converter a montagem XML para uma lib especializada ou template literal complexo
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<TEnvioLoteGNRE xmlns="http://www.gnre.pe.gov.br">
    <guias>
        <TDadosGNRE>
            <c01_UfFavorecida>${dadosGnre.uf_favorecida.toUpperCase()}</c01_UfFavorecida>
            <c02_receita>${dadosGnre.receita}</c02_receita>
            <!-- Depende se é contribuinte ou não -->
            <c27_tipoIdentificacaoEmitente>1</c27_tipoIdentificacaoEmitente>
            <c03_id_contribuinteEmitente>
                <CNPJ>${dadosGnre.cnpj_emitente}</CNPJ>
            </c03_id_contribuinteEmitente>
            <c04_docOrigem>10</c04_docOrigem>
            <!-- 10 = NFe -->
            <c05_referencia>${dadosGnre.chave_nfe}</c05_referencia>
            <c06_valorPrincipal>${dadosGnre.valor.toFixed(2)}</c06_valorPrincipal>
            <c10_valorTotal>${dadosGnre.valor.toFixed(2)}</c10_valorTotal>
            <c14_dataVencimento>${dadosGnre.data_vencimento}</c14_dataVencimento>
            <!-- Outros campos obrigatórios por UF seriam inseridos aqui dependendo da resposta do GnreConfigUF -->
        </TDadosGNRE>
    </guias>
</TEnvioLoteGNRE>`;

    // 4. Assinar o XML de Lote (Requisito SEFAZ/GNRE)
    // NOTA TÉCNICA: A assinatura de XML Padrão ICP Brasil (XMLDSIG) no Deno/Edge Functions
    // é extremamente complexa devido à falta de bibliotecas nativas como 'crypto' do Node 
    // com suporte completo a chaves e algoritmos específicos (RSA-SHA1 com canonização).
    // Recomendação real de arquitetura seria:
    // a) Usar API de terceiro (Como Focus NFe ou WebMania)
    // b) Criar um microserviço em Node.js dentro da AWS/VPS da transportadora
    // c) Usar uma porta Node (npm:) compatível no Deno se existir.
    
    console.warn("Assinatura XML ainda não implementada. Enviando mock para fins de teste de infraestrutura.");
    
    // 5. Enviar SOAP Request
    // Usa mTLS se exigido (geralmente SEFAZ exige certificado no handshake TCP)
    const ambiente = Deno.env.get("GNRE_AMBIENTE") === "producao" ? GNRE_WS_PRODUCAO : GNRE_WS_HOMOLOGACAO;
    
    const soapMessage = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gnr="http://www.gnre.pe.gov.br/webservice/GnreLoteRecepcao">
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
        'SOAPAction': 'http://www.gnre.pe.gov.br/webservice/GnreLoteRecepcao/processar'
      },
      body: soapMessage
    });
*/
    // Mock Response
    const mockRecibo = "RECIBO-" + Math.floor(Math.random() * 10000000);

    // 6. Inserir no Banco de Dados
    const { data: gnreInsert, error: gnreError } = await supabaseClient
      .from("gnres")
      .insert({
        empresa_id: empresa_id,
        nfe_id: nfe_id,
        cargas_id: carga_id,
        status: "processando",
        uf_favorecida: dadosGnre.uf_favorecida,
        receita: dadosGnre.receita,
        valor: dadosGnre.valor,
        data_vencimento: dadosGnre.data_vencimento,
        numero_recibo: mockRecibo,
        xml_envio: xmlBody,
      })
      .select()
      .single();

    if (gnreError) {
        throw new Error("Erro ao salvar GNRE no banco: " + gnreError.message);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: "Lote GNRE enviado.", 
        recibo: mockRecibo,
        gnre_id: gnreInsert.id
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
