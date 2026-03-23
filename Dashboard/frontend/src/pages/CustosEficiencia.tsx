import { BarChart3, CircleDollarSign, Receipt, TrendingUp } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import PageHeroAnalitico from "@/components/dashboard/PageHeroAnalitico";
import PageSectionNav, { type PageSectionNavItem } from "@/components/dashboard/PageSectionNav";
import SectionCard from "@/components/dashboard/SectionCard";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import { useKpiDiario, useTransportadores } from "@/hooks/useApiData";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatInteger, formatMoney, formatPercent } from "@/lib/formatters";

const sections: PageSectionNavItem[] = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "concentracao", label: "Concentração" },
  { id: "detalhamento", label: "Detalhamento" },
];

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
          <div className="h-64">
            {loadingTransp ? <LoadingSkeleton rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={list}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="transportador" tick={{ fontSize: 10, fontWeight: 600, fill: "#667085" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: "#667085" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="custoMedioCarga" fill="#522B8F" name="R$/Carga" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
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
