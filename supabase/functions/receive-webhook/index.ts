import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const statusMap: Record<string, string> = {
  "a enviar": "não enviado",
  "saldo insuficiente": "não enviado",
  "em separação": "não enviado",
  "enviado": "enviado",
  "entregue": "retirado",
  "em devolução": "a retirar",
  "devolvido": "não enviado",
  "estoque insuficiente": "não enviado",
  "sem unidades disponíveis": "não enviado",
  "erro no leilão": "não enviado",
};

function normalizeStatus(raw: string): string | null {
  const lower = (raw || "").trim().toLowerCase();
  return statusMap[lower] ?? null;
}

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

  try {
    const body = await req.json();
    console.log("Webhook LogZZ recebido:", JSON.stringify(body));

    const rawStatus = body.status || null;
    const trackingCode = body.tracking_code || null;
    const recipientDocument = body.recipient_document || null;
    const recipientPhone = body.recipient_phone || null;
    const shippingDate = body.shipping_date || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Helper to log webhook
    async function logWebhook(opts: {
      user_id?: string;
      pedido_id?: string;
      pedido_nome?: string;
      status_recebido: string;
      status_mapeado?: string;
      matched_by?: string;
      success: boolean;
      error_message?: string;
    }) {
      await supabase.from("webhook_logs").insert({
        user_id: opts.user_id || null,
        pedido_id: opts.pedido_id || null,
        pedido_nome: opts.pedido_nome || null,
        status_recebido: opts.status_recebido,
        status_mapeado: opts.status_mapeado || null,
        matched_by: opts.matched_by || null,
        payload: body,
        success: opts.success,
        error_message: opts.error_message || null,
      });
    }

    if (!rawStatus) {
      await logWebhook({ status_recebido: "N/A", success: false, error_message: "Campo 'status' não encontrado" });
      return new Response(
        JSON.stringify({ error: "Campo 'status' não encontrado no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipientDocument && !recipientPhone && !trackingCode) {
      await logWebhook({ status_recebido: rawStatus, success: false, error_message: "Nenhum identificador encontrado" });
      return new Response(
        JSON.stringify({ error: "Nenhum identificador encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedStatus = normalizeStatus(rawStatus);
    if (!mappedStatus) {
      await logWebhook({ status_recebido: rawStatus, success: false, error_message: `Status desconhecido: '${rawStatus}'` });
      return new Response(
        JSON.stringify({ error: `Status desconhecido: '${rawStatus}'`, known_statuses: Object.keys(statusMap) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: allPedidos, error: selectError } = await supabase
      .from("pedidos")
      .select("id, nome, cedula, telefone, status_envio, codigo_rastreamento, user_id");

    if (selectError) {
      await logWebhook({ status_recebido: rawStatus, success: false, error_message: selectError.message });
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedidos", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pedido = null;
    let matchedBy = "";

    if (recipientDocument) {
      const nd = normalizeDoc(recipientDocument);
      pedido = (allPedidos || []).find((p: any) => normalizeDoc(p.cedula) === nd) || null;
      if (pedido) matchedBy = "cedula";
    }

    if (!pedido && recipientPhone) {
      const np = normalizeDoc(recipientPhone);
      pedido = (allPedidos || []).find((p: any) => normalizeDoc(p.telefone) === np) || null;
      if (pedido) matchedBy = "telefone";
    }

    if (!pedido && trackingCode) {
      pedido = (allPedidos || []).find((p: any) => p.codigo_rastreamento === trackingCode) || null;
      if (pedido) matchedBy = "tracking_code";
    }

    if (!pedido) {
      await logWebhook({ status_recebido: rawStatus, status_mapeado: mappedStatus, success: false, error_message: "Pedido não encontrado" });
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado", recipient_document: recipientDocument, recipient_phone: recipientPhone, tracking_code: trackingCode }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, any> = { status_envio: mappedStatus };

    if (trackingCode && (!pedido.codigo_rastreamento || pedido.codigo_rastreamento === "")) {
      updateData.codigo_rastreamento = trackingCode;
    }

    if (mappedStatus === "enviado" && shippingDate) {
      const parts = shippingDate.split("/");
      if (parts.length === 3) updateData.data_envio = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (mappedStatus === "enviado") {
      updateData.data_envio = new Date().toISOString().split("T")[0];
    }

    const { error: updateError } = await supabase.from("pedidos").update(updateData).eq("id", pedido.id);

    if (updateError) {
      await logWebhook({ user_id: pedido.user_id, pedido_id: pedido.id, pedido_nome: pedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus, matched_by: matchedBy, success: false, error_message: updateError.message });
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar pedido", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logWebhook({ user_id: pedido.user_id, pedido_id: pedido.id, pedido_nome: pedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus, matched_by: matchedBy, success: true });

    console.log(`Pedido ${pedido.id} (${pedido.nome}) atualizado: ${pedido.status_envio} → ${mappedStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id: pedido.id,
        nome: pedido.nome,
        status_anterior: pedido.status_envio,
        status_novo: mappedStatus,
        matched_by: matchedBy,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
