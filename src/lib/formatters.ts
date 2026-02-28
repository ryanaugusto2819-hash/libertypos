import { StatusPagamento, StatusEnvio } from "@/types/pedido";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const statusPagamentoConfig: Record<StatusPagamento, { label: string; className: string }> = {
  pago: { label: "Pago", className: "status-paid" },
  pendente: { label: "Pendente", className: "status-pending" },
};

export const statusEnvioConfig: Record<StatusEnvio, { label: string; className: string }> = {
  "não enviado": { label: "Não Enviado", className: "status-overdue" },
  enviado: { label: "Enviado", className: "status-sent" },
  "a retirar": { label: "A Retirar", className: "status-pending" },
  retirado: { label: "Retirado", className: "status-paid" },
};

// Keep backward compat alias
export const statusConfig = statusPagamentoConfig;
