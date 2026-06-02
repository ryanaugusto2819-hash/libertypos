import { useEffect, useMemo, useState } from "react";
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
import { Landmark, Plus, Power, PowerOff, Trash2, Loader2, Wallet, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, setActivePais } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  nome: string;
  ativo: boolean;
}

interface PedidoRow {
  conta_usada: string | null;
  valor: number;
  status_pagamento: string;
  pais: string;
}

export default function ContasUY() {
  const { country } = useCountry();
  const { isAdmin } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => { setActivePais("UY"); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [contasRes, pedidosRes] = await Promise.all([
        supabase.from("contas_uy").select("*").order("nome"),
        supabase.from("pedidos").select("conta_usada,valor,status_pagamento,pais").eq("pais", "UY"),
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

  const stats = useMemo(() => {
    const map: Record<string, { pago: number; pendente: number; countPago: number; countPendente: number }> = {};
    for (const c of contas) {
      map[c.nome] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0 };
    }
    map["__sem_conta__"] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0 };
    for (const p of pedidos) {
      const key = p.conta_usada && p.conta_usada !== "" ? p.conta_usada : "__sem_conta__";
      if (!map[key]) map[key] = { pago: 0, pendente: 0, countPago: 0, countPendente: 0 };
      const v = Number(p.valor) || 0;
      if (p.status_pagamento === "pago") {
        map[key].pago += v;
        map[key].countPago += 1;
      } else {
        map[key].pendente += v;
        map[key].countPendente += 1;
      }
    }
    return map;
  }, [contas, pedidos]);

  const totalPago = useMemo(() => Object.values(stats).reduce((s, v) => s + v.pago, 0), [stats]);
  const totalPendente = useMemo(() => Object.values(stats).reduce((s, v) => s + v.pendente, 0), [stats]);

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
                <TableHead className="text-xs font-bold text-primary uppercase">Conta</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-center">Status</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Pedidos Pagos</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Total Recebido</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Pedidos Pendentes</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Total Pendente</TableHead>
                <TableHead className="text-xs font-bold text-primary uppercase text-right">Total Geral</TableHead>
                {isAdmin && <TableHead className="text-xs font-bold text-primary uppercase text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((c) => {
                const s = stats[c.nome] || { pago: 0, pendente: 0, countPago: 0, countPendente: 0 };
                return (
                  <TableRow key={c.id} className={cn("border-b border-primary/10", !c.ativo && "opacity-50")}>
                    <TableCell className="font-bold text-base flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      {c.nome}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.ativo ? "default" : "secondary"} className="text-xs font-bold">
                        {c.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{s.countPago}</TableCell>
                    <TableCell className="text-right font-bold text-success">{formatCurrency(s.pago)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{s.countPendente}</TableCell>
                    <TableCell className="text-right font-bold text-warning">{formatCurrency(s.pendente)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(s.pago + s.pendente)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => toggleAtivo(c)}
                            title={c.ativo ? "Desativar" : "Ativar"}
                          >
                            {c.ativo ? <PowerOff className="h-4 w-4 text-warning" /> : <Power className="h-4 w-4 text-success" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {(semConta.pago > 0 || semConta.pendente > 0) && (
                <TableRow className="bg-muted/30 border-b border-primary/10">
                  <TableCell className="font-bold text-muted-foreground italic">Sem conta atribuída</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">—</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{semConta.countPago}</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatCurrency(semConta.pago)}</TableCell>
                  <TableCell className="text-right text-sm">{semConta.countPendente}</TableCell>
                  <TableCell className="text-right font-bold text-warning">{formatCurrency(semConta.pendente)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(semConta.pago + semConta.pendente)}</TableCell>
                  {isAdmin && <TableCell />}
                </TableRow>
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
