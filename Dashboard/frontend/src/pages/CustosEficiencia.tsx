import { BarChart3, CircleDollarSign, Receipt, TrendingUp } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useKpiDiario, useTransportadores } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, Cell, ZAxis, ReferenceLine } from "recharts";
import { formatInteger, formatMoney, formatPercent } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "concentracao", label: "Concentração" },
  { id: "eficiencia", label: "Custo × Score" },
  { id: "detalhamento", label: "Detalhamento" },
];

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function CustosEficiencia() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: transportadores, isLoading: loadingTransp } = useTransportadores(filters);

  const kpis = kpi ? [
    { label: "Valor Pagamento Carga", value: formatMoney(kpi.valorPagamentoTotal), unit: "", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Custo Médio/Carga", value: formatMoney(kpi.custoMedioCarga), unit: "/carga", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Custo Médio/Volume", value: formatMoney(kpi.custoMedioVolume), unit: "/vol", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Custo Médio/Pedido", value: formatMoney(kpi.custoMedioPedido), unit: "/ped", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
  ] : [];

  const list = transportadores ?? [];
  const topShare = [...list].sort((left, right) => right.share - left.share)[0];
  const topCost = [...list].sort((left, right) => right.custoMedioCarga - left.custoMedioCarga)[0];
  const bestScore = [...list].sort((left, right) => right.scoreOperacional - left.scoreOperacional)[0];

  const heroHighlights = [
    {
      label: "Pagamento total",
      value: formatMoney(kpi?.valorPagamentoTotal),
      detail: `${formatInteger(kpi?.rotas)} rotas compondo o recorte`,
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Custo médio por carga",
      value: formatMoney(kpi?.custoMedioCarga),
      detail: `${formatMoney(kpi?.custoMedioPedido)} por pedido`,
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      label: "Maior share",
      value: topShare ? formatPercent(topShare.share * 100) : "0,0%",
      detail: topShare ? topShare.transportador : "Sem transportador no recorte",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Melhor score",
      value: bestScore ? bestScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
      detail: bestScore ? bestScore.transportador : "Sem transportador no recorte",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Custos e eficiência"
          title="Concentre a leitura de custo em poucos sinais e desça para parceiros e alavancas de eficiência."
          description="Esta aba passa a destacar volume financeiro, concentração por parceiro e custo unitário, preparando a evolução para leituras MTD, YTD e outliers sem depender de múltiplas trocas de página."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loadingKpi ? <LoadingSkeleton rows={2} /> : kpis.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="concentracao" className="scroll-mt-24">
        <SectionCard title="Custo Médio por Carga — Transportador" subtitle="R$/carga" delay={300}>
          <div className="h-80 xl:h-96">
            {loadingTransp ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={list}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="transportador" tick={TICK_STYLE_SM} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="custoMedioCarga" fill={CHART_COLORS.primary} name="R$/Carga" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="eficiencia" className="scroll-mt-24">
        <SectionCard title="Mapa custo × performance" subtitle="Quadrantes por mediana — custo por carga vs score operacional" delay={320}>
          {loadingTransp ? <LoadingSkeleton rows={5} /> : (() => {
            const scatterData = list.map(t => ({
              nome: t.transportador,
              custo: +t.custoMedioCarga.toFixed(2),
              score: +t.scoreOperacional.toFixed(1),
              rotas: t.rotas,
              entregas: +(t.entregasEfetivas * 100).toFixed(1),
            }));
            const custoMediano = median(list.map(t => t.custoMedioCarga));
            const scoreMediano = median(list.map(t => t.scoreOperacional));
            function qColor(custo: number, score: number): string {
              if (score >= scoreMediano && custo <= custoMediano) return CHART_COLORS.success;
              if (score >= scoreMediano) return CHART_COLORS.primary;
              if (custo <= custoMediano) return CHART_COLORS.warning;
              return CHART_COLORS.danger;
            }
            return scatterData.length < 2 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Mínimo 2 transportadores necessários.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.success }} /> Estratégico</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.primary }} /> Premium</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.warning }} /> Atenção</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.danger }} /> Revisão</span>
                </div>
                <div className="h-80 xl:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis type="number" dataKey="custo" name="Custo/carga" tickFormatter={(v) => v == null ? "" : `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} tick={TICK_STYLE_SM} />
                      <YAxis type="number" dataKey="score" name="Score" tick={TICK_STYLE_SM} />
                      <ZAxis type="number" dataKey="rotas" range={[40, 220]} name="Rotas" />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0]?.payload;
                          if (!d) return null;
                          return (
                            <div className="rounded-xl border bg-card p-3 shadow-lg text-xs font-semibold space-y-1">
                              <p className="font-bold text-sm text-foreground">{d.nome}</p>
                              <p>Score: {d.score} | Custo: R$ {d.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                              <p>Entregas: {d.entregas}% | Rotas: {d.rotas}</p>
                            </div>
                          );
                        }}
                      />
                      {custoMediano > 0 && <ReferenceLine x={custoMediano} stroke={CHART_COLORS.muted} strokeDasharray="5 3" strokeWidth={1} />}
                      {scoreMediano > 0 && <ReferenceLine y={scoreMediano} stroke={CHART_COLORS.muted} strokeDasharray="5 3" strokeWidth={1} />}
                      <Scatter data={scatterData} name="Transportadores">
                        {scatterData.map((entry, i) => (
                          <Cell key={i} fill={qColor(entry.custo, entry.score)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </>
            );
          })()}
        </SectionCard>
      </section>

      <section id="detalhamento" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Leituras prioritárias" subtitle="Parceiros que concentram custo e desempenho" delay={340}>
            {loadingTransp ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {[
                  {
                    label: "Maior share operacional",
                    partner: topShare?.transportador,
                    value: topShare ? formatPercent(topShare.share * 100) : "0,0%",
                    detail: topShare ? `${formatInteger(topShare.rotas)} rotas no recorte` : "Sem dados",
                  },
                  {
                    label: "Maior custo por carga",
                    partner: topCost?.transportador,
                    value: formatMoney(topCost?.custoMedioCarga),
                    detail: topCost ? `${formatPercent(topCost.entregasEfetivas * 100)} de entregas efetivas` : "Sem dados",
                  },
                  {
                    label: "Melhor score operacional",
                    partner: bestScore?.transportador,
                    value: bestScore ? bestScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
                    detail: bestScore ? `${formatMoney(bestScore.custoMedioCarga)} por carga` : "Sem dados",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-sm font-bold text-foreground">{item.partner ?? "Sem transportador no recorte"}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Detalhamento por Transportador" subtitle="Share, custo, entrega e score no recorte aplicado" delay={360}>
            {loadingTransp ? <LoadingSkeleton rows={6} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Transportador", "Rotas", "Share %", "R$/Carga", "Entregas %", "Score"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(t => (
                      <tr key={t.transportador} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{t.transportador}</td>
                        <td className="py-2.5 px-3 tabular-nums">{t.rotas}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(t.share * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatMoney(t.custoMedioCarga)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(t.entregasEfetivas * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 tabular-nums font-bold">{t.scoreOperacional.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
