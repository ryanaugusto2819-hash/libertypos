import { StatusPagamento, StatusEnvio } from "@/types/pedido";

const COTACAO_UYU_BRL = 7.49; // 1 BRL = 7.49 UYU
const COTACAO_ARS_BRL = 268.56; // 1 BRL = 268.56 ARS
const COTACAO_ARS_USD = 0.00083; // 1 ARS ≈ 0.00083 USD

let _activePais: string = "UY";

export function setActivePais(pais: string) {
  _activePais = pais;
}

export function formatCurrency(value: number): string {
  let valueBRL: number;
  if (_activePais === "AR") {
    valueBRL = value / COTACAO_ARS_BRL;
  } else if (_activePais === "BR") {
    valueBRL = value;
  } else {
    valueBRL = value / COTACAO_UYU_BRL;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueBRL);
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBRLFromARS(valueARS: number): string {
  const valueBRL = valueARS * COTACAO_ARS_BRL;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueBRL);
}

export function formatUSD(valueARS: number): string {
  const valueUSD = valueARS * COTACAO_ARS_USD;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueUSD);
}

export function arsToUsd(valueARS: number): number {
  return valueARS * COTACAO_ARS_USD;
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
