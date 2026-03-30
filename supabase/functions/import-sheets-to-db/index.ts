import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64url(input: string | ArrayBuffer): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    b64 = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const key = credentials.private_key;
  const pemContent = key.replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const jwt = `${header}.${payload}.${base64url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function getSheetData(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets read error: ${JSON.stringify(data)}`);
  return data.values || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const credentialsStr = Deno.env.get("GOOGLE_SHEETS_CREDENTIALS");
    if (!credentialsStr) throw new Error("GOOGLE_SHEETS_CREDENTIALS not configured");
    const spreadsheetId = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");

    const credentials = JSON.parse(credentialsStr.trim());
    const accessToken = await getAccessToken(credentials);

    // Read all data from sheet
    const allData = await getSheetData(accessToken, spreadsheetId, "A:AA");
    if (allData.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: "Planilha vazia" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Skip header row
    const rows = allData[0][0] === "pedido_id" ? allData.slice(1) : allData;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing pedido IDs from DB
    const { data: existingPedidos } = await supabase.from("pedidos").select("id");
    const existingIds = new Set((existingPedidos || []).map((p: any) => p.id));

    // Also build a set of (cedula+nome+data) to avoid duplicates by content
    const { data: allDbPedidos } = await supabase.from("pedidos").select("cedula, nome, data_entrada");
    const existingKeys = new Set((allDbPedidos || []).map((p: any) =>
      `${(p.cedula || "").trim().toLowerCase()}|${(p.nome || "").trim().toLowerCase()}|${p.data_entrada || ""}`
    ));

    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    // Get all profiles to find a default admin user_id for imported orders
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const defaultUserId = adminRoles?.[0]?.user_id;

    if (!defaultUserId) {
      throw new Error("Nenhum admin encontrado para atribuir os pedidos importados");
    }

    // Map afiliado_id from sheet (column W, index 22) to actual user_ids
    // First get all profiles for mapping
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email");
    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      if (p.user_id) profileMap.set(p.user_id, p.user_id);
    });

    for (const row of rows) {
      if (!row[0] && !row[1]) continue; // skip empty rows

      const sheetId = row[0] || "";
      const nome = (row[1] || "").trim();
      const cedula = (row[3] || "").trim();
      const dataEntrada = row[11] || "";

      // Check by ID
      if (sheetId && existingIds.has(sheetId)) {
        skipped++;
        continue;
      }

      // Check by content key
      const contentKey = `${cedula.toLowerCase()}|${nome.toLowerCase()}|${dataEntrada}`;
      if (existingKeys.has(contentKey)) {
        skipped++;
        continue;
      }

      // Determine user_id: use afiliado_id from sheet if it's a valid UUID, otherwise admin
      const afiliadoId = (row[22] || "").trim();
      const userId = afiliadoId && profileMap.has(afiliadoId) ? afiliadoId : defaultUserId;

      const validStatusPag = ["pago", "pendente"];
      const validStatusEnv = ["não enviado", "enviado", "a retirar", "retirado", "a enviar",
        "saldo de expedição insuficiente", "em separação", "entregue", "em devolução", "devolvido", "sem estoque"];
      const validStatusCob = [
        "pendente", "pre enviado", "funil enviado", "funil a retirar", "funil retirado",
        "1-follow (a retirar)", "2-follow (a retirar)", "3-follow (a retirar)", "4-follow (a retirar)",
        "1-recobrança (a retirar)", "2-recobrança (a retirar)", "3-recobrança (a retirar)",
        "1-follow (retirado)", "2-follow (retirado)", "3-follow (retirado)", "4-follow (retirado)",
        "1-recobrança (retirado)", "2-recobrança (retirado)",
        "pedido pre enviado", "pedido enviado", "pedido entregue",
      ];

      const rawStatusPag = (row[10] || "").toLowerCase().trim();
      const rawStatusEnv = (row[19] || "").toLowerCase().trim();
      const rawStatusCob = (row[24] || "").toLowerCase().trim();

      // Parse date - handle various formats
      let parsedDataEntrada = dataEntrada;
      if (dataEntrada && !dataEntrada.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Try to parse "DD de MMM. de YYYY" or other formats
        try {
          const d = new Date(dataEntrada);
          if (!isNaN(d.getTime())) {
            parsedDataEntrada = d.toISOString().split("T")[0];
          }
        } catch { /* keep original */ }
      }
      if (parsedDataEntrada) {
        // Extract just the date part
        parsedDataEntrada = parsedDataEntrada.split("T")[0];
      }
      if (!parsedDataEntrada || parsedDataEntrada === "undefined") {
        parsedDataEntrada = new Date().toISOString().split("T")[0];
      }

      // Parse data_pagamento
      let parsedDataPagamento = row[13] || null;
      if (parsedDataPagamento) {
        try {
          const d = new Date(parsedDataPagamento);
          if (!isNaN(d.getTime())) {
            parsedDataPagamento = d.toISOString().split("T")[0];
          }
        } catch { parsedDataPagamento = null; }
      }

      // Parse data_envio
      let parsedDataEnvio = row[12] || null;
      if (parsedDataEnvio) {
        try {
          const d = new Date(parsedDataEnvio);
          if (!isNaN(d.getTime())) {
            parsedDataEnvio = d.toISOString().split("T")[0];
          }
        } catch { parsedDataEnvio = null; }
      }

      const insertData: any = {
        user_id: userId,
        nome: nome || "Sem nome",
        telefone: row[2] || "",
        cedula: cedula,
        produto: row[4] || "",
        quantidade: Number(row[5]) || 1,
        valor: Number(row[6]) || 0,
        cidade: row[7] || "",
        departamento: row[8] || "",
        codigo_rastreamento: row[9] || "",
        status_pagamento: validStatusPag.includes(rawStatusPag) ? rawStatusPag : "pendente",
        data_entrada: parsedDataEntrada,
        data_envio: parsedDataEnvio,
        data_pagamento: parsedDataPagamento,
        hora_pagamento: row[14] || null,
        comprovante_url: row[15] || null,
        vendedor: row[17] || null,
        criativo: row[18] || null,
        status_envio: validStatusEnv.includes(rawStatusEnv) ? rawStatusEnv : "não enviado",
        etiqueta_envio_url: row[20] || null,
        pais: row[21] || "UY",
        wpp_cobranca: row[23] || "",
        status_cobranca: validStatusCob.includes(rawStatusCob) ? rawStatusCob : "pendente",
        forma_pagamento: row[26] || "",
        observacoes: "",
      };

      // If the sheet had a valid UUID as ID, use it
      if (sheetId && sheetId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        insertData.id = sheetId;
      }

      const { error } = await supabase.from("pedidos").insert(insertData);
      if (error) {
        errors.push(`${nome} (${cedula}): ${error.message}`);
        console.error(`Failed to import: ${nome}`, error.message);
      } else {
        imported++;
        existingKeys.add(contentKey);
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        total_in_sheet: rows.length,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
