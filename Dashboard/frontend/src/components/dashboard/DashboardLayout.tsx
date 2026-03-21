import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Truck, Clock, CheckCircle,
  BarChart3, Users, Building2, AlertTriangle, ChevronLeft, Menu
} from "lucide-react";
import petloveLogo from "@/assets/petlove-logo.png";
import GlobalFiltersBar from "@/components/dashboard/GlobalFiltersBar";

const navItems = [
  { path: "/", label: "Cockpit Executivo", icon: LayoutDashboard },
  { path: "/planejado-realizado", label: "Planejado × Realizado", icon: BarChart3 },
  { path: "/custos", label: "Custos e Eficiência", icon: DollarSign },
  { path: "/frota", label: "Frota e Capacidade", icon: Truck },
  { path: "/tempo-sla", label: "Tempo e SLA", icon: Clock },
  { path: "/aderencia", label: "Aderência e Atendimento", icon: CheckCircle },
  { path: "/transportadores", label: "Transportadores", icon: Building2 },
  { path: "/motoristas", label: "Motoristas e Jornada", icon: Users },
  { path: "/alertas", label: "Investigação Operacional", icon: AlertTriangle },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find((item) => item.path === location.pathname)
    ?? (location.pathname === "/cockpit-operacional" ? navItems[0] : undefined);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`sidebar-gradient flex flex-col transition-all duration-300 ease-out ${collapsed ? "w-16" : "w-60"
          } shrink-0`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-center px-4 py-5 border-b border-white/10">
          {collapsed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Truck className="h-5 w-5 text-white/90" />
            </div>
          ) : (
            <img src={petloveLogo} alt="Petlove" className="h-8 w-auto object-contain" />
          )}
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.16em]">
              Monitoramento Logístico
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/60 hover:text-white/90 hover:bg-white/8"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-3 text-white/40 hover:text-white/70 transition-colors"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top ribbon */}
        <header className="ribbon-gradient flex items-center justify-between px-6 py-3 shrink-0">
          <div>
            <h1 className="text-base font-bold text-white/95">
              {currentPage?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalFiltersBar />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 glow-soft">
          {children}
        </div>
      </main>
    </div>
  );
}
