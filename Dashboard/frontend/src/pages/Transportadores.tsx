import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import { useTransportadores } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { BarChart3, Building2, CircleDollarSign, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Cell, Tooltip, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, ZAxis, ReferenceLine } from "recharts";
import { formatInteger, formatPercent, formatMoney } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS, CATEGORICAL_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "concentracao", label: "Concentração" },
  { id: "performance", label: "Performance" },
  { id: "ranking", label: "Ranking" },
];

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function Transportadores() {
  const { filters } = useGlobalFilters();
  const { data: transportadores, isLoading } = useTransportadores(filters);

  const list = transportadores ?? [];
  const orderedByShare = [...list].sort((a, b) => b.share - a.share);
  const orderedByScore = [...list].sort((a, b) => b.scoreOperacional - a.scoreOperacional);
  const orderedByCost = [...list].sort((a, b) => b.custoMedioCarga - a.custoMedioCarga);
  const topShare = orderedByShare[0];
  const topScore = orderedByScore[0];
  const topCost = orderedByCost[0];
  const parceirosAtivos = list.length;
  const top3Share = orderedByShare.slice(0, 3).reduce((sum, item) => sum + item.share, 0);

  const pieData = orderedByShare.slice(0, 7).map(t => ({
    transportador: t.transportador,
    share: +(t.share * 100).toFixed(1),
  }));
  // Agrupar "Outros" se houver mais de 7
  if (list.length > 7) {
    const outrosShare = orderedByShare.slice(7).reduce((sum, t) => sum + t.share, 0);
    pieData.push({ transportador: "Outros", share: +(outrosShare * 100).toFixed(1) });
  }

  // Dados Pareto (horizontal bar, ordenado por share desc, com acumulado)
  const paretoData = pieData.map((item, i) => {
    const acumulado = pieData.slice(0, i + 1).reduce((sum, d) => sum + d.share, 0);
    return { ...item, acumulado: +acumulado.toFixed(1) };
  });

  // ScatterChart: Custo × Score
  const scatterData = list.map(t => ({
    nome: t.transportador,
    custo: +(t.custoMedioCarga ?? 0).toFixed(2),
    score: +(t.scoreOperacional ?? 0).toFixed(1),
    rotas: t.rotas,
    entregas: +((t.entregasEfetivas ?? 0) * 100).toFixed(1),
    status: t.status,
  }));
  const custoMediano = median(list.map(t => t.custoMedioCarga));
  const scoreMediano = median(list.map(t => t.scoreOperacional));

  function scatterColor(custo: number, score: number): string {
    if (score >= scoreMediano && custo <= custoMediano) return CHART_COLORS.success;
    if (score >= scoreMediano) return CHART_COLORS.primary;
    if (custo <= custoMediano) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  }

  const heroHighlights = [
    {
      label: "Parceiros ativos",
      value: formatInteger(parceirosAtivos),
      detail: "No recorte filtrado",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "Maior share",
      value: topShare ? formatPercent(topShare.share * 100) : "—",
      detail: topShare?.transportador ?? "Sem dados",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Maior custo/carga",
      value: formatMoney(topCost?.custoMedioCarga),
      detail: topCost?.transportador ?? "Sem dados",
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Melhor score",
      value: topScore ? topScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—",
      detail: topScore?.transportador ?? "Sem dados",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Transportadores"
          title="Concentração, custo e performance de parceiros."
          description="Share operacional por parceiro, custo médio por carga e score de performance."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Leituras prioritárias" subtitle="Sinais da carteira de parceiros" delay={100}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Concentração top 3</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercent(top3Share * 100)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Soma dos três maiores</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Maior custo</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatMoney(topCost?.custoMedioCarga)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topCost?.transportador ?? "Sem dados"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Melhor entrega</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {topScore ? formatPercent(topScore.entregasEfetivas * 100) : "—"}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topScore?.transportador ?? "Sem dados"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas do líder</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(topShare?.rotas)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topShare?.transportador ?? "Sem dados"}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Resumo da carteira" subtitle="Top 5 por share operacional" delay={140}>
            {isLoading ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {orderedByShare.slice(0, 5).map((item) => (
                  <div key={item.transportador} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.transportador}</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatInteger(item.rotas)} rotas</p>
                      </div>
                      <StatusChip label={formatPercent(item.share * 100)} colorClass="bg-primary/10 text-primary" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-muted-foreground">
                      <span>Custo {formatMoney(item.custoMedioCarga)}</span>
                      <span>Score {item.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section id="concentracao" className="scroll-mt-24">
        <SectionCard title="Share dos transportadores" subtitle="Participação % nas rotas — Pareto descendente" delay={180}>
          <div className="h-64">
            {isLoading ? <LoadingSkeleton rows={4} /> : paretoData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem transportadores no recorte.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paretoData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="transportador" width={100} tick={TICK_STYLE_SM} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name === "share" ? "Share" : "Acumulado"]}
                  />
                  <Bar dataKey="share" name="Share %" radius={[0, 4, 4, 0]} barSize={18}>
                    {paretoData.map((_, i) => (
                      <Cell key={i} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* MAPA DE PERFORMANCE — Scatter Custo × Score */}
      <section id="performance" className="scroll-mt-24">
        <SectionCard title="Mapa de performance" subtitle="Custo × score — quadrantes por mediana" delay={210}>
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.success }} /> Estratégico</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.primary }} /> Premium</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.warning }} /> Atenção</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.danger }} /> Revisão</span>
          </div>
          <div className="h-64">
            {isLoading ? (
              <LoadingSkeleton rows={5} />
            ) : scatterData.length < 2 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Mínimo 2 transportadores necessários.</p>
            ) : (
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
                      <Cell key={i} fill={scatterColor(entry.custo, entry.score)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="ranking" className="scroll-mt-24">
        <SectionCard title="Ranking" subtitle="Score, custo e participação" delay={260}>
          {isLoading ? <LoadingSkeleton rows={6} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Transportador", "Rotas", "Share", "Entregas", "Custo/carga", "Score"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedByScore.map(t => {
                    const pctEntregas = +(((t.entregasEfetivas ?? 0)) * 100).toFixed(1);
                    return (
                      <tr key={t.transportador} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{t.transportador}</td>
                        <td className="py-2.5 px-3 tabular-nums">{t.rotas}</td>
                        <td className="py-2.5 px-3 tabular-nums">{((t.share ?? 0) * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3">
                          <StatusChip
                            label={`${pctEntregas}%`}
                            colorClass={pctEntregas >= 95 ? "bg-success/15 text-success" : pctEntregas >= 93 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}
                          />
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{formatMoney(t.custoMedioCarga)}</td>
                        <td className="py-2.5 px-3 font-bold tabular-nums">
                          <StatusChip label={(t.scoreOperacional ?? 0).toFixed(1)} colorClass={t.status === "OK" ? "bg-success/15 text-success" : t.status === "Atenção" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
