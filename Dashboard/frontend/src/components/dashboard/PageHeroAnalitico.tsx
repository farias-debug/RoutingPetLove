import type { ReactNode } from "react";

interface HeroHighlight {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

interface PageHeroAnaliticoProps {
  eyebrow?: string;
  title: string;
  description: string;
  highlights: HeroHighlight[];
}

export default function PageHeroAnalitico({
  eyebrow = "Painel analítico",
  title,
  description,
  highlights,
}: PageHeroAnaliticoProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(9,34,52,0.98),rgba(13,83,88,0.9)_52%,rgba(247,144,9,0.14))] p-6 text-white shadow-[0_24px_80px_rgba(9,34,52,0.32)]">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{eyebrow}</p>
          <div>
            <h2 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/78">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white/72">
                {item.icon}
                <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{item.label}</span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-white">{item.value}</p>
              {item.detail ? <p className="mt-2 text-xs font-semibold text-white/65">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
