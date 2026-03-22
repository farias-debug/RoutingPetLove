import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Gauge,
  Route,
  Truck,
} from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import TemporalWindowTabs from "@/components/dashboard/TemporalWindowTabs";
import { useResumoCards, useFilialPerformance, useAlertas, useAlertasContagem, useKpiDiario, useTransportadores, useCockpitSerieDiaria } from "@/hooks/useApiData";
import { formatShortDate, getSeriesExtremes, getVariation, sortDailySeries, sumMetric, temporalWindows, type TemporalWindow } from "@/lib/dashboardTemporal";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { mapStatusBQtoUI } from "@/types/api";
import type { KPIData } from "@/types/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line
} from "recharts";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "tendencias", label: "Tendências" },
  { id: "risco", label: "Risco" },
  { id: "parceiros", label: "Parceiros" },
];

function formatInteger(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatDecimal(value: number | null | undefined, digits = 1) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSigned(value: number, formatter: (input: number) => string) {
  const signal = value >= 0 ? "+" : "-";
  return `${signal}${formatter(Math.abs(value))}`;
}

export default function ResumoExecutivo() {
  const [trendWindow, setTrendWindow] = useState<TemporalWindow>("30d");
  const { filters } = useGlobalFilters();
  const { data: cards, isLoading: loadingCards } = useResumoCards(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);
  const { data: kpiDiario, isLoading: loadingKpiDiario } = useKpiDiario(filters);
  const { data: contagem, isLoading: loadingContagem } = useAlertasContagem(filters);
  const { data: transportadores, isLoading: loadingTransportadores } = useTransportadores(filters);
  const { data: serieDiaria, isLoading: loadingSerieDiaria } = useCockpitSerieDiaria(trendWindow, {
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
  });
  const { data: alertas, isLoading: loadingAlertas } = useAlertas({ limit: 10, filial: filters.filial, periodo: filters.periodo, transportador: filters.transportador, status: filters.status, prioridade: filters.prioridade, tipoVeiculo: filters.tipoVeiculo });

  const kpis: KPIData[] = (cards ?? []).map((c) => ({
    label: c.kpi,
    value: c.valorTexto || c.valor,
    unit: "",
    meta: c.meta,
    metaLabel: c.metaTexto ? "Meta" : undefined,
    trend: (c.trendD1 ?? 0) > 0 ? "up" as const : (c.trendD1 ?? 0) < 0 ? "down" as const : "neutral" as const,
    trendValue: c.trendD1Texto || undefined,
    status: mapStatusBQtoUI(c.status),
  }));

  const orderedSeries = sortDailySeries(serieDiaria);
  const { latest: latestSeriesPoint, previous: previousSeriesPoint } = getSeriesExtremes(orderedSeries);
  const trendChart = orderedSeries.map((item) => ({
    label: formatShortDate(item.data),
    rotas: item.rotas,
    pedidos: item.pedidos,
    entregasPct: Number((item.entregasEfetivas * 100).toFixed(1)),
    score: Number(item.scoreOperacional.toFixed(1)),
  }));

  const filialChart = (filiais ?? []).map((f) => ({
    filial: f.nomeFilial || f.filial,
    score: f.scoreOperacional,
    entregasEfetivas: +(f.entregasEfetivas * 100).toFixed(1),
  }));

  const alertaList = alertas?.data ?? [];
  const topTransportadores = [...(transportadores ?? [])]
    .sort((left, right) => right.scoreOperacional - left.scoreOperacional)
    .slice(0, 5);
  const melhorEntregaTransportador = [...(transportadores ?? [])]
    .sort((left, right) => right.entregasEfetivas - left.entregasEfetivas)[0];
  const melhorFilial = [...(filiais ?? [])].sort((left, right) => right.scoreOperacional - left.scoreOperacional)[0];
  const topShare = [...(transportadores ?? [])].sort((left, right) => right.share - left.share)[0];
  const scoreVariation = getVariation(latestSeriesPoint?.scoreOperacional, previousSeriesPoint?.scoreOperacional);
  const entregasVariation = getVariation(latestSeriesPoint?.entregasEfetivas, previousSeriesPoint?.entregasEfetivas);
  const windowLabel = temporalWindows.find((item) => item.value === trendWindow)?.label ?? trendWindow.toUpperCase();
  const leiturasExecutivas = kpiDiario ? [
    {
      label: "Capacidade de peso",
      value: formatPercent(kpiDiario.pctOcupacaoPeso == null ? null : kpiDiario.pctOcupacaoPeso * 100),
      detail: `Meta ${(kpiDiario.metaOcupacaoPeso ?? 0.85) * 100}%`,
    },
    {
      label: "Entrega efetiva",
      value: `${(kpiDiario.pctEntregasEfetivas * 100).toFixed(1)}%`,
      detail: `${kpiDiario.entregas.toLocaleString("pt-BR")} entregas concluídas`,
    },
    {
      label: "Produtividade",
      value: formatDecimal(kpiDiario.dpph, 2),
      detail: `${kpiDiario.motoristasAtivos.toLocaleString("pt-BR")} motoristas ativos`,
    },
    {
      label: "Custo médio",
      value: `R$ ${kpiDiario.custoMedioCarga.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      detail: `${kpiDiario.rotas.toLocaleString("pt-BR")} rotas no recorte`,
    },
  ] : [];
  const riscoOperacional = contagem ? [
    { label: "Overtime", value: contagem.overtime, tone: "bg-destructive/10 text-destructive" },
    { label: "Entrega crítica", value: contagem.entregaCritica, tone: "bg-destructive/10 text-destructive" },
    { label: "Não planejadas", value: contagem.naoPlanejada, tone: "bg-warning/10 text-warning" },
    { label: "Sem tempo", value: contagem.semTempo, tone: "bg-muted text-muted-foreground" },
  ] : [];

  const alertStatusLabel = (a: typeof alertaList[number]) => a.statusRota;
  const alertStatusColor = (a: typeof alertaList[number]) =>
    a.flagOvertime || a.flagEntregaCritica ? "bg-destructive/15 text-destructive"
      : a.flagNaoPlanejada ? "bg-warning/15 text-warning"
        : a.flagMatchCritico ? "bg-warning/15 text-warning"
          : a.flagSemTempo ? "bg-muted text-muted-foreground"
            : "bg-muted text-muted-foreground";

  const comparativos = [
    {
      label: `Rotas na janela ${windowLabel}`,
      value: formatInteger(sumMetric(orderedSeries, (item) => item.rotas)),
      detail: latestSeriesPoint ? `${formatInteger(latestSeriesPoint.rotas)} no último fechamento` : "Sem série diária no recorte",
      direction: "neutral",
    },
    {
      label: `Pedidos na janela ${windowLabel}`,
      value: formatInteger(sumMetric(orderedSeries, (item) => item.pedidos)),
      detail: latestSeriesPoint ? `${formatInteger(latestSeriesPoint.pedidos)} no último fechamento` : "Sem série diária no recorte",
      direction: "neutral",
    },
    {
      label: "Entregas efetivas vs D-1",
      value: latestSeriesPoint ? formatPercent(latestSeriesPoint.entregasEfetivas * 100) : "—",
      detail: previousSeriesPoint ? formatSigned(entregasVariation.delta * 100, (value) => formatPercent(value)) : "Sem D-1 disponível",
      direction: entregasVariation.direction,
    },
    {
      label: "Score operacional vs D-1",
      value: latestSeriesPoint ? formatDecimal(latestSeriesPoint.scoreOperacional) : "—",
      detail: previousSeriesPoint ? `${formatSigned(scoreVariation.delta, (value) => formatDecimal(value))} pts` : "Sem D-1 disponível",
      direction: scoreVariation.direction,
    },
  ];

  const heroHighlights = [
    {
      label: "Score operacional",
      value: latestSeriesPoint ? formatDecimal(latestSeriesPoint.scoreOperacional) : kpiDiario ? formatDecimal(kpiDiario.scoreOperacional) : "—",
      detail: latestSeriesPoint ? `${formatShortDate(latestSeriesPoint.data)} no último fechamento diário` : kpiDiario ? `${formatPercent(kpiDiario.pctEntregasEfetivas * 100)} de entregas efetivas` : "Sem dados no recorte",
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      label: "Custo médio por carga",
      value: formatMoney(kpiDiario?.custoMedioCarga),
      detail: kpiDiario ? `${formatInteger(kpiDiario.rotas)} rotas monitoradas` : "Sem dados no recorte",
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: "Melhor filial",
      value: melhorFilial ? formatDecimal(melhorFilial.scoreOperacional) : "—",
      detail: melhorFilial ? (melhorFilial.nomeFilial || melhorFilial.filial) : "Sem filial no recorte",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "Pressão de alertas",
      value: formatInteger((contagem?.overtime ?? 0) + (contagem?.entregaCritica ?? 0)),
      detail: topShare ? `${topShare.transportador} concentra ${formatPercent(topShare.share * 100)}` : "Sem parceiro dominante no recorte",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Resumo executivo"
          title="Concentre a leitura diária do recorte em poucos sinais, comparativos e parceiros prioritários."
          description="A Onda 2 inicial transforma o resumo em uma superfície temporal de acompanhamento, com janela configurável, último fechamento diário, comparação contra D-1 e leitura acumulada da janela selecionada."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <SectionCard title="Leitura executiva" subtitle="Síntese operacional do recorte aplicado" delay={120}>
            {loadingKpiDiario ? <LoadingSkeleton rows={3} /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {leiturasExecutivas.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Risco atual" subtitle="Ocorrências que mais pressionam a operação" delay={180}>
            {loadingContagem ? <LoadingSkeleton rows={3} /> : (
              <div className="space-y-3">
                {riscoOperacional.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Camada temporal</p>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Atual, D-1 e acumulado da janela no mesmo fluxo</h2>
          </div>
          <TemporalWindowTabs value={trendWindow} onChange={setTrendWindow} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loadingSerieDiaria ? <LoadingSkeleton rows={2} /> : comparativos.map((item) => {
            const Icon = item.direction === "up" ? ArrowUpRight : item.direction === "down" ? ArrowDownRight : Route;
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {loadingCards ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="tendencias" className="scroll-mt-24 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <SectionCard title="Ritmo diário da operação" subtitle={`Rotas e pedidos na janela ${windowLabel}`} delay={400}>
            <div className="h-56">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                    <Area type="monotone" dataKey="rotas" stroke="#522B8F" fill="#522B8F" fillOpacity={0.12} strokeWidth={2} name="Rotas" />
                    <Area type="monotone" dataKey="pedidos" stroke="#EC5B13" fill="#EC5B13" fillOpacity={0.08} strokeWidth={2} name="Pedidos" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Serviço diário" subtitle="Score operacional e entregas efetivas por fechamento" delay={460}>
            <div className="h-56">
              {loadingSerieDiaria ? <LoadingSkeleton rows={4} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                    <Line type="monotone" dataKey="score" stroke="#522B8F" strokeWidth={2.5} dot={{ r: 3, fill: "#522B8F" }} name="Score" />
                    <Line type="monotone" dataKey="entregasPct" stroke="#EC5B13" strokeWidth={2.5} dot={{ r: 3, fill: "#EC5B13" }} name="Entregas %" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Performance por filial" subtitle="Score operacional e entregas efetivas no recorte atual" delay={500}>
          <div className="h-64">
            {loadingFiliais ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filialChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} domain={[0, 100]} />
                  <YAxis dataKey="filial" type="category" width={96} tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="score" fill="#522B8F" radius={[0, 4, 4, 0]} name="Score" barSize={14} />
                  <Bar dataKey="entregasEfetivas" fill="#EC5B13" radius={[0, 4, 4, 0]} name="Entregas %" barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="risco" className="scroll-mt-24">
        <SectionCard title="Alertas operacionais" subtitle="Últimas ocorrências por rota" delay={500}>
          {loadingAlertas ? <LoadingSkeleton rows={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rota</th>
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filial</th>
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</th>
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Transportador</th>
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cap. Peso</th>
                    <th className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {alertaList.map((a, idx) => (
                    <tr key={`${a.rota}-${idx}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold">{a.rota}</td>
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">{a.nomeFilial || a.filial}</td>
                      <td className="py-2.5 px-3">
                        <StatusChip label={alertStatusLabel(a)} colorClass={alertStatusColor(a)} />
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{a.transportador}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{formatPercent(a.ocupacaoPeso == null ? null : a.ocupacaoPeso * 100)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{a.prioridade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      <section id="parceiros" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <SectionCard title="Transportadores em evidência" subtitle="Top score operacional no período" delay={520}>
            {loadingTransportadores ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {topTransportadores.map((item) => (
                  <div key={item.transportador} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.transportador}</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {item.rotas.toLocaleString("pt-BR")} rotas • share {(item.share * 100).toFixed(1)}%
                        </p>
                      </div>
                      <StatusChip
                        label={item.scoreOperacional.toFixed(1)}
                        colorClass={item.status === "OK" ? "bg-success/15 text-success" : item.status === "Atenção" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
                      <span>Entregas {(item.entregasEfetivas * 100).toFixed(1)}%</span>
                      <span>R$ {item.custoMedioCarga.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/carga</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Leituras de parceiros" subtitle="Concentração, custo e score para priorização rápida" delay={560}>
            {loadingTransportadores ? <LoadingSkeleton rows={4} /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Parceiro líder em share",
                    value: topShare ? formatPercent(topShare.share * 100) : "0,0%",
                    detail: topShare ? topShare.transportador : "Sem dados no recorte",
                  },
                  {
                    label: "Maior score",
                    value: topTransportadores[0] ? topTransportadores[0].scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
                    detail: topTransportadores[0] ? topTransportadores[0].transportador : "Sem dados no recorte",
                  },
                  {
                    label: "Melhor entrega efetiva",
                    value: melhorEntregaTransportador ? formatPercent(melhorEntregaTransportador.entregasEfetivas * 100) : "0,0%",
                    detail: melhorEntregaTransportador ? `${melhorEntregaTransportador.transportador} • ${formatMoney(melhorEntregaTransportador.custoMedioCarga)} por carga` : "Sem dados no recorte",
                  },
                  {
                    label: "Base publicada",
                    value: cards?.[0]?.databaseDt ?? "Sem data",
                    detail: `${formatInteger(alertaList.length)} alertas listados na página`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      {cards?.[0]?.databaseDt && (
        <div className="text-xs font-semibold text-muted-foreground">
          Base atualizada em {cards[0].databaseDt}
        </div>
      )}
    </div>
  );
}
