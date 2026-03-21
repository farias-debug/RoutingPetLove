import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import StatusChip from "@/components/dashboard/StatusChip";
import { useTransportadores } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { BarChart3, Building2, CircleDollarSign, TrendingUp } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#522B8F", "#6B3FB3", "#EC5B13", "#F5913D", "#667085", "#98A2B3", "#D0D5DD"];

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "concentracao", label: "Concentração" },
  { id: "ranking", label: "Ranking" },
  { id: "detalhe", label: "Detalhe" },
];

function formatInteger(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatPercent(value: number | null | undefined, digits = 1) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function formatMoney(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Transportadores() {
  const { filters } = useGlobalFilters();
  const { data: transportadores, isLoading } = useTransportadores(filters);

  const list = transportadores ?? [];
  const orderedByShare = [...list].sort((left, right) => right.share - left.share);
  const orderedByScore = [...list].sort((left, right) => right.scoreOperacional - left.scoreOperacional);
  const orderedByCost = [...list].sort((left, right) => right.custoMedioCarga - left.custoMedioCarga);
  const topShare = orderedByShare[0];
  const topScore = orderedByScore[0];
  const topCost = orderedByCost[0];
  const parceirosAtivos = list.length;
  const top3Share = orderedByShare.slice(0, 3).reduce((sum, item) => sum + item.share, 0);

  const pieData = list.map(t => ({
    transportador: t.transportador,
    share: +(t.share * 100).toFixed(1),
  }));

  const heroHighlights = [
    {
      label: "Parceiros ativos",
      value: formatInteger(parceirosAtivos),
      detail: "Transportadores presentes no recorte filtrado",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "Maior share",
      value: topShare ? formatPercent(topShare.share * 100) : "0,0%",
      detail: topShare ? topShare.transportador : "Sem transportador no recorte",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Maior custo por carga",
      value: formatMoney(topCost?.custoMedioCarga),
      detail: topCost ? topCost.transportador : "Sem transportador no recorte",
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Melhor score",
      value: topScore ? topScore.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0",
      detail: topScore ? topScore.transportador : "Sem transportador no recorte",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section id="visao-geral" className="scroll-mt-24 space-y-6">
        <PageHeroAnalitico
          eyebrow="Transportadores"
          title="Leia concentração, custo e performance de parceiros em uma única superfície analítica."
          description="A aba passa a organizar a concentração da operação por parceiro, destacando onde o risco está mais concentrado e quais transportadores sustentam ou deterioram a performance do recorte atual."
          highlights={heroHighlights}
        />

        <PageSectionNav sections={sections} />

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard title="Leituras prioritárias" subtitle="Sinais que resumem a carteira atual de parceiros" delay={100}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Concentração top 3</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatPercent(top3Share * 100)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Participação acumulada dos três maiores parceiros</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Maior custo</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatMoney(topCost?.custoMedioCarga)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topCost?.transportador ?? "Sem dados no recorte"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Melhor entrega efetiva</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {topScore ? formatPercent(topScore.entregasEfetivas * 100) : "0,0%"}
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topScore?.transportador ?? "Sem dados no recorte"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Rotas do líder de share</p>
                <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{formatInteger(topShare?.rotas)}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">{topShare?.transportador ?? "Sem dados no recorte"}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Resumo da carteira" subtitle="Participação, volume e priorização por parceiro" delay={140}>
            {isLoading ? <LoadingSkeleton rows={5} /> : (
              <div className="space-y-3">
                {orderedByShare.slice(0, 5).map((item) => (
                  <div key={item.transportador} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.transportador}</p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatInteger(item.rotas)} rotas no recorte</p>
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
        <SectionCard title="Share dos Transportadores" subtitle="Participação % nas rotas" delay={180}>
          <div className="h-64">
            {isLoading ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="share"
                    nameKey="transportador"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    strokeWidth={2}
                    stroke="hsl(0 0% 100%)"
                    label={({ transportador, share }) => `${transportador} ${share}%`}
                    labelLine={{ stroke: "#98A2B3", strokeWidth: 1 }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <section id="ranking" className="scroll-mt-24">
        <SectionCard title="Ranking de Transportadores" subtitle="Score, custo e participação operacional" delay={220}>
          {isLoading ? <LoadingSkeleton rows={6} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Transportador", "Rotas", "Share", "Entregas %", "Custo/Carga", "Score"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedByScore.map(t => {
                    const pctEntregas = +(t.entregasEfetivas * 100).toFixed(1);
                    return (
                      <tr key={t.transportador} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold">{t.transportador}</td>
                        <td className="py-2.5 px-3 tabular-nums">{t.rotas}</td>
                        <td className="py-2.5 px-3 tabular-nums">{(t.share * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3">
                          <StatusChip
                            label={`${pctEntregas}%`}
                            colorClass={pctEntregas >= 95 ? "bg-success/15 text-success" : pctEntregas >= 93 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}
                          />
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">R$ {t.custoMedioCarga.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 font-bold tabular-nums">
                          <StatusChip label={t.scoreOperacional.toFixed(1)} colorClass={t.status === "OK" ? "bg-success/15 text-success" : t.status === "Atenção" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"} />
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

      <section id="detalhe" className="scroll-mt-24">
        <SectionCard title="Detalhamento de custo e entrega" subtitle="Leitura complementar para identificar concentração com risco operacional" delay={260}>
          {isLoading ? <LoadingSkeleton rows={5} /> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {orderedByCost.slice(0, 6).map((item) => (
                <div key={item.transportador} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-bold text-foreground">{item.transportador}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{formatMoney(item.custoMedioCarga)}</p>
                  <div className="mt-3 space-y-1 text-xs font-semibold text-muted-foreground">
                    <p>Share {formatPercent(item.share * 100)}</p>
                    <p>Entregas {formatPercent(item.entregasEfetivas * 100)}</p>
                    <p>Score {item.scoreOperacional.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
