import { Clock3, Route, TrendingUp, UserRound } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useMotoristas, useMotoristasKpis } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { formatInteger, formatDuration } from "@/lib/formatters";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "jornada", label: "Jornada" },
  { id: "overtime", label: "Overtime" },
  { id: "tabela", label: "Tabela" },
];

export default function MotoristasJornada() {
  const { filters, searchParams, setParam } = useGlobalFilters();
  const page = Number(searchParams.get("motoristasPage") || "1");
  const { data: kpis, isLoading: loadingKpis } = useMotoristasKpis(filters);
  const { data: motoristas, isLoading: loadingList } = useMotoristas({ page, limit: 20, periodo: filters.periodo, filial: filters.filial, transportador: filters.transportador, tipoVeiculo: filters.tipoVeiculo });

  const kpiCards = kpis ? [
    { label: "Motoristas Ativos", value: kpis.motoristasAtivos, unit: "mot.", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
    { label: "Média Rotas/Dia", value: Number(kpis.mediaRotasDia.toFixed(1)), unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Jornada Média", value: formatDuration(kpis.jornadaMedia), unit: "", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "DPPH", value: Number((kpis.dpph ?? 0).toFixed(2)), unit: "ent/h", trend: "neutral" as const, trendValue: undefined, status: "success" as const },
  ] : [];

  const list = motoristas?.data ?? [];
  const overtimeList = list.filter((item) => item.flagOvertime);
  const orderedByJornada = [...list].sort((left, right) => right.horasJornada - left.horasJornada);
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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loadingKpis ? <LoadingSkeleton rows={2} /> : kpiCards.map((kpi, i) => (
            <KPICard key={kpi.label} data={kpi} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="jornada" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Leituras de jornada" subtitle="Sinais rápidos da operação corrente" delay={300}>
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

          <SectionCard title="Jornada por motorista" subtitle="Comparação rápida entre jornada e volume de rotas na página atual" delay={340}>
            {loadingList ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {orderedByJornada.slice(0, 6).map((item) => {
                  const width = Math.min(100, (item.horasJornada / Math.max(topJornada?.horasJornada ?? 1, 1)) * 100);
                  return (
                    <div key={`${item.motorista}-${item.filial}-${item.transportador}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                        <span>{item.motorista}</span>
                        <span className="text-muted-foreground">{item.horasJornada.toFixed(1)}h • {item.qtdRotas} rotas</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                      <td className="py-2.5 px-3 tabular-nums">{m.horasJornada.toFixed(1)}h</td>
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
