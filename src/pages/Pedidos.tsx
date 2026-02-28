import { useState, useMemo } from "react";
import { Plus, Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockPedidos } from "@/data/mockData";
import { Pedido, StatusPagamento } from "@/types/pedido";
import { formatCurrency, formatDate, statusConfig } from "@/lib/formatters";
import { CreateOrderDialog } from "@/components/pedidos/CreateOrderDialog";
import { PaymentDialog } from "@/components/pedidos/PaymentDialog";
import { cn } from "@/lib/utils";
import { syncOrderToSheets, updateOrderStatusInSheets } from "@/lib/googleSheets";
import { toast } from "sonner";

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
    const order: Pedido = {
      ...newOrder,
      id: pedidoId,
    };
    setPedidos([order, ...pedidos]);

    // Sync to Google Sheets in background
    try {
      await syncOrderToSheets({
        pedido_id: pedidoId,
        nome: order.nome,
        telefone: order.telefone,
        cedula: order.cedula,
        produto: order.produto,
        quantidade: order.quantidade,
        valor: order.valor,
        cidade: order.cidade,
        departamento: order.departamento,
        codigo_rastreamento: order.codigo_rastreamento,
        status_pagamento: order.status_pagamento,
        data_criacao: order.data_entrada,
        data_envio: order.data_envio || "",
      });
      toast.success("Pedido sincronizado com Google Sheets!");
    } catch (err) {
      console.error("Falha ao sincronizar:", err);
      toast.error("Pedido criado, mas falhou ao sincronizar com Google Sheets");
    }
  };

  const handlePayment = async (orderId: string) => {
    const now = new Date();
    const dataPagamento = now.toISOString().split("T")[0];
    const horaPagamento = now.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setPedidos(
      pedidos.map((p) =>
        p.id === orderId
          ? {
              ...p,
              status_pagamento: "pago" as StatusPagamento,
              data_pagamento: dataPagamento,
              hora_pagamento: horaPagamento,
            }
          : p
      )
    );

    // Sync status update to Google Sheets
    try {
      await updateOrderStatusInSheets({
        pedido_id: orderId,
        status_pagamento: "pago",
        data_pagamento: dataPagamento,
        hora_pagamento: horaPagamento,
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
    const entryDate = new Date(p.data_entrada);
    const diffDays = Math.floor(
      (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays > 7;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, cédula, cidade ou rastreamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
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
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="inadimplente">Inadimplente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Telefone</TableHead>
                <TableHead className="text-xs">Produto</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Cidade</TableHead>
                <TableHead className="text-xs">Rastreamento</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Entrada</TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const status = statusConfig[p.status_pagamento];
                const overdue = isOverdue(p);
                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "transition-colors",
                      overdue && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="font-medium text-sm">
                      <div>
                        {p.nome}
                        {overdue && (
                          <span className="ml-2 text-xs text-destructive">⚠ Atraso</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.cedula}</div>
                    </TableCell>
                    <TableCell className="text-sm">{p.telefone}</TableCell>
                    <TableCell className="text-sm">
                      <div>{p.produto}</div>
                      <div className="text-xs text-muted-foreground">Qtd: {p.quantidade}</div>
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(p.valor)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{p.cidade}</div>
                      <div className="text-xs text-muted-foreground">{p.departamento}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {p.codigo_rastreamento}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs font-medium", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(p.data_entrada)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.data_pagamento ? (
                        <div>
                          <div>{formatDate(p.data_pagamento)}</div>
                          <div className="text-xs text-muted-foreground">{p.hora_pagamento}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status_pagamento !== "pago" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => openPaymentDialog(p.id, p.nome)}
                        >
                          Marcar Pago
                        </Button>
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

      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreateOrder}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        orderId={selectedOrder?.id ?? null}
        orderName={selectedOrder?.nome ?? ""}
        onConfirm={handlePayment}
      />
    </div>
  );
};

export default Pedidos;
