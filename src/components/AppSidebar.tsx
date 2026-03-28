import { LayoutDashboard, ShoppingCart, Wallet, Settings, Sun, Moon } from "lucide-react";
import sidebarLogo from "@/assets/sidebar-logo.png";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar } from
"@/components/ui/sidebar";

const navItems = [
{ title: "Cobrança", url: "/", icon: LayoutDashboard },
{ title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
{ title: "Financeiro", url: "/financeiro", icon: Wallet },
{ title: "Configurações", url: "/configuracoes", icon: Settings }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Gradient overlay on sidebar background */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(180deg, hsl(271 76% 53% / 0.12) 0%, transparent 40%)",
        }}
      />

      <SidebarHeader className="p-4 relative z-10">
        <div className="flex items-center gap-3">
          {/* Logo with gradient ring */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: "linear-gradient(135deg, hsl(271 76% 53%), hsl(300 76% 55%))",
                padding: "1.5px",
                borderRadius: "10px",
              }}
            />
            <img
              src={sidebarLogo}
              alt="Group Liberty"
              className="relative h-9 w-9 rounded-[9px] shrink-0 object-cover"
              style={{ outline: "1.5px solid transparent" }}
            />
          </div>
          {!collapsed &&
          <div className="overflow-hidden">
              <h1 className="text-sm font-bold truncate liberty-gradient-text">
                Group Liberty
              </h1>
              <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>
                Sistema de Cobranças
              </p>
            </div>
          }
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel
              className="text-xs uppercase tracking-widest font-semibold mb-1 px-3"
              style={{ color: "hsl(var(--sidebar-muted))" }}
            >
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    end
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    activeClassName="text-white font-semibold"
                    activeStyle={{
                      background: "linear-gradient(135deg, hsl(271 76% 53% / 0.9), hsl(300 76% 55% / 0.9))",
                      boxShadow: "0 4px 12px hsl(271 76% 53% / 0.35)",
                    }}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 relative z-10">
        {/* Divider */}
        <div
          className="mb-2 h-px mx-1"
          style={{ background: "hsl(var(--sidebar-border))" }}
        />
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start gap-3 rounded-xl transition-all duration-200"
          style={{ color: "hsl(var(--sidebar-muted))" }}
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />
          }
          {!collapsed && (
            <span className="text-sm">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>);

}
