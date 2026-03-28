import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant: "received" | "pending" | "scheduled";
  delay?: number;
}

const variantConfig = {
  received: {
    gradient: "linear-gradient(135deg, hsl(142 71% 42%), hsl(142 71% 28%))",
    glow: "hsl(142 71% 42% / 0.20)",
    lightBg: "hsl(142 71% 42% / 0.08)",
    border: "hsl(142 71% 42% / 0.25)",
    iconColor: "hsl(142 71% 38%)",
    label: "Recebido",
  },
  pending: {
    gradient: "linear-gradient(135deg, hsl(271 76% 58%), hsl(300 76% 50%))",
    glow: "hsl(271 76% 53% / 0.20)",
    lightBg: "hsl(271 76% 53% / 0.08)",
    border: "hsl(271 76% 53% / 0.25)",
    iconColor: "hsl(271 76% 58%)",
    label: "Pendente",
  },
  scheduled: {
    gradient: "linear-gradient(135deg, hsl(38 92% 52%), hsl(25 92% 44%))",
    glow: "hsl(38 92% 50% / 0.20)",
    lightBg: "hsl(38 92% 50% / 0.08)",
    border: "hsl(38 92% 50% / 0.25)",
    iconColor: "hsl(38 92% 45%)",
    label: "Agendado",
  },
};

export function FinanceCard({ title, value, subtitle, icon: Icon, variant, delay = 0 }: FinanceCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className="animate-fade-in relative rounded-2xl overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        background: "hsl(var(--card))",
        border: `1px solid ${config.border}`,
        boxShadow: `0 4px 24px -4px ${config.glow}`,
      }}
    >
      {/* Gradient top bar */}
      <div className="h-1 w-full" style={{ background: config.gradient }} />

      {/* Background decorative blob */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${config.lightBg} 0%, transparent 70%)`,
          transform: "translate(20%, 20%)",
        }}
      />

      <div className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          {/* Icon */}
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: config.lightBg }}
          >
            <Icon className="h-5 w-5" style={{ color: config.iconColor }} />
          </div>

          {/* Variant label pill */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: config.lightBg,
              color: config.iconColor,
              border: `1px solid ${config.border}`,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Title */}
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {title}
        </p>

        {/* Value */}
        <p className="text-2xl font-black tracking-tight" style={{ color: "hsl(var(--card-foreground))" }}>
          {value}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
