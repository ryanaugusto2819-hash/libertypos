import { StatusPagamento } from "@/types/pedido";

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

export const statusConfig: Record<StatusPagamento, { label: string; className: string }> = {
  pago: { label: "Pago", className: "status-paid" },
  entregue: { label: "Entregue", className: "status-pending" },
  enviado: { label: "Enviado", className: "status-sent" },
  inadimplente: { label: "Inadimplente", className: "status-overdue" },
};
