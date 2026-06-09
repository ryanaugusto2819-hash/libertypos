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
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  "MEGAFIT",
  "CAPSULA DOR",
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
    plataforma: "",
    conta_shopee: "",
    codigo_conta: "",
  });
  const [duplicates, setDuplicates] = useState<Array<{ nome: string; telefone: string; cedula: string; produto: string; data_entrada: string; matched: string[] }>>([]);
  const [showDupAlert, setShowDupAlert] = useState(false);

  const normalize = (v: string) => (v || "").replace(/\D/g, "");

  const proceedSave = () => {
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
      status_envio: country === "BR" ? "a enviar" : "não enviado",
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
      plataforma: form.plataforma,
      conta_shopee: form.conta_shopee,
      codigo_conta: form.codigo_conta,
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
      plataforma: "",
      conta_shopee: "",
      codigo_conta: "",
    });
    toast.success("Pedido criado com sucesso!");
    setShowDupAlert(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!form.nome || !form.telefone || !form.produto || !form.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Verifica duplicidade por nome, telefone ou cédula
    try {
      const nomeTrim = form.nome.trim();
      const telNorm = normalize(form.telefone);
      const cedNorm = normalize(form.cedula);

      const filters: string[] = [];
      if (nomeTrim) filters.push(`nome.ilike.${nomeTrim}`);
      if (form.telefone.trim()) filters.push(`telefone.eq.${form.telefone.trim()}`);
      if (form.cedula.trim()) filters.push(`cedula.eq.${form.cedula.trim()}`);

      if (filters.length > 0) {
        const { data } = await supabase
          .from("pedidos")
          .select("nome, telefone, cedula, produto, data_entrada")
          .eq("pais", country)
          .or(filters.join(","))
          .limit(20);

        const matches = (data || []).filter((p) => {
          const m: string[] = [];
          if (nomeTrim && (p.nome || "").trim().toLowerCase() === nomeTrim.toLowerCase()) m.push("nome");
          if (telNorm && normalize(p.telefone || "") === telNorm) m.push("telefone");
          if (cedNorm && normalize(p.cedula || "") === cedNorm) m.push("cédula");
          return m.length > 0 ? ((p as any).__m = m, true) : false;
        }).map((p: any) => ({ ...p, matched: p.__m }));

        if (matches.length > 0) {
          setDuplicates(matches);
          setShowDupAlert(true);
          return;
        }
      }
    } catch (e) {
      console.error("Erro ao verificar duplicidade:", e);
    }

    proceedSave();
  };

  return (
    <>
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
          {country === "BR" && (
            <>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label>Rua</Label>
                <Input
                  value={form.rua}
                  onChange={(e) => setForm({ ...form, rua: e.target.value })}
                  placeholder="Nome da rua"
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  placeholder="Nº"
                />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={form.complemento}
                  onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  placeholder="Apto, Bloco..."
                />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select value={form.plataforma} onValueChange={(v) => setForm({ ...form, plataforma: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOGZZ">LOGZZ</SelectItem>
                <SelectItem value="SHOPEE">SHOPEE</SelectItem>
                <SelectItem value="TIKTOK">TIKTOK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.plataforma === "SHOPEE" && (
            <div className="space-y-2">
              <Label>Código da Conta Shopee</Label>
              <Input
                value={form.conta_shopee}
                onChange={(e) => setForm({ ...form, conta_shopee: e.target.value })}
                placeholder="Código da conta"
              />
            </div>
          )}
          {form.plataforma && (
            <div className="space-y-2">
              <Label>Código da Conta</Label>
              <Input
                value={form.codigo_conta}
                onChange={(e) => setForm({ ...form, codigo_conta: e.target.value })}
                placeholder="#422"
              />
            </div>
          )}
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
    <AlertDialog open={showDupAlert} onOpenChange={setShowDupAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Pedido duplicado encontrado</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Já existe(m) {duplicates.length} pedido(s) com os mesmos dados:</p>
              <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                {duplicates.map((d, i) => (
                  <li key={i} className="border-l-2 border-primary pl-2">
                    <strong>{d.nome}</strong> — {d.produto} ({d.data_entrada})
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Coincide por: {d.matched.join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pt-2">Deseja criar o pedido mesmo assim?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={proceedSave}>Criar mesmo assim</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
