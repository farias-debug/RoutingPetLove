import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { temporalWindows, type TemporalWindow } from "@/lib/dashboardTemporal";

interface TemporalWindowTabsProps {
  value: TemporalWindow;
  onChange: (value: TemporalWindow) => void;
  className?: string;
}

export default function TemporalWindowTabs({ value, onChange, className }: TemporalWindowTabsProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-1", className)}>
      {temporalWindows.map((windowOption) => (
        <Button
          key={windowOption.value}
          type="button"
          size="sm"
          variant={value === windowOption.value ? "default" : "ghost"}
          onClick={() => onChange(windowOption.value)}
        >
          {windowOption.label}
        </Button>
      ))}
    </div>
  );
}
