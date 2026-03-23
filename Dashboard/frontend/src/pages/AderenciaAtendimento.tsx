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
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine, Legend } from "recharts";
import { formatInteger, formatDecimal, formatPercent, formatSigned } from "@/lib/formatters";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "evolucao", label: "Evolução" },
  { id: "dimensoes", label: "Dimensões" },
  { id: "filiais", label: "Filiais" },
  { id: "leituras", label: "Leituras" },
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
    { label: "Aderência Pedidos", value: kpi.pctAderPedidos != null ? +(kpi.pctAderPedidos * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência Volumes", value: kpi.pctAderVolumes != null ? +(kpi.pctAderVolumes * 100).toFixed(1) : "—", unit: "%", meta: kpi.metaAderenciaVolumes != null ? kpi.metaAderenciaVolumes * 100 : undefined, metaLabel: "Meta", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Aderência Peso", value: kpi.pctAderPeso != null ? +(kpi.pctAderPeso * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Aderência KM", value: kpi.pctAderKm != null ? +(kpi.pctAderKm * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Aderência Tempo", value: kpi.pctAderTempo != null ? +(kpi.pctAderTempo * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Match Mesmo Dia", value: kpi.pctMatchMesmoDia != null ? +(kpi.pctMatchMesmoDia * 100).toFixed(1) : "—", unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
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
  }));

  const orderedSeries = sortDailySeries(serieDiaria);
  const { latest: latestSeriesPoint, previous: previousSeriesPoint } = getSeriesExtremes(orderedSeries);
  const comparableSeries = orderedSeries.filter((item) => item.aderenciaVolumes != null || (item.scoreOperacional ?? 0) > 0 || (item.tempoMedRealizado ?? 0) > 0);
  const latestComparablePoint = comparableSeries[comparableSeries.length - 1] ?? latestSeriesPoint;
  const previousComparablePoint = comparableSeries.length > 1 ? comparableSeries[comparableSeries.length - 2] : previousSeriesPoint;
  const seriesChart = orderedSeries.map((item) => ({
    label: formatShortDate(item.data),
    aderenciaPct: item.aderenciaVolumes == null ? null : Number((item.aderenciaVolumes * 100).toFixed(1)),
    entregasPct: Number((item.entregasEfetivas * 100).toFixed(1)),
    score: Number(item.scoreOperacional.toFixed(1)),
  }));

  const piorDimensao = [...radarData].sort((left, right) => left.valor - right.valor)[0];
  const melhorDimensao = [...radarData].sort((left, right) => right.valor - left.valor)[0];
  const melhorFilial = [...filialList].sort((left, right) => right.entregasEfetivas - left.entregasEfetivas)[0];
  const piorFilial = [...filialList].sort((left, right) => left.entregasEfetivas - right.entregasEfetivas)[0];

  const entregasVariation = getVariation(latestSeriesPoint?.entregasEfetivas, previousSeriesPoint?.entregasEfetivas);
  const rotasVariation = getVariation(latestSeriesPoint?.rotas, previousSeriesPoint?.rotas);
  const aderenciaVariationComparable = getVariation(latestComparablePoint?.aderenciaVolumes, previousComparablePoint?.aderenciaVolumes);
  const scoreVariationComparable = getVariation(latestComparablePoint?.scoreOperacional, previousComparablePoint?.scoreOperacional);
  const trendDomain = getMetricDomain(
    [...seriesChart.flatMap((item) => [item.aderenciaPct, item.entregasPct]), kpi?.metaAderenciaVolumes != null ? kpi.metaAderenciaVolumes * 100 : null].filter((v): v is number => v != null),
    { min: 0, max: 100, minimumSpan: 2 },
  );
  const windowLabel = temporalWindows.find((item) => item.value === trendWindow)?.label ?? trendWindow.toUpperCase();

  const heroHighlights = [
    {
      label: "Aderência volumes",
      value: latestComparablePoint ? formatPercent(latestComparablePoint.aderenciaVolumes == null ? null : latestComparablePoint.aderenciaVolumes * 100) : formatPercent(kpi?.pctAderVolumes == null ? null : kpi.pctAderVolumes * 100),
      detail: kpi?.metaAderenciaVolumes ? `Meta ${formatPercent(kpi.metaAderenciaVolumes * 100)}` : "Sem meta publicada no recorte",
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Aderência tempo",
      value: formatPercent(kpi?.pctAderTempo == null ? null : kpi.pctAderTempo * 100),
      detail: "Leitura de disciplina operacional do recorte atual",
      icon: <TimerReset className="h-4 w-4" />,
    },
    {
      label: "Match mesmo dia",
      value: formatPercent(kpi?.pctMatchMesmoDia == null ? null : kpi.pctMatchMesmoDia * 100),
      detail: "Aderência do atendimento no mesmo dia planejado",
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
      label: "Aderência volumes vs D-1",
      value: latestComparablePoint ? formatPercent(latestComparablePoint.aderenciaVolumes == null ? null : latestComparablePoint.aderenciaVolumes * 100) : "—",
      detail: previousComparablePoint ? formatSigned(aderenciaVariationComparable.delta * 100, (value) => formatPercent(value)) : "Sem D-1 disponível",
      direction: aderenciaVariationComparable.direction,
    },
    {
      label: "Entregas efetivas vs D-1",
      value: latestSeriesPoint ? formatPercent(latestSeriesPoint.entregasEfetivas * 100) : "—",
      detail: previousSeriesPoint ? formatSigned(entregasVariation.delta * 100, (value) => formatPercent(value)) : "Sem D-1 disponível",
      direction: entregasVariation.direction,
    },
    {
      label: "Score operacional vs D-1",
      value: latestComparablePoint ? formatDecimal(latestComparablePoint.scoreOperacional) : "—",
      detail: previousComparablePoint ? `${formatSigned(scoreVariationComparable.delta, (value) => formatDecimal(value))} pts` : "Sem D-1 disponível",
      direction: scoreVariationComparable.direction,
    },
    {
      label: "Rotas do último dia",
      value: latestSeriesPoint ? formatInteger(latestSeriesPoint.rotas) : "—",
      detail: previousSeriesPoint ? `${formatSigned(rotasVariation.delta, (value) => formatInteger(value))} vs D-1` : "Sem D-1 disponível",
      direction: rotasVariation.direction,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Aderência e atendimento"
          title="Leia aderência por dimensão e acompanhe a evolução diária do atendimento no mesmo fluxo."
          description="A Onda 2 inicial conecta radar dimensional, filiais e série diária do recorte, adicionando janela temporal e comparativos contra D-1 para tornar a leitura realmente operacional."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Janela temporal</p>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Aderência diária, D-1 e acumulado da janela selecionada</h2>
          </div>
          <TemporalWindowTabs value={trendWindow} onChange={setTrendWindow} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loadingSerieDiaria ? <LoadingSkeleton rows={2} /> : variationCards.map((item) => {
            const Icon = item.direction === "up" ? ArrowUpRight : item.direction === "down" ? ArrowDownRight : PackageCheck;
            const tone = item.direction === "up"
              ? "text-success"
              : item.direction === "down"
                ? "text-destructive"
                : "text-muted-foreground";
            return (
              <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-4 card-shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                <p className={`mt-2 text-xs font-semibold ${tone}`}>{item.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {loadingKpi ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="evolucao" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <SectionCard title="Evolução diária do atendimento" subtitle={`Janela ${windowLabel} com aderência de volumes e entregas efetivas`} delay={400}>
            <div className="h-64 flex items-center justify-center">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} domain={trendDomain} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    {kpi?.metaAderenciaVolumes != null && (
                      <ReferenceLine
                        y={kpi.metaAderenciaVolumes * 100}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        label={{ value: `Meta vol. ${(kpi.metaAderenciaVolumes * 100).toFixed(0)}%`, position: "insideTopLeft", fill: "#10b981", fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                    {kpi?.metaEntregas != null && (
                      <ReferenceLine
                        y={kpi.metaEntregas * 100}
                        stroke="#667085"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        label={{ value: `Meta entr. ${(kpi.metaEntregas * 100).toFixed(0)}%`, position: "insideBottomLeft", fill: "#667085", fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                    <Line type="monotone" dataKey="aderenciaPct" stroke="#522B8F" strokeWidth={2.5} dot={{ r: 3, fill: "#522B8F" }} name="Aderência vol. %" />
                    <Line type="monotone" dataKey="entregasPct" stroke="#EC5B13" strokeWidth={2.5} dot={{ r: 3, fill: "#EC5B13" }} name="Entregas %" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Resumo da janela" subtitle="Acumulados e último fechamento do recorte selecionado" delay={440}>
            {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas na janela</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.rotas))}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Acumulado diário do período {windowLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos na janela</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.pedidos))}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Base usada para leitura do atendimento</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Último gap vs meta</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                    {latestComparablePoint?.aderenciaVolumes == null || kpi?.metaAderenciaVolumes == null ? "—" : formatSigned((latestComparablePoint.aderenciaVolumes - kpi.metaAderenciaVolumes) * 100, (value) => formatPercent(value))}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Aderência de volumes contra a meta vigente</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Score do último dia</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(latestComparablePoint?.scoreOperacional)}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Fechamento mais recente da série diária</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section id="dimensoes" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Radar de aderência" subtitle="Visão consolidada de todas as dimensões" delay={400}>
            <div className="h-64 flex items-center justify-center">
              {loadingKpi ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(220 13% 91%)" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fontWeight: 700, fill: "#667085" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#98A2B3" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                    <Radar dataKey="valor" stroke="#522B8F" fill="#522B8F" fillOpacity={0.18} strokeWidth={2} name="Aderência %" />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Leituras dimensionais" subtitle="Melhor e pior aderência para priorização do recorte" delay={440}>
            <div className="space-y-3">
              {[
                {
                  label: "Dimensão mais forte",
                  value: melhorDimensao ? formatPercent(melhorDimensao.valor) : "0,0%",
                  detail: melhorDimensao ? melhorDimensao.dim : "Sem dados no recorte",
                },
                {
                  label: "Dimensão mais crítica",
                  value: piorDimensao ? formatPercent(piorDimensao.valor) : "0,0%",
                  detail: piorDimensao ? piorDimensao.dim : "Sem dados no recorte",
                },
                {
                  label: "Gap atendimento mesmo dia",
                  value: formatPercent(100 - ((kpi?.pctMatchMesmoDia ?? 0) * 100)),
                  detail: "Diferença entre o atendimento ideal e o match realizado no mesmo dia",
                },
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
        <SectionCard title="Entregas efetivas por filial" subtitle="Percentual de entrega efetiva no recorte aplicado" delay={480}>
          {loadingFiliais ? <LoadingSkeleton rows={6} /> : (
            <div className="space-y-2">
              {filialList.map(f => (
                <div key={f.filial} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold w-28 shrink-0">{f.filial}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
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

      <section id="leituras" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Filiais em destaque" subtitle="Melhor e pior atendimento efetivo do período" delay={520}>
            <div className="space-y-3">
              {[
                {
                  label: "Melhor filial",
                  value: melhorFilial ? formatPercent(melhorFilial.entregasEfetivas) : "0,0%",
                  detail: melhorFilial ? `${melhorFilial.filial} • score ${melhorFilial.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "Sem dados no recorte",
                },
                {
                  label: "Filial mais pressionada",
                  value: piorFilial ? formatPercent(piorFilial.entregasEfetivas) : "0,0%",
                  detail: piorFilial ? `${piorFilial.filial} • score ${piorFilial.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "Sem dados no recorte",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Resumo executivo do recorte" subtitle="Leitura rápida para tomada de decisão antes do drill" delay={560}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {radarData.map((item) => (
                <div key={item.dim} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.dim}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatPercent(item.valor)}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Dimensão comparada no radar consolidado</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
