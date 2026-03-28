import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CountrySelector } from "@/components/CountrySelector";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { displayName, role, isAdmin, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className="h-14 flex items-center px-4 sticky top-0 z-10 backdrop-blur-md"
            style={{
              background: "hsl(var(--card) / 0.85)",
              borderBottom: "1px solid hsl(var(--border) / 0.8)",
              boxShadow: "0 1px 12px hsl(271 76% 53% / 0.06)",
            }}
          >
            <SidebarTrigger className="mr-4 text-muted-foreground hover:text-foreground transition-colors" />

            {/* Purple accent line on top */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, hsl(271 76% 53%), hsl(300 76% 55%), transparent)",
              }}
            />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {isAdmin && <CountrySelector />}

              {/* User badge */}
              <div className="hidden sm:flex items-center gap-2 text-sm border-l pl-3 ml-1" style={{ borderColor: "hsl(var(--border))" }}>
                <span className="font-semibold text-foreground">{displayName}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{
                    background: "linear-gradient(135deg, hsl(271 76% 53% / 0.15), hsl(300 76% 55% / 0.15))",
                    color: "hsl(271 76% 58%)",
                    border: "1px solid hsl(271 76% 53% / 0.25)",
                  }}
                >
                  {role}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                title="Atualizar"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-all rounded-lg"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sair"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
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
