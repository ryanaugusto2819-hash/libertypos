import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pedido } = await req.json();

    // Get webhook config for this user
    const { data: config, error: configError } = await supabase
      .from("webhook_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (configError || !config || !config.webhook_url || !config.is_active) {
      return new Response(
        JSON.stringify({ success: false, message: "Webhook não configurado ou inativo" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload matching the logistics platform format
    const payload = {
      id: pedido.id || crypto.randomUUID(),
      customer_name: pedido.nome || "",
      customer_phone: pedido.telefone || "",
      customer_zip_code: pedido.cep || "",
      customer_street: pedido.rua || "",
      customer_district: pedido.bairro || "",
      customer_city: pedido.cidade || "",
      customer_state: pedido.departamento || "",
      customer_number: pedido.numero || "",
      customer_complement: pedido.complemento || "",
      customer_email: pedido.email || "",
      customer_document: pedido.cedula || "",
      products: [
        {
          name: pedido.produto || "",
          quantity: pedido.quantidade || 1,
        },
      ],
      amount: pedido.valor || 0,
    };

    // Send webhook
    const webhookResponse = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await webhookResponse.text();

    return new Response(
      JSON.stringify({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        response: responseText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
