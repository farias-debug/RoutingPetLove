/**
 * Constantes compartilhadas de configuração de gráficos Recharts.
 * Importadas por todas as páginas — nunca duplique esses estilos inline.
 */

export const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: "none",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: 12,
  fontWeight: 600,
};

export const TICK_STYLE = { fontSize: 11, fontWeight: 600, fill: "#667085" } as const;

export const TICK_STYLE_SM = { fontSize: 10, fontWeight: 600, fill: "#667085" } as const;

export const LEGEND_STYLE: React.CSSProperties = { fontSize: 11, fontWeight: 700 };

export const GRID_STROKE = "hsl(220 13% 91%)";

/** Alturas padronizadas para gráficos Recharts */
export const CHART_HEIGHT = {
  sm: 192,    // 48 * 4 — mini charts, sparklines
  md: 256,    // 64 * 4 — padrão
  lg: 320,    // 80 * 4 — destaque
  xl: 400,    // 100 * 4 — hero/full width
} as const;

/** Paleta primária do dashboard — púrpura, laranja, teal e cinzas */
export const CHART_COLORS = {
  primary: "#522B8F",
  secondary: "#EC5B13",
  teal: "#0B7285",
  dark: "#092234",
  gold: "#F79009",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#667085",
  light: "#98A2B3",
  border: "#D0D5DD",
} as const;

/** Paleta sequencial para gráficos categóricos (pie, bar, etc.) - expandida para 12 cores */
export const CATEGORICAL_COLORS = [
  "#522B8F", // Púrpura primário
  "#6B3FB3", // Púrpura claro
  "#EC5B13", // Laranja primário
  "#F5913D", // Laranja claro
  "#0B7285", // Teal
  "#2E7D6F", // Verde teal
  "#D4531A", // Vermelho laranja
  "#8B5CF6", // Violeta
  "#667085", // Cinza médio
  "#98A2B3", // Cinza claro
  "#3B82F6", // Azul
  "#D0D5DD", // Cinza borda
] as const;

/** Cores semânticas de status para StatusChip e barras condicionais */
export const STATUS_COLORS = {
  ok: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
} as const;

/** Retorna cor de barra condicional baseada em threshold vs meta */
export function thresholdColor(value: number, meta: number): string {
  if (value >= meta) return CHART_COLORS.success;
  if (value >= meta * 0.85) return CHART_COLORS.warning;
  return CHART_COLORS.danger;
}
