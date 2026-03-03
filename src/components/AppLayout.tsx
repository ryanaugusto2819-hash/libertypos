import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CountrySelector } from "@/components/CountrySelector";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { displayName, role, isAdmin, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              {isAdmin && <CountrySelector />}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground border-l pl-3">
                <span className="font-medium text-foreground">{displayName}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">
                  {role}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
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
