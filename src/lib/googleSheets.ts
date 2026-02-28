import { supabase } from "@/integrations/supabase/client";

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
}) {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "create", pedido },
  });

  if (error) {
    console.error("Erro ao sincronizar com Google Sheets:", error);
    throw error;
  }
  return data;
}

export async function updateOrderStatusInSheets(pedido: {
  pedido_id: string;
  status_pagamento: string;
  data_pagamento: string | null;
  hora_pagamento: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
    body: { action: "update_status", pedido },
  });

  if (error) {
    console.error("Erro ao atualizar status no Google Sheets:", error);
    throw error;
  }
  return data;
}
