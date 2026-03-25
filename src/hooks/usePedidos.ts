import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Pedido } from "@/types/pedido";
import { toast } from "sonner";

function rowToPedido(row: any): Pedido {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    cedula: row.cedula,
    produto: row.produto,
    quantidade: row.quantidade,
    valor: Number(row.valor),
    cidade: row.cidade,
    departamento: row.departamento,
    codigo_rastreamento: row.codigo_rastreamento,
    status_pagamento: row.status_pagamento,
    status_envio: row.status_envio,
    data_entrada: row.data_entrada,
    data_envio: row.data_envio,
    data_pagamento: row.data_pagamento,
    hora_pagamento: row.hora_pagamento,
    comprovante_url: row.comprovante_url,
    etiqueta_envio_url: row.etiqueta_envio_url,
    observacoes: row.observacoes,
    vendedor: row.vendedor,
    criativo: row.criativo,
    pais: row.pais,
    user_id: row.user_id,
    wpp_cobranca: row.wpp_cobranca,
  };
}

export function usePedidos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pedidos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToPedido);
    },
    enabled: !!user,
  });
}

export function useCreatePedido() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pedido: Omit<Pedido, "id">) => {
      const insertData = {
        user_id: user!.id,
        nome: pedido.nome,
        telefone: pedido.telefone,
        cedula: pedido.cedula,
        produto: pedido.produto,
        quantidade: pedido.quantidade,
        valor: pedido.valor,
        cidade: pedido.cidade,
        departamento: pedido.departamento,
        codigo_rastreamento: pedido.codigo_rastreamento,
        status_pagamento: pedido.status_pagamento,
        status_envio: pedido.status_envio,
        data_entrada: pedido.data_entrada,
        data_envio: pedido.data_envio,
        data_pagamento: pedido.data_pagamento,
        hora_pagamento: pedido.hora_pagamento,
        comprovante_url: pedido.comprovante_url,
        etiqueta_envio_url: pedido.etiqueta_envio_url,
        observacoes: pedido.observacoes,
        vendedor: pedido.vendedor,
        criativo: pedido.criativo,
        pais: pedido.pais,
      };
      const { error } = await supabase.from("pedidos").insert(insertData);
      if (error) throw error;

      // Send webhook in background (don't block order creation)
      supabase.functions.invoke("send-webhook", {
        body: { pedido: { ...insertData, id: "NEW-" + Date.now() } },
      }).catch((err) => {
        console.warn("Webhook falhou:", err.message);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      toast.success("Pedido criado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar pedido: " + err.message);
    },
  });
}

export function useUpdatePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Pedido>) => {
      const { error } = await supabase.from("pedidos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });
}

export function useDeletePedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      toast.success("Pedido excluído!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + err.message);
    },
  });
}
