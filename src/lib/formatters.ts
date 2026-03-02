import { StatusPagamento, StatusEnvio } from "@/types/pedido";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseLocalDate(date: string): Date {
  // If the date is just YYYY-MM-DD, parse as local noon to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(date + "T12:00:00");
  }
  return new Date(date);
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(parseLocalDate(date));
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
