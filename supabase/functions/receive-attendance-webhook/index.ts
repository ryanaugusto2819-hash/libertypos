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

  try {
    const body = await req.json();
    console.log("Webhook de atendimento recebido:", JSON.stringify(body));

    const telefone = body.telefone || body.phone || null;
    const cedula = body.cedula || body.document || null;
    const statusCobranca = body.status_cobranca || null;
    const wppCobranca = body.wpp_cobranca || null;

    if (!statusCobranca && !wppCobranca) {
      return new Response(
        JSON.stringify({ error: "Nenhum campo para atualizar (status_cobranca ou wpp_cobranca)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!telefone && !cedula) {
      return new Response(
        JSON.stringify({ error: "Campo de identificação obrigatório (telefone ou cedula)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (statusCobranca && !VALID_STATUS_COBRANCA.includes(statusCobranca.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error: `Status de cobrança inválido: "${statusCobranca}". Valores válidos: ${VALID_STATUS_COBRANCA.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      return new Response(
        JSON.stringify({ success: false, error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update via Google Sheets sync
    const updatePayload: Record<string, string> = { pedido_id: pedido.id };
    if (statusCobranca) updatePayload.status_cobranca = statusCobranca.toLowerCase();
    if (wppCobranca) updatePayload.wpp_cobranca = wppCobranca;

    // Update status_cobranca
    if (statusCobranca) {
      await supabase.functions.invoke("sync-google-sheets", {
        body: {
          action: "update_status_cobranca",
          pedido: { pedido_id: pedido.id, status_cobranca: statusCobranca.toLowerCase() },
        },
      });
    }

    // Update wpp_cobranca
    if (wppCobranca) {
      await supabase.functions.invoke("sync-google-sheets", {
        body: {
          action: "update_wpp",
          pedido: { pedido_id: pedido.id, wpp_cobranca: wppCobranca },
        },
      });
    }

    console.log(`Atendimento atualizado: ${pedido.nome} (matched_by=${matchedBy}) → status_cobranca=${statusCobranca || "N/A"}, wpp_cobranca=${wppCobranca || "N/A"}`);

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});