import { useState, useMemo, useCallback } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePedidos, useCreatePedido, useUpdatePedido, useDeletePedido } from "@/hooks/usePedidos";
import { OwnerFilter, OwnerFilterValue } from "@/components/OwnerFilter";
import { Plus, Search, Filter, Package, CreditCard, Truck, CircleDot, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Pedido, StatusPagamento, StatusEnvio } from "@/types/pedido";
import { formatCurrency, formatDate, parseLocalDate, statusPagamentoConfig, statusEnvioConfig } from "@/lib/formatters";
import { CreateOrderDialog } from "@/components/pedidos/CreateOrderDialog";
import { PaymentDialog } from "@/components/pedidos/PaymentDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TrackingCell } from "@/components/pedidos/TrackingCell";
import { ImageUploadCell } from "@/components/pedidos/ImageUploadCell";

const Pedidos = () => {
  const { country } = useCountry();
  const { user, isAdmin } = useAuth();
  const { data: pedidos = [], isLoading: loading } = usePedidos();
  const createPedido = useCreatePedido();
  const updatePedido = useUpdatePedido();
  const deletePedido = useDeletePedido();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; nome: string } | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterValue>("todos");

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      const matchCountry = p.pais === country;
      const matchSearch =
        !search ||
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.telefone.includes(search) ||
        p.cedula.includes(search) ||
        p.codigo_rastreamento.toLowerCase().includes(search.toLowerCase()) ||
        p.cidade.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || p.status_pagamento === statusFilter;

      let matchOwner = true;
      if (isAdmin) {
        if (ownerFilter === "meus") matchOwner = p.user_id === user?.id;
        else if (ownerFilter === "afiliados") matchOwner = p.user_id !== user?.id;
      }

      return matchCountry && matchSearch && matchStatus && matchOwner;
    });
  }, [pedidos, search, statusFilter, country, isAdmin, ownerFilter, user]);

  const handleCreateOrder = async (newOrder: Omit<Pedido, "id">) => {
    createPedido.mutate(newOrder);
    setCreateOpen(false);
  };

  const isOverdue = (p: Pedido) => {
    if (p.status_pagamento === "pago") return false;
    const diffDays = Math.floor((Date.now() - parseLocalDate(p.data_entrada).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  const handleStatusPagChange = async (pedidoId: string, value: StatusPagamento) => {
    const now = new Date();
    const dataPagamento = value === "pago" ? now.toISOString().split("T")[0] : null;
    const horaPagamento = value === "pago" ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
    updatePedido.mutate({ id: pedidoId, status_pagamento: value, data_pagamento: dataPagamento, hora_pagamento: horaPagamento });
    toast.success(`Status de pagamento → "${statusPagamentoConfig[value].label}"`);
  };

  const handleStatusEnvChange = async (pedidoId: string, value: StatusEnvio) => {
    updatePedido.mutate({ id: pedidoId, status_envio: value });
    toast.success(`Status de envio → "${statusEnvioConfig[value].label}"`);
  };

  const handleAttachmentChange = useCallback((
    pedidoId: string,
    field: "comprovante_url" | "etiqueta_envio_url",
    value: string | null,
  ) => {
    updatePedido.mutate({ id: pedidoId, [field]: value });
  }, [updatePedido]);

  const handleTrackingChange = useCallback((pedidoId: string, code: string) => {
    updatePedido.mutate({ id: pedidoId, codigo_rastreamento: code });
  }, [updatePedido]);

  const handleDeleteOrder = async (pedidoId: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de "${nome}"?`)) return;
    deletePedido.mutate(pedidoId);
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
          <div className="flex items-center gap-2">
            <OwnerFilter value={ownerFilter} onChange={setOwnerFilter} />
            <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow text-base px-6">
              <Plus className="h-4 w-4" />
              Criar Pedido
            </Button>
          </div>
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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground font-medium">Carregando pedidos...</span>
        </div>
      ) : (
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
                <TableHead className="text-xs font-bold text-primary uppercase">Comprovante</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Etiqueta de Envio</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-center">Ações</TableHead>
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
                        onChange={(code) => handleTrackingChange(p.id, code)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={p.status_pagamento} onValueChange={(v: StatusPagamento) => handleStatusPagChange(p.id, v)}>
                        <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm", statusPagamentoConfig[p.status_pagamento]?.className)}>
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
                        <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", statusEnvioConfig[p.status_envio]?.className)}>
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
                    <TableCell>
                      <div>
                        <ImageUploadCell
                          url={p.comprovante_url}
                          label="Comprovante de Pagamento"
                          onChange={(url) => handleAttachmentChange(p.id, "comprovante_url", url || null)}
                        />
                        {p.data_pagamento && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(p.data_pagamento)} {p.hora_pagamento}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ImageUploadCell
                        url={p.etiqueta_envio_url}
                        label="Etiqueta de Envio"
                        onChange={(url) => handleAttachmentChange(p.id, "etiqueta_envio_url", url || null)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => handleDeleteOrder(p.id, p.nome)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
      )}

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onSave={handleCreateOrder} />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} orderId={selectedOrder?.id ?? null} orderName={selectedOrder?.nome ?? ""} onConfirm={(id) => handleStatusPagChange(id, "pago")} />
    </div>
  );
};

export default Pedidos;
