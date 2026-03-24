import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  Route,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KPICard from "@/components/dashboard/KPICard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useAlertas,
  useAlertasContagem,
  useCockpitSerieDiaria,
  useDrillRotas,
  useFilialPerformance,
  useKpiDiario,
  useMotoristas,
  useMotoristasKpis,
  useOcupacaoTipoVeiculo,
  useResumoCards,
  useTransportadores,
} from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { mapStatusBQtoUI, type DrillRota, type KPIData } from "@/types/api";
import { formatInteger, formatDecimal, formatMoney, formatPercentFrac } from "@/lib/formatters";
import { temporalWindows } from "@/lib/dashboardTemporal";
import { formatShortDate, getVariation } from "@/lib/dashboardTemporal";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS, LEGEND_STYLE } from "@/lib/chartConfig";
import VariationCards from "@/components/dashboard/VariationCards";

const sections = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "tendencias", label: "Tendências" },
  { id: "filiais", label: "Filiais" },
  { id: "transportadores", label: "Transportadores" },
  { id: "capacidade", label: "Capacidade" },
  { id: "sla-produtividade", label: "SLA e produtividade" },
  { id: "alertas", label: "Alertas" },
  { id: "motoristas", label: "Motoristas" },
  { id: "drill", label: "Drill operacional" },
] as const;

type SectionId = (typeof sections)[number]["id"];

// Usando temporalWindows de dashboardTemporal.ts ao invés de definição local

function isSameOrBefore(date: string, limitDate: string) {
  return date <= limitDate;
}

