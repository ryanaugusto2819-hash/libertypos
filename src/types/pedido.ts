export type StatusPagamento = "pago" | "pendente";
export type StatusEnvio = 
  | "não enviado" | "enviado" | "a retirar" | "retirado"
  | "a enviar" | "saldo de expedição insuficiente" | "em separação" 
  | "entregue" | "em devolução" | "devolvido" | "sem estoque";
export type StatusCobranca = 
  | "pendente"
  | "pre enviado"
  | "funil enviado"
  | "funil a retirar"
  | "funil retirado"
  | "1-follow (a retirar)"
  | "2-follow (a retirar)"
  | "3-follow (a retirar)"
  | "4-follow (a retirar)"
  | "1-recobrança (a retirar)"
  | "2-recobrança (a retirar)"
  | "3-recobrança (a retirar)"
  | "1-follow (retirado)"
  | "2-follow (retirado)"
  | "3-follow (retirado)"
  | "4-follow (retirado)"
  | "1-recobrança (retirado)"
  | "2-recobrança (retirado)";

export type PaisCode = "UY" | "BR" | "AR";

export interface Pedido {
  user_id?: string;
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
  pais: PaisCode;
  afiliado_id?: string;
  wpp_cobranca?: string;
  status_cobranca?: StatusCobranca;
  conta_bancaria?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  email?: string;
}
