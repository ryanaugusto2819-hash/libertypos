import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    console.log("Webhook de criação de pedido recebido:", JSON.stringify(body));

    // Validate required fields
    const nome = body.nome || body.name || null;
    if (!nome) {
      return new Response(
        JSON.stringify({ error: "Campo 'nome' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find admin user
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Nenhum administrador encontrado no sistema" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pedidoData = {
      user_id: adminRole.user_id,
      nome: nome,
      cedula: body.cedula || body.cpf || body.documento || "",
      cep: body.cep || "",
      bairro: body.bairro || "",
      cidade: body.cidade || body.city || "",
      rua: body.rua || body.endereco || "",
      numero: body.numero || body.numero_rua || "",
      complemento: body.complemento || "",
      produto: body.produto || body.product || "",
      quantidade: Number(body.quantidade || body.quantity || 1),
      valor: Number(body.valor || body.value || 0),
      vendedor: body.vendedor || body.seller || null,
      telefone: body.telefone || body.phone || "",
      email: body.email || "",
      pais: body.pais || body.country || "BR",
      departamento: body.departamento || body.estado || "",
      status_pagamento: body.status_pagamento || "pendente",
      status_envio: body.status_envio || "não enviado",
      observacoes: body.observacoes || body.obs || "",
      data_entrada: new Date().toISOString().split("T")[0],
    };

    const { data: newPedido, error: insertError } = await supabase
      .from("pedidos")
      .insert(pedidoData)
      .select("id, nome")
      .single();

    if (insertError) {
      console.error("Erro ao inserir pedido:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao criar pedido: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Pedido criado via webhook: ${newPedido.nome} (${newPedido.id})`);

    return new Response(
      JSON.stringify({
        success: true,
        pedido_id: newPedido.id,
        nome: newPedido.nome,
        message: "Pedido criado com sucesso",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no webhook de criação:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
