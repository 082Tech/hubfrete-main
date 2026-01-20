import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateChatRequest = {
  entregaId: string;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entregaId }: CreateChatRequest = await req.json();
    if (!entregaId) {
      return new Response(JSON.stringify({ error: "entregaId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Fetch entrega + carga + motorista (service role)
    const { data: entrega, error: entregaError } = await supabaseAdmin
      .from("entregas")
      .select("id, carga_id, motorista_id")
      .eq("id", entregaId)
      .single();

    if (entregaError || !entrega) {
      return new Response(JSON.stringify({ error: "Entrega não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: carga, error: cargaError } = await supabaseAdmin
      .from("cargas")
      .select("id, empresa_id")
      .eq("id", entrega.carga_id)
      .single();

    if (cargaError || !carga?.empresa_id) {
      return new Response(
        JSON.stringify({ error: "Não foi possível identificar o embarcador da carga" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: motorista, error: motoristaError } = await supabaseAdmin
      .from("motoristas")
      .select("id, user_id, empresa_id")
      .eq("id", entrega.motorista_id)
      .maybeSingle();

    // 2) Permission check: user must be in one of the involved parties
    const embarcadorEmpresaId = Number(carga.empresa_id);
    const transportadoraEmpresaId = motorista?.empresa_id ? Number(motorista.empresa_id) : null;

    const isMotorista = !!(motorista?.user_id && motorista.user_id === user.id);

    const { data: belongsEmbarcador } = await supabaseAdmin.rpc("user_belongs_to_empresa", {
      _user_id: user.id,
      _empresa_id: embarcadorEmpresaId,
    });

    const belongsTransportadora = transportadoraEmpresaId
      ? (await supabaseAdmin.rpc("user_belongs_to_empresa", {
          _user_id: user.id,
          _empresa_id: transportadoraEmpresaId,
        })).data
      : false;

    if (!isMotorista && !belongsEmbarcador && !belongsTransportadora) {
      return new Response(JSON.stringify({ error: "Sem permissão para criar chat desta entrega" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Idempotent: check existing chat
    const { data: existingChat } = await supabaseAdmin
      .from("chats")
      .select("id")
      .eq("entrega_id", entregaId)
      .maybeSingle();

    let chatId: string | null = existingChat?.id ?? null;

    if (!chatId) {
      const { data: newChat, error: newChatError } = await supabaseAdmin
        .from("chats")
        .insert({ entrega_id: entregaId })
        .select("id")
        .single();

      if (newChatError || !newChat?.id) {
        console.error("Error creating chat:", newChatError);
        return new Response(JSON.stringify({ error: "Erro ao criar chat" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      chatId = newChat.id;
    }

    // 4) Resolve participant user_ids for empresas
    async function getEmpresaUserIds(empresaId: number): Promise<string[]> {
      const { data: filiais } = await supabaseAdmin
        .from("filiais")
        .select("id")
        .eq("empresa_id", empresaId);

      const filialIds = (filiais ?? []).map((f) => f.id);
      if (filialIds.length === 0) return [];

      const { data: usuariosFiliais } = await supabaseAdmin
        .from("usuarios_filiais")
        .select("usuario_id")
        .in("filial_id", filialIds);

      const usuarioIds = (usuariosFiliais ?? [])
        .map((uf) => uf.usuario_id)
        .filter((id): id is number => typeof id === "number");

      if (usuarioIds.length === 0) return [];

      const { data: usuarios } = await supabaseAdmin
        .from("usuarios")
        .select("auth_user_id")
        .in("id", usuarioIds);

      return (usuarios ?? [])
        .map((u) => u.auth_user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
    }

    const embarcadorUserIds = await getEmpresaUserIds(embarcadorEmpresaId);
    const transportadoraUserIds = transportadoraEmpresaId
      ? await getEmpresaUserIds(transportadoraEmpresaId)
      : [];

    // 5) Insert participants idempotently
    const participants: Array<{ user_id: string; tipo_participante: string; empresa_id?: number; motorista_id?: string }> = [];
    const added = new Set<string>();

    for (const uid of embarcadorUserIds) {
      if (added.has(uid)) continue;
      added.add(uid);
      participants.push({ user_id: uid, tipo_participante: "embarcador", empresa_id: embarcadorEmpresaId });
    }

    for (const uid of transportadoraUserIds) {
      if (added.has(uid)) continue;
      added.add(uid);
      participants.push({ user_id: uid, tipo_participante: "transportadora", empresa_id: transportadoraEmpresaId ?? undefined });
    }

    if (motorista?.user_id && !added.has(motorista.user_id)) {
      added.add(motorista.user_id);
      participants.push({ user_id: motorista.user_id, tipo_participante: "motorista", motorista_id: motorista.id });
    }

    // Fetch existing participants to avoid duplicate insert errors
    const { data: existingParticipants } = await supabaseAdmin
      .from("chat_participantes")
      .select("user_id")
      .eq("chat_id", chatId);

    const existingSet = new Set((existingParticipants ?? []).map((p) => p.user_id));

    const toInsert = participants
      .filter((p) => !existingSet.has(p.user_id))
      .map((p) => ({ chat_id: chatId, ...p }));

    if (toInsert.length > 0) {
      const { error: insertParticipantsError } = await supabaseAdmin
        .from("chat_participantes")
        .insert(toInsert);

      if (insertParticipantsError) {
        console.error("Error inserting chat participants:", insertParticipantsError);
      }
    }

    return new Response(JSON.stringify({ chatId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
