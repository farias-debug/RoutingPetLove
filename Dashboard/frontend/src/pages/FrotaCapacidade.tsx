import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { Gauge, Scale, Truck, Warehouse } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import { useKpiDiario, useOcupacaoTipoVeiculo } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatInteger, formatPercent } from "@/lib/formatters";

const vehicleOrder = ["Utilitario", "Passeio", "Van"] as const;

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "capacidade", label: "Capacidade" },
  { id: "mix", label: "Mix" },
  { id: "leituras", label: "Leituras" },
];

export default function FrotaCapacidade() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: ocupacao, isLoading: loadingOcupacao } = useOcupacaoTipoVeiculo(filters);

  const chartData = (ocupacao ?? [])
    .filter((item) => vehicleOrder.includes(item.tipoVeiculo as (typeof vehicleOrder)[number]))
    .sort((left, right) => vehicleOrder.indexOf(left.tipoVeiculo as (typeof vehicleOrder)[number]) - vehicleOrder.indexOf(right.tipoVeiculo as (typeof vehicleOrder)[number]))
    .map((o) => ({
      tipo: o.tipoVeiculo,
      rotas: o.rotas,
      ocupacaoPeso: o.ocupacaoPeso == null ? null : +(o.ocupacaoPeso * 100).toFixed(1),
      sprVeiculo: o.sprPorVeiculo,
      orh: o.orh,
      capacidadeKg: o.capacidadePesoTotalKg,
      pesoKg: o.pesoTotalKg,
    }));

  const totalCapacidadeKg = chartData.reduce((sum, item) => sum + item.capacidadeKg, 0);
  const totalPesoKg = chartData.reduce((sum, item) => sum + item.pesoKg, 0);
  const ocupacaoConsolidada = totalCapacidadeKg > 0 ? totalPesoKg / totalCapacidadeKg : null;

  const kpis = kpi ? [
    { label: "Veículos Ativos", value: kpi.veiculosAtivos, unit: "veíc.", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Motoristas Ativos", value: kpi.motoristasAtivos, unit: "mot.", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Ocupação Peso", value: ocupacaoConsolidada == null ? "—" : +(ocupacaoConsolidada * 100).toFixed(1), unit: ocupacaoConsolidada == null ? "" : "%", meta: kpi.metaOcupacaoPeso != null ? kpi.metaOcupacaoPeso * 100 : undefined, metaLabel: "Meta", trend: "neutral" as const, trendValue: undefined, status: (ocupacaoConsolidada ?? -1) >= (kpi.metaOcupacaoPeso ?? 0) ? "success" as const : "warning" as const },
    { label: "Peso Movimentado", value: formatInteger(totalPesoKg), unit: "kg", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Capacidade Total", value: formatInteger(totalCapacidadeKg), unit: "kg", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
  ] : [];

  const chartDataComOcupacao = chartData.filter((item) => item.ocupacaoPeso != null);
  const maiorOcupacao = [...chartDataComOcupacao].sort((left, right) => (right.ocupacaoPeso ?? 0) - (left.ocupacaoPeso ?? 0))[0];
  const menorOcupacao = [...chartDataComOcupacao].sort((left, right) => (left.ocupacaoPeso ?? 0) - (right.ocupacaoPeso ?? 0))[0];
  const maiorSpr = [...chartData].sort((left, right) => right.sprVeiculo - left.sprVeiculo)[0];

  const heroHighlights = [
    {
      label: "Ocupação por peso",
      value: formatPercent(ocupacaoConsolidada == null ? null : ocupacaoConsolidada * 100),
      detail: kpi?.metaOcupacaoPeso != null ? `Meta ${formatPercent(kpi.metaOcupacaoPeso * 100, 0)}` : "Sem meta publicada",
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
      label: "Capacidade total lida",
      value: formatInteger(totalCapacidadeKg),
      detail: `${formatInteger(totalPesoKg)} kg embarcados`,
      icon: <Warehouse className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Frota e capacidade"
          title="Leia ocupação, mix veicular e espaço de eficiência no mesmo fluxo analítico."
          description="A aba passa a reunir capacidade disponível, utilização por tipo de veículo e leituras rápidas de subuso e produtividade para preparar a próxima evolução com séries históricas e recortes mais profundos."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {loadingKpi ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="capacidade" className="scroll-mt-24">
        <SectionCard title="Capacidade por tipo de veículo" subtitle="Somente Utilitario, Passeio e Van no peso embarcado versus capacidade disponível" delay={350}>
          <div className="h-64">
            {loadingOcupacao ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="capacidadeKg" fill="#522B8F" name="Capacidade de peso (kg)" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="pesoKg" fill="#EC5B13" name="Peso movimentado (kg)" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="mix" className="scroll-mt-24">
        <SectionCard title="Mix veicular" subtitle="Leitura operacional por capacidade disponível" delay={410}>
          {loadingOcupacao ? <LoadingSkeleton rows={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Tipo",
                      "Rotas",
                      "Cap. Peso",
                      "Peso Mov.",
                      "Cap. Util.",
                      "SPR/Veículo",
                      "ORH",
                    ].map((header) => (
                      <th key={header} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.tipo} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold">{row.tipo}</td>
                      <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.rotas)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.capacidadeKg)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.pesoKg)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{formatPercent(row.ocupacaoPeso)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{row.sprVeiculo.toFixed(2)}</td>
                      <td className="py-2.5 px-3 tabular-nums">{row.orh.toFixed(2)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      <section id="leituras" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Leituras prioritárias" subtitle="Tipos com melhor e pior alocação de capacidade" delay={450}>
            {loadingOcupacao ? <LoadingSkeleton rows={4} /> : (
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
                    value: maiorSpr ? maiorSpr.sprVeiculo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00",
                    detail: maiorSpr ? maiorSpr.tipo : "Sem dados no recorte",
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

          <SectionCard title="Resumo de capacidade do recorte" subtitle="Leitura consolidada para alocação e balanceamento" delay={490}>
            {loadingOcupacao ? <LoadingSkeleton rows={4} /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Capacidade total</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatInteger(totalCapacidadeKg)} kg</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Distribuída entre {formatInteger(chartData.length)} tipos monitorados</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Peso movimentado</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatInteger(totalPesoKg)} kg</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Ocupação consolidada de {formatPercent(ocupacaoConsolidada == null ? null : ocupacaoConsolidada * 100)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tipos monitorados</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatInteger(chartData.length)}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">Escopo fixo do painel: Utilitario, Passeio e Van</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Maior ocupação</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{maiorOcupacao ? formatPercent(maiorOcupacao.ocupacaoPeso) : "—"}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{maiorOcupacao ? maiorOcupacao.tipo : "Sem dados no recorte"}</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
