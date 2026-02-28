import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export type PedidosTheme = "glass" | "minimal" | "bold" | "stripe" | "neon";

const themes: { value: PedidosTheme; label: string; color: string }[] = [
  { value: "glass", label: "Glass", color: "bg-primary/80" },
  { value: "minimal", label: "Minimal", color: "bg-muted-foreground" },
  { value: "bold", label: "Bold", color: "bg-destructive" },
  { value: "stripe", label: "Stripe", color: "bg-info" },
  { value: "neon", label: "Neon", color: "bg-success" },
];

interface Props {
  current: PedidosTheme;
  onChange: (theme: PedidosTheme) => void;
}

export function PedidosThemeSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <Palette className="h-4 w-4 text-muted-foreground" />
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "h-7 px-2.5 rounded-md text-xs font-medium transition-all",
            current === t.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
