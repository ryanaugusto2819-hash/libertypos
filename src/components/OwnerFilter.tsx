import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

export type OwnerFilterValue = "meus" | "afiliados" | "todos";

interface OwnerFilterProps {
  value: OwnerFilterValue;
  onChange: (v: OwnerFilterValue) => void;
}

export function OwnerFilter({ value, onChange }: OwnerFilterProps) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as OwnerFilterValue)}>
      <SelectTrigger className="w-48">
        <Users className="h-4 w-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os Pedidos</SelectItem>
        <SelectItem value="meus">Meus Pedidos</SelectItem>
        <SelectItem value="afiliados">Afiliados</SelectItem>
      </SelectContent>
    </Select>
  );
}
