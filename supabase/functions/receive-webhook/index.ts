import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const statusMap: Record<string, string> = {
  "a enviar": "a enviar",
  "saldo de expedição insuficiente": "saldo de expedição insuficiente",
  "saldo insuficiente": "saldo de expedição insuficiente",
  "em separação": "em separação",
  "enviado": "enviado",
  "entregue": "entregue",
  "em devolução": "em devolução",
  "devolvido": "devolvido",
  "sem estoque": "sem estoque",
  "estoque insuficiente": "sem estoque",
  "sem unidades disponíveis": "sem estoque",
  "erro no leilão": "sem estoque",
  "pendente": "a enviar",
};

const ATTENDANCE_TRIGGER_STATUSES = ["a enviar", "enviado", "entregue"];

function normalizeStatus(raw: string): string | null {
  const lower = (raw || "").trim().toLowerCase();
  return statusMap[lower] ?? null;
}

function shouldTriggerAttendanceWebhook(status: string | null | undefined): boolean {
  return !!status && ATTENDANCE_TRIGGER_STATUSES.includes(status.trim().toLowerCase());
}

function isCountryBR(pedidoData: Record<string, any>): boolean {
  return (pedidoData.pais || "").toUpperCase() === "BR";
}

function normalizeDoc(val: string): string {
  return (val || "").replace(/[^a-zA-Z0-9]/g, "");
}

