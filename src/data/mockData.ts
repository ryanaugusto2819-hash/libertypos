import { Pedido } from "@/types/pedido";

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export const mockPedidos: Pedido[] = [
  { id: "1", nome: "Carlos Martínez", telefone: "+598 300 123 456", cedula: "1234567890", produto: "Gota Cavalo", quantidade: 2, valor: 189000, cidade: "Montevideo", departamento: "Montevideo", codigo_rastreamento: "UY-2024-001", status_pagamento: "pago", status_envio: "retirado", data_entrada: daysAgo(15), data_envio: daysAgo(12), data_pagamento: daysAgo(2), hora_pagamento: "14:30", comprovante_url: null, etiqueta_envio_url: null, observacoes: "Cliente recorrente", pais: "UY" },
  { id: "2", nome: "María López", telefone: "+598 311 234 567", cedula: "9876543210", produto: "Gota Prosta", quantidade: 1, valor: 95000, cidade: "Salto", departamento: "Salto", codigo_rastreamento: "UY-2024-002", status_pagamento: "pendente", status_envio: "a retirar", data_entrada: daysAgo(10), data_envio: daysAgo(7), data_pagamento: null, hora_pagamento: null, comprovante_url: null, etiqueta_envio_url: null, observacoes: "", pais: "UY" },
];
