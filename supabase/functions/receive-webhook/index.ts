import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map logistics platform statuses to our internal status_envio values
const statusMap: Record<string, string> = {
  // Portuguese variations
  "ENVIADO": "enviado",
  "ENTREGUE": "retirado",
  "EM TRANSITO": "enviado",
  "EM TRÂNSITO": "enviado",
  "SAIU PARA ENTREGA": "a retirar",
  "A CAMINHO": "a retirar",
  "DEVOLVIDO": "não enviado",
  "CANCELADO": "não enviado",
  // English variations
  "SHIPPED": "enviado",
  "DELIVERED": "retirado",
  "IN_TRANSIT": "enviado",
  "OUT_FOR_DELIVERY": "a retirar",
  "RETURNED": "não enviado",
};

function normalizeStatus(raw: string): string | null {
  const upper = (raw || "").trim().toUpperCase();
  return statusMap[upper] || null;
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
    console.log("Webhook recebido:", JSON.stringify(body));

    // Try to extract order identifier and status from various payload formats
    const orderId = body.order_id || body.id || body.pedido_id || body.external_id || null;
    const trackingCode = body.tracking_code || body.codigo_rastreamento || body.rastreio || null;
    const rawStatus = body.status || body.order_status || body.status_envio || null;
    const newTrackingCode = body.tracking_code || body.codigo_rastreamento || body.rastreio || null;

    if (!rawStatus) {
      return new Response(
        JSON.stringify({ error: "Campo 'status' não encontrado no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orderId && !trackingCode) {
      return new Response(
        JSON.stringify({ error: "Nenhum identificador de pedido encontrado (order_id, id, tracking_code)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedStatus = normalizeStatus(rawStatus);
    if (!mappedStatus) {
      return new Response(
        JSON.stringify({ error: `Status desconhecido: '${rawStatus}'`, known_statuses: Object.keys(statusMap) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build query to find the order
    let query = supabase.from("pedidos").select("id, nome, status_envio").limit(1);

    if (orderId) {
      query = query.eq("id", orderId);
    } else if (trackingCode) {
      query = query.eq("codigo_rastreamento", trackingCode);
    }

    const { data: pedidos, error: selectError } = await query;

    if (selectError) {
      console.error("Erro ao buscar pedido:", selectError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedido", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pedidos || pedidos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado", order_id: orderId, tracking_code: trackingCode }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pedido = pedidos[0];

    // Build update object
    const updateData: Record<string, string> = {
      status_envio: mappedStatus,
    };

    // If logistics sent a tracking code and we don't have one yet, save it
    if (newTrackingCode && pedido.codigo_rastreamento !== newTrackingCode) {
      updateData.codigo_rastreamento = newTrackingCode;
    }

    // If status is "enviado", set data_envio to today
    if (mappedStatus === "enviado") {
      updateData.data_envio = new Date().toISOString().split("T")[0];
    }

    const { error: updateError } = await supabase
      .from("pedidos")
      .update(updateData)
      .eq("id", pedido.id);

    if (updateError) {
      console.error("Erro ao atualizar pedido:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar pedido", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Pedido ${pedido.id} (${pedido.nome}) atualizado: ${pedido.status_envio} → ${mappedStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id: pedido.id,
        nome: pedido.nome,
        status_anterior: pedido.status_envio,
        status_novo: mappedStatus,
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
