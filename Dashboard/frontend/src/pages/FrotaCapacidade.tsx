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
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "capacidade", label: "Capacidade" },
  { id: "spr-filial", label: "SPR por filial" },
  { id: "aderencia-filial", label: "Aderência" },
  { id: "desvio-tempo", label: "Desvio de tempo" },
  { id: "mix", label: "Mix veicular" },
];

function ocuColor(pct: number, meta: number): string {
  if (pct >= meta * 100) return CHART_COLORS.success;
  if (pct >= meta * 100 * 0.85) return CHART_COLORS.warning;
  return CHART_COLORS.danger;
}

export default function FrotaCapacidade() {
  const { filters } = useGlobalFilters();
  const { data: kpi, isLoading: loadingKpi } = useKpiDiario(filters);
  const { data: ocupacao, isLoading: loadingOcupacao } = useOcupacaoTipoVeiculo(filters);
  const { data: filiais, isLoading: loadingFiliais } = useFilialPerformance(filters);

  const metaOcupacao = kpi?.metaOcupacaoPeso ?? 0.85;

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

  // SPR por filial — top 10
  const sprFiliaisData = (filiais ?? [])
    .filter((f) => f.rotas > 0)
    .sort((a, b) => b.sprPedidosReal - a.sprPedidosReal)
    .slice(0, 10)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      spr: +(f.sprPedidosReal ?? 0).toFixed(2),
      sprVolumes: +(f.sprVolumesReal ?? 0).toFixed(2),
      meta: f.metaSpr,
    }));
  const metaSpr = filiais?.[0]?.metaSpr ?? 0;

  // Aderência por filial — top 10 piores (menor aderência primeiro)
  const aderenciaFiliaisData = (filiais ?? [])
    .filter((f) => f.rotas > 0 && (f.aderenciaPedidos != null || f.aderenciaVolumes != null))
    .sort((a, b) => (a.aderenciaPedidos ?? 1) - (b.aderenciaPedidos ?? 1))
    .slice(0, 10)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      pedidos: f.aderenciaPedidos != null ? +(f.aderenciaPedidos * 100).toFixed(1) : null,
      volumes: f.aderenciaVolumes != null ? +(f.aderenciaVolumes * 100).toFixed(1) : null,
      km: f.aderenciaKm != null ? +(f.aderenciaKm * 100).toFixed(1) : null,
    }));

  // Desvio de tempo por filial — top 10 maiores desvios absolutos
  const desvioData = (filiais ?? [])
    .filter((f) => f.rotas > 0 && f.desvioTempoH != null)
    .sort((a, b) => Math.abs(b.desvioTempoH ?? 0) - Math.abs(a.desvioTempoH ?? 0))
    .slice(0, 10)
    .map((f) => ({
      filial: f.nomeFilial || f.filial,
      desvio: +(f.desvioTempoH ?? 0).toFixed(2),
      desvioPct: f.desvioTempoPct != null ? +(f.desvioTempoPct * 100).toFixed(1) : null,
    }));

  const chartDataComOcupacao = chartData.filter((item) => item.ocupacaoPeso != null);
  const maiorOcupacao = [...chartDataComOcupacao].sort((a, b) => (b.ocupacaoPeso ?? 0) - (a.ocupacaoPeso ?? 0))[0];
  const menorOcupacao = [...chartDataComOcupacao].sort((a, b) => (a.ocupacaoPeso ?? 0) - (b.ocupacaoPeso ?? 0))[0];

  const kpis = kpi
    ? [
      {
        label: "Veículos ativos",
        value: kpi.veiculosAtivos,
        unit: "veíc.",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "neutral" as const,
      },
      {
        label: "Ocupação peso",
        value: ocupacaoConsolidada == null ? "—" : +(ocupacaoConsolidada * 100).toFixed(1),
        unit: ocupacaoConsolidada == null ? "" : "%",
        meta: kpi.metaOcupacaoPeso != null ? kpi.metaOcupacaoPeso * 100 : undefined,
        metaLabel: "Meta",
        trend: "neutral" as const,
        trendValue: undefined,
        status:
          ocupacaoConsolidada != null && kpi.metaOcupacaoPeso != null && ocupacaoConsolidada >= kpi.metaOcupacaoPeso
            ? ("success" as const)
            : ("warning" as const),
      },
      {
        label: "Peso movimentado",
        value: formatInteger(totalPesoKg),
        unit: "kg",
        trend: "neutral" as const,
        trendValue: undefined,
        status: "neutral" as const,
      },
      {
        label: "Capacidade total",
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
      label: "Ocupação peso",
      value: formatPercent(ocupacaoConsolidada == null ? null : ocupacaoConsolidada * 100),
      detail: kpi?.metaOcupacaoPeso != null ? `Meta ${formatPercent(kpi.metaOcupacaoPeso * 100, 0)}` : "Sem meta publicada",
      icon: <Scale className="h-4 w-4" />,
    },
    {
      label: "Veículos ativos",
      value: formatInteger(kpi?.veiculosAtivos),
      detail: `${formatInteger(kpi?.motoristasAtivos)} motoristas`,
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: "Maior utilização",
      value: maiorOcupacao ? formatPercent(maiorOcupacao.ocupacaoPeso) : "—",
      detail: maiorOcupacao ? maiorOcupacao.tipo : "Sem dados",
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
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Frota e capacidade"
          title="Ocupação, mix veicular e SPR por filial no mesmo fluxo."
          description="Capacidade disponível, utilização por tipo de veículo e produtividade por filial."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loadingKpi ? (
            <LoadingSkeleton rows={2} />
          ) : (
            kpis.map((k, i) => <KPICard key={k.label} data={k} delay={i * 60} />)
          )}
        </div>
      </section>

      {/* CAPACIDADE — % utilizado vs ocioso */}
      <section id="capacidade" className="scroll-mt-24">
        <SectionCard
          title="Utilização por tipo de veículo"
          subtitle={`% de peso utilizado vs ocioso — meta: ${formatPercent(metaOcupacao * 100, 0)}`}
          delay={300}
        >
          <div className="h-64">
            {loadingOcupacao ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.filter((d) => d.ocupacaoPeso != null)} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="tipo" width={72} tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | null, name: string) => [v == null ? "—" : `${v.toFixed(1)}%`, name === "ocupacaoPeso" ? "Utilizado" : "Ocioso"]} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <ReferenceLine x={metaOcupacao * 100} stroke={CHART_COLORS.success} strokeWidth={2} strokeDasharray="5 3" label={{ value: "Meta", position: "insideTopRight", fill: CHART_COLORS.success, fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="ocupacaoPeso" name="Utilizado %" radius={[0, 4, 4, 0]} stackId="a" barSize={22}>
                    {chartData.filter((d) => d.ocupacaoPeso != null).map((entry) => (
                      <Cell key={entry.tipo} fill={ocuColor(entry.ocupacaoPeso ?? 0, metaOcupacao)} />
                    ))}
                  </Bar>
                  <Bar dataKey="ociosoPercent" name="Ocioso %" fill={CHART_COLORS.light} radius={[0, 4, 4, 0]} stackId="a" barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* SPR POR FILIAL */}
      <section id="spr-filial" className="scroll-mt-24">
        <SectionCard
          title="SPR por filial"
          subtitle={`Pedidos e volumes por rota — meta: ${metaSpr > 0 ? metaSpr.toFixed(1) : "—"} ped/rota`}
          delay={360}
        >
          <div className="h-72">
            {loadingFiliais ? (
              <LoadingSkeleton rows={5} />
            ) : sprFiliaisData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de SPR para o recorte.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprFiliaisData} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="filial" width={90} tick={TICK_STYLE_SM} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${v.toFixed(2)}`, name === "spr" ? "Pedidos/rota" : "Volumes/rota"]} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  {metaSpr > 0 && (
                    <ReferenceLine x={metaSpr} stroke={CHART_COLORS.success} strokeWidth={2} strokeDasharray="5 3" label={{ value: `Meta ${metaSpr.toFixed(0)}`, position: "insideTopRight", fill: CHART_COLORS.success, fontSize: 10, fontWeight: 700 }} />
                  )}
                  <Bar dataKey="spr" name="SPR pedidos" radius={[0, 4, 4, 0]} barSize={14}>
                    {sprFiliaisData.map((entry) => (
                      <Cell key={entry.filial} fill={metaSpr > 0 ? (entry.spr >= metaSpr ? CHART_COLORS.success : entry.spr >= metaSpr * 0.85 ? CHART_COLORS.warning : CHART_COLORS.danger) : CHART_COLORS.primary} />
                    ))}
                  </Bar>
                  <Bar dataKey="sprVolumes" name="SPR volumes" fill={CHART_COLORS.secondary} fillOpacity={0.7} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {/* ADERÊNCIA POR FILIAL */}
      <section id="aderencia-filial" className="scroll-mt-24">
        <SectionCard title="Aderência por filial" subtitle="% de aderência em pedidos, volumes e km — top 10 piores" delay={420}>
          {loadingFiliais ? <LoadingSkeleton rows={5} /> : aderenciaFiliaisData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de aderência para o recorte. Verifique se há planejamento cadastrado.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aderenciaFiliaisData} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`} tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="filial" width={95} tick={TICK_STYLE_SM} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | null) => v == null ? ["—", ""] : [`${(v as number).toFixed(1)}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <ReferenceLine x={100} stroke={CHART_COLORS.success} strokeDasharray="5 3" strokeWidth={1.5} label={{ value: "100%", position: "insideTopRight", fill: CHART_COLORS.success, fontSize: 10 }} />
                  <Bar dataKey="pedidos" name="Pedidos %" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} barSize={10} />
                  <Bar dataKey="volumes" name="Volumes %" fill={CHART_COLORS.secondary} radius={[0, 3, 3, 0]} barSize={10} />
                  <Bar dataKey="km" name="Km %" fill={CHART_COLORS.warning} radius={[0, 3, 3, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      {/* DESVIO DE TEMPO */}
      <section id="desvio-tempo" className="scroll-mt-24">
        <SectionCard title="Desvio de tempo por filial" subtitle="Diferença entre tempo realizado e planejado (h) — top 10" delay={460}>
          {loadingFiliais ? <LoadingSkeleton rows={5} /> : desvioData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de desvio de tempo para o recorte. Verifique se há planejamento de tempo cadastrado.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={desvioData} layout="vertical" margin={{ left: 8, right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}h`} tick={TICK_STYLE} />
                  <YAxis type="category" dataKey="filial" width={95} tick={TICK_STYLE_SM} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [
                      `${(v as number).toFixed(2)}h`,
                      name === "desvio" ? "Desvio (h)" : name,
                    ]}
                  />
                  <ReferenceLine x={0} stroke={CHART_COLORS.light} strokeWidth={1.5} />
                  <Bar dataKey="desvio" name="Desvio (h)" radius={[0, 4, 4, 0]} barSize={16}>
                    {desvioData.map((entry) => (
                      <Cell key={entry.filial} fill={entry.desvio > 0 ? CHART_COLORS.danger : CHART_COLORS.success} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </section>

      {/* MIX VEICULAR */}      <section id="mix" className="scroll-mt-24">
        <SectionCard title="Mix veicular" subtitle="Capacidade e produtividade por tipo" delay={420}>
          {loadingOcupacao ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Tipo", "Rotas", "Cap. (kg)", "Peso (kg)", "Utilização", "SPR", "ORH"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => {
                    const pct = row.ocupacaoPeso ?? 0;
                    const barColor = pct >= metaOcupacao * 100 ? CHART_COLORS.success : pct >= metaOcupacao * 100 * 0.85 ? CHART_COLORS.warning : CHART_COLORS.danger;
                    return (
                      <tr key={row.tipo} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{row.tipo}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.rotas)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.capacidadeKg)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatInteger(row.pesoKg)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                            </div>
                            <span className="tabular-nums text-xs font-bold" style={{ color: barColor }}>{formatPercent(row.ocupacaoPeso)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{(row.sprVeiculo ?? 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(row.orh ?? 0).toFixed(2)}h</td>
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
