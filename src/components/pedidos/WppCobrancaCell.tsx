import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  pedidoId: string;
}

function getWppStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("wppCobranca") || "{}");
  } catch { return {}; }
}

function setWppStore(key: string, value: string) {
  const store = getWppStore();
  store[key] = value;
  localStorage.setItem("wppCobranca", JSON.stringify(store));
}

export function WppCobrancaCell({ pedidoId }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(getWppStore()[pedidoId] || "");
  const [saved, setSaved] = useState(!!getWppStore()[pedidoId]);

  const handleSave = () => {
    if (value.trim()) {
      setWppStore(pedidoId, value.trim());
      setSaved(true);
      setEditing(false);
      toast.success("Nome WPP salvo!");
    }
  };

  if (!saved && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="status-pending inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-bold cursor-pointer transition-opacity hover:opacity-80"
      >
        Pendente
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 text-xs border-2 border-primary/30 rounded-lg w-28"
          placeholder="Nome..."
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 rounded-md hover:bg-muted"
        >
          <Check className="h-3.5 w-3.5 text-primary" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-xs font-medium text-foreground">{wppStore[pedidoId]}</span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}
