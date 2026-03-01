import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64url encoding (no padding, URL-safe chars)
function base64url(input: string | ArrayBuffer): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    b64 = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Google Sheets API helpers
async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
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
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64url = base64url(signature);

  const jwt = `${header}.${payload}.${signatureB64url}`;

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

function buildSheetRow(pedido: any, now: string, includePaymentFields = false) {
  return [
    pedido.pedido_id,
    pedido.nome || "",
    pedido.telefone || "",
    pedido.cedula || "",
    pedido.produto || "",
    pedido.quantidade ?? "",
    pedido.valor ?? "",
    pedido.cidade || "",
    pedido.departamento || "",
    pedido.codigo_rastreamento || "",
    pedido.status_pagamento || "",
    pedido.data_criacao || "",
    pedido.data_envio || "",
    includePaymentFields ? pedido.data_pagamento || "" : "",
    includePaymentFields ? pedido.hora_pagamento || "" : "",
    pedido.comprovante_url || "",
    now,
    pedido.vendedor || "",
    pedido.criativo || "",
    pedido.status_envio || "não enviado",
  ];
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

    let credentials;
    try {
      // Handle cases where the secret might be double-encoded or have extra whitespace
      const cleaned = credentialsStr.trim();
      credentials = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse credentials. Length:", credentialsStr.length, "First 100 chars:", credentialsStr.substring(0, 100));
      throw new Error("GOOGLE_SHEETS_CREDENTIALS contains invalid JSON. Please re-enter the service account JSON key.");
    }
    const accessToken = await getAccessToken(credentials);

    const { action, pedido } = await req.json();

    if (action === "read") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:T");
      // Skip header row if present
      const rows = allData.length > 0 && allData[0][0] === "pedido_id" ? allData.slice(1) : allData;
      
      const validStatusPag = ["pago", "pendente"];
      const validStatusEnv = ["não enviado", "enviado", "a retirar", "retirado"];

      const pedidos = rows.filter((row: string[]) => row[0]).map((row: string[]) => {
        const rawStatusPag = (row[10] || "").toLowerCase().trim();
        const rawStatusEnv = (row[19] || "").toLowerCase().trim();
        return {
          id: row[0] || "",
          nome: row[1] || "",
          telefone: row[2] || "",
          cedula: row[3] || "",
          produto: row[4] || "",
          quantidade: Number(row[5]) || 0,
          valor: Number(row[6]) || 0,
          cidade: row[7] || "",
          departamento: row[8] || "",
          codigo_rastreamento: row[9] || "",
          status_pagamento: validStatusPag.includes(rawStatusPag) ? rawStatusPag : "pendente",
          data_entrada: row[11] || "",
          data_envio: row[12] || null,
          data_pagamento: row[13] || null,
          hora_pagamento: row[14] || null,
          comprovante_url: row[15] || null,
          vendedor: row[17] || "",
          criativo: row[18] || "",
          status_envio: validStatusEnv.includes(rawStatusEnv) ? rawStatusEnv : "não enviado",
          etiqueta_envio_url: null,
          observacoes: "",
        };
      });

      return new Response(
        JSON.stringify({ success: true, pedidos }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      const row = buildSheetRow(pedido, now);

      await appendRow(accessToken, spreadsheetId, "A:T", [row]);

      return new Response(
        JSON.stringify({ success: true, message: "Pedido adicionado à planilha" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_status") {
      // Find the row by pedido_id
      const allData = await getSheetData(accessToken, spreadsheetId, "A:T");
      let rowIndex = -1;

      for (let i = 0; i < allData.length; i++) {
        if (allData[i][0] === pedido.pedido_id) {
          rowIndex = i + 1; // Sheets is 1-indexed
          break;
        }
      }

      const now = new Date().toISOString();

      if (rowIndex === -1) {
        const hasRequiredFallbackData = pedido.nome && pedido.telefone && pedido.produto;

        if (!hasRequiredFallbackData) {
          return new Response(
            JSON.stringify({ success: false, error: "Pedido não encontrado na planilha e faltam dados para criar automaticamente" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const row = buildSheetRow(pedido, now, true);
        await appendRow(accessToken, spreadsheetId, "A:T", [row]);

        return new Response(
          JSON.stringify({ success: true, message: "Pedido não existia na planilha e foi criado com status atualizado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update J:rastreamento, K:status_pagamento, N:data_pagamento, O:hora_pagamento, P:comprovante, Q:ultima_atualizacao
      await updateRow(accessToken, spreadsheetId, `J${rowIndex}:K${rowIndex}`, [[
        pedido.codigo_rastreamento || "",
        pedido.status_pagamento,
      ]]);
      await updateRow(accessToken, spreadsheetId, `N${rowIndex}:Q${rowIndex}`, [[
        pedido.data_pagamento || "",
        pedido.hora_pagamento || "",
        pedido.comprovante_url || "",
        now,
      ]]);
      // Update T:status_envio
      await updateRow(accessToken, spreadsheetId, `T${rowIndex}`, [[pedido.status_envio || ""]]);

      return new Response(
        JSON.stringify({ success: true, message: "Status atualizado na planilha" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:A");
      let rowIndex = -1;

      for (let i = 0; i < allData.length; i++) {
        if (allData[i][0] === pedido.pedido_id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return new Response(
          JSON.stringify({ success: true, message: "Pedido não encontrado na planilha (já removido)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get spreadsheet metadata to find sheet ID
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const metaData = await metaRes.json();
      const sheetId = metaData.sheets?.[0]?.properties?.sheetId ?? 0;

      // Delete the row using batchUpdate
      const deleteRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          }],
        }),
      });
      const deleteData = await deleteRes.json();
      if (!deleteRes.ok) throw new Error(`Sheets delete error: ${JSON.stringify(deleteData)}`);

      return new Response(
        JSON.stringify({ success: true, message: "Pedido excluído da planilha" }),
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
