import React from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pedido, StatusPagamento, StatusEnvio, StatusCobranca } from "@/types/pedido";
import {
  formatCurrency,
  formatDate,
  statusPagamentoConfig,
  statusEnvioConfig,
  statusCobrancaConfig,
  statusEnvioUY,
  statusEnvioBR,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { TrackingCell } from "./TrackingCell";
import { ImageUploadCell } from "./ImageUploadCell";
import { WppCobrancaCell } from "./WppCobrancaCell";
import { CodigoContaCell } from "./CodigoContaCell";

export interface PedidoRowProps {
  p: Pedido;
  country: string;
  isAdmin: boolean;
  expanded: boolean;
  overdue: boolean;
  contasUY: { id: string; nome: string; ativo: boolean }[];
  onToggleExpand: (id: string) => void;
  onStatusPag: (id: string, v: StatusPagamento) => void;
  onStatusEnv: (id: string, v: StatusEnvio) => void;
  onStatusCob: (id: string, v: StatusCobranca) => void;
  onFormaPag: (id: string, v: string) => void;
  onPlataforma: (id: string, v: string) => void;
  onContaUsada: (id: string, v: string) => void;
  onCodigoConta: (id: string, v: string) => void;
  onTracking: (id: string, v: string) => void;
  onAttachment: (id: string, field: "comprovante_url" | "etiqueta_envio_url", v: string | null) => void;
  onDelete: (id: string, nome: string) => void;
}

function PedidoRowBase({
  p,
  country,
  isAdmin,
  expanded,
  overdue,
  contasUY,
  onToggleExpand,
  onStatusPag,
  onStatusEnv,
  onStatusCob,
  onFormaPag,
  onPlataforma,
  onContaUsada,
  onCodigoConta,
  onTracking,
  onAttachment,
  onDelete,
}: PedidoRowProps) {
  return (
    <React.Fragment>
      <TableRow
        className={cn(
          "transition-all hover:bg-primary/5 border-b border-primary/10",
          overdue && "bg-destructive/10 border-l-4 border-l-destructive",
        )}
      >
        <TableCell className="w-10 px-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => onToggleExpand(p.id)}>
            {expanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </TableCell>
        <TableCell className="text-sm font-medium">
          <div>
            {p.nome}
            {overdue && <span className="ml-2 text-xs text-destructive">⚠ Atraso</span>}
          </div>
          <div className="text-xs text-muted-foreground">{formatDate(p.data_entrada)}</div>
        </TableCell>
        <TableCell className="text-sm font-medium font-mono">{p.cedula}</TableCell>
        <TableCell className="text-sm font-medium">{p.telefone}</TableCell>
        <TableCell className="text-sm font-medium">
          <div>{p.produto}</div>
          <div className="text-xs text-muted-foreground">Qtd: {p.quantidade}</div>
        </TableCell>
        <TableCell className="text-sm font-medium text-right">{formatCurrency(p.valor)}</TableCell>
        {country === "BR" && (
          <TableCell className="text-sm font-medium text-right text-muted-foreground">
            {p.valor_frete ? formatCurrency(p.valor_frete) : "—"}
          </TableCell>
        )}
        <TableCell className="text-sm font-medium">
          <div>{p.cidade}</div>
          <div className="text-xs text-muted-foreground">{p.departamento}</div>
        </TableCell>
        <TableCell>
          <TrackingCell value={p.codigo_rastreamento} onChange={(code) => onTracking(p.id, code)} />
        </TableCell>
        <TableCell>
          {isAdmin ? (
            <Select value={p.status_pagamento} onValueChange={(v: StatusPagamento) => onStatusPag(p.id, v)}>
              <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm", statusPagamentoConfig[p.status_pagamento]?.className)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="inadimplente">Inadimplente</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={p.status_pagamento === "pago" ? "default" : "secondary"} className={cn("text-xs font-bold", statusPagamentoConfig[p.status_pagamento]?.className)}>
              {statusPagamentoConfig[p.status_pagamento]?.label ?? p.status_pagamento}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Select value={p.forma_pagamento || ""} onValueChange={(v) => onFormaPag(p.id, v)}>
            <SelectTrigger className="h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={p.plataforma || ""} onValueChange={(v) => onPlataforma(p.id, v)}>
            <SelectTrigger className="h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOGZZ">LOGZZ</SelectItem>
              <SelectItem value="SHOPEE">SHOPEE</SelectItem>
              <SelectItem value="TIKTOK">TIKTOK</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <CodigoContaCell value={p.codigo_conta || ""} onChange={(v) => onCodigoConta(p.id, v)} />
        </TableCell>
        <TableCell>
          {isAdmin ? (
            <Select value={p.status_envio} onValueChange={(v: StatusEnvio) => onStatusEnv(p.id, v)}>
              <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", statusEnvioConfig[p.status_envio]?.className)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(country === "BR" ? statusEnvioBR : statusEnvioUY).map((s) => (
                  <SelectItem key={s} value={s}>{statusEnvioConfig[s]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className={cn("text-xs font-bold", statusEnvioConfig[p.status_envio]?.className)}>
              {statusEnvioConfig[p.status_envio]?.label ?? p.status_envio}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {isAdmin ? (
            <Select value={p.status_cobranca || "pendente"} onValueChange={(v: StatusCobranca) => onStatusCob(p.id, v)}>
              <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", statusCobrancaConfig[p.status_cobranca || "pendente"]?.className)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {p.pais === "BR" ? (
                  <>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pedido pre enviado">Pedido Pré Enviado</SelectItem>
                    <SelectItem value="pedido enviado">Pedido Enviado</SelectItem>
                    <SelectItem value="pedido entregue">Pedido Entregue</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pre enviado">Pré Enviado</SelectItem>
                    <SelectItem value="funil enviado">Funil Enviado</SelectItem>
                    <SelectItem value="funil a retirar">Funil A Retirar</SelectItem>
                    <SelectItem value="funil retirado">Funil Retirado</SelectItem>
                    <SelectItem value="1-follow (a retirar)">1-Follow (A Retirar)</SelectItem>
                    <SelectItem value="2-follow (a retirar)">2-Follow (A Retirar)</SelectItem>
                    <SelectItem value="3-follow (a retirar)">3-Follow (A Retirar)</SelectItem>
                    <SelectItem value="4-follow (a retirar)">4-Follow (A Retirar)</SelectItem>
                    <SelectItem value="1-recobrança (a retirar)">1-Recobrança (A Retirar)</SelectItem>
                    <SelectItem value="2-recobrança (a retirar)">2-Recobrança (A Retirar)</SelectItem>
                    <SelectItem value="3-recobrança (a retirar)">3-Recobrança (A Retirar)</SelectItem>
                    <SelectItem value="1-follow (retirado)">1-Follow (Retirado)</SelectItem>
                    <SelectItem value="2-follow (retirado)">2-Follow (Retirado)</SelectItem>
                    <SelectItem value="3-follow (retirado)">3-Follow (Retirado)</SelectItem>
                    <SelectItem value="4-follow (retirado)">4-Follow (Retirado)</SelectItem>
                    <SelectItem value="1-recobrança (retirado)">1-Recobrança (Retirado)</SelectItem>
                    <SelectItem value="2-recobrança (retirado)">2-Recobrança (Retirado)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className={cn("text-xs font-bold", statusCobrancaConfig[p.status_cobranca || "pendente"]?.className)}>
              {statusCobrancaConfig[p.status_cobranca || "pendente"]?.label ?? p.status_cobranca}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div>
            <ImageUploadCell
              url={p.comprovante_url}
              label="Comprovante de Pagamento"
              onChange={(url) => onAttachment(p.id, "comprovante_url", url || null)}
            />
            {p.data_pagamento && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(p.data_pagamento)} {p.hora_pagamento}
              </div>
            )}
          </div>
        </TableCell>
        {country === "UY" && (
          <TableCell>
            <ImageUploadCell
              url={p.etiqueta_envio_url}
              label="Etiqueta de Envio"
              onChange={(url) => onAttachment(p.id, "etiqueta_envio_url", url || null)}
            />
          </TableCell>
        )}
        <TableCell>
          <WppCobrancaCell pedidoId={p.id} initialValue={p.wpp_cobranca || ""} />
        </TableCell>
        {country === "UY" && (
          <TableCell>
            <Select value={p.conta_usada || ""} onValueChange={(v) => onContaUsada(p.id, v)}>
              <SelectTrigger className="h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {contasUY.filter((c) => c.ativo || c.nome === p.conta_usada).map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
        )}
        <TableCell className="text-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={() => onDelete(p.id, p.nome)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/40">
          <TableCell colSpan={20} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-sm">
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Nome Completo</p><p className="font-medium">{p.nome}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Telefone</p><p className="font-medium">{p.telefone}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cédula</p><p className="font-medium font-mono">{p.cedula}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Email</p><p className="font-medium">{p.email || "—"}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Produto</p><p className="font-medium">{p.produto} (Qtd: {p.quantidade})</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Valor</p><p className="font-medium">{formatCurrency(p.valor)}</p></div>
              {p.valor_frete > 0 && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Frete</p><p className="font-medium">{formatCurrency(p.valor_frete)}</p></div>)}
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cidade / Departamento</p><p className="font-medium">{p.cidade} — {p.departamento}</p></div>
              {(p.rua || p.cep) && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Endereço</p>
                  <p className="font-medium">
                    {[p.rua, p.numero, p.complemento, p.bairro].filter(Boolean).join(", ")}
                    {p.cep && ` — CEP: ${p.cep}`}
                  </p>
                </div>
              )}
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Data de Entrada</p><p className="font-medium">{formatDate(p.data_entrada)}</p></div>
              {p.data_envio && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Data de Envio</p><p className="font-medium">{formatDate(p.data_envio)}</p></div>)}
              {p.data_pagamento && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Data Pagamento</p><p className="font-medium">{formatDate(p.data_pagamento)} {p.hora_pagamento}</p></div>)}
              <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Rastreamento</p><p className="font-medium font-mono">{p.codigo_rastreamento || "—"}</p></div>
              {p.plataforma && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Plataforma</p><p className="font-medium">{p.plataforma}</p></div>)}
              {p.plataforma === "SHOPEE" && p.conta_shopee && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Conta Shopee</p><p className="font-medium font-mono">{p.conta_shopee}</p></div>)}
              {p.codigo_conta && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Código da Conta</p><p className="font-medium font-mono">{p.codigo_conta}</p></div>)}
              {p.vendedor && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Vendedor</p><p className="font-medium">{p.vendedor}</p></div>)}
              {p.criativo && (<div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Criativo</p><p className="font-medium">{p.criativo}</p></div>)}
              {p.observacoes && (<div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Observações</p><p className="font-medium">{p.observacoes}</p></div>)}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export const PedidoRow = React.memo(PedidoRowBase);
