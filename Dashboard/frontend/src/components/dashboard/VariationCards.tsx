import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export interface VariationCardItem {
  label: string;
  value: string;
  detail: string;
  direction: "up" | "down" | "neutral";
}

interface VariationCardProps {
  items: VariationCardItem[];
  isLoading?: boolean;
}

const ICONS = { up: ArrowUpRight, down: ArrowDownRight, neutral: Minus } as const;
const TONES = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

export default function VariationCards({ items, isLoading }: VariationCardProps) {
  if (isLoading) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = ICONS[item.direction];
        const tone = TONES[item.direction];
        return (
          <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-4 card-shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
            <p className={`mt-2 text-xs font-semibold ${tone}`}>{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