// Convert "DD/MM/YYYY" or "DD/MM/YYYY HH:MM:SS" to "YYYY-MM-DD"
function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const datePart = raw.split(" ")[0];
  const parts = datePart.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return null;
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
    const deliveryDate = body.delivery_date || null;
    const freightCost = body.freight_cost != null ? Number(body.freight_cost) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    async function syncGoogleSheets(
      action: "create" | "update_status",
      pedidoPayload: Record<string, unknown>
    ): Promise<string | null> {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            "apikey": serviceRoleKey,
          },
          body: JSON.stringify({ action, pedido: pedidoPayload }),
        });

        const responseText = await syncResponse.text();
        console.log(`Sync Google Sheets (${action}) response [${syncResponse.status}]:`, responseText.substring(0, 500));

        if (!syncResponse.ok) {
          return `Sync HTTP ${syncResponse.status}: ${responseText.substring(0, 200)}`;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          return `Sync response não é JSON: ${responseText.substring(0, 200)}`;
        }

        if (data && data.success === false) {
          return data.error || data.message || "Falha ao sincronizar com Google Sheets";
        }

        return null;
      } catch (fetchError) {
        console.error("Erro ao chamar sync-google-sheets:", fetchError);
        return `Fetch error: ${fetchError.message}`;
      }
    }

    function buildSheetsPayload(pedidoData: Record<string, any>, overrides: Record<string, any> = {}) {
      return {
        pedido_id: pedidoData.id,
        nome: pedidoData.nome || "",
        telefone: pedidoData.telefone || "",
        cedula: pedidoData.cedula || "",
        produto: pedidoData.produto || "",
        quantidade: Number(pedidoData.quantidade ?? 1),
        valor: Number(pedidoData.valor ?? 0),
        cidade: pedidoData.cidade || "",
        departamento: pedidoData.departamento || "",
        codigo_rastreamento: overrides.codigo_rastreamento ?? pedidoData.codigo_rastreamento ?? "",
        status_pagamento: pedidoData.status_pagamento || "pendente",
        data_criacao: pedidoData.data_entrada || new Date().toISOString().split("T")[0],
        data_envio: overrides.data_envio ?? pedidoData.data_envio ?? "",
        data_pagamento: pedidoData.data_pagamento || null,
        hora_pagamento: pedidoData.hora_pagamento || null,
        comprovante_url: pedidoData.comprovante_url || "",
        etiqueta_envio_url: overrides.etiqueta_envio_url ?? pedidoData.etiqueta_envio_url ?? "",
        vendedor: pedidoData.vendedor || "",
        criativo: pedidoData.criativo || "",
        status_envio: overrides.status_envio ?? pedidoData.status_envio ?? "não enviado",
        pais: pedidoData.pais || "BR",
        afiliado_id: pedidoData.afiliado_id || "",
        wpp_cobranca: pedidoData.wpp_cobranca || "",
        status_cobranca: pedidoData.status_cobranca || "pendente",
        conta_bancaria: pedidoData.conta_bancaria || "",
      };
    }

    async function sendAttendanceWebhook(
      userId: string,
      pedidoData: Record<string, any>,
      newStatus: string | null | undefined
    ) {
      if (!shouldTriggerAttendanceWebhook(newStatus)) return;

      const { data: attendanceConfig, error: attendanceConfigError } = await supabase
        .from("webhook_config")
        .select("attendance_webhook_url, attendance_webhook_active")
        .eq("user_id", userId)
        .maybeSingle();

      if (
        attendanceConfigError ||
        !attendanceConfig ||
        !attendanceConfig.attendance_webhook_active ||
        !attendanceConfig.attendance_webhook_url?.trim()
      ) {
        console.log(`Webhook de atendimento não configurado para user_id=${userId}`);
        return;
      }

      const payload = {
        id: pedidoData.id || "",
        nome: pedidoData.nome || "",
        telefone: pedidoData.telefone || "",
        produto: (pedidoData.produto || "").replace(/\s*\[.*?\]\s*$/, ""),
        status_envio: newStatus,
        codigo_rastreamento: pedidoData.codigo_rastreamento || "",
        valor: Number(pedidoData.valor || 0),
        cidade: pedidoData.cidade || "",
        departamento: pedidoData.departamento || "",
        pais: pedidoData.pais || "",
        cedula: pedidoData.cedula || "",
        email: pedidoData.email || "",
      };

      try {
        const attendanceResponse = await fetch(attendanceConfig.attendance_webhook_url.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log(
          `Webhook de atendimento enviado para ${payload.nome}: status=${newStatus}, response=${attendanceResponse.status}`
        );
      } catch (attendanceError) {
        console.error("Falha ao enviar webhook de atendimento:", attendanceError);
      }
    }

    if (!rawStatus) {
      await logWebhook({ status_recebido: "N/A", success: false, error_message: "Campo 'status' não encontrado" });
      return new Response(
        JSON.stringify({ error: "Campo 'status' não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedStatus = normalizeStatus(rawStatus);

    // Try to find existing pedido
    const { data: allPedidos } = await supabase
      .from("pedidos")
      .select("id, nome, cedula, telefone, email, produto, quantidade, valor, cidade, departamento, status_pagamento, status_envio, data_entrada, data_envio, data_pagamento, hora_pagamento, comprovante_url, etiqueta_envio_url, codigo_rastreamento, pais, user_id");

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

    // ========== PEDIDO EXISTS → UPDATE ==========
    if (pedido) {
      const updateData: Record<string, any> = {};

      if (mappedStatus) updateData.status_envio = mappedStatus;
      if (trackingCode) updateData.codigo_rastreamento = trackingCode;

      if (mappedStatus === "enviado" && shippingDate) {
        const parsed = parseDate(shippingDate);
        if (parsed) updateData.data_envio = parsed;
      } else if (mappedStatus === "enviado") {
        updateData.data_envio = new Date().toISOString().split("T")[0];
      }

      if (body.files?.label?.a4) {
        updateData.etiqueta_envio_url = body.files.label.a4;
      }

      const { error: updateError } = await supabase.from("pedidos").update(updateData).eq("id", pedido.id);

      if (updateError) {
        await logWebhook({ user_id: pedido.user_id, pedido_id: pedido.id, pedido_nome: pedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, matched_by: matchedBy, success: false, error_message: updateError.message });
        return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const syncError = await syncGoogleSheets(
        "update_status",
        buildSheetsPayload(pedido, {
          status_envio: updateData.status_envio,
          codigo_rastreamento: updateData.codigo_rastreamento,
          data_envio: updateData.data_envio,
          etiqueta_envio_url: updateData.etiqueta_envio_url,
        })
      );

      if (syncError) {
        const fullError = `Pedido atualizado no banco, mas falhou ao sincronizar na planilha: ${syncError}`;
        await logWebhook({ user_id: pedido.user_id, pedido_id: pedido.id, pedido_nome: pedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, matched_by: matchedBy, success: false, error_message: fullError });
        return new Response(JSON.stringify({ error: fullError }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (isCountryBR(pedido)) {
        await sendAttendanceWebhook(
          pedido.user_id,
          { ...pedido, ...updateData },
          (updateData.status_envio as string | undefined) ?? pedido.status_envio
        );
      }

      await logWebhook({ user_id: pedido.user_id, pedido_id: pedido.id, pedido_nome: pedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, matched_by: matchedBy, success: true });

      console.log(`ATUALIZADO: ${pedido.nome} → ${mappedStatus}`);
      return new Response(JSON.stringify({ success: true, action: "updated", pedido_id: pedido.id, nome: pedido.nome, status_novo: mappedStatus, matched_by: matchedBy }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== PEDIDO NOT FOUND → CREATE NEW ==========

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    const adminUserId = adminRole?.[0]?.user_id;
    if (!adminUserId) {
      await logWebhook({ status_recebido: rawStatus, success: false, error_message: "Admin não encontrado para criar pedido" });
      return new Response(JSON.stringify({ error: "Admin não encontrado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newPedido = {
      user_id: adminUserId,
      nome: body.recipient_name || "",
      telefone: body.recipient_phone || "",
      cedula: body.recipient_document || "",
      produto: body.product || "",
      quantidade: body.quantity || 1,
      valor: body.cost || 0,
      cidade: body.recipient_city || "",
      departamento: body.recipient_state || "",
      cep: body.recipient_zip_code || "",
      rua: body.recipient_street || "",
      numero: body.recipient_number || "",
      complemento: body.recipient_complement || "",
      bairro: body.recipient_neighborhood || "",
      email: body.recipient_email || "",
      codigo_rastreamento: trackingCode || "",
      status_pagamento: "pendente",
      status_envio: mappedStatus || "a enviar",
      data_entrada: parseDate(body.creation_date) || new Date().toISOString().split("T")[0],
      data_envio: parseDate(shippingDate) || null,
      pais: "BR",
      observacoes: `LogZZ: ${body.code || ""} | ${body.carrier || ""} | ${body.freight_modality || ""}`,
      etiqueta_envio_url: body.files?.label?.a4 || null,
      wpp_cobranca: "",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("pedidos")
      .insert(newPedido)
      .select("id")
      .single();

    if (insertError) {
      await logWebhook({ user_id: adminUserId, pedido_nome: newPedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, success: false, error_message: insertError.message });
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const syncError = await syncGoogleSheets(
      "create",
      buildSheetsPayload({ id: inserted.id, ...newPedido })
    );

    if (syncError) {
      const fullError = `Pedido criado no banco, mas falhou ao sincronizar na planilha: ${syncError}`;
      await logWebhook({ user_id: adminUserId, pedido_id: inserted.id, pedido_nome: newPedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, matched_by: "criado_novo", success: false, error_message: fullError });
      return new Response(JSON.stringify({ error: fullError }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (isCountryBR(newPedido)) {
      await sendAttendanceWebhook(adminUserId, { id: inserted.id, ...newPedido }, newPedido.status_envio);
    }

    await logWebhook({ user_id: adminUserId, pedido_id: inserted.id, pedido_nome: newPedido.nome, status_recebido: rawStatus, status_mapeado: mappedStatus || undefined, matched_by: "criado_novo", success: true });

    console.log(`CRIADO: ${newPedido.nome} (${inserted.id})`);
    return new Response(JSON.stringify({ success: true, action: "created", pedido_id: inserted.id, nome: newPedido.nome }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
