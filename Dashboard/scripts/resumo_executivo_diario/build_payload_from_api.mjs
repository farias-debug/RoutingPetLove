import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  asNumber,
  buildQuery,
  defaultOutDir,
  deliveryTone,
  ensureDir,
  formatCurrency,
  formatDateBr,
  formatDecimal,
  formatInteger,
  formatPercentFraction,
  parseArgs,
  scoreTone,
  writeJson,
} from "./shared.mjs";

const LAST_DAY_LABEL = "vs ultimo dia comparavel";

async function fetchJson(baseUrl, endpoint, params = {}) {
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint}${buildQuery(params)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao consultar ${url}: ${response.status} ${body}`);
  }

  return response.json();
}

function shiftIsoDate(dateText, dayOffset) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function formatSignedNumber(value, formatter, suffix = "") {
  const numeric = asNumber(value);
  if (numeric == null) return "";
  const signal = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  const formatted = formatter(Math.abs(numeric));
  return `${signal}${formatted}${suffix}`;
}

function formatDeltaText(value, kind) {
  const numeric = asNumber(value);
  if (numeric == null) return "";

  if (kind === "pp") {
    return `${LAST_DAY_LABEL} ${formatSignedNumber(numeric * 100, (current) => formatDecimal(current, 1), " pp")}`;
  }

  if (kind === "pts") {
    return `${LAST_DAY_LABEL} ${formatSignedNumber(numeric, (current) => formatDecimal(current, 1), " pts")}`;
  }

  if (kind === "decimal") {
    return `${LAST_DAY_LABEL} ${formatSignedNumber(numeric, (current) => formatDecimal(current, 1))}`;
  }

  return `${LAST_DAY_LABEL} ${formatSignedNumber(numeric, (current) => formatInteger(current))}`;
}

function percentOf(total, fractionDigits = 0) {
  const numeric = asNumber(total);
  if (numeric == null) return "n/d";
  return formatPercentFraction(numeric, fractionDigits);
}

function computeDelta(currentValue, previousValue) {
  const current = asNumber(currentValue);
  const previous = asNumber(previousValue);
  if (current == null || previous == null) return null;
  return current - previous;
}

function computeRatio(currentValue, totalValue) {
  const current = asNumber(currentValue);
  const total = asNumber(totalValue);
  if (current == null || total == null || total <= 0) return null;
  return current / total;
}

function trendTone(deltaValue, options = {}) {
  const {
    positiveThreshold = 0.5,
    negativeThreshold = -0.5,
  } = options;
  const numeric = asNumber(deltaValue);
  if (numeric == null) return "neutral";
  if (numeric >= positiveThreshold) return "success";
  if (numeric <= negativeThreshold) return "danger";
  return "neutral";
}

function criticalAlertCount(alertas) {
  return (alertas?.entregaCritica ?? 0) + (alertas?.overtime ?? 0);
}

function buildComparisonFilters(filters, currentDate) {
  return {
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
    periodo: `${shiftIsoDate(currentDate, -14)},${currentDate}`,
  };
}

async function resolveComparisonData(baseUrl, filters, currentDate) {
  if (!currentDate) {
    return {
      previousDate: null,
      previousKpi: null,
      previousAlertas: null,
    };
  }

  const series = await fetchJson(baseUrl, "/api/executivo/serie-diaria", buildComparisonFilters(filters, currentDate));
  const previousDate = [...series]
    .map((entry) => entry?.data)
    .filter((entry) => entry && entry < currentDate)
    .sort((left, right) => right.localeCompare(left))[0] || null;

  if (!previousDate) {
    return {
      previousDate: null,
      previousKpi: null,
      previousAlertas: null,
    };
  }

  const exactFilters = {
    filial: filters.filial,
    transportador: filters.transportador,
    tipoVeiculo: filters.tipoVeiculo,
    status: filters.status,
    periodo: previousDate,
  };

  const [previousKpi, previousAlertas] = await Promise.all([
    fetchJson(baseUrl, "/api/kpi-diario", exactFilters),
    fetchJson(baseUrl, "/api/alertas/contagem", exactFilters),
  ]);

  return {
    previousDate,
    previousKpi,
    previousAlertas,
  };
}

function buildGapVsMetaText(realValue, metaValue) {
  const real = asNumber(realValue);
  const meta = asNumber(metaValue);
  if (real == null || meta == null) return "Meta de SPR indisponivel";
  const delta = real - meta;
  return `Meta ${formatDecimal(meta, 1)} | gap ${formatSignedNumber(delta, (current) => formatDecimal(current, 1))}`;
}

function buildLeaderboardEntries(filiais, direction) {
  const sorted = [...filiais]
    .filter((item) => asNumber(item?.sprVolumesReal) != null && (item?.sprVolumesReal ?? 0) > 0)
    .sort((left, right) => direction === "desc"
      ? (right.sprVolumesReal ?? 0) - (left.sprVolumesReal ?? 0)
      : (left.sprVolumesReal ?? 0) - (right.sprVolumesReal ?? 0))
    .slice(0, 3);

  return sorted.map((item, index) => ({
    rank: index + 1,
    filial: item.nomeFilial || item.filial || "Filial sem nome",
    value: formatDecimal(item.sprVolumesReal, 1),
    detail: buildGapVsMetaText(item.sprVolumesReal, item.metaSprVolumes),
    supportingText: `Score ${formatDecimal(item.scoreOperacional, 1)} | ${formatInteger(item.rotas)} rotas`,
    tone: direction === "desc" ? "success" : "danger",
    source: "/api/filiais/performance",
  }));
}

function buildSprLeaderboard(filiais) {
  return {
    title: "Top 3 filiais por SPR volumes",
    subtitle: "Leitura direta de densidade por rota no ultimo fechamento comparavel.",
    best: buildLeaderboardEntries(filiais, "desc"),
    worst: buildLeaderboardEntries(filiais, "asc"),
    source: "/api/filiais/performance",
  };
}

function pickFocus(filiais) {
  if (!Array.isArray(filiais) || filiais.length === 0) {
    return {
      title: "Foco do dia",
      entity: "Sem entidade critica",
      reason: "Nao houve dados suficientes para eleger um foco do dia.",
      impact: "Sem leitura de impacto consolidada.",
      action: "Abrir dashboard para revisar o recorte atual.",
      source: "/api/filiais/performance",
    };
  }

  const ordered = [...filiais].sort((left, right) => {
    const scoreDiff = (left.scoreOperacional ?? 0) - (right.scoreOperacional ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    const sprGapLeft = (left.sprVolumesReal ?? 0) - (left.metaSprVolumes ?? 0);
    const sprGapRight = (right.sprVolumesReal ?? 0) - (right.metaSprVolumes ?? 0);
    return sprGapLeft - sprGapRight;
  });

  const worst = ordered[0];
  const entity = worst.nomeFilial || worst.filial || "Filial sem nome";
  const score = formatDecimal(worst.scoreOperacional, 1);
  const entrega = worst.entregasEfetivas == null ? "n/d" : formatPercentFraction(worst.entregasEfetivas, 1);
  const spr = formatDecimal(worst.sprVolumesReal, 1);
  const gapText = buildGapVsMetaText(worst.sprVolumesReal, worst.metaSprVolumes);

  return {
    title: "Foco do dia",
    entity,
    reason: `score operacional em ${score}, entrega efetiva de ${entrega} e SPR volumes em ${spr}`,
    impact: gapText,
    action: `Abrir o dashboard e revisar priorizacao, capacidade e fila critica de ${entity}.`,
    source: "/api/filiais/performance",
  };
}

function buildNorthStarKpis(kpiDiario, previousKpi, alertas, previousAlertas) {
  const alertasCriticos = criticalAlertCount(alertas);
  const previousCriticos = previousAlertas ? criticalAlertCount(previousAlertas) : null;

  return [
    {
      id: "score_operacional",
      label: "Score operacional",
      value: formatDecimal(kpiDiario.scoreOperacional, 1),
      detail: `SPR volumes ${formatDecimal(kpiDiario.sprVolumes, 1)}`,
      deltaText: formatDeltaText(computeDelta(kpiDiario.scoreOperacional, previousKpi?.scoreOperacional), "pts"),
      status: scoreTone(kpiDiario.scoreOperacional),
      source: "/api/kpi-diario",
    },
    {
      id: "entrega_efetiva",
      label: "Entrega efetiva",
      value: formatPercentFraction(kpiDiario.pctEntregasEfetivas, 1),
      detail: `${formatInteger(kpiDiario.entregas)} entregas concluidas`,
      deltaText: formatDeltaText(computeDelta(kpiDiario.pctEntregasEfetivas, previousKpi?.pctEntregasEfetivas), "pp"),
      status: deliveryTone(kpiDiario.pctEntregasEfetivas),
      source: "/api/kpi-diario",
    },
    {
      id: "spr_volumes",
      label: "SPR volumes",
      value: formatDecimal(kpiDiario.sprVolumes, 1),
      detail: `${formatInteger(kpiDiario.volumes)} volumes em ${formatInteger(kpiDiario.rotas)} rotas`,
      deltaText: formatDeltaText(computeDelta(kpiDiario.sprVolumes, previousKpi?.sprVolumes), "decimal"),
      status: trendTone(computeDelta(kpiDiario.sprVolumes, previousKpi?.sprVolumes)),
      source: "/api/kpi-diario",
    },
    {
      id: "alertas_criticos",
      label: "Alertas criticos",
      value: formatInteger(alertasCriticos),
      detail: `${formatInteger(alertas.entregaCritica)} entrega critica + ${formatInteger(alertas.overtime)} overtime`,
      deltaText: formatDeltaText(computeDelta(alertasCriticos, previousCriticos), "int"),
      status: alertasCriticos > 0 ? "danger" : "success",
      source: "/api/alertas/contagem",
    },
  ];
}

function buildRouteSnapshot(kpiDiario, previousKpi) {
  const plannedRoutes = kpiDiario.rotasPlanejadas ?? Math.max((kpiDiario.rotas ?? 0) - (kpiDiario.qtdNaoPlanejada ?? 0), 0);
  const concludedRoutes = kpiDiario.rotasConcluidas ?? 0;
  const inTransitRoutes = Math.max((kpiDiario.rotas ?? 0) - concludedRoutes, 0);

  const previousPlanned = previousKpi?.rotasPlanejadas ?? null;
  const previousConcluded = previousKpi?.rotasConcluidas ?? null;
  const previousInTransit = previousKpi == null ? null : Math.max((previousKpi.rotas ?? 0) - (previousKpi.rotasConcluidas ?? 0), 0);

  return [
    {
      id: "rotas_planejadas",
      label: "Rotas planejadas",
      value: formatInteger(plannedRoutes),
      detail: `${percentOf(computeRatio(plannedRoutes, kpiDiario.rotas), 0)} do total do dia`,
      deltaText: formatDeltaText(computeDelta(plannedRoutes, previousPlanned), "int"),
      status: "neutral",
      source: "/api/kpi-diario",
    },
    {
      id: "rotas_em_transito",
      label: "Rotas em transito",
      value: formatInteger(inTransitRoutes),
      detail: `${percentOf(computeRatio(inTransitRoutes, kpiDiario.rotas), 0)} ainda abertas`,
      deltaText: formatDeltaText(computeDelta(inTransitRoutes, previousInTransit), "int"),
      status: inTransitRoutes > Math.max((kpiDiario.rotas ?? 0) * 0.2, 10) ? "warning" : "neutral",
      source: "/api/kpi-diario",
    },
    {
      id: "rotas_concluidas",
      label: "Rotas concluidas",
      value: formatInteger(concludedRoutes),
      detail: `${formatPercentFraction(kpiDiario.pctRotasConcluidas, 1)} do dia encerrado`,
      deltaText: formatDeltaText(computeDelta(concludedRoutes, previousConcluded), "int"),
      status: deliveryTone(kpiDiario.pctRotasConcluidas),
      source: "/api/kpi-diario",
    },
  ];
}

function buildIntro(kpiDiario, routeSnapshot, focusOfDay) {
  const plannedRoutes = routeSnapshot.find((item) => item.id === "rotas_planejadas")?.value || "n/d";
  const inTransitRoutes = routeSnapshot.find((item) => item.id === "rotas_em_transito")?.value || "n/d";
  const score = formatDecimal(kpiDiario.scoreOperacional, 1);
  const entrega = formatPercentFraction(kpiDiario.pctEntregasEfetivas, 1);

  return `O fechamento comparavel do dia trouxe score operacional de ${score}, entrega efetiva de ${entrega}, ${plannedRoutes} rotas planejadas e ${inTransitRoutes} rotas ainda em transito. O principal ponto de atencao segue concentrado em ${focusOfDay.entity}.`;
}

export async function buildPayloadFromApi({
  baseUrl = "http://localhost:3001",
  filters = {},
} = {}) {
  const [kpiDiario, alertas, filiais] = await Promise.all([
    fetchJson(baseUrl, "/api/kpi-diario", filters),
    fetchJson(baseUrl, "/api/alertas/contagem", filters),
    fetchJson(baseUrl, "/api/filiais/performance", filters),
  ]);

  const { previousDate, previousKpi, previousAlertas } = await resolveComparisonData(baseUrl, filters, kpiDiario.data);

  const focusOfDay = pickFocus(filiais);
  const routeSnapshot = buildRouteSnapshot(kpiDiario, previousKpi);
  const asOfDate = kpiDiario.data;
  const dayLabel = formatDateBr(asOfDate);
  const comparisonLabel = previousDate ? formatDateBr(previousDate) : "sem base D-1";

  return {
    asOfDate,
    title: "Resumo Executivo Diario",
    subtitle: `Fechamento operacional de ${dayLabel}`,
    northStarKpis: buildNorthStarKpis(kpiDiario, previousKpi, alertas, previousAlertas),
    routeSnapshot,
    riskChips: [
      {
        id: "overtime",
        label: "Overtime",
        value: formatInteger(alertas.overtime),
        tone: (alertas.overtime ?? 0) > 0 ? "danger" : "neutral",
        source: "/api/alertas/contagem",
      },
      {
        id: "nao_planejada",
        label: "Nao planejadas",
        value: formatInteger(alertas.naoPlanejada),
        tone: (alertas.naoPlanejada ?? 0) > 0 ? "warning" : "neutral",
        source: "/api/alertas/contagem",
      },
      {
        id: "entrega_critica",
        label: "Entrega critica",
        value: formatInteger(alertas.entregaCritica),
        tone: (alertas.entregaCritica ?? 0) > 0 ? "danger" : "neutral",
        source: "/api/alertas/contagem",
      },
    ],
    sprLeaderboard: buildSprLeaderboard(filiais),
    focusOfDay,
    cta: {
      label: "Abrir dashboard",
      url: "https://data-aileron-482822-d0.web.app/",
    },
    email: {
      subject: `Resumo Executivo Diario - ${dayLabel}`,
      preheader: "Score, SPR, rotas planejadas, transito e top 3 filiais do dia",
      intro: buildIntro(kpiDiario, routeSnapshot, focusOfDay),
      comparisonLabel: previousDate ? `Comparacao D-1: ${comparisonLabel}` : "Comparacao D-1 indisponivel",
      footerNote: `Base comparavel ate ${dayLabel}. Ultimo dia comparavel usado nas variacoes: ${comparisonLabel}. Custo medio por carga: ${formatCurrency(kpiDiario.custoMedioCarga)}.`,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filters = {
    periodo: args.periodo,
    filial: args.filial,
    transportador: args.transportador,
    tipoVeiculo: args.tipoVeiculo,
    status: args.status,
  };

  const payload = await buildPayloadFromApi({
    baseUrl: args["base-url"] || "http://localhost:3001",
    filters,
  });

  const outDir = args.outdir ? path.resolve(args.outdir) : defaultOutDir;
  await ensureDir(outDir);

  const outFile = args.out || path.join(outDir, "payload.api.json");
  await writeJson(outFile, payload);

  console.log(`Payload gerado em ${outFile}`);
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
