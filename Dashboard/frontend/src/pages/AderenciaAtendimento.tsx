import { useState } from "react";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, MapPinned, PackageCheck, TimerReset } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import TemporalWindowTabs from "@/components/dashboard/TemporalWindowTabs";
import { useCockpitSerieDiaria, useKpiDiario, useFilialPerformance } from "@/hooks/useApiData";
import { formatShortDate, getMetricDomain, getSeriesExtremes, getVariation, sortDailySeries, sumMetric, temporalWindows, type TemporalWindow } from "@/lib/dashboardTemporal";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine, Legend, BarChart, Bar, Cell } from "recharts";
import { formatInteger, formatDecimal, formatPercent, formatSigned } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS, LEGEND_STYLE } from "@/lib/chartConfig";
import VariationCards from "@/components/dashboard/VariationCards";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "evolucao", label: "Evolução" },
  { id: "dimensoes", label: "Dimensões" },
  { id: "filiais", label: "Filiais" },
];

export default function AderenciaAtendimento() {
  const [trendWindow, setTrendWindow] = useState<TemporalWindow>("30d");
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);
  const { data: serieDiaria, isLoading: loadingSerieDiaria } = useCockpitSerieDiaria(trendWindow, {
    periodo: filters.periodo,
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
  });

  const kpis = kpi ? [
    { label: "Aderência pedidos", value: kpi.pctAderPedidos != null ? +(kpi.pctAderPedidos * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência volumes", value: kpi.pctAderVolumes != null ? +(kpi.pctAderVolumes * 100).toFixed(1) : "—", unit: "%", meta: kpi.metaAderenciaVolumes != null ? kpi.metaAderenciaVolumes * 100 : undefined, metaLabel: "Meta", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Aderência peso", value: kpi.pctAderPeso != null ? +(kpi.pctAderPeso * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência km", value: kpi.pctAderKm != null ? +(kpi.pctAderKm * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Aderência tempo", value: kpi.pctAderTempo != null ? +(kpi.pctAderTempo * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Match mesmo dia", value: kpi.pctMatchMesmoDia != null ? +(kpi.pctMatchMesmoDia * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
  ] : [];

  const radarData = kpi ? [
    { dim: "Pedidos", valor: kpi.pctAderPedidos != null ? +(kpi.pctAderPedidos * 100).toFixed(1) : 0 },
    { dim: "Volumes", valor: kpi.pctAderVolumes != null ? +(kpi.pctAderVolumes * 100).toFixed(1) : 0 },
    { dim: "Peso", valor: kpi.pctAderPeso != null ? +(kpi.pctAderPeso * 100).toFixed(1) : 0 },
    { dim: "KM", valor: kpi.pctAderKm != null ? +(kpi.pctAderKm * 100).toFixed(1) : 0 },
    { dim: "Tempo", valor: kpi.pctAderTempo != null ? +(kpi.pctAderTempo * 100).toFixed(1) : 0 },
    { dim: "Match", valor: kpi.pctMatchMesmoDia != null ? +(kpi.pctMatchMesmoDia * 100).toFixed(1) : 0 },
  ] : [];

  const filialList = (filiais ?? []).map(f => ({
    filial: f.nomeFilial || f.filial,
    entregasEfetivas: +(f.entregasEfetivas * 100).toFixed(1),
    score: f.scoreOperacional,
  })).sort((a, b) => b.entregasEfetivas - a.entregasEfetivas);

  const orderedSeries = sortDailySeries(serieDiaria);
  const { latest: latestSeriesPoint, previous: previousSeriesPoint } = getSeriesExtremes(orderedSeries);
  const comparableSeries = orderedSeries.filter((item) => item.aderenciaVolumes != null || (item.scoreOperacional ?? 0) > 0 || (item.tempoMedRealizado ?? 0) > 0);
  const latestComparablePoint = comparableSeries[comparableSeries.length - 1] ?? latestSeriesPoint;
  const previousComparablePoint = comparableSeries.length > 1 ? comparableSeries[comparableSeries.length - 2] : previousSeriesPoint;
  const seriesChart = orderedSeries.map((item) => ({
    label: formatShortDate(item.data),
    aderenciaPct: item.aderenciaVolumes == null ? null : Number((item.aderenciaVolumes * 100).toFixed(1)),
    entregasPct: Number((item.entregasEfetivas * 100).toFixed(1)),
  }));

  const piorDimensao = [...radarData].sort((a, b) => a.valor - b.valor)[0];
  const melhorDimensao = [...radarData].sort((a, b) => b.valor - a.valor)[0];
  const melhorFilial = filialList[0];
  const piorFilial = filialList[filialList.length - 1];

  const entregasVariation = getVariation(latestSeriesPoint?.entregasEfetivas, previousSeriesPoint?.entregasEfetivas);
  const aderenciaVariation = getVariation(latestComparablePoint?.aderenciaVolumes, previousComparablePoint?.aderenciaVolumes);
  const trendDomain = getMetricDomain(
    [...seriesChart.flatMap((item) => [item.aderenciaPct, item.entregasPct]), kpi?.metaAderenciaVolumes != null ? kpi.metaAderenciaVolumes * 100 : null].filter((v): v is number => v != null),
    { min: 0, max: 100, minimumSpan: 2 },
  );
  const windowLabel = temporalWindows.find((item) => item.value === trendWindow)?.label ?? trendWindow.toUpperCase();

  const heroHighlights = [
    {
      label: "Aderência volumes",
      value: latestComparablePoint ? formatPercent(latestComparablePoint.aderenciaVolumes == null ? null : latestComparablePoint.aderenciaVolumes * 100) : formatPercent(kpi?.pctAderVolumes == null ? null : kpi.pctAderVolumes * 100),
      detail: kpi?.metaAderenciaVolumes ? `Meta ${formatPercent(kpi.metaAderenciaVolumes * 100)}` : "Sem meta publicada",
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Aderência tempo",
      value: formatPercent(kpi?.pctAderTempo == null ? null : kpi.pctAderTempo * 100),
      detail: "Disciplina operacional do recorte",
      icon: <TimerReset className="h-4 w-4" />,
    },
    {
      label: "Match mesmo dia",
      value: formatPercent(kpi?.pctMatchMesmoDia == null ? null : kpi.pctMatchMesmoDia * 100),
      detail: "Atendimento no dia planejado",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: "Melhor filial",
      value: melhorFilial ? formatPercent(melhorFilial.entregasEfetivas) : "—",
      detail: melhorFilial ? melhorFilial.filial : "Sem filial no recorte",
      icon: <MapPinned className="h-4 w-4" />,
    },
  ];

  const variationCards = [
    {
      label: "Aderência vol. vs D-1",
      value: latestComparablePoint ? formatPercent(latestComparablePoint.aderenciaVolumes == null ? null : latestComparablePoint.aderenciaVolumes * 100) : "—",
      detail: previousComparablePoint ? formatSigned(aderenciaVariation.delta * 100, (v) => formatPercent(v)) : "Sem D-1",
      direction: aderenciaVariation.direction,
    },
    {
      label: "Entregas efetivas vs D-1",
      value: latestSeriesPoint ? formatPercent(latestSeriesPoint.entregasEfetivas * 100) : "—",
      detail: previousSeriesPoint ? formatSigned(entregasVariation.delta * 100, (v) => formatPercent(v)) : "Sem D-1",
      direction: entregasVariation.direction,
    },
    {
      label: "Rotas na janela",
      value: formatInteger(sumMetric(orderedSeries, (item) => item.rotas)),
      detail: `Acumulado ${windowLabel}`,
      direction: "neutral" as const,
    },
    {
      label: "Último dia",
      value: latestSeriesPoint ? formatInteger(latestSeriesPoint.rotas) : "—",
      detail: latestSeriesPoint ? `${formatShortDate(latestSeriesPoint.data)}` : "Sem dados",
      direction: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Aderência e atendimento"
          title="Aderência por dimensão e evolução diária do atendimento."
          description="Radar dimensional, filiais e série diária com janela temporal e comparação D-1."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Janela temporal</p>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Aderência diária e variações D-1</h2>
          </div>
          <TemporalWindowTabs value={trendWindow} onChange={setTrendWindow} />
        </div>

        <VariationCards items={variationCards} isLoading={loadingSerieDiaria} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {loadingKpi ? <LoadingSkeleton rows={2} /> : kpis.map((k, i) => (
            <KPICard key={k.label} data={k} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="evolucao" className="scroll-mt-24">
        <SectionCard title="Evolução diária" subtitle={`Janela ${windowLabel} — aderência volumes e entregas efetivas`} delay={400}>
          <div className="h-56">
            {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={TICK_STYLE_SM} />
                  <YAxis tick={TICK_STYLE_SM} domain={trendDomain} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {kpi?.metaAderenciaVolumes != null && (
                    <ReferenceLine y={kpi.metaAderenciaVolumes * 100} stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" label={{ value: `Meta ${(kpi.metaAderenciaVolumes * 100).toFixed(0)}%`, position: "insideTopLeft", fill: "#10b981", fontSize: 10, fontWeight: 700 }} />
                  )}
                  <Line type="monotone" dataKey="aderenciaPct" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_COLORS.primary }} name="Aderência vol. %" />
                  <Line type="monotone" dataKey="entregasPct" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART_COLORS.secondary }} name="Entregas %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="dimensoes" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="Radar de aderência" subtitle="Visão de todas as dimensões" delay={440}>
            <div className="h-56">
              {loadingKpi ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke={GRID_STROKE} />
                    <PolarAngleAxis dataKey="dim" tick={TICK_STYLE} />
                    <PolarRadiusAxis domain={[0, 100]} tick={TICK_STYLE_SM} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Radar dataKey="valor" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.18} strokeWidth={2} name="Aderência %" />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Barras dimensionais" subtitle="Comparação precisa de cada dimensão" delay={460}>
            <div className="h-56">
              {loadingKpi ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...radarData].sort((a, b) => b.valor - a.valor)} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={TICK_STYLE_SM} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="dim" tick={TICK_STYLE} width={58} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Aderência"]} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18}>
                      {[...radarData].sort((a, b) => b.valor - a.valor).map((entry, i) => (
                        <Cell key={i} fill={entry.valor >= 95 ? CHART_COLORS.success : entry.valor >= 90 ? CHART_COLORS.warning : CHART_COLORS.danger} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Leituras dimensionais" subtitle="Maior e menor aderência do recorte" delay={480}>
            <div className="space-y-3">
              {[
                { label: "Dimensão mais forte", value: melhorDimensao ? formatPercent(melhorDimensao.valor) : "—", detail: melhorDimensao?.dim ?? "Sem dados" },
                { label: "Dimensão mais crítica", value: piorDimensao ? formatPercent(piorDimensao.valor) : "—", detail: piorDimensao?.dim ?? "Sem dados" },
                { label: "Gap atendimento", value: formatPercent(100 - ((kpi?.pctMatchMesmoDia ?? 0) * 100)), detail: "Diferença entre meta e match no mesmo dia" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section id="filiais" className="scroll-mt-24">
        <SectionCard title="Entregas efetivas por filial" subtitle="% de entrega efetiva no recorte" delay={520}>
          {loadingFiliais ? <LoadingSkeleton rows={6} /> : (
            <div className="space-y-2">
              {filialList.slice(0, 12).map(f => (
                <div key={f.filial} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold w-28 shrink-0 truncate">{f.filial}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${f.entregasEfetivas}%`,
                        background: f.entregasEfetivas >= 95 ? "hsl(152 60% 40%)" : f.entregasEfetivas >= 93 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)",
                      }}
                    />
                  </div>
                  <span className="text-[13px] font-bold tabular-nums w-14 text-right">{f.entregasEfetivas}%</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
