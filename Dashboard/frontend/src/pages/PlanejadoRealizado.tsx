import { Boxes, PackageCheck, Route, Weight } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useKpiDiario, useFilialPerformance } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "pedidos", label: "Pedidos" },
  { id: "volumes", label: "Volumes" },
  { id: "gaps", label: "Gaps" },
];

function formatInteger(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export default function PlanejadoRealizado() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);

  const kpis = kpi ? [
    { label: "Aderência Pedidos", value: +(kpi.pctAderPedidos * 100).toFixed(1), unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência Volumes", value: +(kpi.pctAderVolumes * 100).toFixed(1), unit: "%", meta: (kpi.metaAderenciaVolumes ?? 0.9) * 100, metaLabel: "Meta", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Aderência Peso", value: +(kpi.pctAderPeso * 100).toFixed(1), unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência KM", value: +(kpi.pctAderKm * 100).toFixed(1), unit: "%", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
  ] : [];

  const chartData = (filiais ?? []).map((f) => ({
    filial: f.nomeFilial || f.filial,
    planejadoPedidos: f.pedidosPlan ?? 0,
    realizadoPedidos: f.pedidosReal,
    planejadoVolumes: f.volumesPlan ?? 0,
    realizadoVolumes: f.volumesReal,
    gapPedidos: f.pedidosReal - (f.pedidosPlan ?? 0),
    gapVolumes: f.volumesReal - (f.volumesPlan ?? 0),
  }));

  const maioresGaps = [...chartData]
    .sort((left, right) => Math.abs(right.gapVolumes) - Math.abs(left.gapVolumes))
    .slice(0, 5);

  const totalPlanejadoPedidos = chartData.reduce((sum, item) => sum + item.planejadoPedidos, 0);
  const totalRealizadoPedidos = chartData.reduce((sum, item) => sum + item.realizadoPedidos, 0);
  const totalPlanejadoVolumes = chartData.reduce((sum, item) => sum + item.planejadoVolumes, 0);
  const totalRealizadoVolumes = chartData.reduce((sum, item) => sum + item.realizadoVolumes, 0);

  const isLoading = loadingKpi || loadingFiliais;

  const heroHighlights = [
    {
      label: "Aderência pedidos",
      value: formatPercent(kpi?.pctAderPedidos ? kpi.pctAderPedidos * 100 : 0),
      detail: `${formatInteger(totalRealizadoPedidos)} pedidos realizados no recorte`,
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Aderência volumes",
      value: formatPercent(kpi?.pctAderVolumes ? kpi.pctAderVolumes * 100 : 0),
      detail: `${formatInteger(totalRealizadoVolumes)} volumes realizados`,
      icon: <Boxes className="h-4 w-4" />,
    },
    {
      label: "Aderência peso",
      value: formatPercent(kpi?.pctAderPeso ? kpi.pctAderPeso * 100 : 0),
      detail: "Leitura do que foi embarcado versus o planejado",
      icon: <Weight className="h-4 w-4" />,
    },
    {
      label: "Aderência km",
      value: formatPercent(kpi?.pctAderKm ? kpi.pctAderKm * 100 : 0),
      detail: "Desvio de execução da malha no recorte aplicado",
      icon: <Route className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Planejado × realizado"
          title="Acompanhe aderência e gaps do plano com leitura operacional por filial."
          description="Esta página passa a servir como ponte entre a leitura executiva de aderência e os desvios que precisam de correção no dia. O foco aqui é enxergar rapidamente onde o plano não está se convertendo em execução."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="pedidos" className="scroll-mt-24">
        <SectionCard title="Planejado × Realizado — Pedidos" subtitle="Por filial" delay={300}>
          <div className="h-64">
            {loadingFiliais ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="planejadoPedidos" fill="#522B8F" fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoPedidos" fill="#522B8F" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="volumes" className="scroll-mt-24">
        <SectionCard title="Planejado × Realizado — Volumes" subtitle="Por filial" delay={360}>
          <div className="h-64">
            {loadingFiliais ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="planejadoVolumes" fill="#EC5B13" fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoVolumes" fill="#EC5B13" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="gaps" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Resumo do recorte" subtitle="Totais planejados e realizados do período filtrado" delay={420}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(totalRealizadoPedidos)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Planejado {formatInteger(totalPlanejadoPedidos)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Volumes</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(totalRealizadoVolumes)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Planejado {formatInteger(totalPlanejadoVolumes)}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Filiais com maior gap" subtitle="Desvio absoluto de volumes para priorização operacional" delay={460}>
            {loadingFiliais ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {maioresGaps.map((item) => (
                  <div key={item.filial} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.filial}</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Pedidos {formatInteger(item.realizadoPedidos)} de {formatInteger(item.planejadoPedidos)} planejados
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${item.gapVolumes >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {item.gapVolumes >= 0 ? "+" : ""}{formatInteger(item.gapVolumes)} vol.
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground">
                      <span>Volumes {formatInteger(item.realizadoVolumes)} de {formatInteger(item.planejadoVolumes)}</span>
                      <span>Gap pedidos {item.gapPedidos >= 0 ? "+" : ""}{formatInteger(item.gapPedidos)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
