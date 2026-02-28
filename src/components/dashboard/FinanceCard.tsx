import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const variantMap = {
  received: "bg-success/10 text-success border-success/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  scheduled: "bg-warning/10 text-warning border-warning/20",
};

export function FinanceCard({ title, value, subtitle, icon: Icon, variant, delay = 0 }: FinanceCardProps) {
  return (
    <Card
      className={cn("glass-card animate-fade-in overflow-hidden")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border shrink-0", variantMap[variant])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-card-foreground truncate">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
