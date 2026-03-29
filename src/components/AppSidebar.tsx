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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Cobrança", url: "/", icon: LayoutDashboard },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Gradient top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-0"
        style={{
          background: "linear-gradient(180deg, hsl(271 76% 53% / 0.15) 0%, transparent 100%)",
        }}
      />

      {/* Header */}
      <SidebarHeader className="p-4 pb-5 relative z-10">
        <div className="flex items-center gap-3">
          {/* Logo with glow */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: "0 0 16px hsl(271 76% 53% / 0.6)",
                borderRadius: "12px",
              }}
            />
            <img
              src={sidebarLogo}
              alt="Group Liberty"
              className="h-10 w-10 rounded-xl object-cover relative z-10"
              style={{ border: "1.5px solid hsl(271 76% 53% / 0.5)" }}
            />
          </div>

          {!collapsed && (
            <div className="overflow-hidden">
              <p
                className="text-sm font-black tracking-tight leading-tight"
                style={{
                  background: "linear-gradient(135deg, hsl(271 76% 75%), hsl(300 76% 72%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Group Liberty
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(270 15% 50%)" }}>
                Sistema de Cobranças
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        {!collapsed && (
          <div
            className="mt-4 h-px"
            style={{ background: "linear-gradient(90deg, hsl(271 76% 53% / 0.4), transparent)" }}
          />
        )}
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent className="relative z-10 px-2">
        <SidebarGroup>
          {!collapsed && (
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 mb-2" style={{ color: "hsl(270 15% 40%)" }}>
              Menu
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
                      style={{ color: "hsl(270 15% 50%)" }}
                      activeClassName="font-semibold liberty-nav-active text-white"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 relative z-10">
        <div
          className="mb-2 h-px"
          style={{ background: "hsl(258 30% 14%)" }}
        />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 hover:bg-white/5"
          style={{ color: "hsl(270 15% 45%)" }}
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />
          }
          {!collapsed && (
            <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
