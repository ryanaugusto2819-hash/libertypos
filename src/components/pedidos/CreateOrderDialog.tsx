import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pedido } from "@/types/pedido";
import { toast } from "sonner";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pedido: Omit<Pedido, "id">) => void;
}

const produtos = [
  "Kit Skincare Premium",
  "Creme Anti-idade",
  "Sérum Vitamina C",
  "Protetor Solar FPS 50",
];

const departamentos = [
  "Cundinamarca",
  "Antioquia",
  "Valle del Cauca",
  "Atlántico",
  "Bolívar",
  "Santander",
  "Risaralda",
  "Caldas",
];

export function CreateOrderDialog({ open, onOpenChange, onSave }: CreateOrderDialogProps) {
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    produto: "",
    quantidade: "1",
    valor: "",
    vendedor: "",
    criativo: "",
  });

  const handleSave = () => {
    if (!form.nome || !form.telefone || !form.produto || !form.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const now = new Date();

    onSave({
      nome: form.nome,
      telefone: form.telefone,
      cedula: "",
      produto: form.produto,
      quantidade: parseInt(form.quantidade) || 1,
      valor: parseFloat(form.valor) || 0,
      cidade: "",
      departamento: "",
      codigo_rastreamento: "",
      status_pagamento: "enviado",
      data_entrada: now.toISOString().split("T")[0],
      data_envio: now.toISOString().split("T")[0],
      data_pagamento: null,
      hora_pagamento: null,
      comprovante_url: null,
      observacoes: "",
      vendedor: form.vendedor,
      criativo: form.criativo,
    });

    setForm({
      nome: "",
      telefone: "",
      produto: "",
      quantidade: "1",
      valor: "",
      vendedor: "",
      criativo: "",
    });
    toast.success("Pedido criado com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Pedido</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="+57 300 000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label>Produto *</Label>
            <Select value={form.produto} onValueChange={(v) => setForm({ ...form, produto: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor (COP) *</Label>
            <Input
              type="number"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Input
              value={form.vendedor}
              onChange={(e) => setForm({ ...form, vendedor: e.target.value })}
              placeholder="Nome do vendedor"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Criativo</Label>
            <Input
              value={form.criativo}
              onChange={(e) => setForm({ ...form, criativo: e.target.value })}
              placeholder="Referência do criativo"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
