import { supabase } from "@/integrations/supabase/client";
import { Pedido } from "@/types/pedido";

type SheetsFunctionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  pedidos?: Pedido[];
};

function assertSheetsSuccess(data: unknown) {
  if (data && typeof data === "object" && "success" in data) {
    const result = data as SheetsFunctionResponse;
    if (result.success === false) {
      throw new Error(result.error || "Falha ao sincronizar com Google Sheets");
    }
  }
}

export async function fetchOrdersFromSheets(): Promise<Pedido[]> {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "read" },
  });

  if (error) {
    console.error("Erro ao buscar pedidos do Google Sheets:", error);
    throw error;
  }

  assertSheetsSuccess(data);
  return (data as SheetsFunctionResponse).pedidos || [];
}

export async function syncOrderToSheets(pedido: {
  pedido_id: string;
  nome: string;
  telefone: string;
  cedula: string;
  produto: string;
  quantidade: number;
  valor: number;
  cidade: string;
  departamento: string;
  codigo_rastreamento: string;
  status_pagamento: string;
  data_criacao: string;
  data_envio: string;
  vendedor?: string;
  criativo?: string;
  status_envio?: string;
}) {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "create", pedido },
  });

  if (error) {
    console.error("Erro ao sincronizar com Google Sheets:", error);
    throw error;
  }

  assertSheetsSuccess(data);
  return data;
}

export async function updateOrderStatusInSheets(pedido: {
  pedido_id: string;
  status_pagamento: string;
  data_pagamento: string | null;
  hora_pagamento: string | null;
  nome?: string;
  telefone?: string;
  cedula?: string;
  produto?: string;
  quantidade?: number;
  valor?: number;
  cidade?: string;
  departamento?: string;
  codigo_rastreamento?: string;
  data_criacao?: string;
  data_envio?: string;
  comprovante_url?: string;
  vendedor?: string;
  criativo?: string;
  status_envio?: string;
}) {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "update_status", pedido },
  });

  if (error) {
    console.error("Erro ao atualizar status no Google Sheets:", error);
    throw error;
  }

  assertSheetsSuccess(data);
  return data;
}

export async function deleteOrderFromSheets(pedidoId: string) {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "delete", pedido: { pedido_id: pedidoId } },
  });

  if (error) {
    console.error("Erro ao excluir do Google Sheets:", error);
    throw error;
  }

  assertSheetsSuccess(data);
  return data;
}
