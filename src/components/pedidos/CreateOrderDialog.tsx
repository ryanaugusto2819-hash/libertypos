import { useState } from "react";
import { useCountry, countryConfig } from "@/contexts/CountryContext";
import { todayInSaoPaulo } from "@/lib/formatters";
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
  "Gota Cavalo",
  "Gota Prosta",
  "Gota Memo",
  "Gota Emagrecimento",
  "Gota Diabtes",
];

const departamentosPorPais: Record<string, string[]> = {
  UY: ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"],
  BR: ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"],
  AR: ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"],
};

export function CreateOrderDialog({ open, onOpenChange, onSave }: CreateOrderDialogProps) {
  const { country, config } = useCountry();
  const departamentos = departamentosPorPais[country] || [];
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cedula: "",
    produto: "",
    quantidade: "1",
    valor: "",
    cidade: "",
    departamento: "",
    vendedor: "",
    criativo: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    email: "",
  });

  const handleSave = () => {
    if (!form.nome || !form.telefone || !form.produto || !form.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const todaySP = todayInSaoPaulo();

    onSave({
      nome: form.nome,
      telefone: form.telefone,
      cedula: form.cedula,
      produto: form.produto,
      quantidade: parseInt(form.quantidade) || 1,
      valor: parseFloat(form.valor) || 0,
      cidade: form.cidade,
      departamento: form.departamento,
      codigo_rastreamento: "",
      status_pagamento: "pendente",
      status_envio: "não enviado",
      data_entrada: todaySP,
      data_envio: todaySP,
      data_pagamento: null,
      hora_pagamento: null,
      comprovante_url: null,
      etiqueta_envio_url: null,
      observacoes: "",
      vendedor: form.vendedor,
      criativo: form.criativo,
      pais: country,
      cep: form.cep,
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      email: form.email,
    });

    setForm({
      nome: "",
      telefone: "",
      cedula: "",
      produto: "",
      quantidade: "1",
      valor: "",
      cidade: "",
      departamento: "",
      vendedor: "",
      criativo: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      email: "",
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
              placeholder={config.phonePrefix + " ..."}
            />
          </div>
          <div className="space-y-2">
            <Label>Cédula</Label>
            <Input
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              placeholder="Número da cédula"
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
            <Label>Valor ({config.currency}) *</Label>
            <Input
              type="number"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Cidade"
            />
          </div>
          <div className="space-y-2">
            <Label>{country === "BR" ? "Estado" : "Departamento"}</Label>
            <Select value={form.departamento} onValueChange={(v) => setForm({ ...form, departamento: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {departamentos.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
