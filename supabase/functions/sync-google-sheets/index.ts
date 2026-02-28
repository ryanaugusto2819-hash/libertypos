import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API helpers
async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const key = credentials.private_key;
  const pemContent = key.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  const jwt = `${header}.${payload}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function getSheetData(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets read error: ${JSON.stringify(data)}`);
  return data.values || [];
}

async function appendRow(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets append error: ${JSON.stringify(data)}`);
  return data;
}

async function updateRow(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets update error: ${JSON.stringify(data)}`);
  return data;
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

    const credentials = JSON.parse(credentialsStr);
    const accessToken = await getAccessToken(credentials);

    const { action, pedido } = await req.json();

    if (action === "create") {
      // Anti-duplicity: check if pedido_id already exists
      const existingData = await getSheetData(accessToken, spreadsheetId, "A:A");
      const existingIds = existingData.map((row: string[]) => row[0]);

      if (existingIds.includes(pedido.pedido_id)) {
        return new Response(
          JSON.stringify({ success: false, error: "Pedido já existe na planilha" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Columns: A:pedido_id, B:nome, C:telefone, D:cedula, E:produto, F:quantidade,
      // G:valor, H:cidade, I:departamento, J:codigo_rastreamento, K:status_pagamento,
      // L:data_criacao, M:data_envio, N:data_pagamento, O:hora_pagamento,
      // P:comprovante_url, Q:ultima_atualizacao, R:Vendedor, S:Criativo
      const now = new Date().toISOString();
      const row = [
        pedido.pedido_id,
        pedido.nome,
        pedido.telefone,
        pedido.cedula,
        pedido.produto,
        pedido.quantidade,
        pedido.valor,
        pedido.cidade,
        pedido.departamento,
        pedido.codigo_rastreamento || "",
        pedido.status_pagamento,
        pedido.data_criacao,
        pedido.data_envio || "",
        "", // data_pagamento
        "", // hora_pagamento
        "", // comprovante_url
        now, // ultima_atualizacao
        pedido.vendedor || "",
        pedido.criativo || "",
      ];

      await appendRow(accessToken, spreadsheetId, "A:S", [row]);

      return new Response(
        JSON.stringify({ success: true, message: "Pedido adicionado à planilha" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_status") {
      // Find the row by pedido_id
      const allData = await getSheetData(accessToken, spreadsheetId, "A:S");
      let rowIndex = -1;

      for (let i = 0; i < allData.length; i++) {
        if (allData[i][0] === pedido.pedido_id) {
          rowIndex = i + 1; // Sheets is 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return new Response(
          JSON.stringify({ success: false, error: "Pedido não encontrado na planilha" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      // Update K:status_pagamento, N:data_pagamento, O:hora_pagamento, Q:ultima_atualizacao
      // We update K individually, then N:O, then Q
      await updateRow(accessToken, spreadsheetId, `K${rowIndex}`, [[
        pedido.status_pagamento,
      ]]);
      await updateRow(accessToken, spreadsheetId, `N${rowIndex}:O${rowIndex}`, [[
        pedido.data_pagamento || "",
        pedido.hora_pagamento || "",
      ]]);
      await updateRow(accessToken, spreadsheetId, `Q${rowIndex}`, [[now]]);

      return new Response(
        JSON.stringify({ success: true, message: "Status atualizado na planilha" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
