import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Truck,
  Send,
  AlertTriangle,
  DollarSign,
  Wallet,
  CalendarClock,
  Calendar,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FinanceCard } from "@/components/dashboard/FinanceCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { mockPedidos } from "@/data/mockData";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type FilterOption = "hoje" | "7" | "15" | "30" | "custom";

const filterLabels: Record<FilterOption, string> = {
  hoje: "Hoje",
  "7": "Últimos 7 dias",
  "15": "Últimos 15 dias",
  "30": "Últimos 30 dias",
  custom: "Personalizado",
};

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filteredPedidos = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (activeFilter === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return mockPedidos.filter((p) => {
        const d = new Date(p.data_entrada);
        return d >= start && d <= end;
      });
    }

    if (activeFilter === "custom") return mockPedidos;

    const daysMap: Record<string, number> = { hoje: 0, "7": 7, "15": 15, "30": 30 };
    const days = daysMap[activeFilter];
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    return mockPedidos.filter((p) => {
      const d = new Date(p.data_entrada);
      return d >= start && d <= now;
    });
  }, [activeFilter, customStart, customEnd]);

  const total = filteredPedidos.length;
  const pagos = filteredPedidos.filter((p) => p.status_pagamento === "pago");
  const entregues = filteredPedidos.filter((p) => p.status_pagamento === "entregue");
  const enviados = filteredPedidos.filter((p) => p.status_pagamento === "enviado");
  const inadimplentes = filteredPedidos.filter((p) => p.status_pagamento === "inadimplente");

  const totalRecebido = pagos.reduce((sum, p) => sum + p.valor, 0);
  const totalAReceber = [...entregues, ...enviados, ...inadimplentes].reduce(
    (sum, p) => sum + p.valor,
    0
  );
  const totalAgendado = entregues.reduce((sum, p) => sum + p.valor, 0);

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
          {(["hoje", "7", "15", "30"] as FilterOption[]).map((opt) => (
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
                <Calendar className="h-3 w-3" />
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
              <p className="text-xs font-medium text-muted-foreground">Selecione o período</p>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => { setCustomStart(e.target.value); setActiveFilter("custom"); }}
                  className="text-xs h-8"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => { setCustomEnd(e.target.value); setActiveFilter("custom"); }}
                  className="text-xs h-8"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Pedidos Pagos"
          value={pagos.length}
          percentage={Math.round((pagos.length / total) * 100)}
          icon={CheckCircle2}
          variant="success"
          trend="up"
          delay={0}
        />
        <KpiCard
          title="Pedidos Entregues"
          value={entregues.length}
          percentage={Math.round((entregues.length / total) * 100)}
          icon={Truck}
          variant="warning"
          trend="neutral"
          delay={100}
        />
        <KpiCard
          title="Pedidos Enviados"
          value={enviados.length}
          percentage={Math.round((enviados.length / total) * 100)}
          icon={Send}
          variant="info"
          trend="up"
          delay={200}
        />
        <KpiCard
          title="Inadimplentes"
          value={inadimplentes.length}
          percentage={Math.round((inadimplentes.length / total) * 100)}
          icon={AlertTriangle}
          variant="danger"
          trend="down"
          delay={300}
        />
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceCard
          title="Total Recebido"
          value={formatCurrency(totalRecebido)}
          subtitle={`${pagos.length} pedidos pagos`}
          icon={Wallet}
          variant="received"
          delay={200}
        />
        <FinanceCard
          title="Total a Receber"
          value={formatCurrency(totalAReceber)}
          subtitle={`${total - pagos.length} pedidos pendentes`}
          icon={DollarSign}
          variant="pending"
          delay={300}
        />
        <FinanceCard
          title="Agendado para Hoje"
          value={formatCurrency(totalAgendado)}
          subtitle={`${entregues.length} pedidos entregues`}
          icon={CalendarClock}
          variant="scheduled"
          delay={400}
        />
      </div>

      {/* Charts */}
      <DashboardCharts pedidos={filteredPedidos} />
    </div>
  );
};

export default Dashboard;
