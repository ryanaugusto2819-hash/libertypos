import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate, setActivePais, nowInSaoPaulo, todayInSaoPaulo } from "@/lib/formatters";
import { useCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerFilter, OwnerFilterValue } from "@/components/OwnerFilter";
import { fetchOrdersFromSheets } from "@/lib/googleSheets";
import {
  CheckCircle2, Truck, Send, AlertTriangle, DollarSign, Wallet,
  CalendarClock, CalendarIcon, Loader2, CreditCard, QrCode, FileText,
  PackageCheck,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FinanceCard } from "@/components/dashboard/FinanceCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Pedido } from "@/types/pedido";
import { toast } from "sonner";

type FilterOption = "hoje" | "ontem" | "7" | "15" | "30" | "custom";
type DateField = "data_entrada" | "data_pagamento";

const filterLabels: Record<FilterOption, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7": "Últimos 7 dias",
  "15": "Últimos 15 dias",
  "30": "Últimos 30 dias",
  custom: "Personalizado",
};

const Dashboard = () => {
  const { country } = useCountry();
  const { user, isAdmin } = useAuth();
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("30");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterValue>("todos");
  const [dateField, setDateField] = useState<DateField>("data_entrada");

  useEffect(() => { setActivePais(country); }, [country]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Load from Google Sheets
        const sheetsOrders = await fetchOrdersFromSheets();
        
        // Also load from database to catch webhook-created orders not yet in Sheets
        const { data: dbRows } = await supabase
          .from("pedidos")
          .select("*")
          .order("created_at", { ascending: false });
        
        const dbOrders: Pedido[] = (dbRows || []).map((row: any) => ({
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
          afiliado_id: row.user_id,
          cep: row.cep,
          rua: row.rua,
          numero: row.numero,
          complemento: row.complemento,
          bairro: row.bairro,
          email: row.email,
          forma_pagamento: row.forma_pagamento || "",
          valor_frete: Number(row.valor_frete ?? 0),
        }));
        
        // Merge: use Sheets as primary, add DB orders not found in Sheets
        const sheetsIds = new Set(sheetsOrders.map((o) => o.id));
        const dbOnlyOrders = dbOrders.filter((o) => !sheetsIds.has(o.id));
        
        setAllPedidos([...sheetsOrders, ...dbOnlyOrders]);
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        toast.error("Falha ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredPedidos = useMemo(() => {
    let list = allPedidos.filter((p) => p.pais === country);

    // Afiliado: only their own orders
    if (!isAdmin) {
      list = list.filter((p) => p.afiliado_id === user?.id);
    } else {
      // Admin: filter by owner
      if (ownerFilter === "meus") {
        list = list.filter((p) => !p.afiliado_id || p.afiliado_id === "" || p.afiliado_id === user?.id);
      } else if (ownerFilter === "afiliados") {
        list = list.filter((p) => !!p.afiliado_id && p.afiliado_id !== "" && p.afiliado_id !== user?.id);
      }
    }

    const now = nowInSaoPaulo();
    now.setHours(23, 59, 59, 999);

    const getDateValue = (p: Pedido): Date | null => {
      if (dateField === "data_pagamento") {
        return p.data_pagamento ? parseLocalDate(p.data_pagamento) : null;
      }
      return parseLocalDate(p.data_entrada);
    };

    if (activeFilter === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return list.filter((p) => {
        const d = getDateValue(p);
        return d && d >= start && d <= end;
      });
    }

    if (activeFilter === "custom") return list;

    if (activeFilter === "ontem") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return list.filter((p) => {
        const d = getDateValue(p);
        return d && d >= yesterday && d <= yesterdayEnd;
      });
    }

    const daysMap: Record<string, number> = { hoje: 0, "7": 7, "15": 15, "30": 30 };
    const days = daysMap[activeFilter];
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    return list.filter((p) => {
      const d = getDateValue(p);
      return d && d >= start && d <= now;
    });
  }, [activeFilter, customStart, customEnd, allPedidos, country, isAdmin, ownerFilter, user, dateField]);

  const total = filteredPedidos.length;
  const pagos = filteredPedidos.filter((p) => p.status_pagamento === "pago");
  const pendentes = filteredPedidos.filter((p) => p.status_pagamento === "pendente");
  const retirados = filteredPedidos.filter((p) => p.status_envio === "retirado");
  const aRetirar = filteredPedidos.filter((p) => p.status_envio === "a retirar");
  const enviados = filteredPedidos.filter((p) => p.status_envio === "enviado");

  const totalRecebido = pagos.reduce((sum, p) => sum + p.valor, 0);
  const totalAReceber = pendentes.reduce((sum, p) => sum + p.valor, 0);
  const totalFaturamento = filteredPedidos.reduce((sum, p) => sum + p.valor, 0);

  const pagosPix = pagos.filter((p) => p.forma_pagamento?.toLowerCase() === "pix");
  const pagosCartao = pagos.filter((p) => p.forma_pagamento?.toLowerCase() === "cartão" || p.forma_pagamento?.toLowerCase() === "cartao");
  const pagosBoleto = pagos.filter((p) => p.forma_pagamento?.toLowerCase() === "boleto");
  const totalPix = pagosPix.reduce((sum, p) => sum + p.valor, 0);
  const totalCartao = pagosCartao.reduce((sum, p) => sum + p.valor, 0);
  const totalBoleto = pagosBoleto.reduce((sum, p) => sum + p.valor, 0);
  const totalFrete = filteredPedidos.reduce((sum, p) => sum + (p.valor_frete || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Cobranças</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do sistema de cobranças pós-pagamento
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <Button
              size="sm"
              variant={dateField === "data_entrada" ? "default" : "outline"}
              onClick={() => setDateField("data_entrada")}
              className="text-xs"
            >
              Data Entrada
            </Button>
            <Button
              size="sm"
              variant={dateField === "data_pagamento" ? "default" : "outline"}
              onClick={() => setDateField("data_pagamento")}
              className="text-xs"
            >
              Data Pagamento
            </Button>
          </div>
          <OwnerFilter value={ownerFilter} onChange={setOwnerFilter} />
          {(["hoje", "ontem", "7", "15", "30"] as FilterOption[]).map((opt) => (
            <Button
              key={opt}
              size="sm"
              variant={activeFilter === opt ? "default" : "outline"}
              onClick={() => setActiveFilter(opt)}
              className="text-xs"
            >
              {filterLabels[opt]}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={activeFilter === "custom" ? "default" : "outline"}
                onClick={() => setActiveFilter("custom")}
                className="text-xs gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                {activeFilter === "custom" && customStart && customEnd
                  ? `${format(customStart, "dd/MM")} - ${format(customEnd, "dd/MM")}`
                  : "Personalizado"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
              <p className="text-xs font-medium text-muted-foreground">Data Início</p>
              <Calendar mode="single" selected={customStart} onSelect={(date) => { setCustomStart(date); setActiveFilter("custom"); }} initialFocus className={cn("p-3 pointer-events-auto")} />
              <p className="text-xs font-medium text-muted-foreground">Data Fim</p>
              <Calendar mode="single" selected={customEnd} onSelect={(date) => { setCustomEnd(date); setActiveFilter("custom"); }} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Pedidos Pagos" value={pagos.length} percentage={total ? Math.round((pagos.length / total) * 100) : 0} icon={CheckCircle2} variant="success" trend="up" delay={0} />
        <KpiCard title="Pedidos Retirados" value={retirados.length} percentage={total ? Math.round((retirados.length / total) * 100) : 0} icon={Truck} variant="warning" trend="neutral" delay={100} />
        <KpiCard title="Pedidos Enviados" value={enviados.length} percentage={total ? Math.round((enviados.length / total) * 100) : 0} icon={Send} variant="info" trend="up" delay={200} />
        <KpiCard title="A Retirar" value={aRetirar.length} percentage={total ? Math.round((aRetirar.length / total) * 100) : 0} icon={AlertTriangle} variant="danger" trend="down" delay={300} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceCard title="Total Recebido" value={formatCurrency(totalRecebido)} subtitle={`${pagos.length} pedidos pagos`} icon={Wallet} variant="received" delay={200} />
        <FinanceCard title="Total a Receber" value={formatCurrency(totalAReceber)} subtitle={`${total - pagos.length} pedidos pendentes`} icon={DollarSign} variant="pending" delay={300} />
        <FinanceCard title="Receita Agendada (Faturamento)" value={formatCurrency(totalFaturamento)} subtitle={`${total} pedidos no período`} icon={CalendarClock} variant="scheduled" delay={400} />
      </div>

      {country === "BR" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceCard title="Total Recebido via PIX" value={formatCurrency(totalPix)} subtitle={`${pagosPix.length} pedidos pagos`} icon={QrCode} variant="pix" delay={500} />
          <FinanceCard title="Total Recebido via Cartão" value={formatCurrency(totalCartao)} subtitle={`${pagosCartao.length} pedidos pagos`} icon={CreditCard} variant="cartao" delay={600} />
          <FinanceCard title="Total Recebido via Boleto" value={formatCurrency(totalBoleto)} subtitle={`${pagosBoleto.length} pedidos pagos`} icon={FileText} variant="boleto" delay={700} />
        </div>
      )}

      {country === "BR" && (
        <div className="flex gap-3">
          <div className="rounded-2xl border border-primary/20 bg-card px-5 py-3 flex items-center gap-3 shadow-md">
            <PackageCheck className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Frete</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(totalFrete)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card px-5 py-3 flex items-center gap-3 shadow-md">
            <PackageCheck className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo Produtos</p>
              <p className="text-sm font-bold text-foreground">
                {filteredPedidos.reduce((sum, p) => sum + p.quantidade, 0)} un × R$ 13,00 = {formatCurrency(filteredPedidos.reduce((sum, p) => sum + p.quantidade, 0) * 13)}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
