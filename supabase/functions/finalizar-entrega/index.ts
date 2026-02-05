import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================================
// EDGE FUNCTION: finalizar-entrega
// Única forma permitida de finalizar uma entrega
// Chama RPC atômica no Postgres
// =====================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FinalizarEntregaRequest {
  entrega_id: string;
  nome_recebedor?: string;
  documento_recebedor?: string;
  observacoes?: string;
}

interface RPCResponse {
  success: boolean;
  entrega_id: string;
  entrega_status: string;
  viagem_id: string | null;
  viagem_finalizada: boolean;
  total_entregas?: number;
  entregas_concluidas?: number;
  mensagem: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =====================================================
    // VALIDAÇÃO: Método HTTP
    // =====================================================
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "METHOD_NOT_ALLOWED",
          message: "Apenas POST é permitido",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // AUTENTICAÇÃO: Validar token JWT
    // =====================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UNAUTHORIZED",
          message: "Token de autenticação não fornecido",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Criar cliente Supabase com token do usuário
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar se usuário está autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // VALIDAÇÃO: Parse do body
    // =====================================================
    let body: FinalizarEntregaRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_JSON",
          message: "Body inválido. Esperado JSON",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // VALIDAÇÃO: entrega_id obrigatório
    // =====================================================
    if (!body.entrega_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MISSING_ENTREGA_ID",
          message: "O campo entrega_id é obrigatório",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.entrega_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_ENTREGA_ID",
          message: "O campo entrega_id deve ser um UUID válido",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // CHAMADA RPC: Executar função atômica no Postgres
    // =====================================================
    console.log(
      `[finalizar-entrega] Iniciando finalização da entrega ${body.entrega_id} por usuário ${user.id}`
    );

    const { data, error: rpcError } = await supabase.rpc(
      "finalizar_entrega_e_verificar_viagem",
      {
        p_entrega_id: body.entrega_id,
        p_nome_recebedor: body.nome_recebedor || null,
        p_documento_recebedor: body.documento_recebedor || null,
        p_observacoes: body.observacoes || null,
      }
    );

    if (rpcError) {
      console.error(`[finalizar-entrega] Erro RPC:`, rpcError);

      // Mapear erros específicos
      const errorMessage = rpcError.message || "";
      let statusCode = 500;
      let errorCode = "RPC_ERROR";

      if (errorMessage.includes("ENTREGA_NAO_ENCONTRADA")) {
        statusCode = 404;
        errorCode = "ENTREGA_NAO_ENCONTRADA";
      } else if (errorMessage.includes("ENTREGA_JA_FINALIZADA")) {
        statusCode = 409;
        errorCode = "ENTREGA_JA_FINALIZADA";
      } else if (errorMessage.includes("ENTREGA_CANCELADA")) {
        statusCode = 409;
        errorCode = "ENTREGA_CANCELADA";
      } else if (errorMessage.includes("VIAGEM_COM_ENTREGAS_PENDENTES")) {
        statusCode = 409;
        errorCode = "VIAGEM_COM_ENTREGAS_PENDENTES";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorCode,
          message: errorMessage,
          details: rpcError,
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = data as RPCResponse;

    console.log(
      `[finalizar-entrega] Sucesso: entrega=${result.entrega_id}, viagem_finalizada=${result.viagem_finalizada}`
    );

    // =====================================================
    // RETORNO: Sucesso
    // =====================================================
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[finalizar-entrega] Erro inesperado:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "INTERNAL_ERROR",
        message: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
