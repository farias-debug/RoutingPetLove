import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, DollarSign, Truck, Clock, CheckCircle,
  BarChart3, Users, Building2, AlertTriangle, ChevronLeft, Menu, Info, GitCompare, X
} from "lucide-react";
import petloveLogo from "@/assets/petlove-logo.png";
import GlobalFiltersBar from "@/components/dashboard/GlobalFiltersBar";
import { API_ENABLED, MOCKS_ENABLED } from "@/config/env";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

const navItems = [
  { path: "/", label: "Cockpit Executivo-Operacional", icon: LayoutDashboard },
  { path: "/planejado-realizado", label: "Planejado × Realizado", icon: BarChart3 },
  { path: "/custos", label: "Custos e Eficiência", icon: DollarSign },
  { path: "/frota", label: "Frota e Capacidade", icon: Truck },
  { path: "/filiais", label: "Comparativo de Filiais", icon: GitCompare },
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
  const { filters, setFilter } = useGlobalFilters();
  const currentPage = navItems.find((item) => item.path === location.pathname)
    ?? navItems.find((item) => location.pathname.startsWith(item.path) && item.path !== "/")
    ?? (location.pathname === "/cockpit-operacional" ? navItems[0] : undefined);

  // Build active filter chips
  const activeChips: { key: string; label: string; onClear: () => void }[] = [];
  if (filters.periodo) {
    try {
      const d = parse(filters.periodo, "yyyy-MM", new Date());
      const label = format(d, "MMM yyyy", { locale: ptBR }).replace(/^./, (l) => l.toUpperCase());
      activeChips.push({ key: "periodo", label: `Período: ${label}`, onClear: () => setFilter("periodo", undefined) });
    } catch {
      activeChips.push({ key: "periodo", label: `Período: ${filters.periodo}`, onClear: () => setFilter("periodo", undefined) });
    }
  }
  if (filters.dataInicio && filters.dataFim) {
    activeChips.push({ key: "range", label: `${filters.dataInicio} → ${filters.dataFim}`, onClear: () => { setFilter("dataInicio", undefined); setFilter("dataFim", undefined); } });
  }
  if (filters.filial) activeChips.push({ key: "filial", label: `Filial: ${filters.filial}`, onClear: () => setFilter("filial", undefined) });
  if (filters.transportador) activeChips.push({ key: "transp", label: `Transp.: ${filters.transportador}`, onClear: () => setFilter("transportador", undefined) });
  if (filters.tipoVeiculo) activeChips.push({ key: "veiculo", label: `Veículo: ${filters.tipoVeiculo}`, onClear: () => setFilter("tipoVeiculo", undefined) });
  if (filters.status) activeChips.push({ key: "status", label: `Status: ${filters.status}`, onClear: () => setFilter("status", undefined) });
  if (filters.prioridade) activeChips.push({ key: "prio", label: `Prio.: ${filters.prioridade}`, onClear: () => setFilter("prioridade", undefined) });

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
        {!API_ENABLED && (
          <div className="bg-amber-500/90 text-white text-center text-xs font-semibold py-1.5 px-4 shrink-0">
            {MOCKS_ENABLED
              ? "⚠ Modo demonstração — dados fictícios (mocks). Configure VITE_API_BASE_URL para dados reais."
              : "⚠ API não configurada e mocks desativados. Nenhum dado disponível."}
          </div>
        )}
        {API_ENABLED && !filters.periodo && (
          <div className="flex items-center justify-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-center text-xs font-semibold py-1.5 px-4 shrink-0">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Exibindo dados do mês corrente. Selecione um período no filtro para navegar no histórico.
          </div>
        )}
        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-1.5 px-6 py-1.5 bg-muted/50 border-b border-border/30 shrink-0 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mr-1">Filtros:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5"
              >
                {chip.label}
                <button onClick={chip.onClear} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 xl:p-6 glow-soft">
          <div className="mx-auto w-full max-w-[1920px] px-2 xl:px-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
