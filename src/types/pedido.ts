export type StatusPagamento = "pago" | "pendente";
export type StatusEnvio = "não enviado" | "enviado" | "a retirar" | "retirado";

export interface Pedido {
  id: string;
  nome: string;
  telefone: string;
  cedula: string;
  produto: string;
  quantidade: number;
  valor: number;
  cidade: string;
  departamento: string;
  codigo_rastreamento: string;
  status_pagamento: StatusPagamento;
  status_envio: StatusEnvio;
  data_entrada: string;
  data_envio: string | null;
  data_pagamento: string | null;
  hora_pagamento: string | null;
  comprovante_url: string | null;
  etiqueta_envio_url: string | null;
  observacoes: string;
  vendedor?: string;
  criativo?: string;
}
