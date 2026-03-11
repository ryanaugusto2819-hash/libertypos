// DashboardCharts - receives filtered pedidos
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Truck, Package, PackageX, BarChart3 } from "lucide-react";
import { Pedido } from "@/types/pedido";

interface DashboardChartsProps {
  pedidos: Pedido[];
}

const dailyData = [
  { dia: "Seg", recebido: 120000, meta: 150000 },
  { dia: "Ter", recebido: 180000, meta: 150000 },
  { dia: "Qua", recebido: 95000, meta: 150000 },
  { dia: "Qui", recebido: 210000, meta: 150000 },
  { dia: "Sex", recebido: 160000, meta: 150000 },
  { dia: "Sáb", recebido: 89000, meta: 150000 },
  { dia: "Dom", recebido: 45000, meta: 150000 },
];

const defaultRateData = [
  { mes: "Jan", taxa: 12 },
  { mes: "Fev", taxa: 15 },
  { mes: "Mar", taxa: 10 },
  { mes: "Abr", taxa: 8 },
  { mes: "Mai", taxa: 18 },
  { mes: "Jun", taxa: 14 },
];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DashboardCharts({ pedidos = [] }: DashboardChartsProps) {
  const total = pedidos.length || 0;
  const pagos = pedidos.filter((p) => p.status_pagamento === "pago").length;
  const pendentes = pedidos.filter((p) => p.status_pagamento === "pendente").length;
  const retirados = pedidos.filter((p) => p.status_envio === "retirado").length;
  const aRetirar = pedidos.filter((p) => p.status_envio === "a retirar").length;
  const enviados = pedidos.filter((p) => p.status_envio === "enviado").length;
  const naoEnviados = pedidos.filter((p) => p.status_envio === "não enviado").length;

  const entreguesERetirados = retirados + pagos;
  const percPagosVsEntregues = entreguesERetirados > 0 ? Math.round((pagos / entreguesERetirados) * 100) : 0;

  const entreguesRetiradosJuntos = retirados + aRetirar + pagos;
  const percPagosVsEntreguesRetirados = entreguesRetiradosJuntos > 0 ? Math.round((pagos / entreguesRetiradosJuntos) * 100) : 0;

  const totalEntEnvRet = retirados + enviados + aRetirar + pagos;
  const percPagosVsTodos = totalEntEnvRet > 0 ? Math.round((pagos / totalEntEnvRet) * 100) : 0;

  const paymentRateData = [
    { name: `Pagos (${total > 0 ? Math.round((pagos / total) * 100) : 0}%)`, value: pagos, fill: "hsl(142, 71%, 45%)" },
    { name: `Retirados (${total > 0 ? Math.round((retirados / total) * 100) : 0}%)`, value: retirados, fill: "hsl(38, 92%, 50%)" },
    { name: `Enviados (${total > 0 ? Math.round((enviados / total) * 100) : 0}%)`, value: enviados, fill: "hsl(217, 91%, 60%)" },
    { name: `A Retirar (${total > 0 ? Math.round((aRetirar / total) * 100) : 0}%)`, value: aRetirar, fill: "hsl(280, 60%, 55%)" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Payment Rate Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="glass-card animate-fade-in border-emerald-500/30 bg-emerald-500/5" style={{ animationDelay: "350ms" }}>
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Truck className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">% Pagamento vs Retirado</p>
              <p className="text-3xl font-bold text-emerald-400">{percPagosVsEntregues}%</p>
              <p className="text-xs text-muted-foreground mt-1">{pagos} pagos de {entreguesERetirados} retirados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card animate-fade-in border-blue-500/30 bg-blue-500/5" style={{ animationDelay: "400ms" }}>
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Package className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">% Pagamento vs Retirado + A Retirar</p>
              <p className="text-3xl font-bold text-blue-400">{percPagosVsEntreguesRetirados}%</p>
              <p className="text-xs text-muted-foreground mt-1">{pagos} pagos de {entreguesRetiradosJuntos} retirados/a retirar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card animate-fade-in border-violet-500/30 bg-violet-500/5" style={{ animationDelay: "450ms" }}>
          <CardContent className="p-6 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <BarChart3 className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">% Pagamento vs Entregues + Enviados + Retirados</p>
              <p className="text-3xl font-bold text-violet-400">{percPagosVsTodos}%</p>
              <p className="text-xs text-muted-foreground mt-1">{pagos} pagos de {totalEntEnvRet} total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Pedidos Não Enviados */}
      <Card className="glass-card animate-fade-in border-orange-500/30 bg-orange-500/5" style={{ animationDelay: "500ms" }}>
        <CardContent className="p-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <PackageX className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Pedidos Não Enviados</p>
            <p className="text-3xl font-bold text-orange-400">{naoEnviados}</p>
            <p className="text-xs text-muted-foreground mt-1">{total > 0 ? Math.round((naoEnviados / total) * 100) : 0}% do total de pedidos</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Payment Distribution */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: "450ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distribuição de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {paymentRateData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                    color: "hsl(213, 31%, 91%)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [`${value} pedidos`, name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Revenue */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: "500ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebimentos Diários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                    color: "hsl(213, 31%, 91%)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) =>
                    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value)
                  }
                />
                <Bar dataKey="recebido" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Default Rate */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: "600ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Inadimplência (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={defaultRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 65%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                    color: "hsl(213, 31%, 91%)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => `${value}%`}
                />
                <Line
                  type="monotone"
                  dataKey="taxa"
                  stroke="hsl(0, 72%, 51%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(0, 72%, 51%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
