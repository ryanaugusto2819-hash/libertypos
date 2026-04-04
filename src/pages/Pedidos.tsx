import { useState, useMemo, useCallback, useEffect } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerFilter, OwnerFilterValue } from "@/components/OwnerFilter";
import { Plus, Search, Filter, Package, CreditCard, Truck, CircleDot, Trash2, Loader2, Landmark, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { formatCurrency, formatDate, parseLocalDate, statusPagamentoConfig, statusEnvioConfig, statusCobrancaConfig, setActivePais, statusEnvioUY, statusEnvioBR } from "@/lib/formatters";
import { CreateOrderDialog } from "@/components/pedidos/CreateOrderDialog";
import { PaymentDialog } from "@/components/pedidos/PaymentDialog";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { TrackingCell } from "@/components/pedidos/TrackingCell";
import { ImageUploadCell } from "@/components/pedidos/ImageUploadCell";
import { WppCobrancaCell } from "@/components/pedidos/WppCobrancaCell";
import { supabase } from "@/integrations/supabase/client";

const ATTENDANCE_TRIGGER_STATUSES = ["a enviar", "enviado", "entregue"];


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
  const [dateFilter, setDateFilter] = useState<string>("todos");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  useEffect(() => { setActivePais(country); }, [country]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: dbRows, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("data_entrada", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const orders: Pedido[] = (dbRows || []).map((row: any) => ({
        id: row.id,
        nome: row.nome,
        telefone: row.telefone,
        cedula: row.cedula,
        produto: row.produto,
        quantidade: row.quantidade,
        valor: Number(row.valor),
        cidade: row.cidade,
        departamento: row.departamento,
        codigo_rastreamento: row.codigo_rastreamento,
        status_pagamento: row.status_pagamento,
        status_envio: row.status_envio,
        data_entrada: row.data_entrada,
        data_envio: row.data_envio,
        data_pagamento: row.data_pagamento,
        hora_pagamento: row.hora_pagamento,
        comprovante_url: row.comprovante_url,
        etiqueta_envio_url: row.etiqueta_envio_url,
        observacoes: row.observacoes || "",
        vendedor: row.vendedor,
        criativo: row.criativo,
        pais: row.pais,
        user_id: row.user_id,
        wpp_cobranca: row.wpp_cobranca,
        status_cobranca: row.status_cobranca,
        afiliado_id: row.user_id,
        cep: row.cep,
        rua: row.rua,
        numero: row.numero,
        complemento: row.complemento,
        bairro: row.bairro,
        email: row.email,
        valor_frete: Number(row.valor_frete ?? 0),
        forma_pagamento: row.forma_pagamento || "",
        plataforma: row.plataforma || "",
        conta_shopee: (row as any).conta_shopee || "",
      }));

      setPedidos(orders);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
      toast.error("Falha ao carregar pedidos");
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

      // Date filter
      let matchDate = true;
      if (dateFilter !== "todos") {
        const entryDate = parseLocalDate(p.data_entrada);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dateFilter === "7") {
          const from = new Date(today);
          from.setDate(from.getDate() - 7);
          from.setHours(0, 0, 0, 0);
          matchDate = entryDate >= from && entryDate <= today;
        } else if (dateFilter === "15") {
          const from = new Date(today);
          from.setDate(from.getDate() - 15);
          from.setHours(0, 0, 0, 0);
          matchDate = entryDate >= from && entryDate <= today;
        } else if (dateFilter === "30") {
          const from = new Date(today);
          from.setDate(from.getDate() - 30);
          from.setHours(0, 0, 0, 0);
          matchDate = entryDate >= from && entryDate <= today;
        } else if (dateFilter === "custom") {
          if (customDateFrom) {
            const from = new Date(customDateFrom);
            from.setHours(0, 0, 0, 0);
            matchDate = entryDate >= from;
          }
          if (matchDate && customDateTo) {
            const to = new Date(customDateTo);
            to.setHours(23, 59, 59, 999);
            matchDate = entryDate <= to;
          }
        }
      }

      return matchCountry && matchSearch && matchStatus && matchEnvio && matchCobranca && matchOwner && matchDate;
    });
  }, [pedidos, search, statusFilter, envioFilter, cobrancaFilter, country, isAdmin, ownerFilter, user, dateFilter, customDateFrom, customDateTo]);

  const handleCreateOrder = async (newOrder: Omit<Pedido, "id">) => {
    try {
      const { data: insertedRow, error: dbError } = await supabase.from("pedidos").insert({
        user_id: user!.id,
        nome: newOrder.nome,
        telefone: newOrder.telefone,
        cedula: newOrder.cedula,
        produto: newOrder.produto,
        quantidade: newOrder.quantidade,
        valor: newOrder.valor,
        cidade: newOrder.cidade,
        departamento: newOrder.departamento,
        codigo_rastreamento: newOrder.codigo_rastreamento,
        status_pagamento: newOrder.status_pagamento,
        status_envio: newOrder.status_envio,
        data_entrada: newOrder.data_entrada,
        data_envio: newOrder.data_envio,
        observacoes: newOrder.observacoes,
        vendedor: newOrder.vendedor,
        criativo: newOrder.criativo,
        pais: newOrder.pais,
        cep: newOrder.cep || "",
        rua: newOrder.rua || "",
        numero: newOrder.numero || "",
        complemento: newOrder.complemento || "",
        bairro: newOrder.bairro || "",
        email: newOrder.email || "",
        plataforma: newOrder.plataforma || "",
        conta_shopee: newOrder.conta_shopee || "",
      }).select().single();

      if (dbError) throw dbError;

      const realId = insertedRow.id;
      const order: Pedido = { ...newOrder, id: realId, afiliado_id: user?.id };
      setPedidos((prev) => [order, ...prev]);

      toast.success("Pedido criado com sucesso!");

      supabase.functions.invoke("send-webhook", {
        body: { pedido: { ...order, id: realId } },
      }).catch((err) => {
        console.warn("Webhook falhou:", err.message);
      });

      if (order.pais === "BR" && ATTENDANCE_TRIGGER_STATUSES.includes(order.status_envio.toLowerCase())) {
        supabase.functions.invoke("send-attendance-webhook", {
          body: {
            pedido: { ...order, id: realId },
            new_status: order.status_envio,
          },
        }).catch((err) => {
          console.warn("Webhook de atendimento falhou:", err.message);
        });
      }
    } catch (err) {
      console.error("Falha ao criar pedido:", err);
      toast.error("Erro ao criar pedido");
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
      const { error: dbError } = await supabase.from("pedidos").update({
        status_pagamento: "pago",
        data_pagamento: dataPagamento,
        hora_pagamento: horaPagamento,
      }).eq("id", orderId);
      if (dbError) throw dbError;
      toast.success("Status atualizado!");
    } catch (err) {
      console.error("Falha ao atualizar status:", err);
      toast.error("Falha ao atualizar status de pagamento");
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
      const { error: dbError } = await supabase.from("pedidos").update({
        status_pagamento: value,
        data_pagamento: dataPagamento,
        hora_pagamento: horaPagamento,
      }).eq("id", pedidoId);
      if (dbError) throw dbError;
    } catch (err) {
      console.error("Falha ao atualizar status de pagamento:", err);
      toast.error("Falha ao atualizar status de pagamento");
    }
  };

  const handleStatusEnvChange = async (pedidoId: string, value: StatusEnvio) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, status_envio: value } : ped));
    toast.success(`Status de envio → "${statusEnvioConfig[value].label}"`);
    try {
      const { error: dbError } = await supabase.from("pedidos").update({ status_envio: value }).eq("id", pedidoId);
      if (dbError) throw dbError;
    } catch (err) {
      console.error("Falha ao atualizar status de envio:", err);
      toast.error("Falha ao atualizar status de envio");
    }

    if (currentOrder.pais === "BR" && ATTENDANCE_TRIGGER_STATUSES.includes(value.toLowerCase())) {
      supabase.functions.invoke("send-attendance-webhook", {
        body: {
          pedido: { ...currentOrder, status_envio: value },
          new_status: value,
        },
      }).catch((err) => {
        console.warn("Webhook de atendimento falhou:", err.message);
      });
    }
  };

  const handleStatusCobChange = async (pedidoId: string, value: StatusCobranca) => {
    const currentOrder = pedidos.find((p) => p.id === pedidoId);
    if (!currentOrder) return;
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, status_cobranca: value } : ped));
    toast.success(`Status de cobrança → "${statusCobrancaConfig[value].label}"`);
    try {
      const { error: dbError } = await supabase
        .from("pedidos")
        .update({ status_cobranca: value })
        .eq("id", pedidoId);
      if (dbError) throw dbError;
    } catch (err) {
      console.error("Falha ao atualizar status de cobrança:", err);
      toast.error("Falha ao atualizar status de cobrança");
    }
  };

  const handleContaBancariaChange = async (pedidoId: string, value: string) => {
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, conta_bancaria: value } : ped));
    toast.success(`Conta bancária → "${value}"`);
  };

  const handleFormaPagamentoChange = async (pedidoId: string, value: string) => {
    setPedidos(pedidos.map((ped) => ped.id === pedidoId ? { ...ped, forma_pagamento: value } : ped));
    toast.success(`Forma de pagamento → "${value.toUpperCase()}"`);
    try {
      const { error: dbError } = await supabase.from("pedidos").update({ forma_pagamento: value }).eq("id", pedidoId);
      if (dbError) throw dbError;
    } catch (err) {
      console.error("Falha ao atualizar forma de pagamento:", err);
      toast.error("Falhou ao salvar forma de pagamento");
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
      const { error: dbError } = await supabase.from("pedidos").update({ [field]: value }).eq("id", pedidoId);
      if (dbError) throw dbError;
    } catch (err) {
      console.error("Falha ao salvar anexo:", err);
      toast.error("Arquivo enviado, mas falhou ao salvar no pedido");
    }
  }, [pedidos]);

  const handleDeleteOrder = async (pedidoId: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de "${nome}"?`)) return;
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    try {
      const { error: dbError } = await supabase.from("pedidos").delete().eq("id", pedidoId);
      if (dbError) throw dbError;
      toast.success("Pedido excluído!");
    } catch (err) {
      console.error("Falha ao excluir:", err);
      toast.error("Falha ao excluir pedido");
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
            {(country === "BR" ? statusEnvioBR : statusEnvioUY).map((s) => (
              <SelectItem key={s} value={s}>{statusEnvioConfig[s]?.label ?? s}</SelectItem>
            ))}
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {[
            { label: "Todos", value: "todos" },
            { label: "7 dias", value: "7" },
            { label: "15 dias", value: "15" },
            { label: "30 dias", value: "30" },
          ].map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={dateFilter === opt.value ? "default" : "outline"}
              className="h-8 rounded-lg text-xs font-semibold"
              onClick={() => {
                setDateFilter(opt.value);
                if (opt.value !== "custom") {
                  setCustomDateFrom(undefined);
                  setCustomDateTo(undefined);
                }
              }}
            >
              {opt.label}
            </Button>
          ))}
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={dateFilter === "custom" ? "default" : "outline"}
                className="h-8 rounded-lg text-xs font-semibold"
                onClick={() => setDateFilter("custom")}
              >
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Data Início</p>
                <CalendarComponent
                  mode="single"
                  selected={customDateFrom}
                  onSelect={setCustomDateFrom}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Data Fim</p>
                <CalendarComponent
                  mode="single"
                  selected={customDateTo}
                  onSelect={setCustomDateTo}
                  className="rounded-md border"
                />
              </div>
              <Button size="sm" className="w-full" onClick={() => setCustomPopoverOpen(false)}>
                Aplicar
              </Button>
            </PopoverContent>
          </Popover>
        </div>
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
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Cliente</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Cédula</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Telefone</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Produto</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Valor</TableHead>
                {country === "BR" && <TableHead className="text-xs font-bold text-primary uppercase text-right">Frete</TableHead>}
                <TableHead className="text-xs font-bold text-primary uppercase">Cidade</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Rastreamento</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Pagamento</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Forma Pgto</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Envio</TableHead>
                {country === "BR" && <TableHead className="text-xs font-bold text-primary uppercase">Plataforma</TableHead>}
                {country === "BR" && <TableHead className="text-xs font-bold text-primary uppercase">Conta Shopee</TableHead>}
                <TableHead className="text-xs font-bold text-primary uppercase">Status Cobrança</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Comprovante</TableHead>
                {country === "UY" && <TableHead className="text-xs font-bold text-primary uppercase">Etiqueta de Envio</TableHead>}
                <TableHead className="text-xs font-bold text-primary uppercase">WPP Cobrança</TableHead>
                {country !== "BR" && <TableHead className="text-xs font-bold text-primary uppercase">Conta Bancária</TableHead>}
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
                      <TrackingCell
                        value={p.codigo_rastreamento}
                        onChange={async (code) => {
                          const updatedOrder = { ...p, codigo_rastreamento: code };
                          setPedidos(pedidos.map((ped) =>
                            ped.id === p.id ? updatedOrder : ped
                          ));
                          try {
                              const { error: dbError } = await supabase
                                .from("pedidos")
                                .update({ codigo_rastreamento: code })
                                .eq("id", p.id);
                              if (dbError) throw dbError;
                          } catch (err) {
                            console.error("Falha ao salvar rastreamento:", err);
                            toast.error("Falha ao salvar código de rastreamento");
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
                      <Select value={p.forma_pagamento || ""} onValueChange={(v) => handleFormaPagamentoChange(p.id, v)}>
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
                      {isAdmin ? (
                        <Select value={p.status_envio} onValueChange={(v: StatusEnvio) => handleStatusEnvChange(p.id, v)}>
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
                    {country === "BR" && (
                      <TableCell>
                        <Select
                          value={p.plataforma || ""}
                          onValueChange={async (v) => {
                            setPedidos(pedidos.map((ped) => ped.id === p.id ? { ...ped, plataforma: v } : ped));
                            try {
                              const { error } = await supabase.from("pedidos").update({ plataforma: v }).eq("id", p.id);
                              if (error) throw error;
                              toast.success(`Plataforma → ${v}`);
                            } catch (err) {
                              console.error("Falha ao atualizar plataforma:", err);
                              toast.error("Falha ao salvar plataforma");
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOGZZ">LOGZZ</SelectItem>
                            <SelectItem value="SHOPEE">SHOPEE</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    {country === "BR" && (
                      <TableCell>
                        {p.plataforma === "SHOPEE" ? (
                          <Input
                            className="h-8 text-xs w-28"
                            value={p.conta_shopee || ""}
                            placeholder="Código"
                            onChange={(e) => {
                              const val = e.target.value;
                              setPedidos(pedidos.map((ped) => ped.id === p.id ? { ...ped, conta_shopee: val } : ped));
                            }}
                            onBlur={async (e) => {
                              try {
                                const { error } = await supabase.from("pedidos").update({ conta_shopee: e.target.value } as any).eq("id", p.id);
                                if (error) throw error;
                              } catch (err) {
                                console.error("Falha ao salvar conta shopee:", err);
                                toast.error("Falha ao salvar conta");
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {isAdmin ? (
                        <Select value={p.status_cobranca || "pendente"} onValueChange={(v: StatusCobranca) => handleStatusCobChange(p.id, v)}>
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
                    {country !== "BR" && (
                      <TableCell>
                        <Select value={p.conta_bancaria || ""} onValueChange={(v) => handleContaBancariaChange(p.id, v)}>
                          <SelectTrigger className="h-8 text-xs font-bold border-2 w-28 rounded-xl shadow-sm">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pablo">Pablo</SelectItem>
                            <SelectItem value="Mulher">Mulher</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
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
                  <TableCell colSpan={20} className="text-center py-12 text-muted-foreground">
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
