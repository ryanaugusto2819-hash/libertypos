import {
  CheckCircle2,
  Truck,
  Send,
  AlertTriangle,
  DollarSign,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FinanceCard } from "@/components/dashboard/FinanceCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { mockPedidos } from "@/data/mockData";
import { formatCurrency } from "@/lib/formatters";

const Dashboard = () => {
  const total = mockPedidos.length;
  const pagos = mockPedidos.filter((p) => p.status_pagamento === "pago");
  const entregues = mockPedidos.filter((p) => p.status_pagamento === "entregue");
  const enviados = mockPedidos.filter((p) => p.status_pagamento === "enviado");
  const inadimplentes = mockPedidos.filter((p) => p.status_pagamento === "inadimplente");

  const totalRecebido = pagos.reduce((sum, p) => sum + p.valor, 0);
  const totalAReceber = [...entregues, ...enviados, ...inadimplentes].reduce(
    (sum, p) => sum + p.valor,
    0
  );
  const totalAgendado = entregues.reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Cobranças</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do sistema de cobranças pós-pagamento
        </p>
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
      <DashboardCharts />
    </div>
  );
};

export default Dashboard;
