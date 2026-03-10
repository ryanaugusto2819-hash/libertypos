import { useState, useMemo, useCallback, useEffect } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerFilter, OwnerFilterValue } from "@/components/OwnerFilter";
import { Plus, Search, Filter, Package, CreditCard, Truck, CircleDot, Trash2, Loader2, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Pedido, StatusPagamento, StatusEnvio, StatusCobranca } from "@/types/pedido";
import { formatCurrency, formatDate, parseLocalDate, statusPagamentoConfig, statusEnvioConfig, statusCobrancaConfig, setActivePais } from "@/lib/formatters";
import { CreateOrderDialog } from "@/components/pedidos/CreateOrderDialog";
import { PaymentDialog } from "@/components/pedidos/PaymentDialog";
import { cn } from "@/lib/utils";
import { syncOrderToSheets, updateOrderStatusInSheets, deleteOrderFromSheets, fetchOrdersFromSheets } from "@/lib/googleSheets";
import { toast } from "sonner";
import { TrackingCell } from "@/components/pedidos/TrackingCell";
import { ImageUploadCell } from "@/components/pedidos/ImageUploadCell";
import { WppCobrancaCell } from "@/components/pedidos/WppCobrancaCell";
import { supabase } from "@/integrations/supabase/client";

const Pedidos = () => {
  const { country } = useCountry();
  const { user, isAdmin } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [envioFilter, setEnvioFilter] = useState<string>("todos");
  const [cobrancaFilter, setCobrancaFilter] = useState<string>("todos");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; nome: string } | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterValue>("todos");

  useEffect(() => { setActivePais(country); }, [country]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const orders = await fetchOrdersFromSheets();
      setPedidos(orders);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
      toast.error("Falha ao carregar pedidos do Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const normalize = (s: string) => s.replace(/[\s\-\+\(\)]/g, "");
    return pedidos.filter((p) => {
      const matchCountry = p.pais === country;
      const searchLower = search.toLowerCase();
      const matchSearch =
        !search ||
        p.nome.toLowerCase().includes(searchLower) ||
        normalize(p.telefone).includes(normalize(search)) ||
        p.cedula.includes(search) ||
        p.codigo_rastreamento.toLowerCase().includes(search.toLowerCase()) ||
        p.cidade.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "todos" || p.status_pagamento === statusFilter;
      const matchEnvio =
        envioFilter === "todos" || p.status_envio === envioFilter;
      const matchCobranca =
        cobrancaFilter === "todos" || (p.status_cobranca || "pendente") === cobrancaFilter;

      // Owner filter
      let matchOwner = true;
      if (!isAdmin) {
        matchOwner = p.afiliado_id === user?.id;
      } else {
        if (ownerFilter === "meus") matchOwner = !p.afiliado_id || p.afiliado_id === "" || p.afiliado_id === user?.id;
        else if (ownerFilter === "afiliados") matchOwner = !!p.afiliado_id && p.afiliado_id !== "" && p.afiliado_id !== user?.id;
      }

      return matchCountry && matchSearch && matchStatus && matchEnvio && matchCobranca && matchOwner;
    });
  }, [pedidos, search, statusFilter, envioFilter, cobrancaFilter, country, isAdmin, ownerFilter, user]);

  const handleCreateOrder = async (newOrder: Omit<Pedido, "id">) => {
    const pedidoId = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const order: Pedido = { ...newOrder, id: pedidoId, afiliado_id: user?.id };
    setPedidos([order, ...pedidos]);
    try {
      await syncOrderToSheets({
        pedido_id: pedidoId, nome: order.nome, telefone: order.telefone,
        cedula: order.cedula, produto: order.produto, quantidade: order.quantidade,
        valor: order.valor, cidade: order.cidade, departamento: order.departamento,
        codigo_rastreamento: order.codigo_rastreamento, status_pagamento: order.status_pagamento,
        data_criacao: order.data_entrada, data_envio: order.data_envio || "",
        vendedor: order.vendedor || "", criativo: order.criativo || "",
        status_envio: order.status_envio, pais: order.pais,
        afiliado_id: user?.id || "",
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
    const dataPagamento = now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const horaPagamento = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    setPedidos(pedidos.map((p) => p.id === orderId ? { ...p, status_pagamento: "pago" as StatusPagamento, data_pagamento: dataPagamento, hora_pagamento: horaPagamento } : p));
    try {
      await updateOrderStatusInSheets({
        pedido_id: orderId, status_pagamento: "pago", data_pagamento: dataPagamento, hora_pagamento: horaPagamento,
        nome: currentOrder.nome, telefone: currentOrder.telefone, cedula: currentOrder.cedula,
        produto: currentOrder.produto, quantidade: currentOrder.quantidade, valor: currentOrder.valor,
        cidade: currentOrder.cidade, departamento: currentOrder.departamento,
        codigo_rastreamento: currentOrder.codigo_rastreamento, data_criacao: currentOrder.data_entrada,
        data_envio: currentOrder.data_envio || "", comprovante_url: currentOrder.comprovante_url || "",
        etiqueta_envio_url: currentOrder.etiqueta_envio_url || "",
        vendedor: currentOrder.vendedor || "", criativo: currentOrder.criativo || "",
        status_envio: currentOrder.status_envio, pais: currentOrder.pais,
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
    const diffDays = Math.floor((Date.now() - parseLocalDate(p.data_entrada).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  const handleStatusPagChange = async (pedidoId: string, value: StatusPagamento) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    const now = new Date();
    const dataPagamento = value === "pago" ? now.toISOString().split("T")[0] : null;
    const horaPagamento = value === "pago" ? now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : null;
    const updated = { ...currentOrder, status_pagamento: value, data_pagamento: dataPagamento, hora_pagamento: horaPagamento };
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? updated : ped));
    toast.success(`Status de pagamento → "${statusPagamentoConfig[value].label}"`);
    try {
      await updateOrderStatusInSheets({
        pedido_id: pedidoId, status_pagamento: value,
        data_pagamento: dataPagamento, hora_pagamento: horaPagamento,
        nome: currentOrder.nome, telefone: currentOrder.telefone, cedula: currentOrder.cedula,
        produto: currentOrder.produto, quantidade: currentOrder.quantidade, valor: currentOrder.valor,
        cidade: currentOrder.cidade, departamento: currentOrder.departamento,
        codigo_rastreamento: currentOrder.codigo_rastreamento, data_criacao: currentOrder.data_entrada,
        data_envio: currentOrder.data_envio || "", comprovante_url: currentOrder.comprovante_url || "",
        etiqueta_envio_url: currentOrder.etiqueta_envio_url || "",
        vendedor: currentOrder.vendedor || "", criativo: currentOrder.criativo || "",
        status_envio: currentOrder.status_envio, pais: currentOrder.pais,
      });
    } catch (err) {
      console.error("Falha ao sincronizar status de pagamento:", err);
      toast.error("Falhou ao sincronizar com Google Sheets");
    }
  };

  const handleStatusEnvChange = async (pedidoId: string, value: StatusEnvio) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, status_envio: value } : ped));
    toast.success(`Status de envio → "${statusEnvioConfig[value].label}"`);
    try {
      await updateOrderStatusInSheets({
        pedido_id: pedidoId, status_pagamento: currentOrder.status_pagamento,
        data_pagamento: currentOrder.data_pagamento, hora_pagamento: currentOrder.hora_pagamento,
        nome: currentOrder.nome, telefone: currentOrder.telefone, cedula: currentOrder.cedula,
        produto: currentOrder.produto, quantidade: currentOrder.quantidade, valor: currentOrder.valor,
        cidade: currentOrder.cidade, departamento: currentOrder.departamento,
        codigo_rastreamento: currentOrder.codigo_rastreamento, data_criacao: currentOrder.data_entrada,
        data_envio: currentOrder.data_envio || "", comprovante_url: currentOrder.comprovante_url || "",
        etiqueta_envio_url: currentOrder.etiqueta_envio_url || "",
        vendedor: currentOrder.vendedor || "", criativo: currentOrder.criativo || "",
        status_envio: value, pais: currentOrder.pais,
      });
    } catch (err) {
      console.error("Falha ao sincronizar status de envio:", err);
      toast.error("Falhou ao sincronizar com Google Sheets");
    }
  };

  const handleStatusCobChange = async (pedidoId: string, value: StatusCobranca) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, status_cobranca: value } : ped));
    toast.success(`Status de cobrança → "${statusCobrancaConfig[value].label}"`);
    try {
      await supabase.functions.invoke("sync-google-sheets", {
        body: {
          action: "update_status_cobranca",
          pedido: { pedido_id: pedidoId, status_cobranca: value },
        },
      });
    } catch (err) {
      console.error("Falha ao sincronizar status de cobrança:", err);
      toast.error("Falhou ao sincronizar com Google Sheets");
    }
  };

  const handleAttachmentChange = useCallback(async (
    pedidoId: string,
    field: "comprovante_url" | "etiqueta_envio_url",
    value: string | null,
  ) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    const updatedOrder = { ...currentOrder, [field]: value };
    setPedidos((prev) => prev.map((ped) => (ped.id === pedidoId ? updatedOrder : ped)));
    try {
      await updateOrderStatusInSheets({
        pedido_id: pedidoId, status_pagamento: updatedOrder.status_pagamento,
        data_pagamento: updatedOrder.data_pagamento, hora_pagamento: updatedOrder.hora_pagamento,
        nome: updatedOrder.nome, telefone: updatedOrder.telefone, cedula: updatedOrder.cedula,
        produto: updatedOrder.produto, quantidade: updatedOrder.quantidade, valor: updatedOrder.valor,
        cidade: updatedOrder.cidade, departamento: updatedOrder.departamento,
        codigo_rastreamento: updatedOrder.codigo_rastreamento, data_criacao: updatedOrder.data_entrada,
        data_envio: updatedOrder.data_envio || "", comprovante_url: updatedOrder.comprovante_url || "",
        etiqueta_envio_url: updatedOrder.etiqueta_envio_url || "",
        vendedor: updatedOrder.vendedor || "", criativo: updatedOrder.criativo || "",
        status_envio: updatedOrder.status_envio, pais: updatedOrder.pais,
      });
    } catch (err) {
      console.error("Falha ao sincronizar anexo:", err);
      toast.error("Arquivo enviado, mas falhou ao salvar no pedido");
    }
  }, [pedidos]);

  const handleDeleteOrder = async (pedidoId: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de "${nome}"?`)) return;
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    toast.success("Pedido excluído");
    try {
      await deleteOrderFromSheets(pedidoId);
      toast.success("Pedido excluído da planilha!");
    } catch (err) {
      console.error("Falha ao excluir da planilha:", err);
      toast.error("Pedido removido localmente, mas falhou ao excluir da planilha");
    }
  };

  const totalPedidos = filtered.length;
  const totalPagos = filtered.filter((p) => p.status_pagamento === "pago").length;
  const totalPendentes = filtered.filter((p) => p.status_pagamento === "pendente").length;
  const totalValor = filtered.reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, cédula, cidade ou rastreamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-2 border-primary/30 focus-visible:border-primary rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Pagamento: Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={envioFilter} onValueChange={setEnvioFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Truck className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Envio: Todos</SelectItem>
            <SelectItem value="não enviado">Não Enviado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="a retirar">A Retirar</SelectItem>
            <SelectItem value="retirado">Retirado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cobrancaFilter} onValueChange={setCobrancaFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <CircleDot className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Cobrança: Todos</SelectItem>
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
          </SelectContent>
        </Select>
      </div>

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
                <TableHead className="text-xs font-bold text-primary uppercase">Status Cobrança</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Comprovante</TableHead>
                {country === "UY" && <TableHead className="text-xs font-bold text-primary uppercase">Etiqueta de Envio</TableHead>}
                <TableHead className="text-xs font-bold text-primary uppercase">WPP Cobrança</TableHead>
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
                        onChange={async (code) => {
                          const updatedOrder = { ...p, codigo_rastreamento: code };
                          setPedidos(pedidos.map((ped) =>
                            ped.id === p.id ? updatedOrder : ped
                          ));
                          try {
                            await updateOrderStatusInSheets({
                              pedido_id: p.id, status_pagamento: p.status_pagamento,
                              data_pagamento: p.data_pagamento, hora_pagamento: p.hora_pagamento,
                              nome: p.nome, telefone: p.telefone, cedula: p.cedula,
                              produto: p.produto, quantidade: p.quantidade, valor: p.valor,
                              cidade: p.cidade, departamento: p.departamento,
                              codigo_rastreamento: code, data_criacao: p.data_entrada,
                              data_envio: p.data_envio || "", comprovante_url: p.comprovante_url || "",
                              etiqueta_envio_url: p.etiqueta_envio_url || "",
                              vendedor: p.vendedor || "", criativo: p.criativo || "",
                              status_envio: p.status_envio, pais: p.pais,
                            });
                          } catch (err) {
                            console.error("Falha ao sincronizar rastreamento:", err);
                            toast.error("Código salvo localmente, mas falhou ao sincronizar");
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select value={p.status_pagamento} onValueChange={(v: StatusPagamento) => handleStatusPagChange(p.id, v)}>
                          <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm", statusPagamentoConfig[p.status_pagamento]?.className)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={p.status_pagamento === "pago" ? "default" : "secondary"} className={cn("text-xs font-bold", statusPagamentoConfig[p.status_pagamento]?.className)}>
                          {statusPagamentoConfig[p.status_pagamento]?.label ?? p.status_pagamento}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
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
                      ) : (
                        <Badge variant="secondary" className={cn("text-xs font-bold", statusEnvioConfig[p.status_envio]?.className)}>
                          {statusEnvioConfig[p.status_envio]?.label ?? p.status_envio}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select value={p.status_cobranca || "pendente"} onValueChange={(v: StatusCobranca) => handleStatusCobChange(p.id, v)}>
                          <SelectTrigger className={cn("h-8 text-xs font-bold border-2 w-32 rounded-xl shadow-sm", statusCobrancaConfig[p.status_cobranca || "pendente"]?.className)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
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
                          onChange={(url) => handleAttachmentChange(p.id, "comprovante_url", url || null)}
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
                          onChange={(url) => handleAttachmentChange(p.id, "etiqueta_envio_url", url || null)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <WppCobrancaCell pedidoId={p.id} initialValue={p.wpp_cobranca || ""} />
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
                  <TableCell colSpan={country === "UY" ? 13 : 12} className="text-center py-12 text-muted-foreground">
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
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} orderId={selectedOrder?.id ?? null} orderName={selectedOrder?.nome ?? ""} onConfirm={handlePayment} />
    </div>
  );
};

export default Pedidos;
