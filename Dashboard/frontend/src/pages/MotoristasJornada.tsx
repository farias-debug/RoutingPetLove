import { Clock3, Route, TrendingUp, UserRound } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, LineChart, Line, Legend } from "recharts";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useMotoristas, useMotoristasKpis, useCockpitSerieDiaria } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { formatInteger, formatDuration, formatDecimal, formatPercent } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, TICK_STYLE_SM, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "tendencia", label: "Tendência" },
  { id: "jornada", label: "Jornada" },
  { id: "overtime", label: "Overtime" },
  { id: "tabela", label: "Tabela" },
];

export default function MotoristasJornada() {
  const { filters, searchParams, setParam } = useGlobalFilters();
  const page = Math.max(1, parseInt(searchParams.get("motoristasPage") || "1", 10) || 1);
  const { data: kpis, isLoading: loadingKpis } = useMotoristasKpis(filters);
  const { data: serie, isLoading: loadingSerie } = useCockpitSerieDiaria("30d", filters);
  const { data: motoristas, isLoading: loadingList } = useMotoristas({ page, limit: 20, periodo: filters.periodo, filial: filters.filial, transportador: filters.transportador, tipoVeiculo: filters.tipoVeiculo });

  const kpiCards = kpis ? [
    { label: "Motoristas Ativos", value: kpis.motoristasAtivos, unit: "mot.", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Média Rotas/Dia", value: Number((kpis.mediaRotasDia ?? 0).toFixed(1)), unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Jornada Média", value: formatDuration(kpis.jornadaMedia), unit: "", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "DPPH", value: Number((kpis.dpph ?? 0).toFixed(2)), unit: "ent/h", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Vol./Motorista", value: Number((kpis.volumesPerMotorista ?? 0).toFixed(1)), unit: "vol.", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Efetividade Entrega", value: Number(((kpis.efetividadeMedia ?? 0) * 100).toFixed(1)), unit: "%", trend: "neutral" as const, trendValue: undefined, status: (kpis.efetividadeMedia ?? 0) >= 0.9 ? "success" as const : (kpis.efetividadeMedia ?? 0) >= 0.8 ? "warning" as const : "danger" as const },
  ] : [];

  const list = motoristas?.data ?? [];
  const overtimeList = list.filter((item) => item.flagOvertime);
  const orderedByJornada = [...list].sort((left, right) => (right.horasJornada ?? 0) - (left.horasJornada ?? 0));
  const orderedByScore = [...list].sort((left, right) => right.scoreOperacional - left.scoreOperacional);
  const topJornada = orderedByJornada[0];
  const topScore = orderedByScore[0];
  const totalEntregas = list.reduce((sum, item) => sum + item.entregas, 0);
  const totalInsucessos = list.reduce((sum, item) => sum + item.insucessos, 0);

  const heroHighlights = [
    {
      label: "Motoristas ativos",
      value: formatInteger(kpis?.motoristasAtivos),
      detail: `${formatInteger(totalEntregas)} entregas na página atual`,
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      label: "Jornada média",
      value: formatDuration(kpis?.jornadaMedia),
      detail: `${Number(kpis?.mediaRotasDia ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} rotas por dia`,
      icon: <Clock3 className="h-4 w-4" />,
    },
    {
      label: "Maior jornada",
      value: topJornada ? formatDuration(topJornada.horasJornada) : "0h 0min",
      detail: topJornada ? topJornada.motorista : "Sem motorista na página atual",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Melhor score",
      value: topScore && topScore.scoreOperacional > 0 ? topScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
      detail: topScore ? topScore.motorista : "Sem motorista na página atual",
      icon: <Route className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Motoristas e jornada"
          title="Organize jornada, produtividade e overtime em uma leitura operacional contínua."
          description="A página passa a combinar KPIs de jornada com priorização dos motoristas mais pressionados e uma tabela detalhada paginada, preparando a evolução futura para distribuições e séries históricas."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {loadingKpis ? <LoadingSkeleton rows={2} /> : kpiCards.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="tendencia" className="scroll-mt-24">
        <SectionCard title="Tendência operacional (30 dias)" subtitle="Efetividade de entrega (%) e score operacional" delay={265}>
          {loadingSerie ? <LoadingSkeleton rows={4} /> : !serie || serie.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de série histórica para o recorte.</p>
          ) : (() => {
            const serieData = serie.map((s) => ({
              data: s.data.slice(5),
              efetividade: s.entregasEfetivas != null ? +(s.entregasEfetivas * 100).toFixed(1) : null,
              score: s.scoreOperacional != null ? +s.scoreOperacional.toFixed(1) : null,
            }));
            return (
              <div className="h-80 xl:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serieData} margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="data" tick={TICK_STYLE_SM} interval="preserveStartEnd" />
                    <YAxis yAxisId="esq" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={TICK_STYLE_SM} />
                    <YAxis yAxisId="dir" orientation="right" domain={[0, 100]} tick={TICK_STYLE_SM} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, name: string) => [
                        name === "efetividade" ? `${v?.toFixed(1)}%` : v?.toFixed(1),
                        name === "efetividade" ? "Efetividade %" : "Score",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} formatter={(v) => v === "efetividade" ? "Efetividade %" : "Score"} />
                    <Line yAxisId="esq" type="monotone" dataKey="efetividade" name="efetividade" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} connectNulls />
                    <Line yAxisId="dir" type="monotone" dataKey="score" name="score" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </SectionCard>
      </section>

      <section id="jornada" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Jornada por motorista" subtitle="Top 10 motoristas por horas de jornada na página atual" delay={300}>
            {loadingList ? <LoadingSkeleton rows={5} /> : (() => {
              const barData = orderedByJornada.slice(0, 10).map((item) => ({
                motorista: (item.motorista ?? "Sem motorista").length > 18 ? (item.motorista ?? "Sem motorista").slice(0, 16) + "…" : (item.motorista ?? "Sem motorista"),
                horas: +((item.horasJornada ?? 0).toFixed(1)),
                rotas: item.qtdRotas,
                overtime: item.flagOvertime,
              })).filter((d) => d.horas > 0);
              const mediaJornada = kpis?.jornadaMedia ?? 0;
              return barData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de jornada registrados nesta página. Rotas do dia mais recente podem ainda estar em andamento.</p>
              ) : (
                <div className="h-80 xl:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                      <XAxis type="number" tick={TICK_STYLE} unit="h" />
                      <YAxis type="category" dataKey="motorista" width={110} tick={TICK_STYLE_SM} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number) => [`${v.toFixed(1)}h`, "Jornada"]}
                      />
                      {mediaJornada > 0 && (
                        <ReferenceLine x={mediaJornada} stroke={CHART_COLORS.warning} strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `Média ${formatDecimal(mediaJornada)}h`, fontSize: 10, fill: CHART_COLORS.warning, fontWeight: 700 }} />
                      )}
                      <Bar dataKey="horas" name="Jornada (h)" radius={[0, 4, 4, 0]} barSize={16}>
                        {barData.map((entry) => (
                          <Cell key={entry.motorista} fill={entry.overtime ? CHART_COLORS.danger : CHART_COLORS.primary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </SectionCard>

          <SectionCard title="Leituras de jornada" subtitle="Sinais rápidos da operação corrente" delay={340}>
            <div className="space-y-3">
              {[
                {
                  label: "Maior jornada da página",
                  value: topJornada ? formatDuration(topJornada.horasJornada) : "0h 0min",
                  detail: topJornada ? `${topJornada.motorista} • ${topJornada.nomeFilial || topJornada.filial}` : "Sem motorista na página atual",
                },
                {
                  label: "Motorista com melhor score",
                  value: topScore && topScore.scoreOperacional > 0 ? topScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
                  detail: topScore ? `${topScore.motorista} • ${topScore.transportador}` : "Sem motorista na página atual",
                },
                {
                  label: "Insucessos observados",
                  value: formatInteger(totalInsucessos),
                  detail: `${formatInteger(totalEntregas)} entregas consideradas na página atual`,
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
        </div>
      </section>

      <section id="overtime" className="scroll-mt-24">
        <SectionCard title="Motoristas em overtime" subtitle="Priorização operacional da página atual" delay={380}>
          {loadingList ? <LoadingSkeleton rows={5} /> : (
            overtimeList.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {overtimeList.slice(0, 6).map((item) => (
                  <div key={`${item.motorista}-${item.filial}-${item.transportador}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm font-bold text-foreground">{item.motorista}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{item.nomeFilial || item.filial} • {item.transportador}</p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatDuration(item.horasJornada)}</p>
                    <div className="mt-3 space-y-1 text-xs font-semibold text-muted-foreground">
                      <p>{item.qtdRotas} rotas</p>
                      <p>{item.entregas} entregas • {item.insucessos} insucessos</p>
                      <p>Score {item.scoreOperacional > 0 ? item.scoreOperacional.toFixed(1) : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm font-semibold text-muted-foreground">
                Nenhum motorista em overtime nesta página do recorte atual.
              </div>
            )
          )}
        </SectionCard>
      </section>

      <section id="tabela" className="scroll-mt-24">
        <SectionCard title="Jornada dos motoristas" subtitle="Visão operacional detalhada da página atual" delay={420}>
          {loadingList ? <LoadingSkeleton rows={6} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Motorista", "Filial", "Transportador", "Rotas Hoje", "Horas Jornada", "Overtime", "Entregas", "Insucessos", "Score"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(m => (
                    <tr key={`${m.motorista}-${m.filial}-${m.transportador}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold">{m.motorista}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{m.nomeFilial || m.filial}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{m.transportador}</td>
                      <td className="py-2.5 px-3 tabular-nums">{m.qtdRotas}</td>
                      <td className="py-2.5 px-3 tabular-nums">{(m.horasJornada ?? 0).toFixed(1)}h</td>
                      <td className="py-2.5 px-3">
                        <StatusChip
                          label={m.flagOvertime ? "Sim" : "Não"}
                          colorClass={m.flagOvertime ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}
                        />
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">{m.entregas}</td>
                      <td className="py-2.5 px-3 tabular-nums">{m.insucessos}</td>
                      <td className="py-2.5 px-3 font-bold tabular-nums">{m.scoreOperacional > 0 ? m.scoreOperacional.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!!motoristas && motoristas.pages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => setParam("motoristasPage", String(page - 1))}>Anterior</button>
              <span className="text-sm font-semibold text-muted-foreground">Página {motoristas.page} de {motoristas.pages}</span>
              <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={page >= motoristas.pages} onClick={() => setParam("motoristasPage", String(page + 1))}>Próxima</button>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
