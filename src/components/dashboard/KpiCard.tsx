import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "danger" | "info";
  delay?: number;
}

const variantConfig = {
  default: {
    iconBg: "linear-gradient(135deg, hsl(270 15% 55%), hsl(270 15% 40%))",
    accent: "hsl(270 15% 55%)",
    glow: "hsl(270 15% 55% / 0.15)",
    bar: "hsl(270 15% 55%)",
  },
  success: {
    iconBg: "linear-gradient(135deg, hsl(142 71% 50%), hsl(142 71% 35%))",
    accent: "hsl(142 71% 45%)",
    glow: "hsl(142 71% 45% / 0.15)",
    bar: "hsl(142 71% 45%)",
  },
  warning: {
    iconBg: "linear-gradient(135deg, hsl(38 92% 55%), hsl(38 92% 40%))",
    accent: "hsl(38 92% 50%)",
    glow: "hsl(38 92% 50% / 0.15)",
    bar: "hsl(38 92% 50%)",
  },
  danger: {
    iconBg: "linear-gradient(135deg, hsl(0 72% 56%), hsl(0 72% 42%))",
    accent: "hsl(0 72% 51%)",
    glow: "hsl(0 72% 51% / 0.15)",
    bar: "hsl(0 72% 51%)",
  },
  info: {
    iconBg: "linear-gradient(135deg, hsl(271 76% 63%), hsl(300 76% 55%))",
    accent: "hsl(271 76% 58%)",
    glow: "hsl(271 76% 53% / 0.15)",
    bar: "linear-gradient(90deg, hsl(271 76% 63%), hsl(300 76% 55%))",
  },
};

export function KpiCard({
  title,
  value,
  percentage,
  icon: Icon,
  trend = "neutral",
  variant = "default",
  delay = 0,
}: KpiCardProps) {
  const config = variantConfig[variant];

  return (
    <div
      className="animate-fade-in relative rounded-2xl overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.7)",
        boxShadow: `0 4px 24px -4px ${config.glow}, 0 1px 4px hsl(0 0% 0% / 0.04)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: config.iconBg }}
      />

      {/* Decorative glow in corner */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
          transform: "translate(30%, -30%)",
        }}
      />

      <div className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: config.iconBg }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>

          {/* Trend badge */}
          {percentage !== undefined && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: trend === "up"
                  ? "hsl(142 71% 45% / 0.12)"
                  : trend === "down"
                  ? "hsl(0 72% 51% / 0.12)"
                  : "hsl(var(--muted))",
                color: trend === "up"
                  ? "hsl(142 71% 40%)"
                  : trend === "down"
                  ? "hsl(0 72% 51%)"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {percentage}%
            </span>
          )}
        </div>

        {/* Value */}
        <p
          className="text-3xl font-black tracking-tight leading-none mb-1"
          style={{ color: "hsl(var(--card-foreground))" }}
        >
          {value}
        </p>

        {/* Title */}
        <p className="text-xs font-medium uppercase tracking-widest mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
          {title}
        </p>

        {/* Progress bar */}
        {percentage !== undefined && (
          <div className="mt-4">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "hsl(var(--border))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  background: config.iconBg,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
