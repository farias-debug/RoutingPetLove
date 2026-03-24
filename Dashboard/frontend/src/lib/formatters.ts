/**
 * Formatadores reutilizáveis do dashboard.
 * Importados por todas as páginas — nunca duplique essas funções em componentes.
 */

export function formatInteger(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Formato percentual partindo de fração 0-1 (multiplica por 100). */
export function formatPercentFrac(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return formatPercent(value * 100, digits);
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDuration(hours: number | null | undefined): string {
  if (hours == null) return "—";
  const totalMinutes = Math.round(Number(hours) * 60);
  const integerHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${integerHours}h ${minutes}min`;
}

export function formatSigned(value: number, formatter: (input: number) => string): string {
  const signal = value >= 0 ? "+" : "-";
  return `${signal}${formatter(Math.abs(value))}`;
}
