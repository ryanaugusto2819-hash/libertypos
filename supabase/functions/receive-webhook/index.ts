import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map LogZZ statuses to our internal status_envio values
const statusMap: Record<string, string> = {
  "pendente": "não enviado",
  "em separação": "não enviado",
  "despachado": "enviado",
  "enviado": "enviado",
  "em transito": "enviado",
  "em trânsito": "enviado",
  "saiu para entrega": "a retirar",
  "a caminho": "a retirar",
  "entregue": "retirado",
  "devolvido": "não enviado",
  "cancelado": "não enviado",
  "extraviado": "não enviado",
};

function normalizeStatus(raw: string): string | null {
  const lower = (raw || "").trim().toLowerCase();
  return statusMap[lower] ?? null;
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

    // LogZZ payload fields
    const externalId = body.external_id || null;
    const rawStatus = body.status || null;
    const trackingCode = body.tracking_code || null;
    const logzzCode = body.code || null;
    const shippingDate = body.shipping_date || null;
    const deliveryDate = body.delivery_date || null;

    if (!rawStatus) {
      return new Response(
        JSON.stringify({ error: "Campo 'status' não encontrado no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!externalId && !trackingCode) {
      return new Response(
        JSON.stringify({ error: "Nenhum identificador encontrado (external_id ou tracking_code)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedStatus = normalizeStatus(rawStatus);
    if (!mappedStatus) {
      console.warn(`Status desconhecido recebido: '${rawStatus}'`);
      return new Response(
        JSON.stringify({ 
          error: `Status desconhecido: '${rawStatus}'`, 
          known_statuses: Object.keys(statusMap) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to find by external_id first (our pedido ID), then by tracking_code
    let pedido = null;

    if (externalId) {
      const { data } = await supabase
        .from("pedidos")
        .select("id, nome, status_envio, codigo_rastreamento")
        .eq("id", externalId)
        .limit(1);
      if (data && data.length > 0) pedido = data[0];
    }

    if (!pedido && trackingCode) {
      const { data } = await supabase
        .from("pedidos")
        .select("id, nome, status_envio, codigo_rastreamento")
        .eq("codigo_rastreamento", trackingCode)
        .limit(1);
      if (data && data.length > 0) pedido = data[0];
    }

    if (!pedido) {
      console.warn(`Pedido não encontrado - external_id: ${externalId}, tracking: ${trackingCode}`);
      return new Response(
        JSON.stringify({ 
          error: "Pedido não encontrado", 
          external_id: externalId, 
          tracking_code: trackingCode 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update
    const updateData: Record<string, any> = {
      status_envio: mappedStatus,
    };

    // Save tracking code if we received one and don't have it yet
    if (trackingCode && (!pedido.codigo_rastreamento || pedido.codigo_rastreamento === "")) {
      updateData.codigo_rastreamento = trackingCode;
    }

    // Set shipping date if status is "enviado" and we have it
    if (mappedStatus === "enviado" && shippingDate) {
      // LogZZ sends dates as "DD/MM/YYYY", convert to "YYYY-MM-DD"
      const parts = shippingDate.split("/");
      if (parts.length === 3) {
        updateData.data_envio = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } else if (mappedStatus === "enviado") {
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
        tracking_code: trackingCode,
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
