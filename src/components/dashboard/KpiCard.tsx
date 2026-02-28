import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const variantStyles = {
  default: "border-l-muted-foreground/30",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-destructive",
  info: "border-l-info",
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
  return (
    <Card
      className={cn(
        "glass-card border-l-4 animate-fade-in",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold text-card-foreground">{value}</p>
            {percentage !== undefined && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}{" "}
                {percentage}%
              </p>
            )}
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              variant === "success" && "bg-success/10 text-success",
              variant === "warning" && "bg-warning/10 text-warning",
              variant === "danger" && "bg-destructive/10 text-destructive",
              variant === "info" && "bg-info/10 text-info",
              variant === "default" && "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
