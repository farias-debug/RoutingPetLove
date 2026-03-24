import type { CockpitSerieDiaria } from "@/types/api";

export const temporalWindows = [
  { value: "7d", label: "7d" },
  { value: "14d", label: "14d" },
  { value: "30d", label: "30d" },
  { value: "mtd", label: "MTD" },
] as const;

export type TemporalWindow = (typeof temporalWindows)[number]["value"];

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}`;
}

export function sortDailySeries(series: CockpitSerieDiaria[] | undefined) {
  return [...(series ?? [])].sort((left, right) => left.data.localeCompare(right.data));
}

export function getSeriesExtremes(series: CockpitSerieDiaria[]) {
  return {
    latest: series.at(-1),
    previous: series.length > 1 ? series.at(-2) : undefined,
  };
}

export function getVariation(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null) {
    return { current: 0, previous: 0, delta: 0, direction: "neutral" as const, noData: true };
  }
  const safeCurrent = Number(current);
  const safePrevious = Number(previous ?? 0);
  const delta = safeCurrent - safePrevious;

  return {
    current: safeCurrent,
    previous: safePrevious,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
    noData: false,
  } as const;
}

export function sumMetric<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((sum, item) => sum + selector(item), 0);
}

export function getMetricDomain(values: number[], options?: { min?: number; max?: number; minimumSpan?: number; paddingRatio?: number }) {
  if (values.length === 0) {
    return [options?.min ?? 0, options?.max ?? 100];
  }

  const lowerBound = Math.min(...values);
  const upperBound = Math.max(...values);
  const span = Math.max(upperBound - lowerBound, options?.minimumSpan ?? 1);
  const padding = span * (options?.paddingRatio ?? 0.18);
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;

  return [
    Math.max(min, Number((lowerBound - padding).toFixed(1))),
    Math.min(max, Number((upperBound + padding).toFixed(1))),
  ];
}
