import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export function CodigoContaCell({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  const hasValue = value && value !== "";

  const handleSave = () => {
    onChange(code.trim());
    setOpen(false);
    setCode("");
    toast.success("Código da conta salvo!");
  };

  if (!hasValue) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-0.5 text-xs text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
          >
            #—
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <p className="text-sm font-bold text-foreground">Código da Conta</p>
          <Input
            placeholder="#422"
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
      <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
            title="Editar código da conta"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <p className="text-sm font-bold text-foreground">Editar Código da Conta</p>
          <EditCodigoContaInput currentValue={value} onSave={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function EditCodigoContaInput({ currentValue, onSave }: { currentValue: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(currentValue);
  return (
    <>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(val.trim()); toast.success("Código atualizado!"); } }}
        className="border-2 border-primary/30 rounded-xl text-sm"
        autoFocus
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => { onSave(val.trim()); toast.success("Código atualizado!"); }}
          className="rounded-xl text-xs font-bold"
        >
          Salvar
        </Button>
      </div>
    </>
  );
}
