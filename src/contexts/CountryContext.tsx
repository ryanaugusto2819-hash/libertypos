import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type Country = "UY" | "BR" | "AR";

export const countryConfig: Record<Country, { label: string; flag: string; currency: string; locale: string; phonePrefix: string }> = {
  UY: { label: "Uruguai", flag: "🇺🇾", currency: "UYU", locale: "es-UY", phonePrefix: "+598" },
  BR: { label: "Brasil", flag: "🇧🇷", currency: "BRL", locale: "pt-BR", phonePrefix: "+55" },
  AR: { label: "Argentina", flag: "🇦🇷", currency: "ARS", locale: "es-AR", phonePrefix: "+54" },
};

interface CountryContextType {
  country: Country;
  setCountry: (c: Country) => void;
  config: typeof countryConfig[Country];
  isCountryLocked: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const { isAdmin, countryLock, loading } = useAuth();

  const [country, setCountry] = useState<Country>("UY");

  const isCountryLocked = !!countryLock;

  // Set country based on role and country_lock once auth is loaded
  useEffect(() => {
    if (loading) return;
    if (countryLock && countryConfig[countryLock as Country]) {
      setCountry(countryLock as Country);
    } else if (!isAdmin) {
      setCountry("AR");
    } else {
      const saved = localStorage.getItem("selected-country") as Country;
      setCountry(saved && countryConfig[saved] ? saved : "UY");
    }
  }, [loading, isAdmin, countryLock]);

  const handleSetCountry = (c: Country) => {
    if (isCountryLocked || !isAdmin) return;
    setCountry(c);
    localStorage.setItem("selected-country", c);
  };

  return (
    <CountryContext.Provider value={{ country, setCountry: handleSetCountry, config: countryConfig[country], isCountryLocked }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
