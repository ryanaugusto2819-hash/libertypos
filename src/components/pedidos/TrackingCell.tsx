import { useState } from "react";
import { Copy, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export function TrackingCell({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const hasCodigo = value && value !== "";

  const handleSave = () => {
    if (code.trim()) {
      onChange(code.trim());
      setOpen(false);
      setCode("");
      toast.success("Código de rastreamento adicionado!");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasCodigo) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="status-pending inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-bold cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Pendente
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <p className="text-sm font-bold text-foreground">Código de Rastreamento</p>
          <Input
            placeholder="Ex: COL-2024-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="border-2 border-primary/30 rounded-xl text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-xl text-xs font-bold">
              Salvar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="font-mono text-xs font-medium text-foreground">{value}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
        title="Copiar código"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
            title="Editar código"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <p className="text-sm font-bold text-foreground">Editar Rastreamento</p>
          <EditTrackingInput currentValue={value} onSave={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EditTrackingInput({ currentValue, onSave }: { currentValue: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(currentValue);
  return (
    <>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onSave(val.trim()); toast.success("Código atualizado!"); } }}
        className="border-2 border-primary/30 rounded-xl text-sm"
        autoFocus
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { if (val.trim()) { onSave(val.trim()); toast.success("Código atualizado!"); } }} className="rounded-xl text-xs font-bold">
          Salvar
        </Button>
      </div>
    </>
  );
}
