import { useState, useMemo } from "react";
import { Plus, Search, Filter, Package, CreditCard, Truck, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { mockPedidos } from "@/data/mockData";
import { Pedido, StatusPagamento, StatusEnvio } from "@/types/pedido";
import { formatCurrency, formatDate, statusPagamentoConfig, statusEnvioConfig } from "@/lib/formatters";
import { CreateOrderDialog } from "@/components/pedidos/CreateOrderDialog";
import { PaymentDialog } from "@/components/pedidos/PaymentDialog";
import { cn } from "@/lib/utils";
import { syncOrderToSheets, updateOrderStatusInSheets } from "@/lib/googleSheets";
import { toast } from "sonner";
import { PedidosThemeSwitcher, type PedidosTheme } from "@/components/pedidos/PedidosThemeSwitcher";

// ─── Theme-specific style maps ───────────────────────────────────
const themeStyles: Record<PedidosTheme, {
  wrapper: string;
  header: string;
  subtitle: string;
  searchInput: string;
  tableWrapper: string;
  tableHeaderRow: string;
  tableHead: string;
  tableRow: (overdue: boolean) => string;
  cell: string;
  statusPagTrigger: (cls: string) => string;
  statusEnvTrigger: (cls: string) => string;
  createBtn: string;
  cardStats: string;
}> = {
  // ── 1. Glass (original) ──
  glass: {
    wrapper: "space-y-6",
    header: "text-2xl font-bold text-foreground",
    subtitle: "text-sm text-muted-foreground mt-1",
    searchInput: "pl-10",
    tableWrapper: "glass-card rounded-lg overflow-hidden",
    tableHeaderRow: "hover:bg-transparent",
    tableHead: "text-xs",
    tableRow: (overdue) => cn("transition-colors", overdue && "bg-destructive/5"),
    cell: "text-sm",
    statusPagTrigger: (cls) => cn("h-7 text-xs font-medium border-0 w-28 rounded-full", cls),
    statusEnvTrigger: (cls) => cn("h-7 text-xs font-medium border-0 w-32 rounded-full", cls),
    createBtn: "gap-2",
    cardStats: "glass-card",
  },
  // ── 2. Minimal ──
  minimal: {
    wrapper: "space-y-8",
    header: "text-xl font-semibold tracking-tight text-foreground",
    subtitle: "text-xs text-muted-foreground mt-0.5 uppercase tracking-widest",
    searchInput: "pl-10 border-0 border-b border-border rounded-none focus-visible:ring-0 bg-transparent",
    tableWrapper: "rounded-none border-t border-border",
    tableHeaderRow: "hover:bg-transparent border-b border-border",
    tableHead: "text-[10px] uppercase tracking-widest text-muted-foreground font-medium",
    tableRow: (overdue) => cn("border-b border-border/50 hover:bg-muted/30 transition-colors", overdue && "bg-destructive/3"),
    cell: "text-sm py-4",
    statusPagTrigger: (cls) => cn("h-6 text-[11px] font-medium border border-border bg-transparent w-24 rounded-sm", cls),
    statusEnvTrigger: (cls) => cn("h-6 text-[11px] font-medium border border-border bg-transparent w-28 rounded-sm", cls),
    createBtn: "gap-2 rounded-sm border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
    cardStats: "border border-border bg-transparent rounded-sm",
  },
  // ── 3. Bold ──
  bold: {
    wrapper: "space-y-6",
    header: "text-3xl font-black text-foreground tracking-tight",
    subtitle: "text-sm font-semibold text-primary mt-1",
    searchInput: "pl-10 border-2 border-primary/30 focus-visible:border-primary rounded-xl",
    tableWrapper: "rounded-2xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden",
    tableHeaderRow: "bg-primary/10 hover:bg-primary/10",
    tableHead: "text-xs font-bold text-primary uppercase",
    tableRow: (overdue) => cn("transition-all hover:bg-primary/5 border-b border-primary/10", overdue && "bg-destructive/10 border-l-4 border-l-destructive"),
    cell: "text-sm font-medium",
    statusPagTrigger: (cls) => cn("h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm", cls),
    statusEnvTrigger: (cls) => cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", cls),
    createBtn: "gap-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow text-base px-6",
    cardStats: "rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg",
  },
  // ── 4. Stripe (alternating rows) ──
  stripe: {
    wrapper: "space-y-5",
    header: "text-2xl font-bold text-foreground",
    subtitle: "text-sm text-muted-foreground mt-1",
    searchInput: "pl-10 rounded-lg bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-info",
    tableWrapper: "rounded-xl bg-card border border-border overflow-hidden shadow-sm",
    tableHeaderRow: "bg-secondary hover:bg-secondary",
    tableHead: "text-xs font-semibold text-secondary-foreground",
    tableRow: (overdue) => cn(
      "transition-colors even:bg-muted/40 hover:bg-info/5",
      overdue && "!bg-destructive/8"
    ),
    cell: "text-sm",
    statusPagTrigger: (cls) => cn("h-7 text-xs font-semibold border-0 w-28 rounded-md bg-secondary", cls),
    statusEnvTrigger: (cls) => cn("h-7 text-xs font-semibold border-0 w-32 rounded-md bg-secondary", cls),
    createBtn: "gap-2 bg-info hover:bg-info/90 text-info-foreground rounded-lg",
    cardStats: "rounded-xl bg-card border border-border shadow-sm",
  },
  // ── 5. Neon ──
  neon: {
    wrapper: "space-y-6",
    header: "text-2xl font-bold text-success drop-shadow-[0_0_8px_hsl(var(--success)/0.4)]",
    subtitle: "text-sm text-success/70 mt-1",
    searchInput: "pl-10 bg-background border border-success/30 focus-visible:ring-success/50 focus-visible:border-success rounded-lg text-foreground placeholder:text-success/40",
    tableWrapper: "rounded-xl border border-success/20 bg-card/50 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_hsl(var(--success)/0.05)]",
    tableHeaderRow: "bg-success/5 hover:bg-success/5 border-b border-success/20",
    tableHead: "text-[11px] uppercase tracking-wider text-success/80 font-semibold",
    tableRow: (overdue) => cn(
      "transition-all border-b border-success/10 hover:bg-success/5",
      overdue && "bg-destructive/10 border-l-2 border-l-destructive shadow-[inset_0_0_10px_hsl(var(--destructive)/0.05)]"
    ),
    cell: "text-sm",
    statusPagTrigger: (cls) => cn("h-7 text-xs font-semibold border border-success/30 w-28 rounded-lg bg-success/5", cls),
    statusEnvTrigger: (cls) => cn("h-7 text-xs font-semibold border border-success/30 w-32 rounded-lg bg-success/5", cls),
    createBtn: "gap-2 bg-success/20 border border-success/50 text-success hover:bg-success/30 rounded-lg shadow-[0_0_12px_hsl(var(--success)/0.15)]",
    cardStats: "rounded-xl border border-success/20 bg-success/5 shadow-[0_0_12px_hsl(var(--success)/0.05)]",
  },
};

const Pedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>(mockPedidos);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; nome: string } | null>(null);
  const [theme, setTheme] = useState<PedidosTheme>("glass");

  const s = themeStyles[theme];

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      const matchSearch =
        !search ||
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.telefone.includes(search) ||
        p.cedula.includes(search) ||
        p.codigo_rastreamento.toLowerCase().includes(search.toLowerCase()) ||
        p.cidade.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "todos" || p.status_pagamento === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pedidos, search, statusFilter]);

  const handleCreateOrder = async (newOrder: Omit<Pedido, "id">) => {
    const pedidoId = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const order: Pedido = { ...newOrder, id: pedidoId };
    setPedidos([order, ...pedidos]);
    try {
      await syncOrderToSheets({
        pedido_id: pedidoId, nome: order.nome, telefone: order.telefone,
        cedula: order.cedula, produto: order.produto, quantidade: order.quantidade,
        valor: order.valor, cidade: order.cidade, departamento: order.departamento,
        codigo_rastreamento: order.codigo_rastreamento, status_pagamento: order.status_pagamento,
        data_criacao: order.data_entrada, data_envio: order.data_envio || "",
        vendedor: order.vendedor || "", criativo: order.criativo || "",
      });
      toast.success("Pedido sincronizado com Google Sheets!");
    } catch (err) {
      console.error("Falha ao sincronizar:", err);
      toast.error("Pedido criado, mas falhou ao sincronizar com Google Sheets");
    }
  };

  const handlePayment = async (orderId: string) => {
    const currentOrder = pedidos.find((p) => p.id === orderId);
    if (!currentOrder) { toast.error("Pedido não encontrado"); return; }
    const now = new Date();
    const dataPagamento = now.toISOString().split("T")[0];
    const horaPagamento = now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    setPedidos(pedidos.map((p) => p.id === orderId ? { ...p, status_pagamento: "pago" as StatusPagamento, data_pagamento: dataPagamento, hora_pagamento: horaPagamento } : p));
    try {
      await updateOrderStatusInSheets({
        pedido_id: orderId, status_pagamento: "pago", data_pagamento: dataPagamento, hora_pagamento: horaPagamento,
        nome: currentOrder.nome, telefone: currentOrder.telefone, cedula: currentOrder.cedula,
        produto: currentOrder.produto, quantidade: currentOrder.quantidade, valor: currentOrder.valor,
        cidade: currentOrder.cidade, departamento: currentOrder.departamento,
        codigo_rastreamento: currentOrder.codigo_rastreamento, data_criacao: currentOrder.data_entrada,
        data_envio: currentOrder.data_envio || "", comprovante_url: currentOrder.comprovante_url || "",
        vendedor: currentOrder.vendedor || "", criativo: currentOrder.criativo || "",
      });
      toast.success("Status atualizado no Google Sheets!");
    } catch (err) {
      console.error("Falha ao atualizar status:", err);
      toast.error("Status alterado localmente, mas falhou ao sincronizar");
    }
  };

  const openPaymentDialog = (id: string, nome: string) => {
    setSelectedOrder({ id, nome });
    setPaymentOpen(true);
  };

  const isOverdue = (p: Pedido) => {
    if (p.status_pagamento === "pago") return false;
    const diffDays = Math.floor((Date.now() - new Date(p.data_entrada).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  const handleStatusPagChange = (pedidoId: string, value: StatusPagamento) => {
    setPedidos(pedidos.map((ped) =>
      ped.id === pedidoId
        ? {
            ...ped,
            status_pagamento: value,
            ...(value === "pago" ? {
              data_pagamento: new Date().toISOString().split("T")[0],
              hora_pagamento: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
            } : {}),
          }
        : ped
    ));
    toast.success(`Status de pagamento → "${statusPagamentoConfig[value].label}"`);
  };

  const handleStatusEnvChange = (pedidoId: string, value: StatusEnvio) => {
    setPedidos(pedidos.map((ped) =>
      ped.id === pedidoId ? { ...ped, status_envio: value } : ped
    ));
    toast.success(`Status de envio → "${statusEnvioConfig[value].label}"`);
  };

  // Summary counts
  const totalPedidos = filtered.length;
  const totalPagos = filtered.filter((p) => p.status_pagamento === "pago").length;
  const totalPendentes = filtered.filter((p) => p.status_pagamento === "pendente").length;
  const totalValor = filtered.reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className={s.wrapper}>
      {/* Header + Theme Switcher */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={s.header}>Gestão de Pedidos</h1>
            <p className={s.subtitle}>
              {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} encontrado{totalPedidos !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PedidosThemeSwitcher current={theme} onChange={setTheme} />
            <Button onClick={() => setCreateOpen(true)} className={s.createBtn}>
              <Plus className="h-4 w-4" />
              Criar Pedido
            </Button>
          </div>
        </div>

        {/* Mini Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={s.cardStats}>
            <CardContent className="p-3 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">{totalPedidos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className={s.cardStats}>
            <CardContent className="p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{totalPagos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagos</p>
              </div>
            </CardContent>
          </Card>
          <Card className={s.cardStats}>
            <CardContent className="p-3 flex items-center gap-3">
              <CircleDot className="h-5 w-5 text-warning" />
              <div>
                <p className="text-lg font-bold text-warning">{totalPendentes}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className={s.cardStats}>
            <CardContent className="p-3 flex items-center gap-3">
              <Truck className="h-5 w-5 text-info" />
              <div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, cédula, cidade ou rastreamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className={s.tableWrapper}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={s.tableHeaderRow}>
                <TableHead className={s.tableHead}>Cliente</TableHead>
                <TableHead className={s.tableHead}>Telefone</TableHead>
                <TableHead className={s.tableHead}>Produto</TableHead>
                <TableHead className={cn(s.tableHead, "text-right")}>Valor</TableHead>
                <TableHead className={s.tableHead}>Cidade</TableHead>
                <TableHead className={s.tableHead}>Rastreamento</TableHead>
                <TableHead className={s.tableHead}>Pagamento</TableHead>
                <TableHead className={s.tableHead}>Envio</TableHead>
                <TableHead className={s.tableHead}>Entrada</TableHead>
                <TableHead className={s.tableHead}>Dt. Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const overdue = isOverdue(p);
                return (
                  <TableRow key={p.id} className={s.tableRow(overdue)}>
                    <TableCell className={cn(s.cell, "font-medium")}>
                      <div>
                        {p.nome}
                        {overdue && <span className="ml-2 text-xs text-destructive">⚠ Atraso</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.cedula}</div>
                    </TableCell>
                    <TableCell className={s.cell}>{p.telefone}</TableCell>
                    <TableCell className={s.cell}>
                      <div>{p.produto}</div>
                      <div className="text-xs text-muted-foreground">Qtd: {p.quantidade}</div>
                    </TableCell>
                    <TableCell className={cn(s.cell, "text-right font-medium")}>
                      {formatCurrency(p.valor)}
                    </TableCell>
                    <TableCell className={s.cell}>
                      <div>{p.cidade}</div>
                      <div className="text-xs text-muted-foreground">{p.departamento}</div>
                    </TableCell>
                    <TableCell className={cn(s.cell, "font-mono text-xs")}>
                      {p.codigo_rastreamento}
                    </TableCell>
                    <TableCell>
                      <Select value={p.status_pagamento} onValueChange={(v: StatusPagamento) => handleStatusPagChange(p.id, v)}>
                        <SelectTrigger className={s.statusPagTrigger(statusPagamentoConfig[p.status_pagamento].className)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={p.status_envio} onValueChange={(v: StatusEnvio) => handleStatusEnvChange(p.id, v)}>
                        <SelectTrigger className={s.statusEnvTrigger(statusEnvioConfig[p.status_envio].className)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="não enviado">Não Enviado</SelectItem>
                          <SelectItem value="enviado">Enviado</SelectItem>
                          <SelectItem value="a retirar">A Retirar</SelectItem>
                          <SelectItem value="retirado">Retirado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(s.cell, "text-muted-foreground")}>
                      {formatDate(p.data_entrada)}
                    </TableCell>
                    <TableCell className={s.cell}>
                      {p.data_pagamento ? (
                        <div>
                          <div>{formatDate(p.data_pagamento)}</div>
                          <div className="text-xs text-muted-foreground">{p.hora_pagamento}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onSave={handleCreateOrder} />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} orderId={selectedOrder?.id ?? null} orderName={selectedOrder?.nome ?? ""} onConfirm={handlePayment} />
    </div>
  );
};

export default Pedidos;
