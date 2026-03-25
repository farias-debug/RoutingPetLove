import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock3, PackageCheck, Route, TrendingUp } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import TemporalWindowTabs from "@/components/dashboard/TemporalWindowTabs";
import { useCockpitSerieDiaria, useKpiDiario, useMetas } from "@/hooks/useApiData";
import { formatShortDate, getMetricDomain, getSeriesExtremes, getVariation, sortDailySeries, sumMetric, temporalWindows, type TemporalWindow } from "@/lib/dashboardTemporal";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { formatInteger, formatPercent, formatDuration, formatDecimal, formatSigned } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";
import VariationCards from "@/components/dashboard/VariationCards";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "entregas", label: "Entregas" },
  { id: "produtividade", label: "Produtividade" },
  { id: "leituras", label: "Leituras" },
];

export default function TempoSla() {
  const [trendWindow, setTrendWindow] = useState<TemporalWindow>("30d");
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: metas } = useMetas();
  const { data: serieDiaria, isLoading: loadingSerieDiaria } = useCockpitSerieDiaria(trendWindow, {
    periodo: filters.periodo,
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
  });

  const metaEntregas = (metas ?? []).find(m => m.kpiId === "entregas_efetivas")?.meta ?? kpi?.metaEntregas;
  const metaSpr = (metas ?? []).find(m => m.kpiId === "spr_pedidos")?.meta;
  const metaRotasConcluidas = kpi?.metaRotasConcluidas;
  const overtimeRotas = kpi ? Math.round(kpi.rotas * kpi.pctRotasOvertime) : 0;

  const kpis = kpi ? [
    { label: "Tempo Médio Realizado", value: formatDuration(kpi.tempoMedRealizado), unit: "", meta: kpi.metaOrhTempo != null ? +kpi.metaOrhTempo.toFixed(1) : undefined, metaLabel: "Meta", metaFormatted: kpi.metaOrhTempo != null ? formatDuration(kpi.metaOrhTempo) : undefined, trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Rotas Concluídas", value: +(kpi.pctRotasConcluidas * 100).toFixed(1), unit: "%", meta: metaRotasConcluidas != null ? metaRotasConcluidas * 100 : undefined, metaLabel: "Meta", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Ociosidade", value: +(kpi.pctOciosidadeJornada * 100).toFixed(1), unit: "%", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Overtime", value: Math.round(kpi.rotas * kpi.pctRotasOvertime), unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
  ] : [];

  const orderedSeries = sortDailySeries(serieDiaria);
  const { latest: latestSeriesPoint, previous: previousSeriesPoint } = getSeriesExtremes(orderedSeries);
  const chartData = orderedSeries.map((item) => ({
    label: formatShortDate(item.data),
    entregasPct: Number((item.entregasEfetivas * 100).toFixed(1)),
    sprPedidos: Number(item.sprPedidos.toFixed(1)),
    tempoMedRealizado: Number(item.tempoMedRealizado.toFixed(1)),
    score: Number(item.scoreOperacional.toFixed(1)),
    naoPlanejadas: item.qtdRotasNaoPlanejadas,
    semTempo: item.qtdRotasSemTempo,
  }));
  const entregasDomain = getMetricDomain(
    [...chartData.map((item) => item.entregasPct), ...(metaEntregas != null ? [metaEntregas * 100] : [])],
    { min: 0, max: 100, minimumSpan: 2 },
  );
  const sprDomain = getMetricDomain(
    [...chartData.map((item) => item.sprPedidos), ...(metaSpr != null ? [metaSpr] : [])],
    { min: 0, minimumSpan: 3 },
  );
  const tempoDomain = getMetricDomain(
    [...chartData.map((item) => item.tempoMedRealizado), kpi?.metaOrhTempo ?? 0],
    { min: 0, minimumSpan: 1 },
  );

  const entregasVariation = getVariation(latestSeriesPoint?.entregasEfetivas, previousSeriesPoint?.entregasEfetivas);
  const sprVariation = getVariation(latestSeriesPoint?.sprPedidos, previousSeriesPoint?.sprPedidos);
  const tempoVariation = getVariation(latestSeriesPoint?.tempoMedRealizado, previousSeriesPoint?.tempoMedRealizado);
  const scoreVariation = getVariation(latestSeriesPoint?.scoreOperacional, previousSeriesPoint?.scoreOperacional);
  const windowLabel = temporalWindows.find((item) => item.value === trendWindow)?.label ?? trendWindow.toUpperCase();

  const melhorEntrega = [...chartData].sort((left, right) => right.entregasPct - left.entregasPct)[0];
  const menorEntrega = [...chartData].sort((left, right) => left.entregasPct - right.entregasPct)[0];
  const melhorSpr = [...chartData].sort((left, right) => right.sprPedidos - left.sprPedidos)[0];
  const piorScore = [...chartData].sort((left, right) => left.score - right.score)[0];

  const heroHighlights = [
    {
      label: "Tempo médio realizado",
      value: latestSeriesPoint ? formatDuration(latestSeriesPoint.tempoMedRealizado) : formatDuration(kpi?.tempoMedRealizado),
      detail: kpi?.metaOrhTempo ? `Meta ${formatDuration(kpi.metaOrhTempo)}` : "Sem meta publicada no recorte",
      icon: <Clock3 className="h-4 w-4" />,
    },
    {
      label: "Rotas concluídas",
      value: formatPercent(kpi?.pctRotasConcluidas == null ? null : kpi.pctRotasConcluidas * 100),
      detail: kpi?.metaRotasConcluidas != null ? `Meta ${formatPercent(kpi.metaRotasConcluidas * 100)}` : "Leitura operacional do recorte atual",
      icon: <Route className="h-4 w-4" />,
    },
    {
      label: "Entregas efetivas",
      value: latestSeriesPoint ? formatPercent(latestSeriesPoint.entregasEfetivas * 100) : "—",
      detail: metaEntregas != null ? `Meta ${formatPercent(metaEntregas * 100)}` : "Sem meta publicada",
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Overtime estimado",
      value: formatInteger(overtimeRotas),
      detail: `${formatPercent((kpi?.pctRotasOvertime ?? 0) * 100)} das rotas no recorte`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  const variationCards = [
    {
      label: "Entregas efetivas vs D-1",
      value: latestSeriesPoint ? formatPercent(latestSeriesPoint.entregasEfetivas * 100) : "—",
      detail: previousSeriesPoint ? formatSigned(entregasVariation.delta * 100, (value) => formatPercent(value)) : "Sem D-1 disponível",
      direction: entregasVariation.direction,
    },
    {
      label: "SPR pedidos vs D-1",
      value: latestSeriesPoint ? formatDecimal(latestSeriesPoint.sprPedidos) : "—",
      detail: previousSeriesPoint ? formatSigned(sprVariation.delta, (value) => formatDecimal(value)) : "Sem D-1 disponível",
      direction: sprVariation.direction,
    },
    {
      label: "Tempo médio vs D-1",
      value: latestSeriesPoint ? formatDuration(latestSeriesPoint.tempoMedRealizado) : "—",
      detail: previousSeriesPoint ? `${formatSigned(tempoVariation.delta, (value) => `${formatDecimal(value)}h`)} contra o dia anterior` : "Sem D-1 disponível",
      direction: tempoVariation.direction,
    },
    {
      label: "Score operacional vs D-1",
      value: latestSeriesPoint ? formatDecimal(latestSeriesPoint.scoreOperacional) : "—",
      detail: previousSeriesPoint ? `${formatSigned(scoreVariation.delta, (value) => formatDecimal(value))} pts` : "Sem D-1 disponível",
      direction: scoreVariation.direction,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Tempo e SLA"
          title="Conecte serviço, tempo e produtividade em uma leitura diária contínua da execução."
          description="A Onda 2 inicial troca a dependência da leitura apenas semanal por uma camada diária visível no dashboard, com janela configurável, comparativos contra D-1 e resumos acumulados do recorte selecionado."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Janela temporal</p>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Acompanhe o recorte diário sem trocar de página</h2>
          </div>
          <TemporalWindowTabs value={trendWindow} onChange={setTrendWindow} />
        </div>

        <VariationCards items={variationCards} isLoading={loadingSerieDiaria} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loadingKpi ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="entregas" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <SectionCard title="Entregas efetivas por dia" subtitle={metaEntregas != null ? `Janela ${windowLabel} com meta de ${(metaEntregas * 100).toFixed(0)}%` : `Janela ${windowLabel}`} delay={350}>
            <div className="h-56">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={TICK_STYLE} />
                    <YAxis tick={TICK_STYLE} domain={entregasDomain} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {metaEntregas != null && <ReferenceLine y={metaEntregas * 100} stroke={CHART_COLORS.secondary} strokeDasharray="6 3" label={{ value: `Meta ${(metaEntregas * 100).toFixed(0)}%`, fontSize: 10, fill: CHART_COLORS.secondary, fontWeight: 700 }} />}
                    <Line type="monotone" dataKey="entregasPct" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.primary }} name="Entregas %" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Resumo da janela" subtitle="Acumulados e último fechamento do período selecionado" delay={390}>
            {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas na janela</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.rotas))}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{windowLabel} acumulado no recorte ativo</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos na janela</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.pedidos))}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Base acumulada da série diária</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Não planejadas</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(latestSeriesPoint?.qtdRotasNaoPlanejadas)}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Último fechamento diário da janela</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Sem tempo</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(latestSeriesPoint?.qtdRotasSemTempo)}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Rotas pressionadas no último fechamento</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section id="produtividade" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="SPR pedidos por dia" subtitle={metaSpr != null ? `Janela ${windowLabel} com meta ${formatDecimal(metaSpr)}` : `Janela ${windowLabel}`} delay={410}>
            <div className="h-56">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={TICK_STYLE} />
                    <YAxis tick={TICK_STYLE} domain={sprDomain} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {metaSpr != null && <ReferenceLine y={metaSpr} stroke={CHART_COLORS.secondary} strokeDasharray="6 3" label={{ value: `Meta ${formatDecimal(metaSpr)}`, fontSize: 10, fill: CHART_COLORS.secondary, fontWeight: 700 }} />}
                    <Line type="monotone" dataKey="sprPedidos" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.primary }} name="SPR Ped." />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Tempo médio realizado por dia" subtitle="Tempo diário realizado versus meta publicada" delay={450}>
            <div className="h-56">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="label" tick={TICK_STYLE} />
                    <YAxis tick={TICK_STYLE} domain={tempoDomain} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {!!kpi?.metaOrhTempo && (
                      <ReferenceLine y={kpi.metaOrhTempo} stroke={CHART_COLORS.secondary} strokeDasharray="6 3" label={{ value: `Meta ${formatDecimal(kpi.metaOrhTempo)}h`, fontSize: 10, fill: CHART_COLORS.secondary, fontWeight: 700 }} />
                    )}
                    <Line type="monotone" dataKey="tempoMedRealizado" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.teal }} name="Tempo h" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <section id="leituras" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Leituras prioritárias" subtitle="Dias e sinais que merecem acompanhamento imediato" delay={500}>
            <div className="space-y-3">
              {[
                {
                  label: "Melhor dia de entrega",
                  value: melhorEntrega ? formatPercent(melhorEntrega.entregasPct) : "0,0%",
                  detail: melhorEntrega ? melhorEntrega.label : "Sem histórico no recorte",
                },
                {
                  label: "Dia mais crítico de entrega",
                  value: menorEntrega ? formatPercent(menorEntrega.entregasPct) : "0,0%",
                  detail: menorEntrega ? menorEntrega.label : "Sem histórico no recorte",
                },
                {
                  label: "Melhor produtividade",
                  value: melhorSpr ? `${Number(melhorSpr.sprPedidos).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "0,0",
                  detail: melhorSpr ? `${melhorSpr.label} em SPR pedidos` : "Sem histórico no recorte",
                },
                {
                  label: "Pior score diário",
                  value: piorScore ? formatDecimal(piorScore.score) : "0,0",
                  detail: piorScore ? `${piorScore.label} no fechamento da janela` : "Sem histórico no recorte",
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

          <SectionCard title="Resumo operacional da janela" subtitle="Metas, acumulados e pontos de pressão do período" delay={540}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Meta de entregas</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{metaEntregas != null ? formatPercent(metaEntregas * 100) : '—'}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Leitura diária comparada na janela {windowLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Meta de SPR</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{metaSpr != null ? formatDecimal(metaSpr) : '—'}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Pedidos por rota esperados</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas na janela</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.rotas))}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Acumulado diário do período selecionado</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos na janela</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(sumMetric(orderedSeries, (item) => item.pedidos))}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Base diária consolidada do recorte</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
