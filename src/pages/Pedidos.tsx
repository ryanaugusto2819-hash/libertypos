import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Filter, Package, CreditCard, Truck, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TrackingCell } from "@/components/pedidos/TrackingCell";
import { ImageUploadCell } from "@/components/pedidos/ImageUploadCell";

const Pedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>(mockPedidos);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; nome: string } | null>(null);

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

  const totalPedidos = filtered.length;
  const totalPagos = filtered.filter((p) => p.status_pagamento === "pago").length;
  const totalPendentes = filtered.filter((p) => p.status_pagamento === "pendente").length;
  const totalValor = filtered.reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Gestão de Pedidos</h1>
            <p className="text-sm font-semibold text-primary mt-1">
              {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} encontrado{totalPedidos !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow text-base px-6">
            <Plus className="h-4 w-4" />
            Criar Pedido
          </Button>
        </div>

        {/* Mini Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg">
            <CardContent className="p-3 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">{totalPedidos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg">
            <CardContent className="p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{totalPagos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg">
            <CardContent className="p-3 flex items-center gap-3">
              <CircleDot className="h-5 w-5 text-warning" />
              <div>
                <p className="text-lg font-bold text-warning">{totalPendentes}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg">
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
            className="pl-10 border-2 border-primary/30 focus-visible:border-primary rounded-xl"
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
      <div className="rounded-2xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10 hover:bg-primary/10">
                <TableHead className="text-xs font-bold text-primary uppercase">Cliente</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Cédula</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Telefone</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Produto</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Valor</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Cidade</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Rastreamento</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Pagamento</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Envio</TableHead>
                
                <TableHead className="text-xs font-bold text-primary uppercase">Dt. Pagamento</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Comprovante</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Etiqueta de Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const overdue = isOverdue(p);
                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "transition-all hover:bg-primary/5 border-b border-primary/10",
                      overdue && "bg-destructive/10 border-l-4 border-l-destructive"
                    )}
                  >
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
                    <TableCell className="text-sm font-medium text-right">
                      {formatCurrency(p.valor)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <div>{p.cidade}</div>
                      <div className="text-xs text-muted-foreground">{p.departamento}</div>
                    </TableCell>
                    <TableCell>
                      <TrackingCell
                        value={p.codigo_rastreamento}
                        onChange={(code) => {
                          setPedidos(pedidos.map((ped) =>
                            ped.id === p.id ? { ...ped, codigo_rastreamento: code } : ped
                          ));
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={p.status_pagamento} onValueChange={(v: StatusPagamento) => handleStatusPagChange(p.id, v)}>
                        <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm", statusPagamentoConfig[p.status_pagamento].className)}>
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
                        <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", statusEnvioConfig[p.status_envio].className)}>
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
                    <TableCell className="text-sm font-medium">
                      {p.data_pagamento ? (
                        <div>
                          <div>{formatDate(p.data_pagamento)}</div>
                          <div className="text-xs text-muted-foreground">{p.hora_pagamento}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ImageUploadCell
                        url={p.comprovante_url}
                        label="Comprovante de Pagamento"
                        onChange={(url) => {
                          setPedidos(pedidos.map((ped) =>
                            ped.id === p.id ? { ...ped, comprovante_url: url || null } : ped
                          ));
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <ImageUploadCell
                        url={p.etiqueta_envio_url}
                        label="Etiqueta de Envio"
                        onChange={(url) => {
                          setPedidos(pedidos.map((ped) =>
                            ped.id === p.id ? { ...ped, etiqueta_envio_url: url || null } : ped
                          ));
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
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
