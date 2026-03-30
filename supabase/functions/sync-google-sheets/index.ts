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
  const existingData = await getSheetData(accessToken, spreadsheetId, "A:A");
  const nextRow = existingData.length + 1;
  const targetRange = `A${nextRow}:AA${nextRow}`;
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetRange}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
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

// Columns: A:pedido_id, B:nome, C:telefone, D:cedula, E:produto, F:quantidade,
// G:valor, H:cidade, I:departamento, J:codigo_rastreamento, K:status_pagamento,
// L:data_criacao, M:data_envio, N:data_pagamento, O:hora_pagamento,
// P:comprovante_url, Q:ultima_atualizacao, R:Vendedor, S:Criativo,
// T:status_envio, U:etiqueta_envio_url, V:pais, W:afiliado_id, X:wpp_cobranca,
// Y:status_cobranca, Z:conta_bancaria, AA:forma_pagamento
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
    pedido.etiqueta_envio_url || "",
    pedido.pais || "UY",
    pedido.afiliado_id || "",
    pedido.wpp_cobranca || "",
    pedido.status_cobranca || "pendente",
    pedido.conta_bancaria || "",
    pedido.forma_pagamento || "",
  ];
}

async function ensurePedidoInSheet(
  accessToken: string, spreadsheetId: string, pedidoId: string, allData: string[][]
): Promise<{ rowIndex: number; created: boolean }> {
  for (let i = 0; i < allData.length; i++) {
    if (allData[i][0] === pedidoId) {
      return { rowIndex: i + 1, created: false };
    }
  }
  // Not found in sheet — fetch from DB and create row
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: dbRow } = await supabase.from("pedidos").select("*").eq("id", pedidoId).maybeSingle();
  if (!dbRow) {
    throw new Error("Pedido não encontrado na planilha nem no banco de dados");
  }
  const now = new Date().toISOString();
  const row = buildSheetRow({
    pedido_id: dbRow.id, nome: dbRow.nome, telefone: dbRow.telefone, cedula: dbRow.cedula,
    produto: dbRow.produto, quantidade: dbRow.quantidade, valor: dbRow.valor,
    cidade: dbRow.cidade, departamento: dbRow.departamento,
    codigo_rastreamento: dbRow.codigo_rastreamento, status_pagamento: dbRow.status_pagamento,
    data_criacao: dbRow.data_entrada, data_envio: dbRow.data_envio || "",
    data_pagamento: dbRow.data_pagamento || "", hora_pagamento: dbRow.hora_pagamento || "",
    comprovante_url: dbRow.comprovante_url || "", etiqueta_envio_url: dbRow.etiqueta_envio_url || "",
    vendedor: dbRow.vendedor || "", criativo: dbRow.criativo || "",
    status_envio: dbRow.status_envio, pais: dbRow.pais, afiliado_id: dbRow.user_id || "",
    wpp_cobranca: dbRow.wpp_cobranca || "",
    forma_pagamento: dbRow.forma_pagamento || "",
  }, now, true);
  await appendRow(accessToken, spreadsheetId, "A:AA", [row]);
  console.log(`[AUTO-CREATE] Pedido ${pedidoId} criado na planilha a partir do banco`);
  // Return the new row index (last row)
  const updatedData = await getSheetData(accessToken, spreadsheetId, "A:A");
  for (let i = updatedData.length - 1; i >= 0; i--) {
    if (updatedData[i][0] === pedidoId) return { rowIndex: i + 1, created: true };
  }
  return { rowIndex: allData.length + 1, created: true };
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
      const cleaned = credentialsStr.trim();
      credentials = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse credentials. Length:", credentialsStr.length, "First 100 chars:", credentialsStr.substring(0, 100));
      throw new Error("GOOGLE_SHEETS_CREDENTIALS contains invalid JSON. Please re-enter the service account JSON key.");
    }
    const accessToken = await getAccessToken(credentials);

    const { action, pedido } = await req.json();

    if (action === "read") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:AA");
      
      if (allData.length > 0 && allData[0][0] === "pedido_id") {
        const header = allData[0];
        if (!header[23] || header[23] !== "wpp_cobranca") {
          await updateRow(accessToken, spreadsheetId, "X1", [["wpp_cobranca"]]);
        }
        if (!header[24] || header[24] !== "status_cobranca") {
          await updateRow(accessToken, spreadsheetId, "Y1", [["status_cobranca"]]);
        }
        if (!header[25] || header[25] !== "conta_bancaria") {
          await updateRow(accessToken, spreadsheetId, "Z1", [["conta_bancaria"]]);
        }
        if (!header[26] || header[26] !== "forma_pagamento") {
          await updateRow(accessToken, spreadsheetId, "AA1", [["forma_pagamento"]]);
        }
      }
      
      const rows = allData.length > 0 && allData[0][0] === "pedido_id" ? allData.slice(1) : allData;
      
      const validStatusPag = ["pago", "pendente"];
      const validStatusEnv = ["não enviado", "enviado", "a retirar", "retirado", "a enviar", "saldo de expedição insuficiente", "em separação", "entregue", "em devolução", "devolvido", "sem estoque"];
      const validStatusCob = [
        "pendente", "pre enviado", "funil enviado", "funil a retirar", "funil retirado",
        "1-follow (a retirar)", "2-follow (a retirar)", "3-follow (a retirar)", "4-follow (a retirar)",
        "1-recobrança (a retirar)", "2-recobrança (a retirar)", "3-recobrança (a retirar)",
        "1-follow (retirado)", "2-follow (retirado)", "3-follow (retirado)", "4-follow (retirado)",
        "1-recobrança (retirado)", "2-recobrança (retirado)",
        "pedido pre enviado", "pedido enviado", "pedido entregue",
      ];

      const pedidos = rows.filter((row: string[]) => row[0]).map((row: string[]) => {
        const rawStatusPag = (row[10] || "").toLowerCase().trim();
        const rawStatusEnv = (row[19] || "").toLowerCase().trim();
        const rawStatusCob = (row[24] || "").toLowerCase().trim();
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
          etiqueta_envio_url: row[20] || null,
          pais: row[21] || "UY",
          afiliado_id: row[22] || "",
          wpp_cobranca: row[23] || "",
          status_cobranca: validStatusCob.includes(rawStatusCob) ? rawStatusCob : "pendente",
          conta_bancaria: row[25] || "",
          forma_pagamento: row[26] || "",
          observacoes: "",
        };
      });

      return new Response(
        JSON.stringify({ success: true, pedidos }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      console.log(`[CREATE] Recebido pedido_id=${pedido.pedido_id}, nome=${pedido.nome}, pais=${pedido.pais}`);
      const existingData = await getSheetData(accessToken, spreadsheetId, "A:A");
      const existingIds = existingData.map((row: string[]) => row[0]);

      if (existingIds.includes(pedido.pedido_id)) {
        console.log(`[CREATE] Pedido ${pedido.pedido_id} já existe na planilha`);
        return new Response(
          JSON.stringify({ success: false, error: "Pedido já existe na planilha" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const row = buildSheetRow(pedido, now);

      console.log(`[CREATE] Adicionando row com ${row.length} colunas para ${pedido.nome}`);
      await appendRow(accessToken, spreadsheetId, "A:AA", [row]);
      console.log(`[CREATE] Sucesso: ${pedido.nome} adicionado à planilha`);

      return new Response(
        JSON.stringify({ success: true, message: "Pedido adicionado à planilha" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_status") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:Z");
      const now = new Date().toISOString();
      const { rowIndex, created } = await ensurePedidoInSheet(accessToken, spreadsheetId, pedido.pedido_id, allData);

      if (created) {
        return new Response(
          JSON.stringify({ success: true, message: "Pedido não existia na planilha e foi criado com status atualizado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
      await updateRow(accessToken, spreadsheetId, `T${rowIndex}:W${rowIndex}`, [[
        pedido.status_envio || "",
        pedido.etiqueta_envio_url || "",
        pedido.pais || "UY",
        pedido.afiliado_id || "",
      ]]);

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

      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const metaData = await metaRes.json();
      const sheetId = metaData.sheets?.[0]?.properties?.sheetId ?? 0;

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

    if (action === "update_wpp") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:Z");
      const { rowIndex } = await ensurePedidoInSheet(accessToken, spreadsheetId, pedido.pedido_id, allData);
      await updateRow(accessToken, spreadsheetId, `X${rowIndex}`, [[pedido.wpp_cobranca || ""]]);
      return new Response(
        JSON.stringify({ success: true, message: "WPP Cobrança atualizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_status_cobranca") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:Z");
      const { rowIndex } = await ensurePedidoInSheet(accessToken, spreadsheetId, pedido.pedido_id, allData);
      await updateRow(accessToken, spreadsheetId, `Y${rowIndex}`, [[pedido.status_cobranca || "pendente"]]);
      return new Response(
        JSON.stringify({ success: true, message: "Status de Cobrança atualizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_conta_bancaria") {
      const allData = await getSheetData(accessToken, spreadsheetId, "A:Z");
      const { rowIndex } = await ensurePedidoInSheet(accessToken, spreadsheetId, pedido.pedido_id, allData);
      await updateRow(accessToken, spreadsheetId, `Z${rowIndex}`, [[pedido.conta_bancaria || ""]]);
      return new Response(
        JSON.stringify({ success: true, message: "Conta Bancária atualizada" }),
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