export default function CockpitOperacional() {
  const { filters } = useGlobalFilters();
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0].id);
  const [trendWindow, setTrendWindow] = useState<(typeof temporalWindows)[number]["value"]>("30d");
  const [selectedRota, setSelectedRota] = useState<DrillRota | null>(null);

  const seriesFilters = {
    periodo: filters.periodo,
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
  };

  const { data: cards, isLoading: loadingCards } = useResumoCards(filters);
  const { data: kpiDiario, isLoading: loadingKpiDiario } = useKpiDiario(filters);
  const { data: serieDiaria, isLoading: loadingSerieDiaria } = useCockpitSerieDiaria(trendWindow, seriesFilters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);
  const { data: transportadores, isLoading: loadingTransportadores } = useTransportadores(filters);
  const { data: ocupacaoTipoVeiculo, isLoading: loadingOcupacao } = useOcupacaoTipoVeiculo(filters);
  const { data: alertasContagem, isLoading: loadingAlertasContagem } = useAlertasContagem(filters);
  const { data: alertas, isLoading: loadingAlertas } = useAlertas({
    limit: 8,
    filial: filters.filial,
    periodo: filters.periodo,
    transportador: filters.transportador,
    status: filters.status,
    prioridade: filters.prioridade,
    tipoVeiculo: filters.tipoVeiculo,
  });
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristas({
    limit: 8,
    filial: filters.filial,
    periodo: filters.periodo,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
  });
  const { data: motoristasKpis, isLoading: loadingMotoristasKpis } = useMotoristasKpis(filters);
  const { data: drillRotas, isLoading: loadingDrillRotas } = useDrillRotas({
    limit: 12,
    filial: filters.filial,
    periodo: filters.periodo,
    transportador: filters.transportador,
    status: filters.status,
    prioridade: filters.prioridade,
    tipoVeiculo: filters.tipoVeiculo,
    sort: "scoreOperacional",
    order: "asc",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-15% 0px -55% 0px",
      },
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const kpis: KPIData[] = (cards ?? []).map((card) => ({
    label: card.kpi,
    value: card.valorTexto || card.valor,
    meta: card.meta,
    metaLabel: card.metaTexto ? "Meta" : undefined,
    trend: (card.trendD1 ?? 0) > 0 ? "up" : (card.trendD1 ?? 0) < 0 ? "down" : "neutral",
    trendValue: card.trendD1Texto || undefined,
    status: mapStatusBQtoUI(card.status),
  }));

  const baseComparavelEm = cards?.[0]?.databaseDt || kpiDiario?.data || "";
  const seriesAteBaseComparavel = (serieDiaria ?? []).filter((item) => !baseComparavelEm || isSameOrBefore(item.data, baseComparavelEm));
  const diasEmAberto = baseComparavelEm
    ? (serieDiaria ?? []).filter((item) => item.data > baseComparavelEm)
    : [];
  const trendData = seriesAteBaseComparavel.map((item) => ({
    ...item,
    label: formatShortDate(item.data),
    entregasPct: Number(((item.entregasEfetivas ?? 0) * 100).toFixed(1)),
    ocupacaoPct: Number(((item.ocupacaoPeso ?? 0) * 100).toFixed(1)),
    aderenciaPct: item.aderenciaVolumes == null ? null : Number((item.aderenciaVolumes * 100).toFixed(1)),
  }));

  const flowTrendData = trendData.filter((item) => item.rotas > 0 || item.pedidos > 0 || item.volumes > 0);
  const qualityTrendData = trendData.filter((item) => item.aderenciaVolumes != null || (item.tempoMedRealizado ?? 0) > 0 || (item.scoreOperacional ?? 0) > 0);

  const latestSeriesPoint = flowTrendData[flowTrendData.length - 1];
  const previousSeriesPoint = flowTrendData.length > 1 ? flowTrendData[flowTrendData.length - 2] : undefined;
  const comparableSeries = qualityTrendData;
  const latestComparablePoint = comparableSeries[comparableSeries.length - 1] ?? latestSeriesPoint;
  const previousComparablePoint = comparableSeries.length > 1 ? comparableSeries[comparableSeries.length - 2] : previousSeriesPoint;

  const variationCards = latestSeriesPoint && previousSeriesPoint ? [
    {
      label: "Rotas vs D-1",
      value: formatInteger(latestSeriesPoint.rotas),
      detail: `${getVariation(latestSeriesPoint.rotas, previousSeriesPoint.rotas).delta >= 0 ? "+" : ""}${formatInteger(getVariation(latestSeriesPoint.rotas, previousSeriesPoint.rotas).delta)} rotas`,
      direction: getVariation(latestSeriesPoint.rotas, previousSeriesPoint.rotas).direction,
    },
    {
      label: "Score operacional",
      value: formatDecimal(latestComparablePoint.scoreOperacional),
      detail: `${getVariation(latestComparablePoint.scoreOperacional, previousComparablePoint?.scoreOperacional).delta >= 0 ? "+" : ""}${formatDecimal(getVariation(latestComparablePoint.scoreOperacional, previousComparablePoint?.scoreOperacional).delta)} pts`,
      direction: getVariation(latestComparablePoint.scoreOperacional, previousComparablePoint?.scoreOperacional).direction,
    },
    {
      label: "Aderência volumes",
      value: formatPercentFrac(latestComparablePoint.aderenciaVolumes),
      detail: `${getVariation(latestComparablePoint.aderenciaVolumes ?? 0, previousComparablePoint?.aderenciaVolumes ?? 0).delta >= 0 ? "+" : ""}${formatPercentFrac(getVariation(latestComparablePoint.aderenciaVolumes ?? 0, previousComparablePoint?.aderenciaVolumes ?? 0).delta)}`,
      direction: getVariation(latestComparablePoint.aderenciaVolumes ?? 0, previousComparablePoint?.aderenciaVolumes ?? 0).direction,
    },
    {
      label: "Filiais críticas SPR",
      value: formatInteger(latestSeriesPoint.qtdFiliaisCriticasSpr),
      detail: `${getVariation(latestSeriesPoint.qtdFiliaisCriticasSpr, previousSeriesPoint.qtdFiliaisCriticasSpr).delta >= 0 ? "+" : ""}${formatInteger(getVariation(latestSeriesPoint.qtdFiliaisCriticasSpr, previousSeriesPoint.qtdFiliaisCriticasSpr).delta)} filiais`,
      direction: getVariation(latestSeriesPoint.qtdFiliaisCriticasSpr, previousSeriesPoint.qtdFiliaisCriticasSpr).direction,
    },
  ] : [];

  const topFiliais = [...(filiais ?? [])]
    .sort((left, right) => right.scoreOperacional - left.scoreOperacional)
    .slice(0, 6);
  const criticalFiliais = [...(filiais ?? [])]
    .sort((left, right) => left.sprVsMeta - right.sprVsMeta)
    .slice(0, 6);
  const globalMetaSprVolumes = (filiais ?? [])[0]?.metaSprVolumes ?? 67;
  const sprFiliais = [...(filiais ?? [])]
    .filter((item) => item.sprVolumesReal > 0)
    .sort((left, right) => right.sprVolumesReal - left.sprVolumesReal)
    .slice(0, 10)
    .map((item) => ({
      nome: item.nomeFilial || item.filial,
      sprVolumes: Number(item.sprVolumesReal.toFixed(2)),
      meta: globalMetaSprVolumes,
      metaFilial: Number(item.metaSpr.toFixed(2)),
    }));

  // ── Plan vs Actual (agregado do período via filiais) ──
  const planVsActual = (filiais ?? []).reduce(
    (acc, f) => ({
      pedidosReal: acc.pedidosReal + f.pedidosReal,
      pedidosPlan: acc.pedidosPlan + (f.pedidosPlan ?? 0),
      volumesReal: acc.volumesReal + f.volumesReal,
      volumesPlan: acc.volumesPlan + (f.volumesPlan ?? 0),
      pesoReal: acc.pesoReal + f.pesoReal,
      pesoPlan: acc.pesoPlan + (f.pesoPlan ?? 0),
      kmReal: acc.kmReal + f.kmReal,
      kmPlan: acc.kmPlan + (f.kmPlan ?? 0),
      tempoReal: acc.tempoReal + f.tempoReal,
      tempoPlan: acc.tempoPlan + (f.tempoPlan ?? 0),
      entregues: acc.entregues + f.entregues,
      insucessos: acc.insucessos + f.insucessos,
    }),
    { pedidosReal: 0, pedidosPlan: 0, volumesReal: 0, volumesPlan: 0, pesoReal: 0, pesoPlan: 0, kmReal: 0, kmPlan: 0, tempoReal: 0, tempoPlan: 0, entregues: 0, insucessos: 0 },
  );
  const pva = planVsActual;
  const aderPedidos = pva.pedidosPlan > 0 ? pva.pedidosReal / pva.pedidosPlan : null;
  const aderVolumes = pva.volumesPlan > 0 ? pva.volumesReal / pva.volumesPlan : null;
  const aderPeso = pva.pesoPlan > 0 ? pva.pesoReal / pva.pesoPlan : null;
  const aderKm = pva.kmPlan > 0 ? pva.kmReal / pva.kmPlan : null;
  const aderTempo = pva.tempoPlan > 0 ? pva.tempoReal / pva.tempoPlan : null;
  const transportadoresRanking = [...(transportadores ?? [])]
    .sort((left, right) => right.share - left.share)
    .slice(0, 8);
  const frotaRanking = [...(ocupacaoTipoVeiculo ?? [])]
    .sort((left, right) => right.rotas - left.rotas)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      ocupacaoPercent: item.ocupacaoPeso == null ? null : Number((item.ocupacaoPeso * 100).toFixed(1)),
    }));
  const alertasLista = alertas?.data ?? [];
  const motoristasLista = [...(motoristas?.data ?? [])]
    .sort((left, right) => right.horasJornada - left.horasJornada)
    .slice(0, 8);
  const rotasCriticas = [...(drillRotas?.data ?? [])]
    .sort((left, right) => left.scoreOperacional - right.scoreOperacional)
    .slice(0, 12);

  const heroHighlights = kpiDiario ? [
    {
      icon: Gauge,
      label: "Score operacional",
      value: formatDecimal(kpiDiario.scoreOperacional),
      detail: `${formatPercentFrac(kpiDiario.pctEntregasEfetivas)} de entrega efetiva`,
    },
    {
      icon: Truck,
      label: "Capacidade de peso",
      value: formatPercentFrac(kpiDiario.pctOcupacaoPeso),
      detail: `${formatInteger(kpiDiario.rotas)} rotas no recorte atual`,
    },
    {
      icon: Users,
      label: "Produtividade DPPH",
      value: formatDecimal(kpiDiario.dpph, 2),
      detail: `${formatInteger(kpiDiario.motoristasAtivos)} motoristas ativos`,
    },
    {
      icon: ShieldAlert,
      label: "Custo médio por carga",
      value: formatMoney(kpiDiario.custoMedioCarga),
      detail: `${formatMoney(kpiDiario.valorPagamentoTotal)} pagos no recorte`,
    },
  ] : [];

  const alertSummary = alertasContagem ? [
    { label: "Não planejadas", value: alertasContagem.naoPlanejada, tone: "bg-warning/10 text-warning" },
    { label: "Sem tempo", value: alertasContagem.semTempo, tone: "bg-muted text-muted-foreground" },
    { label: "Overtime", value: alertasContagem.overtime, tone: "bg-destructive/10 text-destructive" },
    { label: "Entrega crítica", value: alertasContagem.entregaCritica, tone: "bg-destructive/10 text-destructive" },
    { label: "Match crítico", value: alertasContagem.matchCritico, tone: "bg-warning/10 text-warning" },
  ] : [];

  const baseAtualizadaEm = baseComparavelEm;

  const buildAlertKey = (rota: string, data: string, transportador: string, index: number) =>
    `${rota}-${data}-${transportador}-${index}`;

  const buildMotoristaKey = (motorista: string, placa: string, data: string, transportador: string, index: number) =>
    `${motorista}-${placa}-${data}-${transportador}-${index}`;

  const buildRotaCriticaKey = (
    rota: string,
    data: string,
    filial: string,
    transportador: string,
    placa: string,
    index: number,
  ) => `${rota}-${data}-${filial}-${transportador}-${placa}-${index}`;

  const scrollToSection = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="space-y-10 pb-10">
        <section id="visao-geral" className="scroll-mt-24 space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(9,34,52,0.98),rgba(13,83,88,0.92)_48%,rgba(247,144,9,0.16))] p-6 text-white shadow-[0_24px_80px_rgba(9,34,52,0.32)]">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                  <span>Cockpit executivo-operacional</span>
                  {baseComparavelEm && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white/90 normal-case tracking-normal">
                      Base: {baseComparavelEm}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                    A operação agora começa por uma leitura única de tendência, risco, capacidade e execução.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/78">
                    A home consolida pressão operacional, estabilidade de serviço, concentração por parceiro e rotas críticas sem forçar troca de página para cada pergunta.
                  </p>
                </div>
                {loadingKpiDiario ? (
                  <LoadingSkeleton rows={2} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {heroHighlights.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-white/72">
                            <Icon className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{item.label}</span>
                          </div>
                          <p className="mt-4 text-2xl font-black tracking-tight text-white">{item.value}</p>
                          <p className="mt-2 text-xs font-semibold text-white/65">{item.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/12 bg-black/15 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">
                  <AlertTriangle className="h-4 w-4" />
                  Radar de pressão
                </div>
                {loadingAlertasContagem ? (
                  <div className="mt-4"><LoadingSkeleton rows={4} /></div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {alertSummary.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                        <span className="text-sm font-semibold text-white/84">{item.label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${item.tone}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-2xl border border-border/70 bg-background/92 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/72">
            <div className="flex min-w-max items-center gap-2">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  type="button"
                  size="sm"
                  variant={activeSection === section.id ? "default" : "outline"}
                  onClick={() => scrollToSection(section.id)}
                  className={activeSection === section.id ? "shadow-sm" : "bg-transparent"}
                >
                  {section.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {loadingCards ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, index) => (
              <KPICard key={kpi.label} data={kpi} delay={index * 40} />
            ))}
          </div>

          {/* Plan vs Actual — agregado do período */}
          <SectionCard title="Plan vs Real — Aderência no período" subtitle="Comparativo do planejado contra o realizado no recorte selecionado" delay={60}>
            {loadingFiliais ? <LoadingSkeleton rows={2} /> : (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {[
                  { label: "Pedidos", real: pva.pedidosReal, plan: pva.pedidosPlan, ader: aderPedidos, fmt: formatInteger },
                  { label: "Volumes", real: pva.volumesReal, plan: pva.volumesPlan, ader: aderVolumes, fmt: formatInteger },
                  { label: "Peso (kg)", real: pva.pesoReal, plan: pva.pesoPlan, ader: aderPeso, fmt: (v: number) => formatInteger(Math.round(v)) },
                  { label: "Km", real: pva.kmReal, plan: pva.kmPlan, ader: aderKm, fmt: (v: number) => formatInteger(Math.round(v)) },
                  { label: "Tempo (h)", real: pva.tempoReal, plan: pva.tempoPlan, ader: aderTempo, fmt: (v: number) => formatDecimal(v, 1) },
                  { label: "Entregas", real: pva.entregues, plan: null, ader: null, fmt: formatInteger },
                  { label: "Insucessos", real: pva.insucessos, plan: null, ader: null, fmt: formatInteger },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-xl font-black tracking-tight text-foreground">{item.fmt(item.real)}</p>
                    {item.plan != null && item.plan > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Plan {item.fmt(item.plan)}</p>
                        <StatusChip
                          label={item.ader != null ? formatPercentFrac(item.ader) : "—"}
                          colorClass={item.ader == null ? "bg-muted text-muted-foreground" : item.ader >= 0.95 ? "bg-success/10 text-success" : item.ader >= 0.85 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}
                        />
                      </div>
                    ) : item.label === "Insucessos" ? (
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">
                        {pva.entregues + pva.insucessos > 0 ? formatPercentFrac(pva.insucessos / (pva.entregues + pva.insucessos)) : "—"} da base
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="tendencias" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tendências e variações</p>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Ritmo diário da operação</h2>
              {baseAtualizadaEm ? (
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  Comparativos fechados em {baseAtualizadaEm}. {diasEmAberto.length > 0 ? "Dias posteriores seguem em aberto e foram ocultados dos gráficos comparativos." : ""}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-1">
              {temporalWindows.map((windowOption) => (
                <Button
                  key={windowOption.value}
                  type="button"
                  size="sm"
                  variant={trendWindow === windowOption.value ? "default" : "ghost"}
                  onClick={() => setTrendWindow(windowOption.value)}
                >
                  {windowOption.label}
                </Button>
              ))}
            </div>
          </div>

          <VariationCards items={variationCards} isLoading={variationCards.length === 0 || loadingSerieDiaria} />

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <SectionCard title="Fluxo diário" subtitle="Rotas, pedidos e volumes no período selecionado" delay={80}>
              <div className="h-64 md:h-80">
                <div className="max-w-[900px] mx-auto">
                  {loadingSerieDiaria ? <LoadingSkeleton rows={5} /> : flowTrendData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período selecionado.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={flowTrendData}>
                        <defs>
                          <linearGradient id="rotasFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="pedidosFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.gold} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.gold} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="volumesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="label" tick={TICK_STYLE_SM} angle={-45} textAnchor="end" height={56} />
                        <YAxis yAxisId="left" width={56} tick={TICK_STYLE} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                        <YAxis yAxisId="right" orientation="right" width={44} tick={TICK_STYLE} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [formatInteger(value), name]} />
                        <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                        <Area yAxisId="left" type="monotone" dataKey="pedidos" stroke={CHART_COLORS.gold} fill="url(#pedidosFill)" strokeWidth={2.5} name="Pedidos" />
                        <Area yAxisId="left" type="monotone" dataKey="volumes" stroke={CHART_COLORS.primary} fill="url(#volumesFill)" strokeWidth={2.5} name="Volumes" />
                        <Area yAxisId="right" type="monotone" dataKey="rotas" stroke={CHART_COLORS.teal} fill="url(#rotasFill)" strokeWidth={2.5} name="Rotas (eixo dir.)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Qualidade de execução" subtitle="Entrega efetiva e aderência de volumes (%)" delay={120}>
              <div className="h-64 md:h-80">
                <div className="max-w-[900px] mx-auto">
                  {loadingSerieDiaria ? <LoadingSkeleton rows={5} /> : qualityTrendData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de qualidade no período selecionado.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={qualityTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="label" tick={TICK_STYLE_SM} angle={-45} textAnchor="end" height={56} />
                        <YAxis width={48} tick={TICK_STYLE} domain={[0, 100]} allowDataOverflow unit="%" />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                        <Line type="monotone" dataKey="entregasPct" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={false} name="Entrega efetiva" />
                        <Line type="monotone" dataKey="aderenciaPct" stroke={CHART_COLORS.danger} strokeWidth={2.5} dot={false} name="Aderência volumes" />
                        <Line type="monotone" dataKey="ocupacaoPct" stroke={CHART_COLORS.gold} strokeWidth={2.5} dot={false} name="Ocupação peso" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="SPR Volumes por filial" subtitle="Volumes por rota (SPR) das principais filiais vs meta" delay={160}>
            <div className="h-72 md:h-96">
              <div className="max-w-[900px] mx-auto">
                {loadingFiliais ? <LoadingSkeleton rows={5} /> : sprFiliais.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de SPR no período selecionado.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sprFiliais} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis type="number" tick={TICK_STYLE} />
                      <YAxis dataKey="nome" type="category" width={110} tick={TICK_STYLE_SM} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [formatDecimal(value, 2), name]} />
                      <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                      <Bar dataKey="sprVolumes" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} name="SPR Volumes" barSize={18} />
                      <ReferenceLine x={sprFiliais[0]?.meta ?? 0} stroke={CHART_COLORS.danger} strokeDasharray="6 4" strokeWidth={2} label={{ value: `Meta ${formatDecimal(sprFiliais[0]?.meta)}`, position: "top", fill: CHART_COLORS.danger, fontSize: 11, fontWeight: 700 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </SectionCard>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="filiais" className="scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Filiais com melhor tração" subtitle="Score operacional e entrega efetiva no recorte" delay={140}>
              <div className="h-80 md:h-96">
                <div className="max-w-[900px] mx-auto">
                  {loadingFiliais ? <LoadingSkeleton rows={5} /> : topFiliais.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de filiais no período selecionado.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topFiliais.map((item) => ({ nome: item.nomeFilial || item.filial, score: item.scoreOperacional, entrega: Number((item.entregasEfetivas * 100).toFixed(1)) }))} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis type="number" tick={TICK_STYLE} domain={[0, 100]} />
                        <YAxis dataKey="nome" type="category" width={110} tick={TICK_STYLE_SM} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                        <Bar dataKey="score" fill={CHART_COLORS.dark} radius={[0, 6, 6, 0]} name="Score" barSize={14} />
                        <Bar dataKey="entrega" fill={CHART_COLORS.teal} radius={[0, 6, 6, 0]} name="Entrega %" barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Filiais que puxam a queda" subtitle="Gap de SPR vs meta e desvio de tempo" delay={180}>
              {loadingFiliais ? <LoadingSkeleton rows={6} /> : criticalFiliais.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de filiais no período selecionado.</p>
              ) : (
                <div className="space-y-3">
                  {criticalFiliais.map((item) => (
                    <div key={item.filial} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.nomeFilial || item.filial}</p>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {formatInteger(item.rotas)} rotas • score {formatDecimal(item.scoreOperacional)}
                          </p>
                        </div>
                        <StatusChip
                          label={`${item.sprVsMeta >= 0 ? "+" : ""}${formatDecimal(item.sprVsMeta)}`}
                          colorClass={item.sprVsMeta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground">
                        <span>Entrega efetiva {formatPercentFrac(item.entregasEfetivas)}</span>
                        <span>Desvio tempo {formatDecimal(item.desvioTempoH)}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="transportadores" className="scroll-mt-24">
          <SectionCard title="Concentração e performance por transportador" subtitle="Share, custo médio e estabilidade de execução" delay={200}>
            {loadingTransportadores ? <LoadingSkeleton rows={6} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-3">Transportador</th>
                      <th className="px-3 py-3">Share</th>
                      <th className="px-3 py-3">Rotas</th>
                      <th className="px-3 py-3">Entrega efetiva</th>
                      <th className="px-3 py-3">SPR volumes</th>
                      <th className="px-3 py-3">Custo/carga</th>
                      <th className="px-3 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportadoresRanking.map((item) => (
                      <tr key={item.transportador} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 font-bold text-foreground">{item.transportador}</td>
                        <td className="px-3 py-3 font-semibold text-muted-foreground">{formatPercentFrac(item.share)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatInteger(item.rotas)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatPercentFrac(item.entregasEfetivas)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDecimal(item.sprVolumes, 2)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatMoney(item.custoMedioCarga)}</td>
                        <td className="px-3 py-3"><StatusChip label={formatDecimal(item.scoreOperacional)} colorClass={item.status === "OK" ? "bg-success/10 text-success" : item.status === "Atenção" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="capacidade" className="scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <SectionCard title="Mix de veículo e ocupação" subtitle="Rotas por tipo (eixo esq.) e ocupação de peso (eixo dir.)" delay={220}>
              <div className="h-72 md:h-80">
                <div className="max-w-[900px] mx-auto">
                  {loadingOcupacao ? <LoadingSkeleton rows={5} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={frotaRanking}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="tipoVeiculo" tick={TICK_STYLE_SM} interval={0} angle={-14} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" width={44} tick={TICK_STYLE} label={{ value: "Rotas", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: CHART_COLORS.muted } }} />
                        <YAxis yAxisId="right" orientation="right" width={48} tick={TICK_STYLE} domain={[0, 100]} unit="%" label={{ value: "Ocupação %", angle: 90, position: "insideRight", style: { fontSize: 10, fill: CHART_COLORS.muted } }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | null, name: string) => value == null ? ["—", name] : name.includes("%") ? [`${value.toFixed(1)}%`, name] : [formatInteger(value), name]} />
                        <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                        <Bar yAxisId="left" dataKey="rotas" fill={CHART_COLORS.dark} radius={[6, 6, 0, 0]} name="Rotas" />
                        <Bar yAxisId="right" dataKey="ocupacaoPercent" fill={CHART_COLORS.gold} radius={[6, 6, 0, 0]} name="Ocupação peso %" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Eficiência da frota" subtitle="Peso médio, SPR e custo por volume por tipo" delay={240}>
              {loadingOcupacao ? <LoadingSkeleton rows={6} /> : (
                <div className="space-y-3">
                  {frotaRanking.map((item) => (
                    <div key={item.tipoVeiculo} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.tipoVeiculo}</p>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {formatInteger(item.rotas)} rotas • {formatInteger(item.placasDistintas)} placas
                          </p>
                        </div>
                        <StatusChip
                          label={formatPercentFrac(item.ocupacaoPeso)}
                          colorClass={item.ocupacaoPeso >= 0.85 ? "bg-success/10 text-success" : item.ocupacaoPeso >= 0.7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground">
                        <span>Peso médio/rota {formatInteger(item.mediaPesoRota)} kg</span>
                        <span>SPR/veículo {formatDecimal(item.sprPorVeiculo, 2)}</span>
                        <span>ORH {formatDecimal(item.orh, 2)}h</span>
                        <span>Custo/volume {formatMoney(item.custoMedioVolume)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="sla-produtividade" className="scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard title="SLA e produtividade" subtitle="Entrega, jornada e aderência no fechamento do recorte" delay={260}>
              {loadingKpiDiario || loadingMotoristasKpis ? <LoadingSkeleton rows={5} /> : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Entrega efetiva</p>
                      <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercentFrac(kpiDiario?.pctEntregasEfetivas)}</p>
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">Meta {formatPercentFrac(kpiDiario?.metaEntregas)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">ORH médio</p>
                      <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(kpiDiario?.tempoMedRealizado, 2)}h</p>
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">Gap {formatDecimal(kpiDiario?.gapOrhVsMeta, 2)}h</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">DPPH</p>
                      <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(motoristasKpis?.dpph, 2)}</p>
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">{formatInteger(motoristasKpis?.qtdOvertime)} motoristas em overtime</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Aderência por dimensão</p>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {[
                      { label: "Pedidos", value: kpiDiario?.pctAderPedidos },
                      { label: "Volumes", value: kpiDiario?.pctAderVolumes },
                      { label: "Peso", value: kpiDiario?.pctAderPeso },
                      { label: "Km", value: kpiDiario?.pctAderKm },
                      { label: "Tempo", value: kpiDiario?.pctAderTempo },
                    ].map((dim) => (
                      <div key={dim.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{dim.label}</p>
                        <p className="mt-3 text-xl font-black tracking-tight text-foreground">{dim.value != null ? formatPercentFrac(dim.value) : "—"}</p>
                        <StatusChip
                          label={dim.value != null ? (dim.value >= 0.95 ? "OK" : dim.value >= 0.85 ? "Atenção" : "Crítico") : "Sem dados"}
                          colorClass={dim.value == null ? "bg-muted text-muted-foreground" : dim.value >= 0.95 ? "bg-success/10 text-success" : dim.value >= 0.85 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Score operacional e produtividade" subtitle="Evolução do score e SPR volumes no período" delay={280}>
              <div className="h-64 md:h-80">
                <div className="max-w-[900px] mx-auto">
                  {loadingSerieDiaria ? <LoadingSkeleton rows={5} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="label" tick={TICK_STYLE} angle={-45} textAnchor="end" height={56} />
                        <YAxis yAxisId="left" width={48} tick={TICK_STYLE} domain={[0, 100]} />
                        <YAxis yAxisId="right" width={48} orientation="right" tick={TICK_STYLE} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend align="center" wrapperStyle={LEGEND_STYLE} />
                        <Line yAxisId="left" type="monotone" dataKey="scoreOperacional" stroke={CHART_COLORS.dark} strokeWidth={2.5} dot={false} name="Score operacional" />
                        <Line yAxisId="left" type="monotone" dataKey="entregasPct" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={false} name="Entrega efetiva %" />
                        <Line yAxisId="right" type="monotone" dataKey="tempoMedRealizado" stroke={CHART_COLORS.gold} strokeWidth={2.5} dot={false} name="Tempo médio (h)" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="alertas" className="scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[0.4fr_1fr]">
            <SectionCard title="Mapa de alertas" subtitle="O que está pressionando a malha agora" delay={300}>
              {loadingAlertasContagem ? <LoadingSkeleton rows={5} /> : (
                <div className="flex flex-col gap-3">
                  {alertSummary.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3.5">
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      <span className={`min-w-[48px] text-center rounded-full px-3 py-1.5 text-sm font-bold ${item.tone}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Rotas com alerta operacional" subtitle="Últimas ocorrências relevantes já prontas para investigação" delay={320}>
              {loadingAlertas ? <LoadingSkeleton rows={6} /> : alertasLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum alerta operacional no recorte</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ajuste os filtros ou selecione outro período</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        <th className="px-3 py-3">Rota</th>
                        <th className="px-3 py-3">Filial</th>
                        <th className="px-3 py-3">Transportador</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Peso</th>
                        <th className="px-3 py-3">Prioridade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertasLista.map((item, index) => (
                        <tr key={buildAlertKey(item.rota, item.data, item.transportador, index)} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 font-bold text-foreground">{item.rota}</td>
                          <td className="px-3 py-3 text-muted-foreground">{item.nomeFilial || item.filial}</td>
                          <td className="px-3 py-3 text-muted-foreground">{item.transportador}</td>
                          <td className="px-3 py-3">
                            <StatusChip
                              label={item.statusRota}
                              colorClass={item.flagOvertime || item.flagEntregaCritica ? "bg-destructive/10 text-destructive" : item.flagNaoPlanejada || item.flagMatchCritico ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}
                            />
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{formatPercentFrac(item.ocupacaoPeso)}</td>
                          <td className="px-3 py-3 text-muted-foreground">{item.prioridade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="motoristas" className="scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <SectionCard title="Jornada dos motoristas" subtitle="Atividade e overtime no recorte" delay={340}>
              {loadingMotoristasKpis ? <LoadingSkeleton rows={4} /> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Motoristas ativos</p>
                    <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(motoristasKpis?.motoristasAtivos)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Jornada média</p>
                    <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(motoristasKpis?.jornadaMedia, 2)}h</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas por dia</p>
                    <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(motoristasKpis?.mediaRotasDia, 2)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Motoristas em overtime</p>
                    <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(motoristasKpis?.qtdOvertime)}</p>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Motoristas que exigem atenção" subtitle="Quem está puxando a jornada para cima" delay={360}>
              {loadingMotoristas ? <LoadingSkeleton rows={6} /> : motoristasLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum motorista encontrado no recorte</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ajuste os filtros ou selecione outro período</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        <th className="px-3 py-3">Motorista</th>
                        <th className="px-3 py-3">Transportador</th>
                        <th className="px-3 py-3">Horas</th>
                        <th className="px-3 py-3">Rotas</th>
                        <th className="px-3 py-3">Volumes</th>
                        <th className="px-3 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {motoristasLista.map((item, index) => (
                        <tr key={buildMotoristaKey(item.motorista, item.placa, item.data, item.transportador, index)} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 font-bold text-foreground">{item.motorista}</td>
                          <td className="px-3 py-3 text-muted-foreground">{item.transportador}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDecimal(item.horasJornada, 2)}h</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatInteger(item.qtdRotas)}</td>
                          <td className="px-3 py-3 text-muted-foreground">{formatInteger(item.volumes)}</td>
                          <td className="px-3 py-3">
                            <StatusChip
                              label={formatDecimal(item.scoreOperacional)}
                              colorClass={item.flagOvertime ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <div className="my-8 border-t border-border/40" />
        <section id="drill" className="scroll-mt-24">
          <SectionCard title="Drill operacional" subtitle="Rotas mais frágeis do recorte, prontas para abertura de detalhe" delay={380}>
            {loadingDrillRotas ? <LoadingSkeleton rows={7} /> : rotasCriticas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Route className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">Nenhuma rota encontrada no recorte</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Ajuste os filtros ou selecione outro período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-3">Rota</th>
                      <th className="px-3 py-3">Filial</th>
                      <th className="px-3 py-3">Transportador</th>
                      <th className="px-3 py-3">Pedidos</th>
                      <th className="px-3 py-3">Volumes</th>
                      <th className="px-3 py-3">Score</th>
                      <th className="px-3 py-3">Entrega</th>
                      <th className="px-3 py-3">Capacidade</th>
                      <th className="px-3 py-3">Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotasCriticas.map((item, index) => (
                      <tr
                        key={buildRotaCriticaKey(item.rota, item.data, item.filial, item.transportador, item.placa, index)}
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30"
                        onClick={() => setSelectedRota(item)}
                      >
                        <td className="px-3 py-3 font-bold text-foreground">{item.rota}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.nomeFilial || item.filial}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.transportador}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatInteger(item.pedidos)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatInteger(item.volumes)}</td>
                        <td className="px-3 py-3">
                          <StatusChip
                            label={formatDecimal(item.scoreOperacional)}
                            colorClass={item.scoreOperacional >= 85 ? "bg-success/10 text-success" : item.scoreOperacional >= 70 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}
                          />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{formatPercentFrac(item.entregaEfetiva)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatPercentFrac(item.ocupacaoPeso)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.alertaOperacional}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>
      </div>

      <Sheet open={Boolean(selectedRota)} onOpenChange={(open) => !open && setSelectedRota(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[520px]">
          {selectedRota ? (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>Rota {selectedRota.rota}</SheetTitle>
                <SheetDescription>
                  {selectedRota.nomeFilial || selectedRota.filial} • {selectedRota.transportador}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Score operacional</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatDecimal(selectedRota.scoreOperacional)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Entrega efetiva</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercentFrac(selectedRota.entregaEfetiva)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Capacidade</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercentFrac(selectedRota.ocupacaoPeso)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Aderência volumes</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercentFrac(selectedRota.aderenciaVolumes)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <h3 className="text-sm font-bold text-foreground">Contexto operacional</h3>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Motorista</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedRota.motorista || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Placa</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedRota.placa || "Não informada"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tipo de veículo</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedRota.tipoVeiculo || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedRota.status}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos e volumes</p>
                    <p className="mt-1 font-semibold text-foreground">{formatInteger(selectedRota.pedidos)} pedidos • {formatInteger(selectedRota.volumes)} volumes</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tempo</p>
                    <p className="mt-1 font-semibold text-foreground">{formatDecimal(selectedRota.tempoRealizado, 2)}h realizado • {formatDecimal(selectedRota.tempoPlanejado, 2)}h planejado</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <h3 className="text-sm font-bold text-foreground">Sinais de risco</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedRota.flagOvertime ? <StatusChip label="Overtime" colorClass="bg-destructive/10 text-destructive" /> : null}
                  {selectedRota.flagEntregaCritica ? <StatusChip label="Entrega crítica" colorClass="bg-destructive/10 text-destructive" /> : null}
                  {selectedRota.alertaOperacional ? <StatusChip label={selectedRota.alertaOperacional} colorClass="bg-warning/10 text-warning" /> : null}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
