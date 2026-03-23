import { Boxes, ListOrdered, PackageCheck, Route, Weight } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useKpiDiario, useFilialPerformance } from "@/hooks/useApiData";
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
  Cell,
  ReferenceLine,
} from "recharts";
import { formatInteger, formatPercent } from "@/lib/formatters";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "pedidos", label: "Pedidos" },
  { id: "volumes", label: "Volumes" },
  { id: "aderencia-filial", label: "Aderência por filial" },
  { id: "spr-filial", label: "SPR por filial" },
  { id: "gaps", label: "Gaps" },
];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "none",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
  fontWeight: 600,
};
const TICK_STYLE = { fontSize: 11, fontWeight: 600, fill: "#667085" };

export default function PlanejadoRealizado() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);

  const filiaisComparaveis = (filiais ?? []).filter(
    (filial) =>
      (filial.pedidosPlan ?? 0) > 0 ||
      (filial.volumesPlan ?? 0) > 0 ||
      (filial.pesoPlan ?? 0) > 0,
  );
  const filiaisSemPlanejamento = Math.max(0, (filiais ?? []).length - filiaisComparaveis.length);

  const metaAderVolumes = kpi?.metaAderenciaVolumes ?? 0.9;
  const metaSpr = filiais?.[0]?.metaSpr ?? 0;

  const kpis = kpi
    ? [
        {
          label: "Aderência Pedidos",
          value:
            kpi.pctAderPedidos != null ? +(kpi.pctAderPedidos * 100).toFixed(1) : "—",
          unit: "%",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "success" as const,
        },
        {
          label: "Aderência Volumes",
          value:
            kpi.pctAderVolumes != null ? +(kpi.pctAderVolumes * 100).toFixed(1) : "—",
          unit: "%",
          meta:
            kpi.metaAderenciaVolumes != null
              ? kpi.metaAderenciaVolumes * 100
              : undefined,
          metaLabel: "Meta",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "warning" as const,
        },
        {
          label: "Aderência Peso",
          value:
            kpi.pctAderPeso != null ? +(kpi.pctAderPeso * 100).toFixed(1) : "—",
          unit: "%",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "success" as const,
        },
        {
          label: "Aderência KM",
          value:
            kpi.pctAderKm != null ? +(kpi.pctAderKm * 100).toFixed(1) : "—",
          unit: "%",
          trend: "neutral" as const,
          trendValue: undefined,
          status: "neutral" as const,
        },
      ]
    : [];

  // Dados por filial para gráficos plan×real
  const chartData = filiaisComparaveis
    .sort((a, b) => b.volumesReal - a.volumesReal)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      planejadoPedidos: f.pedidosPlan ?? 0,
      realizadoPedidos: f.pedidosReal,
      planejadoVolumes: f.volumesPlan ?? 0,
      realizadoVolumes: f.volumesReal,
      gapPedidos: f.pedidosReal - (f.pedidosPlan ?? 0),
      gapVolumes: f.volumesReal - (f.volumesPlan ?? 0),
      aderenciaVolumes:
        f.aderenciaVolumes != null ? +(f.aderenciaVolumes * 100).toFixed(1) : null,
      aderenciaPedidos:
        f.aderenciaPedidos != null ? +(f.aderenciaPedidos * 100).toFixed(1) : null,
    }));

  // Dados de SPR por filial (filiais com execução)
  const sprData = (filiais ?? [])
    .filter((f) => f.rotas > 0)
    .sort((a, b) => b.sprPedidosReal - a.sprPedidosReal)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      sprPedidos: +f.sprPedidosReal.toFixed(2),
      sprVolumes: +f.sprVolumesReal.toFixed(2),
      meta: f.metaSpr,
      desvio: +(f.sprVsMeta ?? f.sprPedidosReal - f.metaSpr).toFixed(2),
    }));

  // Aderência por filial (apenas filiais com dados)
  const aderenciaFiliaisData = chartData
    .filter((f) => f.aderenciaVolumes != null)
    .sort((a, b) => (b.aderenciaVolumes ?? 0) - (a.aderenciaVolumes ?? 0));

  // Top 5 maiores gaps de volumes
  const maioresGaps = [...chartData]
    .sort((a, b) => Math.abs(b.gapVolumes) - Math.abs(a.gapVolumes))
    .slice(0, 10);

  const totalPlanejadoPedidos = chartData.reduce((sum, item) => sum + item.planejadoPedidos, 0);
  const totalRealizadoPedidos = chartData.reduce((sum, item) => sum + item.realizadoPedidos, 0);
  const totalPlanejadoVolumes = chartData.reduce((sum, item) => sum + item.planejadoVolumes, 0);
  const totalRealizadoVolumes = chartData.reduce((sum, item) => sum + item.realizadoVolumes, 0);

  const isLoading = loadingKpi || loadingFiliais;

  const heroHighlights = [
    {
      label: "Aderência pedidos",
      value: formatPercent(
        kpi?.pctAderPedidos != null ? kpi.pctAderPedidos * 100 : null,
      ),
      detail: `${formatInteger(totalRealizadoPedidos)} pedidos realizados`,
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Aderência volumes",
      value: formatPercent(
        kpi?.pctAderVolumes != null ? kpi.pctAderVolumes * 100 : null,
      ),
      detail: `${formatInteger(totalRealizadoVolumes)} volumes realizados`,
      icon: <Boxes className="h-4 w-4" />,
    },
    {
      label: "Aderência peso",
      value: formatPercent(
        kpi?.pctAderPeso != null ? kpi.pctAderPeso * 100 : null,
      ),
      detail: "Peso embarcado vs planejado",
      icon: <Weight className="h-4 w-4" />,
    },
    {
      label: "Aderência km",
      value: formatPercent(
        kpi?.pctAderKm != null ? kpi.pctAderKm * 100 : null,
      ),
      detail: "Desvio da malha no recorte",
      icon: <Route className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* VISÃO GERAL */}
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Planejado × realizado"
          title="Acompanhe aderência e gaps do plano com leitura operacional por filial."
          description="Compara apenas filiais com planejamento válido. SPR por filial e gaps de volume identificam onde o plano diverge da execução."
          highlights={heroHighlights}
        />

        {filiaisSemPlanejamento > 0 && (
          <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold text-muted-foreground">
            {filiaisSemPlanejamento} filiais sem planejamento válido foram ocultadas dos comparativos deste painel.
          </div>
        )}

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <LoadingSkeleton rows={2} />
          ) : (
            kpis.map((k, i) => <KPICard key={k.label} data={k} delay={i * 60} />)
          )}
        </div>
      </section>

      {/* PEDIDOS */}
      <section id="pedidos" className="scroll-mt-24">
        <SectionCard
          title="Planejado × Realizado — Pedidos"
          subtitle="Por filial com planejamento válido — ordenado por volume realizado"
          delay={300}
        >
          <div className="h-64">
            {loadingFiliais ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatInteger(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="planejadoPedidos" fill="#522B8F" fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoPedidos" fill="#522B8F" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* VOLUMES */}
      <section id="volumes" className="scroll-mt-24">
        <SectionCard
          title="Planejado × Realizado — Volumes"
          subtitle="Por filial com planejamento válido — ordenado por volume realizado"
          delay={360}
        >
          <div className="h-64">
            {loadingFiliais ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="filial" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatInteger(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="planejadoVolumes" fill="#EC5B13" fillOpacity={0.3} name="Planejado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizadoVolumes" fill="#EC5B13" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* ADERÊNCIA POR FILIAL */}
      <section id="aderencia-filial" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Aderência de volumes por filial"
            subtitle={`% realizado vs planejado — meta: ${formatPercent(metaAderVolumes * 100, 0)}`}
            delay={420}
          >
            <div className="h-72">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : aderenciaFiliaisData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sem dados de aderência para o recorte.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={aderenciaFiliaisData}
                    layout="vertical"
                    margin={{ left: 8, right: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, Math.max(100, Math.ceil((aderenciaFiliaisData[0]?.aderenciaVolumes ?? 100) / 10) * 10)]}
                      tickFormatter={(v) => `${v}%`}
                      tick={TICK_STYLE}
                    />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Aderência volumes"]}
                    />
                    <ReferenceLine
                      x={metaAderVolumes * 100}
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      label={{ value: `Meta ${(metaAderVolumes * 100).toFixed(0)}%`, position: "insideTopRight", fill: "#10b981", fontSize: 10, fontWeight: 700 }}
                    />
                    <Bar dataKey="aderenciaVolumes" name="Aderência %" radius={[0, 4, 4, 0]} barSize={18}>
                      {aderenciaFiliaisData.map((entry) => (
                        <Cell
                          key={entry.filial}
                          fill={
                            (entry.aderenciaVolumes ?? 0) >= metaAderVolumes * 100
                              ? "#10b981"
                              : (entry.aderenciaVolumes ?? 0) >= metaAderVolumes * 100 * 0.9
                              ? "#f59e0b"
                              : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Aderência de pedidos por filial"
            subtitle="% de pedidos realizados em relação ao planejado"
            delay={460}
          >
            <div className="h-72">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.filter((f) => f.aderenciaPedidos != null).sort((a, b) => (b.aderenciaPedidos ?? 0) - (a.aderenciaPedidos ?? 0))}
                    layout="vertical"
                    margin={{ left: 8, right: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${v}%`}
                      tick={TICK_STYLE}
                    />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Aderência pedidos"]}
                    />
                    <Bar dataKey="aderenciaPedidos" name="Aderência pedidos %" fill="#522B8F" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      {/* SPR POR FILIAL */}
      <section id="spr-filial" className="scroll-mt-24">
        <SectionCard
          title="SPR por filial"
          subtitle={`Pedidos por rota — meta: ${metaSpr > 0 ? `${metaSpr.toFixed(1)} ped/rota` : "sem meta publicada"}`}
          delay={500}
        >
          <div className="h-80">
            {loadingFiliais ? (
              <LoadingSkeleton rows={6} />
            ) : sprData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem dados de SPR por filial para o recorte selecionado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sprData.slice(0, 14)}
                  layout="vertical"
                  margin={{ left: 8, right: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                  <XAxis type="number" tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [
                      `${v.toFixed(2)}`,
                      name === "sprPedidos" ? "Pedidos/rota" : "Volumes/rota",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  {metaSpr > 0 && (
                    <ReferenceLine
                      x={metaSpr}
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      label={{ value: `Meta ${metaSpr.toFixed(0)}`, position: "insideTopRight", fill: "#10b981", fontSize: 10, fontWeight: 700 }}
                    />
                  )}
                  <Bar dataKey="sprPedidos" name="SPR Pedidos" radius={[0, 4, 4, 0]} barSize={14}>
                    {sprData.slice(0, 14).map((entry) => (
                      <Cell
                        key={entry.filial}
                        fill={
                          metaSpr > 0
                            ? entry.sprPedidos >= metaSpr
                              ? "#10b981"
                              : entry.sprPedidos >= metaSpr * 0.85
                              ? "#f59e0b"
                              : "#ef4444"
                            : "#522B8F"
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="sprVolumes" name="SPR Volumes" fill="#EC5B13" fillOpacity={0.7} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* GAPS */}
      <section id="gaps" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Resumo numérico */}
          <SectionCard
            title="Resumo do recorte"
            subtitle="Totais planejados e realizados das filiais comparáveis"
            delay={560}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pedidos</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {formatInteger(totalRealizadoPedidos)}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Planejado {formatInteger(totalPlanejadoPedidos)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Volumes</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {formatInteger(totalRealizadoVolumes)}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Planejado {formatInteger(totalPlanejadoVolumes)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Gap volumes
                </p>
                <p
                  className="mt-4 text-2xl font-black tracking-tight"
                  style={{
                    color:
                      totalRealizadoVolumes - totalPlanejadoVolumes >= 0
                        ? "#10b981"
                        : "#ef4444",
                  }}
                >
                  {totalRealizadoVolumes - totalPlanejadoVolumes >= 0 ? "+" : ""}
                  {formatInteger(totalRealizadoVolumes - totalPlanejadoVolumes)}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Desvio total do plano de volumes
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Filiais comparáveis
                </p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {formatInteger(filiaisComparaveis.length)}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {filiaisSemPlanejamento > 0
                    ? `${filiaisSemPlanejamento} sem planejamento`
                    : "Todas com planejamento"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Gap visual por filial */}
          <SectionCard
            title="Gap de volumes por filial"
            subtitle="Desvio absoluto realizado vs planejado — verde = acima, vermelho = abaixo"
            delay={600}
          >
            <div className="h-72">
              {loadingFiliais ? (
                <LoadingSkeleton rows={5} />
              ) : maioresGaps.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sem dados de gap para o recorte selecionado.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={maioresGaps}
                    layout="vertical"
                    margin={{ left: 8, right: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="filial" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [
                        `${v >= 0 ? "+" : ""}${formatInteger(v)} vol.`,
                        "Gap volumes",
                      ]}
                    />
                    <ReferenceLine x={0} stroke="#667085" strokeWidth={1.5} />
                    <Bar dataKey="gapVolumes" name="Gap volumes" radius={[0, 4, 4, 0]} barSize={18}>
                      {maioresGaps.map((entry) => (
                        <Cell
                          key={entry.filial}
                          fill={entry.gapVolumes >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Ranking de gaps por filial — ícone de lista */}
        <SectionCard
          title="Ranking de gaps por filial"
          subtitle="SPR e desvio de volumes para priorização operacional"
          delay={660}
          className="mt-6"
        >
          {loadingFiliais ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Filial", "Ped. Plan.", "Ped. Real.", "Vol. Plan.", "Vol. Real.", "Gap Vol.", "Aderência Vol.", "SPR Ped."].map(
                      (h) => (
                        <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...chartData]
                    .sort((a, b) => Math.abs(b.gapVolumes) - Math.abs(a.gapVolumes))
                    .map((row) => (
                      <tr key={row.filial} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{row.filial}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.planejadoPedidos)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.realizadoPedidos)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.planejadoVolumes)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.realizadoVolumes)}</td>
                        <td
                          className="py-2.5 px-3 tabular-nums font-bold"
                          style={{ color: row.gapVolumes >= 0 ? "#10b981" : "#ef4444" }}
                        >
                          {row.gapVolumes >= 0 ? "+" : ""}
                          {formatInteger(row.gapVolumes)}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">
                          {row.aderenciaVolumes != null ? `${row.aderenciaVolumes.toFixed(1)}%` : "—"}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">
                          {sprData.find((s) => s.filial === row.filial)?.sprPedidos.toFixed(2) ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
