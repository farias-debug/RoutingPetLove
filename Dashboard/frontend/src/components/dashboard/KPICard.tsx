import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIData } from "@/types/api";

interface KPICardProps {
  data: KPIData;
  delay?: number;
}

export default function KPICard({ data, delay = 0 }: KPICardProps) {
  const trendIcon = data.trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> :
    data.trend === "down" ? <TrendingDown className="h-3.5 w-3.5" /> :
      <Minus className="h-3.5 w-3.5" />;

  const trendColor = data.status === "success" ? "text-success" :
    data.status === "danger" ? "text-destructive" :
      data.status === "warning" ? "text-warning" :
        "text-muted-foreground";

  const trendBg = data.status === "success" ? "bg-success/10" :
    data.status === "danger" ? "bg-destructive/10" :
      data.status === "warning" ? "bg-warning/10" :
        "bg-muted";

  return (
    <div
      className="rounded-xl bg-card p-5 card-shadow-soft opacity-0 animate-fade-in-up flex flex-col justify-between min-h-[120px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3 leading-none">
        {data.label}
      </p>
      <div>
        <div className="flex items-baseline gap-1.5">
          <p className="text-[28px] font-extrabold tracking-tight text-foreground leading-none tabular-nums">
            {typeof data.value === "number" ? data.value.toLocaleString("pt-BR") : data.value}
          </p>
          {data.unit && (
            <span className="text-[12px] font-semibold text-muted-foreground">{data.unit}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          {data.meta != null ? (
            <p className="text-[11px] font-semibold text-muted-foreground">
              {data.metaLabel}: {data.meta.toLocaleString("pt-BR")}{data.unit}
            </p>
          ) : <span />}
          {data.trendValue && (
            <div className={`flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 ${trendColor} ${trendBg}`}>
              {trendIcon}
              {data.trendValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
