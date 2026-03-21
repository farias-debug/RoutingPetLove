import { Calendar, Building2, Truck, RotateCcw, AlertTriangle, Package } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { useFilterOptions } from "@/hooks/useApiData";

export default function GlobalFiltersBar() {
  const { filters, setFilter, resetFilters } = useGlobalFilters();
  const { data: options } = useFilterOptions(filters);

  const periodos = options?.periodos ?? [];
  const filialOptions = options?.filiais ?? [];
  const transpOptions = options?.transportadores ?? [];
  const tipoVeiculoOptions = options?.tiposVeiculo ?? [];
  const statusOptions = options?.status ?? [];
  const prioridadeOptions = options?.prioridades ?? [];

  const hasFilters = filters.periodo || filters.filial || filters.transportador || filters.status || filters.prioridade || filters.tipoVeiculo;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Período */}
      <Select
        value={filters.periodo ?? "__all__"}
        onValueChange={(v) => setFilter("periodo", v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 w-[180px] bg-white/10 border-white/20 text-white text-xs font-semibold">
          <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-70" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os períodos</SelectItem>
          {periodos.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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
          className="flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Limpar
        </button>
      )}
    </div>
  );
}
