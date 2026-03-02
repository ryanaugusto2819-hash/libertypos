import { useCountry, countryConfig, Country } from "@/contexts/CountryContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CountrySelector() {
  const { country, setCountry } = useCountry();
  const entries = Object.entries(countryConfig) as [Country, typeof countryConfig[Country]][];

  return (
    <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
      <SelectTrigger className="w-40 h-9 rounded-xl border-2 border-primary/30 font-bold text-sm">
        <SelectValue>
          {countryConfig[country].flag} {countryConfig[country].label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {entries.map(([code, cfg]) => (
          <SelectItem key={code} value={code} className="font-medium">
            {cfg.flag} {cfg.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
