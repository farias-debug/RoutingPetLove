import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}

export default function SectionCard({ title, subtitle, children, delay = 0 }: SectionCardProps) {
  return (
    <div
      className="rounded-xl bg-card card-shadow-soft p-5 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
