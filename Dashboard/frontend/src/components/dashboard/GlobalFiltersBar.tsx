import { useMemo, useState } from "react";
import { Calendar, Building2, Truck, RotateCcw, AlertTriangle, Package, ChevronDown } from "lucide-react";
import { format, parse, isValid, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { useFilterOptions } from "@/hooks/useApiData";

// ── helpers de conversão período ↔ DateRange ────────────────────────────────

function periodoToRange(periodo: string | undefined): DateRange | undefined {
  if (!periodo) return undefined;
  if (periodo.includes(",")) {
    const [s, e] = periodo.split(",");
    const from = parse(s, "yyyy-MM-dd", new Date());
    const to = parse(e, "yyyy-MM-dd", new Date());
    return isValid(from) && isValid(to) ? { from, to } : undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    const from = parse(periodo, "yyyy-MM-dd", new Date());
    return isValid(from) ? { from, to: from } : undefined;
  }
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const from = parse(`${periodo}-01`, "yyyy-MM-dd", new Date());
    if (!isValid(from)) return undefined;
    const lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0);
    return { from, to: lastDay };
  }
  return undefined;
}

function rangeToperiodo(range: DateRange | undefined): string | undefined {
  if (!range?.from) return undefined;
  const f = format(range.from, "yyyy-MM-dd");
  if (!range.to || format(range.to, "yyyy-MM-dd") === f) return f;
  return `${f},${format(range.to, "yyyy-MM-dd")}`;
}

function periodoLabel(periodo: string | undefined): string {
  if (!periodo) return "Período";
  if (periodo.includes(",")) {
    const [s, e] = periodo.split(",");
    try {
      const from = parse(s, "yyyy-MM-dd", new Date());
      const to = parse(e, "yyyy-MM-dd", new Date());
      if (isValid(from) && isValid(to)) {
        if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
          return `${format(from, "dd")}–${format(to, "dd/MM/yyyy")}`;
        }
        return `${format(from, "dd/MM")}–${format(to, "dd/MM/yyyy")}`;
      }
    } catch { /* fall through */ }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    try {
      const d = parse(periodo, "yyyy-MM-dd", new Date());
      if (isValid(d)) return format(d, "dd/MM/yyyy");
    } catch { /* fall through */ }
  }
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    try {
      const d = parse(`${periodo}-01`, "yyyy-MM-dd", new Date());
      if (isValid(d)) return format(d, "MMM yyyy", { locale: ptBR });
    } catch { /* fall through */ }
  }
  return periodo;
}

// ── componente principal ─────────────────────────────────────────────────────

export default function GlobalFiltersBar() {
  const { filters, setFilter, resetFilters } = useGlobalFilters();
  const { data: options } = useFilterOptions(filters);
  const [calOpen, setCalOpen] = useState(false);

  const periodos = options?.periodos ?? [];
  const filialOptions = options?.filiais ?? [];
  const transpOptions = options?.transportadores ?? [];
  const tipoVeiculoOptions = options?.tiposVeiculo ?? [];
  const statusOptions = options?.status ?? [];
  const prioridadeOptions = options?.prioridades ?? [];

  // Gerar últimos 6 meses como atalhos, marcando quais têm dados
  const apiPeriodValues = new Set(periodos.map((p: { value: string }) => p.value));
  const syntheticMonths = useMemo(() => {
    const now = new Date();
    const months: { value: string; label: string; hasData: boolean }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = startOfMonth(subMonths(now, i));
      const value = format(d, "yyyy-MM");
      const label = format(d, "MMMM yyyy", { locale: ptBR }).replace(/^./, (l) => l.toUpperCase());
      months.push({ value, label, hasData: apiPeriodValues.has(value) });
    }
    return months;
  }, [apiPeriodValues.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = filters.periodo || filters.filial || filters.transportador || filters.status || filters.prioridade || filters.tipoVeiculo;
  const filterCount = [filters.periodo, filters.filial, filters.transportador, filters.tipoVeiculo, filters.status, filters.prioridade].filter(Boolean).length;

  const selectedRange = periodoToRange(filters.periodo);

  function handleRangeChange(range: DateRange | undefined) {
    const valor = rangeToperiodo(range);
    setFilter("periodo", valor);
    // fecha apenas quando range completo ou limpou
    if (!range?.from || (range?.from && range?.to)) {
      setCalOpen(false);
    }
  }

  function handleMonthShortcut(value: string) {
    setFilter("periodo", value);
    setCalOpen(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Período — DatePicker com atalhos de mês */}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition-colors min-w-[160px]">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{periodoLabel(filters.periodo)}</span>
            <ChevronDown className="h-3 w-3 ml-auto shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* Atalhos rápidos de mês (6 últimos, cinza se sem dados) */}
            {syntheticMonths.length > 0 && (
              <div className="border-b sm:border-b-0 sm:border-r border-border/40 p-2 flex flex-col gap-0.5 min-w-[140px]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">Meses</p>
                {syntheticMonths.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleMonthShortcut(m.value)}
                    disabled={!m.hasData}
                    className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${
                      filters.periodo === m.value
                        ? "bg-accent text-accent-foreground font-semibold"
                        : m.hasData
                          ? "hover:bg-accent hover:text-accent-foreground"
                          : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                  >
                    {m.label}{!m.hasData && " •"}
                  </button>
                ))}
                {filters.periodo && (
                  <button
                    onClick={() => { setFilter("periodo", undefined); setCalOpen(false); }}
                    className="text-left text-xs px-2 py-1.5 rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-1"
                  >
                    Limpar período
                  </button>
                )}
              </div>
            )}
            {/* Calendário dia a dia */}
            <div>
              <CalendarUI
                mode="range"
                selected={selectedRange}
                onSelect={handleRangeChange}
                locale={ptBR}
                numberOfMonths={1}
                initialFocus
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Filial */}
      <Select
        value={filters.filial ?? "__all__"}
        onValueChange={(v) => setFilter("filial", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[160px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <Building2 className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Filial" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as filiais</SelectItem>
          {filialOptions.map((f) => (
            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Transportador */}
      <Select
        value={filters.transportador ?? "__all__"}
        onValueChange={(v) => setFilter("transportador", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[180px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Transportador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos transportadores</SelectItem>
          {transpOptions.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.tipoVeiculo ?? "__all__"}
        onValueChange={(v) => setFilter("tipoVeiculo", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[170px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Tipo de veículo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os tipos</SelectItem>
          {tipoVeiculoOptions.map((tipo) => (
            <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? "__all__"}
        onValueChange={(v) => setFilter("status", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[150px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <Package className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos status</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.prioridade ?? "__all__"}
        onValueChange={(v) => setFilter("prioridade", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[150px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas prioridades</SelectItem>
          {prioridadeOptions.map((prioridade) => (
            <SelectItem key={prioridade.value} value={prioridade.value}>{prioridade.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{filterCount}</span>
          Limpar
        </button>
      )}
    </div>
  );
}
