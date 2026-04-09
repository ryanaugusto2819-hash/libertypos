import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CountrySelector } from "@/components/CountrySelector";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry, countryConfig } from "@/contexts/CountryContext";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { displayName, role, isAdmin, signOut } = useAuth();
  const { country, isCountryLocked } = useCountry();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <header
            className="h-14 flex items-center px-4 sticky top-0 z-10"
            style={{
              background: "hsl(var(--card) / 0.8)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid hsl(var(--border) / 0.6)",
            }}
          >
            {/* Purple top line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, hsl(271 76% 53%), hsl(300 76% 55%) 60%, transparent)",
              }}
            />

            <SidebarTrigger
              className="mr-3 h-8 w-8 rounded-lg transition-all duration-200"
              style={{ color: "hsl(var(--muted-foreground))" }}
            />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {isAdmin && !isCountryLocked && <CountrySelector />}
              {isAdmin && isCountryLocked && (
                <span className="px-3 py-1.5 rounded-xl border-2 border-primary/30 font-bold text-sm">
                  {countryConfig[country].flag} {countryConfig[country].label}
                </span>
              )}

              {/* Divider */}
              <div className="hidden sm:block h-6 w-px mx-1" style={{ background: "hsl(var(--border))" }} />

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="text-right">
                  <p className="text-xs font-semibold leading-none" style={{ color: "hsl(var(--foreground))" }}>
                    {displayName}
                  </p>
                </div>
                <div
                  className="h-7 px-2.5 rounded-lg flex items-center text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: "linear-gradient(135deg, hsl(271 76% 53% / 0.15), hsl(300 76% 55% / 0.15))",
                    color: "hsl(271 76% 65%)",
                    border: "1px solid hsl(271 76% 53% / 0.2)",
                  }}
                >
                  {role}
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px mx-1" style={{ background: "hsl(var(--border))" }} />

              <button
                onClick={() => window.location.reload()}
                title="Atualizar"
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-accent"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={signOut}
                title="Sair"
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
