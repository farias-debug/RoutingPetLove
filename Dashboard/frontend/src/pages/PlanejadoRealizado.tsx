import { useState } from "react";
import { Boxes, PackageCheck, Route, Weight } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import TemporalWindowTabs from "@/components/dashboard/TemporalWindowTabs";
import { useKpiDiario, useFilialPerformance, useCockpitSerieDiaria } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { formatInteger, formatPercent } from "@/lib/formatters";
import { formatShortDate, sortDailySeries, getMetricDomain, temporalWindows, type TemporalWindow } from "@/lib/dashboardTemporal";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, LEGEND_STYLE, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "evolucao", label: "Evolução" },
  { id: "pedidos", label: "Pedidos" },
  { id: "volumes", label: "Volumes" },
  { id: "gaps", label: "Gaps e ranking" },
];

const TOOLTIP_STYLE_LOCAL = TOOLTIP_STYLE;

export default function PlanejadoRealizado() {
  const [trendWindow, setTrendWindow] = useState<TemporalWindow>("30d");
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);
  const { data: serieDiaria, isLoading: loadingSerie } = useCockpitSerieDiaria(trendWindow, {
    periodo: filters.periodo,
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
  });

  const filiaisComparaveis = (filiais ?? []).filter(
    (f) => (f.pedidosPlan ?? 0) > 0 || (f.volumesPlan ?? 0) > 0 || (f.pesoPlan ?? 0) > 0,
  );
  const filiaisSemPlanejamento = Math.max(0, (filiais ?? []).length - filiaisComparaveis.length);

  const kpis = kpi
    ? [
      {
        label: "Aderência pedidos",
        value: kpi.pctAderPedidos != null ? +(kpi.pctAderPedidos * 100).toFixed(1) : "—",
        unit: "%",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "success" as const,
      },
      {
        label: "Aderência volumes",
        value: kpi.pctAderVolumes != null ? +(kpi.pctAderVolumes * 100).toFixed(1) : "—",
        unit: "%",
        meta: kpi.metaAderenciaVolumes != null ? kpi.metaAderenciaVolumes * 100 : undefined,
        metaLabel: "Meta",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "warning" as const,
      },
      {
        label: "Aderência peso",
        value: kpi.pctAderPeso != null ? +(kpi.pctAderPeso * 100).toFixed(1) : "—",
        unit: "%",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "success" as const,
      },
      {
        label: "Aderência km",
        value: kpi.pctAderKm != null ? +(kpi.pctAderKm * 100).toFixed(1) : "—",
        unit: "%",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "neutral" as const,
      },
    ]
    : [];

  // Dados por filial para gráficos plan×real — top 10 por volume
  const chartData = filiaisComparaveis
    .sort((a, b) => b.volumesReal - a.volumesReal)
    .slice(0, 10)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      planejadoPedidos: f.pedidosPlan ?? 0,
      realizadoPedidos: f.pedidosReal,
      planejadoVolumes: f.volumesPlan ?? 0,
      realizadoVolumes: f.volumesReal,
      gapVolumes: f.volumesReal - (f.volumesPlan ?? 0),
      aderenciaVolumes: f.aderenciaVolumes != null ? +(f.aderenciaVolumes * 100).toFixed(1) : null,
    }));

  // Top 8 maiores gaps de volumes (absoluto)
  const allChartData = filiaisComparaveis
    .sort((a, b) => b.volumesReal - a.volumesReal)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      planejadoPedidos: f.pedidosPlan ?? 0,
      realizadoPedidos: f.pedidosReal,
      planejadoVolumes: f.volumesPlan ?? 0,
      realizadoVolumes: f.volumesReal,
      gapVolumes: f.volumesReal - (f.volumesPlan ?? 0),
      aderenciaVolumes: f.aderenciaVolumes != null ? +(f.aderenciaVolumes * 100).toFixed(1) : null,
    }));

  const maioresGaps = [...allChartData]
    .sort((a, b) => Math.abs(b.gapVolumes) - Math.abs(a.gapVolumes))
    .slice(0, 8);

  const totalPlanejadoPedidos = allChartData.reduce((sum, item) => sum + item.planejadoPedidos, 0);
  const totalRealizadoPedidos = allChartData.reduce((sum, item) => sum + item.realizadoPedidos, 0);
  const totalPlanejadoVolumes = allChartData.reduce((sum, item) => sum + item.planejadoVolumes, 0);
  const totalRealizadoVolumes = allChartData.reduce((sum, item) => sum + item.realizadoVolumes, 0);

  const isLoading = loadingKpi || loadingFiliais;

  // Série temporal de aderência
  const orderedSeries = sortDailySeries(serieDiaria);
  const seriesChart = orderedSeries
    .filter(item => item.aderenciaVolumes != null)
    .map(item => ({
      label: formatShortDate(item.data),
      aderenciaPct: item.aderenciaVolumes == null ? null : Number((item.aderenciaVolumes * 100).toFixed(1)),
      entregasPct: Number((item.entregasEfetivas * 100).toFixed(1)),
    }));
  const metaAderencia = kpi?.metaAderenciaVolumes;
  const trendDomain = getMetricDomain(
    [...seriesChart.flatMap(item => [item.aderenciaPct, item.entregasPct]), metaAderencia != null ? metaAderencia * 100 : null].filter((v): v is number => v != null),
    { min: 0, max: 100, minimumSpan: 2 },
  );
  const windowLabel = temporalWindows.find(item => item.value === trendWindow)?.label ?? trendWindow.toUpperCase();

  const heroHighlights = [
    {
      label: "Aderência pedidos",
      value: formatPercent(kpi?.pctAderPedidos != null ? kpi.pctAderPedidos * 100 : null),
      detail: `${formatInteger(totalRealizadoPedidos)} realizados de ${formatInteger(totalPlanejadoPedidos)} planejados`,
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Aderência volumes",
      value: formatPercent(kpi?.pctAderVolumes != null ? kpi.pctAderVolumes * 100 : null),
      detail: `${formatInteger(totalRealizadoVolumes)} realizados de ${formatInteger(totalPlanejadoVolumes)} planejados`,
      icon: <Boxes className="h-4 w-4" />,
    },
    {
      label: "Aderência peso",
      value: formatPercent(kpi?.pctAderPeso != null ? kpi.pctAderPeso * 100 : null),
      detail: "Peso embarcado vs planejado",
      icon: <Weight className="h-4 w-4" />,
    },
    {
      label: "Aderência km",
      value: formatPercent(kpi?.pctAderKm != null ? kpi.pctAderKm * 100 : null),
      detail: "Desvio de malha no recorte",
      icon: <Route className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Planejado vs realizado"
          title="Acompanhe aderência e gaps do plano com leitura operacional por filial."
          description="Compara filiais com planejamento válido. Gaps de volume indicam onde o plano diverge da execução."
          highlights={heroHighlights}
        />

        {filiaisSemPlanejamento > 0 && (
          <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold text-muted-foreground">
            {filiaisSemPlanejamento} filiais sem planejamento foram ocultadas.
          </div>
        )}

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <LoadingSkeleton rows={2} />
          ) : (
            kpis.map((k, i) => <KPICard key={k.label} data={k} delay={i * 60} />)
          )}
        </div>
      </section>

      {/* EVOLUÇÃO TEMPORAL — série diária de aderência */}
      <section id="evolucao" className="scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Evolução temporal</p>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Aderência e entregas ao longo do período</h2>
          </div>
          <TemporalWindowTabs value={trendWindow} onChange={setTrendWindow} />
        </div>
        <SectionCard title={`Aderência volumes e entregas — ${windowLabel}`} subtitle={metaAderencia != null ? `Meta aderência ${formatPercent(metaAderencia * 100)}` : "Sem meta publicada"} delay={280}>
          <div className="h-56">
            {loadingSerie ? <LoadingSkeleton rows={4} /> : seriesChart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados na janela selecionada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={TICK_STYLE_SM} />
                  <YAxis tick={TICK_STYLE} domain={trendDomain} />
                  <Tooltip contentStyle={TOOLTIP_STYLE_LOCAL} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {metaAderencia != null && (
                    <ReferenceLine y={metaAderencia * 100} stroke={CHART_COLORS.success} strokeWidth={1.5} strokeDasharray="5 3" label={{ value: `Meta ${(metaAderencia * 100).toFixed(0)}%`, position: "insideTopLeft", fill: CHART_COLORS.success, fontSize: 10, fontWeight: 700 }} />
                  )}
                  <Line type="monotone" dataKey="aderenciaPct" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_COLORS.primary }} name="Aderência vol. %" />
                  <Line type="monotone" dataKey="entregasPct" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_COLORS.secondary }} name="Entregas %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* PEDIDOS — top 10 filiais */}
      <section id="pedidos" className="scroll-mt-24">
        <SectionCard
          title="Planejado vs realizado — pedidos"
          subtitle="Top 10 filiais por volume realizado"
          delay={300}
        >
          <div className="h-64">
            {loadingFiliais ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={TICK_STYLE_SM} interval={0} angle={-25} textAnchor="end" height={48} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE_LOCAL} formatter={(v: number) => formatInteger(v)} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="planejadoPedidos" fill={CHART_COLORS.primary} fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoPedidos" fill={CHART_COLORS.primary} name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* VOLUMES — top 10 filiais */}
      <section id="volumes" className="scroll-mt-24">
        <SectionCard
          title="Planejado vs realizado — volumes"
          subtitle="Top 10 filiais por volume realizado"
          delay={360}
        >
          <div className="h-64">
            {loadingFiliais ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={TICK_STYLE_SM} interval={0} angle={-25} textAnchor="end" height={48} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE_LOCAL} formatter={(v: number) => formatInteger(v)} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="planejadoVolumes" fill={CHART_COLORS.secondary} fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoVolumes" fill={CHART_COLORS.secondary} name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* GAPS */}
      <section id="gaps" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Resumo do recorte"
            subtitle="Totais planejados vs realizados"
            delay={420}
          >
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
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Gap volumes</p>
                <p className="mt-4 text-2xl font-black tracking-tight" style={{ color: totalRealizadoVolumes - totalPlanejadoVolumes >= 0 ? "#10b981" : "#ef4444" }}>
                  {totalRealizadoVolumes - totalPlanejadoVolumes >= 0 ? "+" : ""}{formatInteger(totalRealizadoVolumes - totalPlanejadoVolumes)}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Desvio total do plano</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Filiais comparáveis</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(filiaisComparaveis.length)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {filiaisSemPlanejamento > 0 ? `${filiaisSemPlanejamento} sem planejamento` : "Todas com planejamento"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Gap de volumes por filial"
            subtitle="Desvio absoluto — verde acima do plano, vermelho abaixo"
            delay={460}
          >
            <div className="h-72">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : maioresGaps.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de gap para o recorte.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maioresGaps} layout="vertical" margin={{ left: 8, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v >= 0 ? "+" : ""}${formatInteger(v)}`, "Gap"]} />
                    <ReferenceLine x={0} stroke="#667085" strokeWidth={1.5} />
                    <Bar dataKey="gapVolumes" name="Gap volumes" radius={[0, 4, 4, 0]} barSize={18}>
                      {maioresGaps.map((entry) => (
                        <Cell key={entry.filial} fill={entry.gapVolumes >= 0 ? "#10b981" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
