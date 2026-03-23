// helpers.js — Utilitários, formatadores e construtores de filtro
// Dashboard Logístico API

export const bqNormalizeText = "`data-aileron-482822-d0.monitoramento_carga.normalize_text`";
export const DASHBOARD_VEHICLE_SCOPE = ["Utilitario", "Passeio", "Van"];

export function toSnakeLabel(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeEntityKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const LOWERCASE_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "para", "por", "a", "o", "no", "na", "ao"]);

export function normalizeEntityLabel(value, fallback = "") {
  const cleaned = String(value || fallback || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  // Se for um código curto (ex: "SP01", "RJ/02"), manter como está
  if (/^[A-Z0-9\/.\-]{2,10}$/.test(cleaned)) return cleaned;
  return cleaned
    .split(" ")
    .map((part, idx) => {
      if (!part) return part;
      const lower = part.toLowerCase();
      // Preposições e artigos em minúsculo (exceto primeira palavra)
      if (idx > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      // Siglas curtas (2-4 letras maiúsculas ou com números) -> manter
      if (/^[A-Z0-9]{2,4}$/.test(part)) return part;
      // Title case
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function uniqueOptions(rows, mapValue, mapLabel) {
  const seen = new Set();
  return rows.flatMap((row) => {
    const value = mapValue(row);
    if (!value || seen.has(value)) return [];
    seen.add(value);
    return [{ value, label: mapLabel(row, value) }];
  });
}

export function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critico") return "Crítico";
  if (normalized === "atencao") return "Atenção";
  if (normalized === "ok") return "OK";
  return value || "OK";
}

export function colorHex(value, fallback = "#6A7282") {
  const hex = String(value || "").replace(/^#/, "").trim();
  return hex ? `#${hex}` : fallback;
}

export function formatDate(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "value" in value) {
    return String(value.value).slice(0, 10);
  }
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function computeRatioOrNull(numeratorValue, denominatorValue) {
  const numerator = toNumberOrNull(numeratorValue);
  const denominator = toNumberOrNull(denominatorValue);
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

export function mapMetaKpiId(value) {
  const normalized = toSnakeLabel(value);
  const lookup = {
    spr_pedidos: "spr_pedidos",
    spr_volumes: "spr_volumes",
    orh_tempo_rota: "orh",
    entregas_efetivas: "entregas_efetivas",
    rotas_concluidas: "rotas_concluidas",
    ocupacao_composta: "ocupacao_composta",
    aderencia_volumes: "aderencia_volumes",
    custo_medio_carga: "custo_por_carga",
    custo_por_carga: "custo_por_carga",
    dpph: "dpph",
  };
  return lookup[normalized] || normalized;
}

export function parsePeriodo(periodo) {
  if (!periodo) return null;
  if (periodo.includes(",")) {
    const [startDate, endDate] = periodo.split(",").map((value) => value.trim());
    if (startDate && endDate) {
      return { startDate, endDate };
    }
  }
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    return { monthKey: periodo };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    return { startDate: periodo, endDate: periodo };
  }
  return null;
}

export function formatIsoDateUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function resolveJanelaPeriodo(janela) {
  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startDate = new Date(endDate);
  const normalized = String(janela || "30d").trim().toLowerCase();

  if (normalized === "7d") {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
  } else if (normalized === "14d") {
    startDate.setUTCDate(startDate.getUTCDate() - 13);
  } else if (normalized === "mtd") {
    startDate.setUTCDate(1);
  } else if (normalized === "ytd") {
    startDate.setUTCMonth(0, 1);
  } else {
    startDate.setUTCDate(startDate.getUTCDate() - 29);
  }

  return {
    startDate: formatIsoDateUtc(startDate),
    endDate: formatIsoDateUtc(endDate),
  };
}

/**
 * Retorna o mês atual como default quando nenhum filtro temporal é enviado.
 * Garante que queries nunca rodem contra toda a base histórica.
 */
export function resolveDefaultPeriodo() {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function buildDateFilter(fieldName, periodo, params) {
  const parsed = parsePeriodo(periodo);
  if (!parsed) return "";
  if (parsed.monthKey) {
    params.monthKey = parsed.monthKey;
    return ` AND FORMAT_DATE('%Y-%m', ${fieldName}) = @monthKey`;
  }
  params.startDate = parsed.startDate;
  params.endDate = parsed.endDate;
  return ` AND ${fieldName} BETWEEN @startDate AND @endDate`;
}

export function buildCanonWhere(query, params = {}, options = {}) {
  const alias = options.alias ? `${options.alias}.` : "";
  const exclude = new Set(options.exclude || []);
  const dateField = options.dateField || `${alias}data_referencia`;
  const filialField = options.filialField || `${alias}filial`;
  const transportadorField = options.transportadorField || `${alias}transportador`;
  const statusField = options.statusField || null;
  const tipoVeiculoField = options.tipoVeiculoField || null;
  const tipoFilialField = options.tipoFilialField || null;
  const vehicleScope = options.vehicleScope || DASHBOARD_VEHICLE_SCOPE;
  let where = " WHERE 1 = 1";
  if (options.unitOnly && tipoFilialField) {
    where += ` AND ${tipoFilialField} = 'Unidade'`;
  }
  if (!exclude.has("periodo")) {
    const periodo = query.periodo || query.data || resolveDefaultPeriodo();
    where += buildDateFilter(dateField, periodo, params);
  }
  if (!exclude.has("filial") && query.filial) {
    params.filial = String(query.filial);
    where += ` AND ${filialField} = @filial`;
  }
  if (!exclude.has("transportador") && query.transportador) {
    params.transportador = normalizeEntityKey(query.transportador);
    where += ` AND ${bqNormalizeText}(${transportadorField}) = @transportador`;
  }
  if (!exclude.has("status") && statusField && query.status) {
    params.status = String(query.status);
    where += ` AND ${statusField} = @status`;
  }
  if (tipoVeiculoField) {
    if (!exclude.has("tipoVeiculo") && query.tipoVeiculo) {
      params.tipoVeiculo = String(query.tipoVeiculo);
      where += ` AND ${tipoVeiculoField} = @tipoVeiculo`;
    } else if (vehicleScope?.length) {
      params.dashboardVehicleScope = vehicleScope;
      where += ` AND ${tipoVeiculoField} IN UNNEST(@dashboardVehicleScope)`;
    }
  }
  return where;
}

export function buildCanonAlertWhere(query, params = {}, options = {}) {
  const alias = options.alias ? `${options.alias}.` : "";
  const vehicleScope = options.vehicleScope || DASHBOARD_VEHICLE_SCOPE;
  let where = " WHERE 1 = 1";
  // Filtrar apenas Unidades em alertas
  if (options.unitOnly !== false) {
    where += ` AND ${alias}tipo_filial = 'Unidade'`;
  }
  where += buildDateFilter(`${alias}data_referencia`, query.periodo || query.data || resolveDefaultPeriodo(), params);
  if (query.filial) {
    params.filial = String(query.filial);
    where += ` AND ${alias}filial = @filial`;
  }
  if (query.transportador) {
    params.transportador = normalizeEntityKey(query.transportador);
    where += ` AND ${bqNormalizeText}(${alias}transportador) = @transportador`;
  }
  if (query.status) {
    params.status = String(query.status);
    where += ` AND ${alias}status_tms = @status`;
  }
  if (query.tipoVeiculo) {
    params.tipoVeiculo = String(query.tipoVeiculo);
    where += ` AND ${alias}tipo_veiculo = @tipoVeiculo`;
  } else if (vehicleScope?.length) {
    params.dashboardVehicleScope = vehicleScope;
    where += ` AND ${alias}tipo_veiculo IN UNNEST(@dashboardVehicleScope)`;
  }
  return where;
}

export function buildCanonAlertTypeFilter(tipo, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  switch (tipo) {
    case "nao_planejada":
      return ` AND ${prefix}flag_nao_planejada`;
    case "sem_tempo":
      return ` AND ${prefix}flag_sem_tempo`;
    case "overtime":
      return ` AND ${prefix}flag_overtime`;
    case "entrega_critica":
      return ` AND ${prefix}flag_entrega_critica`;
    case "match_critico":
      return ` AND ${prefix}flag_match_critico`;
    default:
      return "";
  }
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value || 0));
}

export function formatCardMetric(kpi, value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "";
  const numeric = Number(value);
  const sign = signed && numeric > 0 ? "+" : "";
  if (["Entregas Efetivas", "Capacidade Utilizada", "Aderencia Volumes"].includes(kpi)) {
    return `${sign}${formatNumber(numeric * 100, { maximumFractionDigits: 1 })}%`;
  }
  if (kpi === "Peso Total") {
    return `${sign}${formatNumber(numeric, { maximumFractionDigits: 0 })} kg`;
  }
  if (["Custo por Carga"].includes(kpi)) {
    return `${sign}R$ ${formatNumber(numeric, { maximumFractionDigits: 2 })}`;
  }
  if (kpi === "ORH") {
    return `${sign}${formatNumber(numeric, { maximumFractionDigits: 2 })}h`;
  }
  if (["SPR Pedidos", "SPR Volumes", "DPPH"].includes(kpi)) {
    return `${sign}${formatNumber(numeric, { maximumFractionDigits: 2 })}`;
  }
  return `${sign}${formatNumber(numeric, { maximumFractionDigits: 0 })}`;
}

export function sendError(res, status, code, error, details) {
  res.status(status).json({ error, code, details });
}
