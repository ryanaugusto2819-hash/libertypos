import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Landmark, Plus, Power, PowerOff, Trash2, Loader2, Wallet, CheckCircle2, Clock,
  ChevronDown, ChevronRight, FileText, Download, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, parseLocalDate, setActivePais } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  nome: string;
  ativo: boolean;
}

interface PedidoRow {
  id: string;
  nome: string;
  conta_usada: string | null;
  valor: number;
  status_pagamento: string;
  pais: string;
  data_entrada: string;
  data_pagamento: string | null;
  hora_pagamento: string | null;
  comprovante_url: string | null;
  produto: string;
  forma_pagamento: string | null;
}

type HistFilter = "todos" | "pago" | "pendente";

export default function ContasUY() {
  const { country } = useCountry();
  const { isAdmin } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [histFilter, setHistFilter] = useState<Record<string, HistFilter>>({});

  useEffect(() => { setActivePais("UY"); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [contasRes, pedidosRes] = await Promise.all([
        supabase.from("contas_uy").select("*").order("nome"),
        supabase
          .from("pedidos")
          .select("id,nome,conta_usada,valor,status_pagamento,pais,data_entrada,data_pagamento,hora_pagamento,comprovante_url,produto,forma_pagamento")
          .eq("pais", "UY")
          .order("data_pagamento", { ascending: false, nullsFirst: false })
          .order("data_entrada", { ascending: false }),
      ]);
      if (contasRes.error) throw contasRes.error;
      if (pedidosRes.error) throw pedidosRes.error;
      setContas(contasRes.data as Conta[]);
      setPedidos((pedidosRes.data || []) as PedidoRow[]);
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (nome: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const stats = useMemo(() => {
    const map: Record<string, {
      pago: number; pendente: number; countPago: number; countPendente: number;
      ultimaEntrada: string | null;
    }> = {};
    for (const c of contas) {
      map[c.nome] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0, ultimaEntrada: null };
    }
    map["__sem_conta__"] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0, ultimaEntrada: null };
    for (const p of pedidos) {
      const key = p.conta_usada && p.conta_usada !== "" ? p.conta_usada : "__sem_conta__";
      if (!map[key]) map[key] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0, ultimaEntrada: null };
      const v = Number(p.valor) || 0;
      if (p.status_pagamento === "pago") {
        map[key].pago += v;
        map[key].countPago += 1;
        const d = p.data_pagamento || p.data_entrada;
        if (d && (!map[key].ultimaEntrada || d > map[key].ultimaEntrada!)) {
          map[key].ultimaEntrada = d;
        }
      } else {
        map[key].pendente += v;
        map[key].countPendente += 1;
      }
    }
    return map;
  }, [contas, pedidos]);

  const totalPago = useMemo(() => Object.values(stats).reduce((s, v) => s + v.pago, 0), [stats]);
  const totalPendente = useMemo(() => Object.values(stats).reduce((s, v) => s + v.pendente, 0), [stats]);

  const pedidosByConta = useMemo(() => {
    const map: Record<string, PedidoRow[]> = {};
    for (const p of pedidos) {
      const key = p.conta_usada && p.conta_usada !== "" ? p.conta_usada : "__sem_conta__";
      (map[key] ||= []).push(p);
    }
    return map;
  }, [pedidos]);

  const handleCreate = async () => {
    const nome = newName.trim();
    if (!nome) return;
    const { error } = await supabase.from("contas_uy").insert({ nome });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Já existe uma conta com esse nome" : "Erro: " + error.message);
      return;
    }
    toast.success("Conta criada!");
    setNewName("");
    setCreateOpen(false);
    load();
  };

  const toggleAtivo = async (c: Conta) => {
    const { error } = await supabase.from("contas_uy").update({ ativo: !c.ativo }).eq("id", c.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`Conta ${!c.ativo ? "ativada" : "desativada"}`);
    load();
  };

  const handleDelete = async (c: Conta) => {
    if (!confirm(`Excluir a conta "${c.nome}"? Os pedidos vinculados permanecerão, mas perderão essa referência visualmente.`)) return;
    const { error } = await supabase.from("contas_uy").delete().eq("id", c.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Conta excluída");
    load();
  };

  const exportCSV = (nome: string, rows: PedidoRow[]) => {
    const header = ["Data Pagamento", "Hora", "Data Entrada", "Cliente", "Produto", "Valor", "Status", "Forma Pgto"];
    const lines = rows.map((p) => [
      p.data_pagamento || "",
      p.hora_pagamento || "",
      p.data_entrada,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${(p.produto || "").replace(/"/g, '""')}"`,
      p.valor,
      p.status_pagamento,
      p.forma_pagamento || "",
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (country !== "UY") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
        <Landmark className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Disponível apenas para Uruguai</h2>
        <p className="text-sm text-muted-foreground">Troque o país para UY no seletor do topo para acessar essa seção.</p>
      </div>
    );
  }

  const semConta = stats["__sem_conta__"];

  const renderHistoryRows = (nome: string) => {
    const all = pedidosByConta[nome] || [];
    const filter = histFilter[nome] || "todos";
    const filtered = filter === "todos" ? all : all.filter((p) => p.status_pagamento === filter);

    return (
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={isAdmin ? 8 : 7} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Histórico de entradas — {nome === "__sem_conta__" ? "Sem conta" : nome}</p>
                <Badge variant="secondary" className="text-[10px]">{all.length} registro{all.length !== 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex items-center gap-1">
                {(["todos", "pago", "pendente"] as HistFilter[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    className="h-7 rounded-lg text-[11px] font-bold capitalize"
                    onClick={() => setHistFilter((prev) => ({ ...prev, [nome]: f }))}
                  >
                    {f}
                  </Button>
                ))}
                {all.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-[11px] font-bold gap-1 ml-2"
                    onClick={() => exportCSV(nome, filtered)}
                  >
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                )}
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro</p>
            ) : (
              <div className="rounded-xl border border-primary/15 overflow-hidden bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableHead className="text-[10px] font-bold uppercase">Data Pagamento</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Cliente</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Produto</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Forma Pgto</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right">Valor</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Comprovante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id} className="border-b border-primary/5 text-sm">
                        <TableCell>
                          {p.data_pagamento ? (
                            <>
                              <div className="font-medium">{formatDate(p.data_pagamento)}</div>
                              {p.hora_pagamento && <div className="text-[10px] text-muted-foreground">{p.hora_pagamento}</div>}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">— ({formatDate(p.data_entrada)})</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.produto}</TableCell>
                        <TableCell className="text-xs uppercase">{p.forma_pagamento || "—"}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(p.valor)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={p.status_pagamento === "pago" ? "default" : "secondary"}
                            className={cn("text-[10px] font-bold", p.status_pagamento === "pago" ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30")}
                          >
                            {p.status_pagamento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.comprovante_url ? (
                            <a href={p.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver</a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Contas Bancárias (UY)</h1>
          <p className="text-sm font-semibold text-primary mt-1">
            Controle do que cada conta recebeu nas vendas do Uruguai
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl font-bold shadow-lg">
            <Plus className="h-4 w-4" /> Nova Conta
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Contas Cadastradas</p>
              <p className="text-2xl font-bold">{contas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 border-success/30 bg-success/5 shadow-lg">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Recebido</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 border-warning/30 bg-warning/5 shadow-lg">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-warning" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Pendente</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10 hover:bg-primary/10">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Conta</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-center">Status</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase">Última Entrada</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Recebido</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Pendente</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Total Geral</TableHead>
                {isAdmin && <TableHead className="text-xs font-bold text-primary uppercase text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((c) => {
                const s = stats[c.nome] || { pago: 0, pendente: 0, countPago: 0, countPendente: 0, ultimaEntrada: null };
                const isOpen = expanded.has(c.nome);
                return (
                  <React.Fragment key={c.id}>
                    <TableRow
                      key={c.id}
                      className={cn(
                        "border-b border-primary/10 transition-colors cursor-pointer hover:bg-primary/5",
                        !c.ativo && "opacity-50",
                      )}
                      onClick={() => toggleExpand(c.nome)}
                    >
                      <TableCell className="w-10 px-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); toggleExpand(c.nome); }}>
                          {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-bold text-base">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-primary" />
                          {c.nome}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({s.countPago + s.countPendente} pedido{s.countPago + s.countPendente !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.ativo ? "default" : "secondary"} className="text-xs font-bold">
                          {c.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.ultimaEntrada ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-success" />
                            {formatDate(s.ultimaEntrada)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-success">{formatCurrency(s.pago)}</div>
                        <div className="text-[10px] text-muted-foreground">{s.countPago} pago{s.countPago !== 1 ? "s" : ""}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-warning">{formatCurrency(s.pendente)}</div>
                        <div className="text-[10px] text-muted-foreground">{s.countPendente} pendente{s.countPendente !== 1 ? "s" : ""}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(s.pago + s.pendente)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => toggleAtivo(c)} title={c.ativo ? "Desativar" : "Ativar"}>
                              {c.ativo ? <PowerOff className="h-4 w-4 text-warning" /> : <Power className="h-4 w-4 text-success" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {isOpen && renderHistoryRows(c.nome)}
                  </>
                );
              })}
              {(semConta.pago > 0 || semConta.pendente > 0) && (
                <>
                  <TableRow
                    className="bg-muted/30 border-b border-primary/10 cursor-pointer hover:bg-muted/40"
                    onClick={() => toggleExpand("__sem_conta__")}
                  >
                    <TableCell className="w-10 px-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); toggleExpand("__sem_conta__"); }}>
                        {expanded.has("__sem_conta__") ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-bold text-muted-foreground italic">Sem conta atribuída</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-xs">—</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{semConta.ultimaEntrada ? formatDate(semConta.ultimaEntrada) : "—"}</TableCell>
                    <TableCell className="text-right font-bold text-success">{formatCurrency(semConta.pago)}</TableCell>
                    <TableCell className="text-right font-bold text-warning">{formatCurrency(semConta.pendente)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(semConta.pago + semConta.pendente)}</TableCell>
                    {isAdmin && <TableCell />}
                  </TableRow>
                  {expanded.has("__sem_conta__") && renderHistoryRows("__sem_conta__")}
                </>
              )}
              {contas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
                    Nenhuma conta cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nome da pessoa / conta</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Maria"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="border-2 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} className="rounded-xl font-bold">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
