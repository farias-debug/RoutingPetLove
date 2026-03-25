import { ArrowUpDown, CheckCircle2, MapPin, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useFilialPerformance } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { formatInteger, formatPercent } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "ranking", label: "Ranking" },
  { id: "spr-score", label: "SPR × Score" },
  { id: "aderencia", label: "Aderência" },
];

export default function ComparativoFiliais() {
  const { filters } = useGlobalFilters();
  const { data: filiais, isLoading } = useFilialPerformance(filters);

  const list = (filiais ?? []).filter((f) => f.rotas > 0);
  const sorted = [...list].sort((a, b) => b.scoreOperacional - a.scoreOperacional);

  const totalFiliais = list.length;
  const mediaScore = totalFiliais > 0
    ? list.reduce((s, f) => s + f.scoreOperacional, 0) / totalFiliais
    : 0;
  const mediaAderencia = (() => {
    const withAder = list.filter((f) => f.aderenciaPedidos != null);
    if (withAder.length === 0) return null;
    return withAder.reduce((s, f) => s + (f.aderenciaPedidos ?? 0), 0) / withAder.length;
  })();
  const mediaSpr = totalFiliais > 0
    ? list.reduce((s, f) => s + f.sprPedidosReal, 0) / totalFiliais
    : 0;

  const kpiCards = [
    {
      label: "Filiais ativas",
      value: totalFiliais,
      unit: "fil.",
      trend: "neutral" as const,
      trendValue: undefined,
      status: "neutral" as const,
    },
    {
      label: "Score médio",
      value: Number(mediaScore.toFixed(1)),
      unit: "",
      trend: "neutral" as const,
      trendValue: undefined,
      status: mediaScore >= 70 ? ("success" as const) : mediaScore >= 55 ? ("warning" as const) : ("danger" as const),
    },
    {
      label: "SPR médio",
      value: Number(mediaSpr.toFixed(2)),
      unit: "ped/rt",
      trend: "neutral" as const,
      trendValue: undefined,
      status: "neutral" as const,
    },
    {
      label: "Aderência média",
      value: mediaAderencia == null ? "—" : Number((mediaAderencia * 100).toFixed(1)),
      unit: mediaAderencia == null ? "" : "%",
      trend: "neutral" as const,
      trendValue: undefined,
      status: mediaAderencia == null ? ("neutral" as const) : mediaAderencia >= 0.9 ? ("success" as const) : ("warning" as const),
    },
  ];

  const melhorFilial = sorted[0];
  const piorFilial = [...list].sort((a, b) => a.scoreOperacional - b.scoreOperacional)[0];

  const heroHighlights = [
    {
      label: "Melhor score",
      value: melhorFilial ? melhorFilial.scoreOperacional.toFixed(1) : "—",
      detail: melhorFilial ? (melhorFilial.nomeFilial || melhorFilial.filial) : "Sem dados",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Pior score",
      value: piorFilial ? piorFilial.scoreOperacional.toFixed(1) : "—",
      detail: piorFilial ? (piorFilial.nomeFilial || piorFilial.filial) : "Sem dados",
      icon: <ArrowUpDown className="h-4 w-4" />,
    },
    {
      label: "Filiais ativas",
      value: formatInteger(totalFiliais),
      detail: `Score médio: ${mediaScore.toFixed(1)}`,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Aderência média",
      value: mediaAderencia == null ? "—" : formatPercent(mediaAderencia * 100),
      detail: "Aderência de pedidos",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

  // Ranking de score
  const scoreRankData = sorted.map((f) => ({
    filial: f.nomeFilial || f.filial,
    score: +f.scoreOperacional.toFixed(1),
    spr: +f.sprPedidosReal.toFixed(2),
    aderencia: f.aderenciaPedidos != null ? +(f.aderenciaPedidos * 100).toFixed(1) : null,
  }));

  // Scatter: SPR × Score
  const scatterData = list.map((f) => ({
    x: +f.sprPedidosReal.toFixed(2),
    y: +f.scoreOperacional.toFixed(1),
    z: f.rotas,
    filial: f.nomeFilial || f.filial,
  }));

  // Aderência comparativa — todas as filiais ordenadas pela pior
  const aderenciaData = list
    .filter((f) => f.aderenciaPedidos != null)
    .sort((a, b) => (a.aderenciaPedidos ?? 1) - (b.aderenciaPedidos ?? 1))
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      pedidos: f.aderenciaPedidos != null ? +(f.aderenciaPedidos * 100).toFixed(1) : null,
      volumes: f.aderenciaVolumes != null ? +(f.aderenciaVolumes * 100).toFixed(1) : null,
      km: f.aderenciaKm != null ? +(f.aderenciaKm * 100).toFixed(1) : null,
    }));

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Comparativo de filiais"
          title="Ranking, eficiência e aderência por filial em uma leitura unificada."
          description="Pontuação operacional, SPR e aderência de todas as filiais ativas consolidadas para visão comparativa."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? <LoadingSkeleton rows={2} /> : kpiCards.map((k, i) => <KPICard key={k.label} data={k} delay={i * 60} />)}
        </div>
      </section>

      <section id="ranking" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <SectionCard title="Ranking de score por filial" subtitle="Score operacional — maior é melhor" delay={300}>
            {isLoading ? <LoadingSkeleton rows={5} /> : scoreRankData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem filiais ativas no recorte.</p>
            ) : (
              <div style={{ height: Math.max(240, scoreRankData.length * 30) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreRankData} layout="vertical" margin={{ left: 8, right: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="filial" width={105} tick={TICK_STYLE_SM} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toFixed(1), "Score"]} />
                    <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]} barSize={18}>
                      {scoreRankData.map((entry) => (
                        <Cell
                          key={entry.filial}
                          fill={entry.score >= 70 ? CHART_COLORS.success : entry.score >= 55 ? CHART_COLORS.warning : CHART_COLORS.danger}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Tabela comparativa" subtitle="Métricas chave por filial" delay={340}>
            {isLoading ? <LoadingSkeleton rows={6} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Filial", "Score", "SPR", "Ader."].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((f) => {
                      const sc = f.scoreOperacional;
                      const color = sc >= 70 ? CHART_COLORS.success : sc >= 55 ? CHART_COLORS.warning : CHART_COLORS.danger;
                      return (
                        <tr key={f.filial} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2 font-bold">{f.nomeFilial || f.filial}</td>
                          <td className="py-2 px-2 tabular-nums font-bold" style={{ color }}>{sc.toFixed(1)}</td>
                          <td className="py-2 px-2 tabular-nums">{f.sprPedidosReal.toFixed(2)}</td>
                          <td className="py-2 px-2 tabular-nums">{f.aderenciaPedidos != null ? formatPercent(f.aderenciaPedidos * 100, 0) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <section id="spr-score" className="scroll-mt-24">
        <SectionCard title="SPR × Score por filial" subtitle="Relação entre produtividade de rota e desempenho operacional" delay={380}>
          {isLoading ? <LoadingSkeleton rows={5} /> : scatterData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados para o recorte.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 24, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="x"
                    name="SPR"
                    type="number"
                    tick={TICK_STYLE}
                    label={{ value: "SPR (ped/rota)", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#888" }}
                  />
                  <YAxis
                    dataKey="y"
                    name="Score"
                    type="number"
                    tick={TICK_STYLE}
                    label={{ value: "Score", angle: -90, position: "insideLeft", fontSize: 10, fill: "#888" }}
                  />
                  <ZAxis dataKey="z" range={[40, 200]} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ ...TOOLTIP_STYLE, padding: "8px 12px" }}>
                          <p className="font-bold text-xs">{d?.filial}</p>
                          <p className="text-xs">SPR: {d?.x}</p>
                          <p className="text-xs">Score: {d?.y}</p>
                          <p className="text-xs">Rotas: {formatInteger(d?.z)}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData} fill={CHART_COLORS.primary} fillOpacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      <section id="aderencia" className="scroll-mt-24">
        <SectionCard title="Aderência por filial" subtitle="% de aderência em pedidos, volumes e km — piores primeiro" delay={420}>
          {isLoading ? <LoadingSkeleton rows={5} /> : aderenciaData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de aderência para o recorte. Verifique se há planejamento cadastrado.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aderenciaData} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`} tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="filial" width={105} tick={TICK_STYLE_SM} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | null) => v == null ? ["—", ""] : [`${(v as number).toFixed(1)}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <ReferenceLine x={100} stroke={CHART_COLORS.success} strokeDasharray="5 3" strokeWidth={1.5} label={{ value: "Meta 100%", position: "insideTopRight", fill: CHART_COLORS.success, fontSize: 10 }} />
                  <Bar dataKey="pedidos" name="Pedidos %" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} barSize={10} />
                  <Bar dataKey="volumes" name="Volumes %" fill={CHART_COLORS.secondary} radius={[0, 3, 3, 0]} barSize={10} />
                  <Bar dataKey="km" name="Km %" fill={CHART_COLORS.warning} radius={[0, 3, 3, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
