import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map LogZZ statuses to our internal status_envio values
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

// Strip non-alphanumeric chars for document/phone matching
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
    const recipientName = body.recipient_name || null;
    const shippingDate = body.shipping_date || null;

    if (!rawStatus) {
      return new Response(
        JSON.stringify({ error: "Campo 'status' não encontrado no payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipientDocument && !recipientPhone && !trackingCode) {
      return new Response(
        JSON.stringify({ error: "Nenhum identificador encontrado (recipient_document, recipient_phone ou tracking_code)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedStatus = normalizeStatus(rawStatus);
    if (!mappedStatus) {
      console.warn(`Status desconhecido recebido: '${rawStatus}'`);
      return new Response(
        JSON.stringify({
          error: `Status desconhecido: '${rawStatus}'`,
          known_statuses: Object.keys(statusMap),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all pedidos and match by normalized cedula, then phone, then tracking
    const { data: allPedidos, error: selectError } = await supabase
      .from("pedidos")
      .select("id, nome, cedula, telefone, status_envio, codigo_rastreamento");

    if (selectError) {
      console.error("Erro ao buscar pedidos:", selectError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedidos", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pedido = null;

    // 1. Match by document (cedula)
    if (!pedido && recipientDocument) {
      const normalizedDoc = normalizeDoc(recipientDocument);
      pedido = (allPedidos || []).find(
        (p: any) => normalizeDoc(p.cedula) === normalizedDoc
      ) || null;
    }

    // 2. Match by phone
    if (!pedido && recipientPhone) {
      const normalizedPhone = normalizeDoc(recipientPhone);
      pedido = (allPedidos || []).find(
        (p: any) => normalizeDoc(p.telefone) === normalizedPhone
      ) || null;
    }

    // 3. Match by tracking code
    if (!pedido && trackingCode) {
      pedido = (allPedidos || []).find(
        (p: any) => p.codigo_rastreamento === trackingCode
      ) || null;
    }

    if (!pedido) {
      console.warn(`Pedido não encontrado - doc: ${recipientDocument}, phone: ${recipientPhone}, tracking: ${trackingCode}`);
      return new Response(
        JSON.stringify({
          error: "Pedido não encontrado",
          recipient_document: recipientDocument,
          recipient_phone: recipientPhone,
          tracking_code: trackingCode,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update
    const updateData: Record<string, any> = {
      status_envio: mappedStatus,
    };

    // Save tracking code if provided and missing
    if (trackingCode && (!pedido.codigo_rastreamento || pedido.codigo_rastreamento === "")) {
      updateData.codigo_rastreamento = trackingCode;
    }

    // Set shipping date
    if (mappedStatus === "enviado" && shippingDate) {
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
        matched_by: recipientDocument ? "cedula" : recipientPhone ? "telefone" : "tracking_code",
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
