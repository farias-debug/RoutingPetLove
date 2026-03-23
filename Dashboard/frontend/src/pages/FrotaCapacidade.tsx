import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { Gauge, Scale, Truck, Warehouse } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import { useKpiDiario, useOcupacaoTipoVeiculo, useFilialPerformance } from "@/hooks/useApiData";
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
  ReferenceLine,
  Cell,
} from "recharts";
import { formatInteger, formatPercent } from "@/lib/formatters";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "capacidade", label: "Capacidade" },
  { id: "spr-filial", label: "SPR por filial" },
  { id: "volumes-filial", label: "Volumes por filial" },
  { id: "mix", label: "Mix" },
  { id: "leituras", label: "Leituras" },
];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "none",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
  fontWeight: 600,
};
const TICK_STYLE = { fontSize: 11, fontWeight: 600, fill: "#667085" };

function ocuColor(pct: number, meta: number): string {
  if (pct >= meta * 100) return "#10b981"; // verde
  if (pct >= meta * 100 * 0.85) return "#f59e0b"; // amarelo
  return "#ef4444"; // vermelho
}

export default function FrotaCapacidade() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: ocupacao, isLoading: loadingOcupacao } = useOcupacaoTipoVeiculo(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);

  const metaOcupacao = kpi?.metaOcupacaoPeso ?? 0.85;

  // Capacidade por tipo de veículo — todos os tipos dinâmicos, exceto vazios
  const chartData = (ocupacao ?? [])
    .filter((item) => item.tipoVeiculo && item.tipoVeiculo.trim() !== "")
    .sort((a, b) => b.rotas - a.rotas)
    .map((o) => {
      const ocuPct = o.ocupacaoPeso == null ? null : +(o.ocupacaoPeso * 100).toFixed(1);
      return {
        tipo: o.tipoVeiculo,
        rotas: o.rotas,
        ocupacaoPeso: ocuPct,
        ociosoPercent: ocuPct == null ? null : +(100 - ocuPct).toFixed(1),
        sprVeiculo: o.sprPorVeiculo,
        orh: o.orh,
        capacidadeKg: o.capacidadePesoTotalKg,
        pesoKg: o.pesoTotalKg,
      };
    });

  const totalCapacidadeKg = chartData.reduce((sum, item) => sum + item.capacidadeKg, 0);
  const totalPesoKg = chartData.reduce((sum, item) => sum + item.pesoKg, 0);
  const ocupacaoConsolidada = totalCapacidadeKg > 0 ? totalPesoKg / totalCapacidadeKg : null;

  // SPR por filial (filiais com planejamento ou execução)
  const sprFiliaisData = (filiais ?? [])
    .filter((f) => f.rotas > 0)
    .sort((a, b) => b.sprPedidosReal - a.sprPedidosReal)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      spr: +f.sprPedidosReal.toFixed(2),
      sprVolumes: +f.sprVolumesReal.toFixed(2),
      meta: f.metaSpr,
      desvio: +(f.sprVsMeta ?? 0).toFixed(2),
      score: f.scoreOperacional,
    }));
  const metaSpr = filiais?.[0]?.metaSpr ?? 0;

  // Volumes por filial
  const volumesFiliaisData = (filiais ?? [])
    .filter((f) => f.rotas > 0)
    .sort((a, b) => b.volumesReal - a.volumesReal)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      volumesReal: f.volumesReal,
      volumesPlan: f.volumesPlan ?? 0,
      sprVolumes: +f.sprVolumesReal.toFixed(2),
    }));

  const chartDataComOcupacao = chartData.filter((item) => item.ocupacaoPeso != null);
  const maiorOcupacao = [...chartDataComOcupacao].sort((a, b) => (b.ocupacaoPeso ?? 0) - (a.ocupacaoPeso ?? 0))[0];
  const menorOcupacao = [...chartDataComOcupacao].sort((a, b) => (a.ocupacaoPeso ?? 0) - (b.ocupacaoPeso ?? 0))[0];
  const maiorSpr = [...chartData].sort((a, b) => b.sprVeiculo - a.sprVeiculo)[0];

  const kpis = kpi
    ? [
        {
          label: "Veículos Ativos",
          value: kpi.veiculosAtivos,
          unit: "veíc.",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "neutral" as const,
        },
        {
          label: "Motoristas Ativos",
          value: kpi.motoristasAtivos,
          unit: "mot.",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "warning" as const,
        },
        {
          label: "Ocupação Peso",
          value:
            ocupacaoConsolidada == null ? "—" : +(ocupacaoConsolidada * 100).toFixed(1),
          unit: ocupacaoConsolidada == null ? "" : "%",
          meta:
            kpi.metaOcupacaoPeso != null ? kpi.metaOcupacaoPeso * 100 : undefined,
          metaLabel: "Meta",
          trend: "neutral" as const,
          trendValue: undefined,
          status:
            ocupacaoConsolidada != null &&
            kpi.metaOcupacaoPeso != null &&
            ocupacaoConsolidada >= kpi.metaOcupacaoPeso
              ? ("success" as const)
              : ("warning" as const),
        },
        {
          label: "Peso Movimentado",
          value: formatInteger(totalPesoKg),
          unit: "kg",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "neutral" as const,
        },
        {
          label: "Capacidade Total",
          value: formatInteger(totalCapacidadeKg),
          unit: "kg",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "success" as const,
        },
      ]
    : [];

  const heroHighlights = [
    {
      label: "Ocupação por peso",
      value: formatPercent(ocupacaoConsolidada == null ? null : ocupacaoConsolidada * 100),
      detail:
        kpi?.metaOcupacaoPeso != null
          ? `Meta ${formatPercent(kpi.metaOcupacaoPeso * 100, 0)}`
          : "Sem meta publicada",
      icon: <Scale className="h-4 w-4" />,
    },
    {
      label: "Veículos ativos",
      value: formatInteger(kpi?.veiculosAtivos),
      detail: `${formatInteger(kpi?.motoristasAtivos)} motoristas ativos`,
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: "Maior utilização",
      value: maiorOcupacao ? formatPercent(maiorOcupacao.ocupacaoPeso) : "—",
      detail: maiorOcupacao ? maiorOcupacao.tipo : "Sem tipo no recorte",
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      label: "Capacidade total",
      value: formatInteger(totalCapacidadeKg),
      detail: `${formatInteger(totalPesoKg)} kg embarcados`,
      icon: <Warehouse className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* VISÃO GERAL */}
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Frota e capacidade"
          title="Leia ocupação, mix veicular e espaço de eficiência no mesmo fluxo analítico."
          description="Capacidade disponível, utilização por tipo de veículo, SPR por filial e distribuição de volumes para identificar gargalos e oportunidades de otimização."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {loadingKpi ? (
            <LoadingSkeleton rows={2} />
          ) : (
            kpis.map((k, i) => <KPICard key={k.label} data={k} delay={i * 60} />)
          )}
        </div>
      </section>

      {/* CAPACIDADE — % utilizado vs ocioso por tipo de veículo */}
      <section id="capacidade" className="scroll-mt-24">
        <SectionCard
          title="Utilização de capacidade por tipo de veículo"
          subtitle={`Percentual utilizado (peso embarcado) vs ocioso — meta de ocupação: ${formatPercent(metaOcupacao * 100, 0)}`}
          delay={300}
        >
          <div className="h-72">
            {loadingOcupacao ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.filter((d) => d.ocupacaoPeso != null)}
                  layout="vertical"
                  margin={{ left: 8, right: 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={TICK_STYLE}
                  />
                  <YAxis type="category" dataKey="tipo" width={72} tick={TICK_STYLE} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}%`,
                      name === "ocupacaoPeso" ? "Utilizado (peso)" : "Ocioso",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <ReferenceLine
                    x={metaOcupacao * 100}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    label={{ value: "Meta", position: "insideTopRight", fill: "#10b981", fontSize: 11, fontWeight: 700 }}
                  />
                  <Bar dataKey="ocupacaoPeso" name="Utilizado %" radius={[0, 4, 4, 0]} stackId="a" barSize={22}>
                    {chartData
                      .filter((d) => d.ocupacaoPeso != null)
                      .map((entry) => (
                        <Cell
                          key={entry.tipo}
                          fill={ocuColor(entry.ocupacaoPeso ?? 0, metaOcupacao)}
                        />
                      ))}
                  </Bar>
                  <Bar
                    dataKey="ociosoPercent"
                    name="Ocioso %"
                    fill="#e5e7eb"
                    radius={[0, 4, 4, 0]}
                    stackId="a"
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* SPR POR FILIAL */}
      <section id="spr-filial" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="SPR pedidos por filial"
            subtitle={`Pedidos por rota — meta: ${metaSpr > 0 ? metaSpr.toFixed(1) : "—"} ped/rota`}
            delay={360}
          >
            <div className="h-80">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : sprFiliaisData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de SPR para o recorte selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sprFiliaisData.slice(0, 12)}
                    layout="vertical"
                    margin={{ left: 8, right: 32 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value.toFixed(2)} ped/rota`]}
                    />
                    {metaSpr > 0 && (
                      <ReferenceLine
                        x={metaSpr}
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        label={{ value: `Meta ${metaSpr.toFixed(0)}`, position: "insideTopRight", fill: "#10b981", fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                    <Bar dataKey="spr" name="SPR Pedidos" radius={[0, 4, 4, 0]} barSize={18}>
                      {sprFiliaisData.slice(0, 12).map((entry) => (
                        <Cell
                          key={entry.filial}
                          fill={metaSpr > 0 ? (entry.spr >= metaSpr ? "#10b981" : entry.spr >= metaSpr * 0.85 ? "#f59e0b" : "#ef4444") : "#522B8F"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="SPR volumes por filial"
            subtitle="Volumes por rota — comparação entre filiais"
            delay={400}
          >
            <div className="h-80">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : sprFiliaisData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de SPR para o recorte selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sprFiliaisData.slice(0, 12)}
                    layout="vertical"
                    margin={{ left: 8, right: 32 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value.toFixed(2)} vol/rota`]}
                    />
                    <Bar dataKey="sprVolumes" name="SPR Volumes" fill="#EC5B13" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      {/* VOLUMES POR FILIAL */}
      <section id="volumes-filial" className="scroll-mt-24">
        <SectionCard
          title="Capacidade de volumes por filial"
          subtitle="Volumes realizados vs planejados — distribuição por filial"
          delay={440}
        >
          <div className="h-80">
            {loadingFiliais ? (
              <LoadingSkeleton rows={5} />
            ) : volumesFiliaisData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de volumes por filial para o recorte selecionado.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={volumesFiliaisData.slice(0, 14)}
                  margin={{ left: 4, right: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis
                    dataKey="filial"
                    tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [
                      formatInteger(value),
                      name === "volumesPlan" ? "Planejado" : "Realizado",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="volumesPlan" name="Planejado" fill="#EC5B13" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="volumesReal" name="Realizado" fill="#EC5B13" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* MIX VEICULAR */}
      <section id="mix" className="scroll-mt-24">
        <SectionCard
          title="Mix veicular"
          subtitle="Leitura operacional por tipo — capacidade e produtividade"
          delay={500}
        >
          {loadingOcupacao ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Tipo", "Rotas", "Cap. Peso (kg)", "Peso Mov. (kg)", "Utilização", "SPR/Veículo", "ORH"].map(
                      (header) => (
                        <th
                          key={header}
                          className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => {
                    const pct = row.ocupacaoPeso ?? 0;
                    const barColor =
                      pct >= metaOcupacao * 100
                        ? "#10b981"
                        : pct >= metaOcupacao * 100 * 0.85
                        ? "#f59e0b"
                        : "#ef4444";
                    return (
                      <tr
                        key={row.tipo}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold">{row.tipo}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.rotas)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.capacidadeKg)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.pesoKg)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span className="tabular-nums text-xs font-bold" style={{ color: barColor }}>
                              {formatPercent(row.ocupacaoPeso)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{row.sprVeiculo.toFixed(2)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{row.orh.toFixed(2)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      {/* LEITURAS */}
      <section id="leituras" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Leituras prioritárias"
            subtitle="Tipos com melhor e pior alocação de capacidade"
            delay={560}
          >
            {loadingOcupacao ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Maior ocupação de peso",
                    value: maiorOcupacao ? formatPercent(maiorOcupacao.ocupacaoPeso) : "—",
                    detail: maiorOcupacao ? maiorOcupacao.tipo : "Sem dados no recorte",
                  },
                  {
                    label: "Maior espaço ocioso",
                    value: menorOcupacao ? formatPercent(menorOcupacao.ocupacaoPeso) : "—",
                    detail: menorOcupacao ? menorOcupacao.tipo : "Sem dados no recorte",
                  },
                  {
                    label: "Maior SPR por veículo",
                    value: maiorSpr
                      ? maiorSpr.sprVeiculo.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0,00",
                    detail: maiorSpr ? maiorSpr.tipo : "Sem dados no recorte",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Resumo de capacidade do recorte"
            subtitle="Leitura consolidada para alocação e balanceamento"
            delay={600}
          >
            {loadingOcupacao ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Capacidade total
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {formatInteger(totalCapacidadeKg)} kg
                  </p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {formatInteger(chartData.length)} tipos monitorados
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Peso movimentado
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {formatInteger(totalPesoKg)} kg
                  </p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    Ocupação consolidada de {formatPercent(ocupacaoConsolidada == null ? null : ocupacaoConsolidada * 100)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Meta ocupação
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {formatPercent(metaOcupacao * 100, 0)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {ocupacaoConsolidada != null && ocupacaoConsolidada >= metaOcupacao
                      ? "✓ Meta atingida"
                      : ocupacaoConsolidada != null
                      ? `${formatPercent((metaOcupacao - ocupacaoConsolidada) * 100)} abaixo da meta`
                      : "Sem dados no recorte"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Maior ocupação
                  </p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">
                    {maiorOcupacao ? formatPercent(maiorOcupacao.ocupacaoPeso) : "—"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {maiorOcupacao ? maiorOcupacao.tipo : "Sem dados no recorte"}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
