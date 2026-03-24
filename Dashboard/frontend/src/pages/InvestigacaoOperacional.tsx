import { AlertTriangle, Map, Route, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import KPICard from "@/components/dashboard/KPICard";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import { useAlertasContagem, useAlertas, useDrillRotas } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { formatInteger } from "@/lib/formatters";
import { TOOLTIP_STYLE, TICK_STYLE, GRID_STROKE, CHART_COLORS } from "@/lib/chartConfig";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "severidade", label: "Severidade" },
  { id: "alertas", label: "Alertas" },
  { id: "drill", label: "Drill" },
];

const STATUS_COLORS: Record<string, string> = {
  "Em Rota": "bg-primary/15 text-primary",
  "Finalizado": "bg-success/15 text-success",
  "Roteirizado": "bg-warning/15 text-warning",
};

export default function InvestigacaoOperacional() {
  const { filters, searchParams, setParam } = useGlobalFilters();
  const alertasPage = Math.max(1, parseInt(searchParams.get("alertasPage") || "1", 10) || 1);
  const drillPage = Math.max(1, parseInt(searchParams.get("drillPage") || "1", 10) || 1);
  const VALID_SORTS = ["data", "scoreOperacional", "pedidos", "volumes", "kmRealizado", "ocupacaoPeso", "entregaEfetiva"];
  const VALID_ORDERS = ["asc", "desc"];
  const sort = VALID_SORTS.includes(searchParams.get("drillSort") || "") ? searchParams.get("drillSort")! : "data";
  const order = VALID_ORDERS.includes(searchParams.get("drillOrder") || "") ? searchParams.get("drillOrder")! : "desc";
  const { data: contagem, isLoading: loadingContagem } = useAlertasContagem(filters);
  const { data: alertas, isLoading: loadingAlertas } = useAlertas({ page: alertasPage, limit: 20, filial: filters.filial, periodo: filters.periodo, transportador: filters.transportador, status: filters.status, prioridade: filters.prioridade, tipoVeiculo: filters.tipoVeiculo });
  const { data: rotas, isLoading: loadingRotas } = useDrillRotas({ page: drillPage, limit: 20, filial: filters.filial, transportador: filters.transportador, periodo: filters.periodo, status: filters.status, prioridade: filters.prioridade, tipoVeiculo: filters.tipoVeiculo, sort, order });

  const contCards = contagem ? [
    { label: "Não Planejadas", value: contagem.naoPlanejada, unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Sem Tempo", value: contagem.semTempo, unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
    { label: "Overtime", value: contagem.overtime, unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "danger" as const },
    { label: "Entrega Crítica", value: contagem.entregaCritica, unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "danger" as const },
    { label: "Match Crítico", value: contagem.matchCritico, unit: "rotas", trend: "neutral" as const, trendValue: undefined, status: "warning" as const },
    { label: "Total", value: contagem.total, unit: "alertas", trend: "neutral" as const, trendValue: undefined, status: "neutral" as const },
  ] : [];

  const alertaList = alertas?.data ?? [];
  const rotaList = rotas?.data ?? [];
  const topAlerta = alertaList[0];
  const rotaCritica = [...rotaList].sort((left, right) => left.scoreOperacional - right.scoreOperacional)[0];
  const topVolume = [...rotaList].sort((left, right) => right.volumes - left.volumes)[0];

  const heroHighlights = [
    {
      label: "Alertas totais",
      value: formatInteger(contagem?.total),
      detail: `${formatInteger(contagem?.entregaCritica)} entregas críticas e ${formatInteger(contagem?.overtime)} ocorrências de overtime`,
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      label: "Rota mais crítica",
      value: rotaCritica && rotaCritica.scoreOperacional > 0 ? rotaCritica.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
      detail: rotaCritica ? `${rotaCritica.rota} • ${rotaCritica.nomeFilial || rotaCritica.filial}` : "Sem rota no drill atual",
      icon: <ShieldAlert className="h-4 w-4" />,
    },
    {
      label: "Maior volume no drill",
      value: formatInteger(topVolume?.volumes),
      detail: topVolume ? `${topVolume.rota} • ${topVolume.transportador}` : "Sem rota no drill atual",
      icon: <Route className="h-4 w-4" />,
    },
    {
      label: "Primeiro alerta da fila",
      value: topAlerta?.statusRota ?? "Sem alerta",
      detail: topAlerta ? `${topAlerta.rota} • ${topAlerta.nomeFilial || topAlerta.filial}` : "Sem alerta no recorte",
      icon: <Map className="h-4 w-4" />,
    },
  ];

  const alertStatusLabel = (a: typeof alertaList[number]) => a.statusRota;
  const alertStatusColor = (a: typeof alertaList[number]) =>
    a.flagOvertime || a.flagEntregaCritica ? "bg-destructive/15 text-destructive"
      : a.flagNaoPlanejada ? "bg-warning/15 text-warning"
        : a.flagMatchCritico ? "bg-warning/15 text-warning"
          : a.flagSemTempo ? "bg-muted text-muted-foreground"
            : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Investigação operacional"
          title="Antecipe risco operacional organizando alertas e drill de rotas na mesma superfície analítica."
          description="A página agora começa com uma camada de síntese para apontar pressão, rotas críticas e volume em risco, antes de descer para a fila de alertas e para o drill detalhado."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {loadingContagem ? <LoadingSkeleton rows={2} /> : contCards.map((a, i) => (
            <KPICard key={a.label} data={a} delay={i * 60} />
          ))}
        </div>
      </section>

      <section id="severidade" className="scroll-mt-24">
        <SectionCard title="Distribuição por tipo de alerta" subtitle="Severidade dos alertas ativos no recorte" delay={300}>
          {loadingContagem ? <LoadingSkeleton rows={4} /> : (() => {
            const severityData = contagem ? [
              { tipo: "Overtime", valor: contagem.overtime, cor: CHART_COLORS.danger },
              { tipo: "Entrega Crítica", valor: contagem.entregaCritica, cor: CHART_COLORS.danger },
              { tipo: "Não Planejada", valor: contagem.naoPlanejada, cor: CHART_COLORS.warning },
              { tipo: "Match Crítico", valor: contagem.matchCritico, cor: CHART_COLORS.warning },
              { tipo: "Sem Tempo", valor: contagem.semTempo, cor: CHART_COLORS.muted },
            ].filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor) : [];
            return severityData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum alerta no recorte.</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={TICK_STYLE} />
                    <YAxis type="category" dataKey="tipo" width={110} tick={TICK_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="valor" name="Alertas" radius={[0, 4, 4, 0]} barSize={20}>
                      {severityData.map((entry) => (
                        <Cell key={entry.tipo} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </SectionCard>
      </section>

      <section id="alertas" className="scroll-mt-24">
        <SectionCard title="Alertas ativos" subtitle="Todos os alertas operacionais do período" delay={400}>
          {loadingAlertas ? <LoadingSkeleton rows={6} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Rota", "Filial", "Tipo", "Transportador", "Motorista", "Placa", "Data", "Prioridade"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertaList.map((a, idx) => (
                    <tr key={`${a.rota}-${idx}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold">{a.rota}</td>
                      <td className="py-2.5 px-3">{a.nomeFilial || a.filial}</td>
                      <td className="py-2.5 px-3"><StatusChip label={alertStatusLabel(a)} colorClass={alertStatusColor(a)} /></td>
                      <td className="py-2.5 px-3">{a.transportador}</td>
                      <td className="py-2.5 px-3">{a.motorista}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">{a.placa}</td>
                      <td className="py-2.5 px-3 tabular-nums">{a.data}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{a.prioridade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!alertas && alertas.pages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={alertasPage <= 1} onClick={() => setParam("alertasPage", String(alertasPage - 1))}>Anterior</button>
              <span className="text-sm font-semibold text-muted-foreground">Página {alertas.page} de {alertas.pages}</span>
              <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={alertasPage >= alertas.pages} onClick={() => setParam("alertasPage", String(alertasPage + 1))}>Próxima</button>
            </div>
          )}
        </SectionCard>
      </section>

      <section id="drill" className="scroll-mt-24">
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Leituras do drill" subtitle="Rotas que mais merecem aprofundamento imediato" delay={440}>
            {loadingRotas ? <LoadingSkeleton rows={4} /> : (
              <div className="space-y-3">
                {[
                  {
                    label: "Rota mais crítica por score",
                    value: rotaCritica && rotaCritica.scoreOperacional > 0 ? rotaCritica.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
                    detail: rotaCritica ? `${rotaCritica.rota} • ${rotaCritica.status}` : "Sem rota no recorte",
                  },
                  {
                    label: "Maior volume em rota",
                    value: formatInteger(topVolume?.volumes),
                    detail: topVolume ? `${topVolume.rota} • ${topVolume.transportador}` : "Sem rota no recorte",
                  },
                  {
                    label: "Entregas x insucessos",
                    value: `${formatInteger(rotaList.reduce((sum, item) => sum + item.entregas, 0))} / ${formatInteger(rotaList.reduce((sum, item) => sum + item.insucessos, 0))}`,
                    detail: "Entregas e insucessos somados da página atual do drill",
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

          <SectionCard title="Detalhe das rotas" subtitle="Todas as rotas com indicadores operacionais" delay={480}>
            <div className="flex items-center justify-end gap-2 mb-3">
              <select className="border rounded-md px-2 py-1 text-sm" value={sort} onChange={(event) => setParam("drillSort", event.target.value)}>
                <option value="data">Data</option>
                <option value="scoreOperacional">Score</option>
                <option value="pedidos">Pedidos</option>
                <option value="volumes">Volumes</option>
                <option value="kmRealizado">KM</option>
                <option value="ocupacaoPeso">Capacidade Peso</option>
              </select>
              <select className="border rounded-md px-2 py-1 text-sm" value={order} onChange={(event) => setParam("drillOrder", event.target.value)}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            {loadingRotas ? <LoadingSkeleton rows={6} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Rota", "Filial", "Status", "Ped.", "Vol.", "Entregas", "Insuc.", "KM", "Peso kg", "Cap. Peso", "Score"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rotaList.map(r => (
                      <tr key={r.rota} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{r.rota}</td>
                        <td className="py-2.5 px-3">{r.nomeFilial || r.filial}</td>
                        <td className="py-2.5 px-3"><StatusChip label={r.status} colorClass={STATUS_COLORS[r.status] ?? "bg-muted text-muted-foreground"} /></td>
                        <td className="py-2.5 px-3 tabular-nums">{r.pedidos}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.volumes}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.entregas}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.insucessos}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.kmRealizado}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.peso.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 px-3 tabular-nums">{r.ocupacaoPeso == null ? "—" : `${(r.ocupacaoPeso * 100).toFixed(1)}%`}</td>
                        <td className="py-2.5 px-3 font-bold tabular-nums">{r.scoreOperacional > 0 ? r.scoreOperacional.toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!!rotas && rotas.pages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={drillPage <= 1} onClick={() => setParam("drillPage", String(drillPage - 1))}>Anterior</button>
                <span className="text-sm font-semibold text-muted-foreground">Página {rotas.page} de {rotas.pages}</span>
                <button className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50" disabled={drillPage >= rotas.pages} onClick={() => setParam("drillPage", String(drillPage + 1))}>Próxima</button>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
