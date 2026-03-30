import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_STATUS_COBRANCA = [
  "pendente",
  "pedido pre enviado",
  "pedido enviado",
  "pedido entregue",
];

function normalizeDoc(val: string): string {
  return (val || "").replace(/[^a-zA-Z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    console.log("Webhook de atendimento recebido:", JSON.stringify(body));

    const telefone = body.telefone || body.phone || null;
    const cedula = body.cedula || body.document || null;
    const statusCobranca = body.status_cobranca || null;
    const wppCobranca = body.wpp_cobranca || null;

    if (!statusCobranca && !wppCobranca) {
      await logWebhook(supabase, { body, success: false, error_message: "Nenhum campo para atualizar", status_recebido: statusCobranca || "N/A" });
      return new Response(
        JSON.stringify({ error: "Nenhum campo para atualizar (status_cobranca ou wpp_cobranca)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!telefone && !cedula) {
      await logWebhook(supabase, { body, success: false, error_message: "Identificação ausente", status_recebido: statusCobranca || "N/A" });
      return new Response(
        JSON.stringify({ error: "Campo de identificação obrigatório (telefone ou cedula)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (statusCobranca && !VALID_STATUS_COBRANCA.includes(statusCobranca.toLowerCase())) {
      await logWebhook(supabase, { body, success: false, error_message: `Status inválido: ${statusCobranca}`, status_recebido: statusCobranca });
      return new Response(
        JSON.stringify({
          error: `Status de cobrança inválido: "${statusCobranca}". Valores válidos: ${VALID_STATUS_COBRANCA.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find matching order by cedula or telefone (BR only)
    const { data: allPedidos } = await supabase
      .from("pedidos")
      .select("id, nome, cedula, telefone, pais, user_id")
      .eq("pais", "BR");

    let pedido = null;
    let matchedBy = "";

    if (cedula) {
      const nd = normalizeDoc(cedula);
      pedido = (allPedidos || []).find((p: any) => normalizeDoc(p.cedula) === nd) || null;
      if (pedido) matchedBy = "cedula";
    }

    if (!pedido && telefone) {
      const np = normalizeDoc(telefone);
      pedido = (allPedidos || []).find((p: any) => normalizeDoc(p.telefone) === np) || null;
      if (pedido) matchedBy = "telefone";
    }

    if (!pedido) {
      console.log(`Pedido não encontrado para telefone=${telefone}, cedula=${cedula}`);
      await logWebhook(supabase, { body, success: false, error_message: "Pedido não encontrado", status_recebido: statusCobranca || "N/A" });
      return new Response(
        JSON.stringify({ success: false, error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    async function callSyncSheets(action: string, pedidoPayload: Record<string, unknown>) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
          },
          body: JSON.stringify({ action, pedido: pedidoPayload }),
        });
        const text = await res.text();
        console.log(`Sync (${action}) [${res.status}]:`, text.substring(0, 300));
      } catch (e) {
        console.error(`Sync (${action}) fetch error:`, e.message);
      }
    }

    // Update status_cobranca in DB + Sheets
    if (statusCobranca) {
      const { error: dbErr } = await supabase
        .from("pedidos")
        .update({ status_cobranca: statusCobranca.toLowerCase() })
        .eq("id", pedido.id);
      if (dbErr) console.error("DB update status_cobranca error:", dbErr.message);

      await callSyncSheets("update_status_cobranca", { pedido_id: pedido.id, status_cobranca: statusCobranca.toLowerCase() });
    }

    // Update wpp_cobranca in DB + Sheets
    if (wppCobranca) {
      const { error: dbErr } = await supabase
        .from("pedidos")
        .update({ wpp_cobranca: wppCobranca })
        .eq("id", pedido.id);
      if (dbErr) console.error("DB update wpp_cobranca error:", dbErr.message);

      await callSyncSheets("update_wpp", { pedido_id: pedido.id, wpp_cobranca: wppCobranca });
    }

    console.log(`Atendimento atualizado: ${pedido.nome} (matched_by=${matchedBy}) → status_cobranca=${statusCobranca || "N/A"}, wpp_cobranca=${wppCobranca || "N/A"}`);

    await logWebhook(supabase, {
      body,
      success: true,
      pedido_id: pedido.id,
      pedido_nome: pedido.nome,
      user_id: pedido.user_id,
      matched_by: matchedBy,
      status_recebido: statusCobranca || wppCobranca || "N/A",
      status_mapeado: statusCobranca?.toLowerCase() || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id: pedido.id,
        nome: pedido.nome,
        matched_by: matchedBy,
        status_cobranca: statusCobranca?.toLowerCase() || null,
        wpp_cobranca: wppCobranca || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no webhook de atendimento:", error.message);
    await logWebhook(supabase, { body: {}, success: false, error_message: error.message, status_recebido: "erro" });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logWebhook(supabase: any, data: {
  body: any;
  success: boolean;
  error_message?: string;
  pedido_id?: string;
  pedido_nome?: string;
  user_id?: string;
  matched_by?: string;
  status_recebido: string;
  status_mapeado?: string | null;
}) {
  try {
    await supabase.from("webhook_logs").insert({
      webhook_type: "atendimento",
      payload: data.body,
      success: data.success,
      error_message: data.error_message || null,
      pedido_id: data.pedido_id || null,
      pedido_nome: data.pedido_nome || null,
      user_id: data.user_id || null,
      matched_by: data.matched_by || null,
      status_recebido: data.status_recebido,
      status_mapeado: data.status_mapeado || null,
    });
  } catch (e) {
    console.error("Erro ao salvar log:", e.message);
  }
}
