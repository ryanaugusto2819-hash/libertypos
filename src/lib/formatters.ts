import { StatusPagamento, StatusEnvio, StatusCobranca } from "@/types/pedido";

const COTACAO_UYU_BRL = 7.73; // 1 BRL = 7.73 UYU
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
  const valueBRL = valueARS / COTACAO_ARS_BRL;
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
    return new Date(date + "T12:00:00-03:00");
  }
  // If it's an ISO string without timezone, treat as São Paulo time
  if (/^\d{4}-\d{2}-\d{2}T[\d:]+$/.test(date)) {
    return new Date(date + "-03:00");
  }
  return new Date(date);
}

/**
 * Returns the current date/time in São Paulo timezone
 */
export function nowInSaoPaulo(): Date {
  const spFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = spFormatter.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-03:00`);
}

/**
 * Returns today's date string (YYYY-MM-DD) in São Paulo timezone
 */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  // BR (LogZZ) statuses
  "a enviar": { label: "A Enviar", className: "status-overdue" },
  "saldo de expedição insuficiente": { label: "Saldo Insuficiente", className: "status-overdue" },
  "em separação": { label: "Em Separação", className: "status-pending" },
  "entregue": { label: "Entregue", className: "status-paid" },
  "em devolução": { label: "Em Devolução", className: "status-pending" },
  "devolvido": { label: "Devolvido", className: "status-overdue" },
  "sem estoque": { label: "Sem Estoque", className: "status-overdue" },
};

export const statusEnvioUY: StatusEnvio[] = ["não enviado", "enviado", "a retirar", "retirado"];
export const statusEnvioBR: StatusEnvio[] = ["a enviar", "saldo de expedição insuficiente", "em separação", "enviado", "entregue", "em devolução", "devolvido", "sem estoque"];

export const statusCobrancaConfig: Record<StatusCobranca, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "status-pending" },
  "pre enviado": { label: "Pré Enviado", className: "status-sent" },
  "funil enviado": { label: "Funil Enviado", className: "status-sent" },
  "funil a retirar": { label: "Funil A Retirar", className: "status-pending" },
  "funil retirado": { label: "Funil Retirado", className: "status-paid" },
  "1-follow (a retirar)": { label: "1-Follow (A Retirar)", className: "status-pending" },
  "2-follow (a retirar)": { label: "2-Follow (A Retirar)", className: "status-pending" },
  "3-follow (a retirar)": { label: "3-Follow (A Retirar)", className: "status-pending" },
  "4-follow (a retirar)": { label: "4-Follow (A Retirar)", className: "status-pending" },
  "1-recobrança (a retirar)": { label: "1-Recobrança (A Retirar)", className: "status-overdue" },
  "2-recobrança (a retirar)": { label: "2-Recobrança (A Retirar)", className: "status-overdue" },
  "3-recobrança (a retirar)": { label: "3-Recobrança (A Retirar)", className: "status-overdue" },
  "1-follow (retirado)": { label: "1-Follow (Retirado)", className: "status-paid" },
  "2-follow (retirado)": { label: "2-Follow (Retirado)", className: "status-paid" },
  "3-follow (retirado)": { label: "3-Follow (Retirado)", className: "status-paid" },
  "4-follow (retirado)": { label: "4-Follow (Retirado)", className: "status-paid" },
  "1-recobrança (retirado)": { label: "1-Recobrança (Retirado)", className: "status-overdue" },
  "2-recobrança (retirado)": { label: "2-Recobrança (Retirado)", className: "status-overdue" },
  "pedido pre enviado": { label: "Pedido Pré Enviado", className: "status-sent" },
  "pedido enviado": { label: "Pedido Enviado", className: "status-sent" },
  "pedido entregue": { label: "Pedido Entregue", className: "status-paid" },
};

// Keep backward compat alias
export const statusConfig = statusPagamentoConfig;
