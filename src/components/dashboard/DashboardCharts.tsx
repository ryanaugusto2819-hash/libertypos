import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const paymentRateData = [
  { name: "Pagos", value: 40, fill: "hsl(142, 71%, 45%)" },
  { name: "Entregues", value: 20, fill: "hsl(38, 92%, 50%)" },
  { name: "Enviados", value: 20, fill: "hsl(217, 91%, 60%)" },
  { name: "Inadimplentes", value: 20, fill: "hsl(0, 72%, 51%)" },
];

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

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {/* Payment Distribution */}
      <Card className="glass-card animate-fade-in" style={{ animationDelay: "400ms" }}>
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
  );
}
