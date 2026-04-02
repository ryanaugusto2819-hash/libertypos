import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatARS, formatBRLFromARS, formatUSD, arsToUsd } from "@/lib/formatters";
import { Pedido } from "@/types/pedido";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Wallet, ArrowDownToLine, Clock, CheckCircle2, Loader2, DollarSign, TrendingUp, BanknoteIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Saque {
  id: string;
  user_id: string;
  valor: number;
  status: string;
  data_solicitacao: string;
  data_pagamento: string | null;
  observacoes: string;
}

const statusSaqueConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  pago: { label: "Pago", variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

const Financeiro = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saqueValor, setSaqueValor] = useState("");
  const [saqueObs, setSaqueObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: pedidosData }, { data: saquesData }] = await Promise.all([
        supabase.from("pedidos").select("*").eq("user_id", user.id).eq("pais", "AR"),
        supabase
          .from("saques")
          .select("*")
          .eq("user_id", user.id)
          .order("data_solicitacao", { ascending: false }),
      ]);
      setPedidos((pedidosData || []).map((row: any) => ({
        ...row,
        valor: Number(row.valor),
        valor_frete: Number(row.valor_frete ?? 0),
        afiliado_id: row.user_id,
      })));
      setSaques((saquesData as Saque[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const financials = useMemo(() => {
    const totalVendas = pedidos.reduce((s, p) => s + p.valor, 0);
    const totalPago = pedidos.filter((p) => p.status_pagamento === "pago").reduce((s, p) => s + p.valor, 0);
    const totalPendente = pedidos.filter((p) => p.status_pagamento === "pendente").reduce((s, p) => s + p.valor, 0);
    const totalSacado = saques
      .filter((s) => s.status === "pago" || s.status === "aprovado")
      .reduce((s, item) => s + item.valor, 0);
    const saldoDisponivel = totalPago - totalSacado;

    return { totalVendas, totalPago, totalPendente, totalSacado, saldoDisponivel };
  }, [pedidos, saques]);

  const handleSolicitarSaque = async () => {
    if (!user) return;
    const valor = parseFloat(saqueValor);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (valor > financials.saldoDisponivel) {
      toast.error("Valor excede o saldo disponível");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("saques").insert({
      user_id: user.id,
      valor,
      observacoes: saqueObs,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao solicitar saque");
      return;
    }
    toast.success("Saque solicitado com sucesso!");
    setDialogOpen(false);
    setSaqueValor("");
    setSaqueObs("");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium">Carregando dados financeiros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe seus ganhos e solicite saques
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Solicitar Saque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo disponível</p>
                <p className="text-lg font-bold text-success">{formatUSD(financials.saldoDisponivel)}</p>
                <p className="text-xs text-muted-foreground">{formatARS(financials.saldoDisponivel)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Valor em ARS (Pesos Argentinos)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={saqueValor}
                  onChange={(e) => setSaqueValor(e.target.value)}
                />
                {saqueValor && !isNaN(parseFloat(saqueValor)) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {formatUSD(parseFloat(saqueValor))}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  placeholder="Dados bancários, PIX, etc."
                  value={saqueObs}
                  onChange={(e) => setSaqueObs(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSolicitarSaque} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar Saque
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Saldo Disponível"
          value={formatARS(financials.saldoDisponivel)}
          subtitle={formatBRLFromARS(financials.saldoDisponivel)}
          icon={Wallet}
          variant="success"
          delay={0}
        />
        <SummaryCard
          title="Total Recebido"
          value={formatARS(financials.totalPago)}
          subtitle={formatBRLFromARS(financials.totalPago)}
          icon={CheckCircle2}
          variant="info"
          delay={100}
        />
        <SummaryCard
          title="Pendente de Pagamento"
          value={formatARS(financials.totalPendente)}
          subtitle={formatBRLFromARS(financials.totalPendente)}
          icon={Clock}
          variant="warning"
          delay={200}
        />
        <SummaryCard
          title="Total Sacado"
          value={formatARS(financials.totalSacado)}
          subtitle={formatBRLFromARS(financials.totalSacado)}
          icon={BanknoteIcon}
          variant="muted"
          delay={300}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total em Vendas</p>
              <p className="text-lg font-bold text-card-foreground">{formatARS(financials.totalVendas)} <span className="text-sm text-muted-foreground font-normal">{formatBRLFromARS(financials.totalVendas)}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pedidos Totais</p>
              <p className="text-lg font-bold text-card-foreground">{pedidos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Saques Realizados</p>
              <p className="text-lg font-bold text-card-foreground">{saques.filter((s) => s.status === "pago").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Saques</CardTitle>
        </CardHeader>
        <CardContent>
          {saques.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum saque solicitado</p>
              <p className="text-sm">Quando você solicitar um saque, ele aparecerá aqui.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saques.map((s) => {
                  const cfg = statusSaqueConfig[s.status] ?? { label: s.status, variant: "outline" as const };
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(s.data_solicitacao).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatUSD(s.valor)}
                        <span className="block text-xs text-muted-foreground">{formatARS(s.valor)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.data_pagamento
                          ? new Date(s.data_pagamento).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {s.observacoes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ---------- Internal Summary Card ---------- */
interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  variant: "success" | "info" | "warning" | "muted";
  delay?: number;
}

const variantStyles: Record<string, string> = {
  success: "bg-success/10 text-success border-success/20",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-muted text-muted-foreground border-border",
};

function SummaryCard({ title, value, subtitle, icon: Icon, variant, delay = 0 }: SummaryCardProps) {
  return (
    <Card
      className="glass-card animate-fade-in overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border shrink-0", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-card-foreground truncate">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Financeiro;
