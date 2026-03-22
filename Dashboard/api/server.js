import express from "express";
import cors from "cors";
import { BigQuery } from "@google-cloud/bigquery";

const app = express();
const port = Number(process.env.PORT || 8080);
const projectId = process.env.BIGQUERY_PROJECT_ID || "data-aileron-482822-d0";
const dataset = process.env.BIGQUERY_DATASET || "monitoramento_carga";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:4173,https://data-aileron-482822-d0.web.app,https://data-aileron-482822-d0.firebaseapp.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const bigquery = new BigQuery({ projectId });
const firebasePreviewPattern = /^https:\/\/data-aileron-482822-d0--[a-z0-9-]+\.web\.app$/i;
const lovablePattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i;
const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;
const bqNormalizeText = "`data-aileron-482822-d0.monitoramento_carga.normalize_text`";

app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || firebasePreviewPattern.test(origin) || lovablePattern.test(origin) || lovableAppPattern.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ["GET", "OPTIONS"],
}));

function toSnakeLabel(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeEntityKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeEntityLabel(value, fallback = "") {
  const cleaned = String(value || fallback || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  return cleaned
    .split(" ")
    .map((part) => {
      if (!part) return part;
      if (/^[A-Z0-9\/]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function uniqueOptions(rows, mapValue, mapLabel) {
  const seen = new Set();
  return rows.flatMap((row) => {
    const value = mapValue(row);
    if (!value || seen.has(value)) return [];
    seen.add(value);
    return [{ value, label: mapLabel(row, value) }];
  });
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "critico") return "Crítico";
  if (normalized === "atencao") return "Atenção";
  if (normalized === "ok") return "OK";
  return value || "OK";
}

function colorHex(value, fallback = "#6A7282") {
  const hex = String(value || "").replace(/^#/, "").trim();
  return hex ? `#${hex}` : fallback;
}

function formatDate(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "value" in value) {
    return String(value.value).slice(0, 10);
  }
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function computeRatioOrNull(numeratorValue, denominatorValue) {
  const numerator = toNumberOrNull(numeratorValue);
  const denominator = toNumberOrNull(denominatorValue);
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

function mapMetaKpiId(value) {
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

function parsePeriodo(periodo) {
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

function formatIsoDateUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function resolveJanelaPeriodo(janela) {
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
  } else {
    startDate.setUTCDate(startDate.getUTCDate() - 29);
  }

  return {
    startDate: formatIsoDateUtc(startDate),
    endDate: formatIsoDateUtc(endDate),
  };
}

function buildDateFilter(fieldName, periodo, params) {
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

function buildBaseExecWhere(query, params = {}, options = {}) {
  const alias = options.alias ? `${options.alias}.` : "";
  const exclude = new Set(options.exclude || []);
  let where = " WHERE 1 = 1";
  where += ` AND ${alias}Filial IN (SELECT Filial FROM \`${projectId}.${dataset}.Resumo_Filial\` WHERE \`Tipo Filial\` = 'Unidade')`;
  if (!exclude.has("periodo")) {
    where += buildDateFilter(`${alias}\`Data Planejada\``, query.periodo || query.data, params);
  }
  if (!exclude.has("filial") && query.filial) {
    params.filial = String(query.filial);
    where += ` AND ${alias}Filial = @filial`;
  }
  if (!exclude.has("transportador") && query.transportador) {
    params.transportador = normalizeEntityKey(query.transportador);
    where += ` AND ${bqNormalizeText}(${alias}Transportador) = @transportador`;
  }
  if (!exclude.has("status") && query.status) {
    params.status = String(query.status);
    where += ` AND ${alias}Status = @status`;
  }
  if (!exclude.has("tipoVeiculo") && query.tipoVeiculo) {
    params.tipoVeiculo = String(query.tipoVeiculo);
    where += ` AND ${alias}\`Tipo de Veiculo Padrao\` = @tipoVeiculo`;
  }
  return where;
}

function buildAlertasWhere(query, params = {}, options = {}) {
  const alias = options.alias ? `${options.alias}.` : "";
  const exclude = new Set(options.exclude || []);
  let where = " WHERE 1 = 1";
  where += ` AND ${alias}Filial IN (SELECT Filial FROM \`${projectId}.${dataset}.Resumo_Filial\` WHERE \`Tipo Filial\` = 'Unidade')`;
  if (!exclude.has("periodo")) {
    where += buildDateFilter(`${alias}Data`, query.periodo || query.data, params);
  }
  if (!exclude.has("filial") && query.filial) {
    params.filial = String(query.filial);
    where += ` AND ${alias}Filial = @filial`;
  }
  if (!exclude.has("transportador") && query.transportador) {
    params.transportador = normalizeEntityKey(query.transportador);
    where += ` AND ${bqNormalizeText}(${alias}Transportador) = @transportador`;
  }
  if (!exclude.has("status") && query.status) {
    params.status = String(query.status);
    where += ` AND ${alias}Status = @status`;
  }
  if (!exclude.has("tipoVeiculo") && query.tipoVeiculo) {
    params.tipoVeiculo = String(query.tipoVeiculo);
    where += ` AND ${alias}\`Tipo de Veiculo Padrao\` = @tipoVeiculo`;
  }
  if (!exclude.has("prioridade") && query.prioridade) {
    params.prioridade = String(query.prioridade);
    where += ` AND ${alias}Prioridade = @prioridade`;
  }
  return where;
}

function buildFctWhere(query, params = {}, options = {}) {
  const alias = options.alias ? `${options.alias}.` : "";
  const exclude = new Set(options.exclude || []);
  let where = ` WHERE ${alias}tipo_filial = 'Unidade'`;
  if (!exclude.has("periodo")) {
    where += buildDateFilter(`${alias}data_planejada`, query.periodo || query.data, params);
  }
  if (!exclude.has("filial") && query.filial) {
    params.filial = String(query.filial);
    where += ` AND ${alias}filial = @filial`;
  }
  if (!exclude.has("transportador") && query.transportador) {
    params.transportador = normalizeEntityKey(query.transportador);
    where += ` AND ${bqNormalizeText}(${alias}transportador) = @transportador`;
  }
  if (!exclude.has("status") && query.status) {
    params.status = String(query.status);
    where += ` AND ${alias}status = @status`;
  }
  if (!exclude.has("tipoVeiculo") && query.tipoVeiculo) {
    params.tipoVeiculo = String(query.tipoVeiculo);
    where += ` AND ${alias}tipo_veiculo = @tipoVeiculo`;
  }
  if (!exclude.has("prioridade") && query.prioridade) {
    params.prioridade = String(query.prioridade);
    where += ` AND EXISTS (SELECT 1 FROM \`${projectId}.${dataset}.alertas_rotas\` _a WHERE _a.Data = ${alias}data_planejada AND _a.Rota = ${alias}rota AND _a.Prioridade = @prioridade)`;
  }
  return where;
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value || 0));
}

function formatCardMetric(kpi, value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return "";
  const numeric = Number(value);
  const sign = signed && numeric > 0 ? "+" : "";
  if (["Entregas Efetivas", "Capacidade Utilizada", "Aderencia Volumes"].includes(kpi)) {
    return `${sign}${formatNumber(numeric * 100, { maximumFractionDigits: 1 })}%`;
  }
  if (["Custo por Carga"].includes(kpi)) {
    return `${sign}R$ ${formatNumber(numeric, { maximumFractionDigits: 2 })}`;
  }
  if (kpi === "ORH") {
    return `${sign}${formatNumber(numeric, { maximumFractionDigits: 2 })}h`;
  }
  if (["SPR Pedidos", "DPPH"].includes(kpi)) {
    return `${sign}${formatNumber(numeric, { maximumFractionDigits: 2 })}`;
  }
  return `${sign}${formatNumber(numeric, { maximumFractionDigits: 0 })}`;
}

async function runQuery(query, params = {}) {
  const [rows] = await bigquery.query({
    query,
    params,
    useLegacySql: false,
    location: "US",
  });
  return rows;
}

function sendError(res, status, code, error, details) {
  res.status(status).json({ error, code, details });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, projectId, dataset });
});

app.get("/api/metas", async (_req, res) => {
  try {
    const rows = await runQuery(`
      SELECT KPI, Meta, Sentido, Unidade
      FROM \`${projectId}.${dataset}.metas_globais\`
      ORDER BY KPI
    `);
    res.json(rows.map((row) => ({
      kpiId: mapMetaKpiId(row.KPI),
      kpiNome: row.KPI,
      meta: Number(row.Meta ?? 0),
      sentido: row.Sentido,
      unidade: row.Unidade,
    })));
  } catch (error) {
    sendError(res, 500, "METAS_QUERY_FAILED", "Falha ao consultar metas", { message: error.message });
  }
});

app.get("/api/filtros/opcoes", async (req, res) => {
  try {
    const periodosParams = {};
    const periodosWhere = buildBaseExecWhere(req.query, periodosParams, { exclude: ["periodo"] });
    const filiaisParams = {};
    const filiaisWhere = buildBaseExecWhere(req.query, filiaisParams, { exclude: ["filial"] });
    const transportadoresParams = {};
    const transportadoresWhere = buildBaseExecWhere(req.query, transportadoresParams, { exclude: ["transportador"] });
    const tiposVeiculoParams = {};
    const tiposVeiculoWhere = buildBaseExecWhere(req.query, tiposVeiculoParams, { exclude: ["tipoVeiculo"] });
    const statusParams = {};
    const statusWhere = buildBaseExecWhere(req.query, statusParams, { exclude: ["status"] });
    const prioridadesParams = {};
    const prioridadesWhere = buildAlertasWhere(req.query, prioridadesParams, { exclude: ["prioridade"] });
    const [periodos, filiais, transportadores, tiposVeiculo, status, prioridades] = await Promise.all([
      runQuery(`
        SELECT DISTINCT FORMAT_DATE('%Y-%m', \`Data Planejada\`) AS value
        FROM \`${projectId}.${dataset}.VW_Base_Execucao\`
        ${periodosWhere}
        AND \`Data Planejada\` IS NOT NULL
        ORDER BY value DESC
        LIMIT 18
      `, periodosParams),
      runQuery(`
        SELECT DISTINCT Filial AS value, COALESCE(\`Nome Filial\`, Filial) AS label
        FROM \`${projectId}.${dataset}.VW_Base_Execucao\`
        ${filiaisWhere}
        ORDER BY label
      `, filiaisParams),
      runQuery(`
        SELECT DISTINCT Transportador AS value
        FROM \`${projectId}.${dataset}.VW_Base_Execucao\`
        ${transportadoresWhere}
        AND Transportador IS NOT NULL AND TRIM(Transportador) != ''
        ORDER BY value
      `, transportadoresParams),
      runQuery(`
        SELECT DISTINCT \`Tipo de Veiculo Padrao\` AS value
        FROM \`${projectId}.${dataset}.VW_Base_Execucao\`
        ${tiposVeiculoWhere}
        AND \`Tipo de Veiculo Padrao\` IS NOT NULL AND TRIM(\`Tipo de Veiculo Padrao\`) != ''
        ORDER BY value
      `, tiposVeiculoParams),
      runQuery(`
        SELECT DISTINCT Status AS value
        FROM \`${projectId}.${dataset}.VW_Base_Execucao\`
        ${statusWhere}
        AND Status IS NOT NULL AND TRIM(Status) != ''
        ORDER BY value
      `, statusParams),
      runQuery(`
        SELECT DISTINCT Prioridade AS value
        FROM \`${projectId}.${dataset}.alertas_rotas\`
        ${prioridadesWhere}
        AND Prioridade IS NOT NULL AND TRIM(Prioridade) != ''
        ORDER BY value
      `, prioridadesParams),
    ]);

    res.json({
      periodos: periodos.map((row) => ({
        value: row.value,
        label: new Date(`${row.value}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (letter) => letter.toUpperCase()),
      })),
      filiais: uniqueOptions(
        filiais,
        (row) => String(row.value || "").trim(),
        (row, value) => normalizeEntityLabel(row.label, value),
      ),
      transportadores: uniqueOptions(
        transportadores,
        (row) => normalizeEntityKey(row.value),
        (row) => normalizeEntityLabel(row.value, "Transportador não informado"),
      ),
      tiposVeiculo: tiposVeiculo.map((row) => ({ value: row.value, label: row.value })),
      status: status.map((row) => ({ value: row.value, label: row.value })),
      prioridades: prioridades.map((row) => ({ value: row.value, label: row.value })),
    });
  } catch (error) {
    sendError(res, 500, "FILTER_OPTIONS_QUERY_FAILED", "Falha ao consultar opções de filtro", { message: error.message });
  }
});

app.get("/api/resumo/cards", async (req, res) => {
  try {
    const params = {};
    const where = buildFctWhere(req.query, params, { alias: "f" });
    const rows = await runQuery(`
      WITH metas AS (SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`),
      daily AS (
        SELECT
          f.data_planejada AS data,
          COUNT(DISTINCT f.id_carga) AS qtd_rotas,
          SUM(f.qtd_pedidos) AS qtd_pedidos,
          SUM(f.qtd_volumes) AS qtd_volumes,
          SUM(f.entregues) AS qtd_entregas,
          SUM(f.insucessos) AS qtd_insucessos,
          SUM(f.tempo_operacional_h) AS tempo_oper_total,
          SUM(f.pedidos_plan) AS pedidos_plan,
          SUM(f.volumes_plan) AS volumes_plan,
          SUM(f.peso_kg) AS total_peso_kg,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidade_peso_total,
          COUNTIF(f.flag_nao_planejada) AS qtd_nao_plan
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1
      ),
      kpis AS (
        SELECT d.*,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.qtd_pedidos, CAST(d.qtd_rotas AS FLOAT64)) AS spr_pedidos,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.qtd_entregas, d.qtd_entregas + d.qtd_insucessos) AS entregas_efetivas,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.tempo_oper_total, CAST(d.qtd_rotas AS FLOAT64)) AS orh,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.total_peso_kg, NULLIF(d.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(d.qtd_volumes, d.volumes_plan) AS ader_vol,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.qtd_entregas, NULLIF(d.tempo_oper_total, 0)), 2) AS dpph
        FROM daily d
      ),
      metrics AS (
        SELECT k.*,
          CAST(k.qtd_rotas AS FLOAT64) AS rotas_f,
          CAST(k.qtd_pedidos AS FLOAT64) AS pedidos_f,
          CAST(k.qtd_nao_plan AS FLOAT64) AS nao_plan_f,
          k.ocup_peso_veiculo AS ocup_composta
        FROM kpis k
      ),
      ordered AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn
        FROM metrics
      ),
      latest AS (SELECT * FROM ordered WHERE rn = 1),
      prev AS (SELECT * FROM ordered WHERE rn = 2),
      wow AS (
        SELECT *
        FROM metrics
        WHERE data = (SELECT DATE_SUB(data, INTERVAL 7 DAY) FROM latest)
      )
      SELECT metric.*
      FROM latest l
      LEFT JOIN prev p ON TRUE
      LEFT JOIN wow w ON TRUE
      CROSS JOIN metas m,
      UNNEST([
        STRUCT('Qtd Rotas' AS kpi, l.rotas_f AS valor, CAST(NULL AS FLOAT64) AS meta, CAST(NULL AS FLOAT64) AS delta, 'Informativo' AS status, l.rotas_f - COALESCE(p.rotas_f, 0) AS trend_d1, l.rotas_f - COALESCE(w.rotas_f, 0) AS trend_wow, l.data AS database_dt, 'Atuar em excecoes e capacidade' AS acao),
        STRUCT('Qtd Pedidos', l.pedidos_f, CAST(NULL AS FLOAT64), CAST(NULL AS FLOAT64), 'Informativo', l.pedidos_f - COALESCE(p.pedidos_f, 0), l.pedidos_f - COALESCE(w.pedidos_f, 0), l.data, 'Avaliar volume e mix por filial'),
        STRUCT('SPR Pedidos', l.spr_pedidos, m.meta_spr_ped, l.spr_pedidos - m.meta_spr_ped, \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(l.spr_pedidos, m.meta_spr_ped), l.spr_pedidos - COALESCE(p.spr_pedidos, 0), l.spr_pedidos - COALESCE(w.spr_pedidos, 0), l.data, 'Revisar consolidacao, mix e ocupacao'),
        STRUCT('Entregas Efetivas', l.entregas_efetivas, m.meta_entregas, l.entregas_efetivas - m.meta_entregas, \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(l.entregas_efetivas, m.meta_entregas), l.entregas_efetivas - COALESCE(p.entregas_efetivas, 0), l.entregas_efetivas - COALESCE(w.entregas_efetivas, 0), l.data, 'Atacar insucessos e janelas criticas'),
        STRUCT('ORH', l.orh, m.meta_orh, l.orh - m.meta_orh, \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(l.orh, m.meta_orh, 1.0, 2.1), l.orh - COALESCE(p.orh, 0), l.orh - COALESCE(w.orh, 0), l.data, 'Rebalancear jornadas e overtime'),
        STRUCT('Capacidade Utilizada', l.ocup_composta, m.meta_ocup, l.ocup_composta - m.meta_ocup, \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(l.ocup_composta), l.ocup_composta - COALESCE(p.ocup_composta, 0), l.ocup_composta - COALESCE(w.ocup_composta, 0), l.data, 'Ajustar mix e capacidade por tipo de veiculo'),
        STRUCT('Aderencia Volumes', l.ader_vol, m.meta_ader_vol, l.ader_vol - m.meta_ader_vol, \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(l.ader_vol, m.meta_ader_vol), l.ader_vol - COALESCE(p.ader_vol, 0), l.ader_vol - COALESCE(w.ader_vol, 0), l.data, 'Comparar planejamento e executado'),
        STRUCT('DPPH', l.dpph, m.meta_dpph, l.dpph - m.meta_dpph, \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(l.dpph, m.meta_dpph), l.dpph - COALESCE(p.dpph, 0), l.dpph - COALESCE(w.dpph, 0), l.data, 'Revisar produtividade por hora trabalhada'),
        STRUCT('Qtd Rotas Nao Planejadas', l.nao_plan_f, 0.0, l.nao_plan_f, CASE WHEN l.qtd_nao_plan > 0 THEN 'Critico' ELSE 'OK' END, l.nao_plan_f - COALESCE(p.nao_plan_f, 0), l.nao_plan_f - COALESCE(w.nao_plan_f, 0), l.data, 'Atuar na governanca do planejamento')
      ]) AS metric
      ORDER BY metric.kpi
    `, params);
    res.json(rows.map((row) => ({
      kpi: row.kpi,
      valor: Number(row.valor ?? 0),
      meta: row.meta == null ? null : Number(row.meta),
      delta: row.delta == null ? null : Number(row.delta),
      status: normalizeStatus(row.status),
      cor: colorHex(row.status === "OK" ? "12B76A" : row.status === "Atencao" || row.status === "Atenção" ? "F79009" : row.status === "Critico" || row.status === "Crítico" ? "F04438" : "6A7282"),
      trendD1: row.trend_d1 == null ? null : Number(row.trend_d1),
      trendWow: row.trend_wow == null ? null : Number(row.trend_wow),
      valorTexto: formatCardMetric(row.kpi, row.valor),
      metaTexto: row.meta == null ? "" : formatCardMetric(row.kpi, row.meta),
      deltaTexto: row.delta == null ? "" : formatCardMetric(row.kpi, row.delta, { signed: true }),
      trendD1Texto: row.trend_d1 == null ? "" : formatCardMetric(row.kpi, row.trend_d1, { signed: true }),
      trendWowTexto: row.trend_wow == null ? "" : formatCardMetric(row.kpi, row.trend_wow, { signed: true }),
      acao: row.acao,
      databaseDt: formatDate(row.database_dt),
    })));
  } catch (error) {
    sendError(res, 500, "CARDS_QUERY_FAILED", "Falha ao consultar cards", { message: error.message });
  }
});

app.get("/api/resumo/tendencia-semanal", async (req, res) => {
  try {
    const semanas = Math.max(1, Math.min(Number(req.query.semanas || 8), 26));
    const params = { semanas };
    const where = buildFctWhere(req.query, params, { alias: "f" });
    const rows = await runQuery(`
      WITH metas AS (
        SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`
      ),
      weekly AS (
        SELECT
          DATE_TRUNC(f.data_planejada, ISOWEEK) AS semana_inicio,
          DATE_ADD(DATE_TRUNC(f.data_planejada, ISOWEEK), INTERVAL 6 DAY) AS semana_fim,
          CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM f.data_planejada) AS STRING), 2, '0'), ' ', FORMAT_DATE('%d/%m', DATE_TRUNC(f.data_planejada, ISOWEEK)), '-', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(f.data_planejada, ISOWEEK), INTERVAL 6 DAY))) AS semana_label,
          FORMAT_DATE('%G-W%V', f.data_planejada) AS ano_semana,
          COUNT(DISTINCT f.id_carga) AS rotas,
          SUM(f.qtd_pedidos) AS pedidos,
          SUM(f.qtd_volumes) AS volumes,
          SUM(f.entregues) AS entregas,
          SUM(f.insucessos) AS insucessos,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.entregues), SUM(f.entregues) + SUM(f.insucessos)) AS pct_entregas_efetivas,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.qtd_pedidos), CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)) AS spr_pedidos,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.qtd_volumes), CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)) AS spr_volumes,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.tempo_operacional_h), CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)) AS orh,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.qtd_volumes), NULLIF(SUM(f.volumes_plan), 0)) AS ader_vol,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(f.entregues), NULLIF(SUM(f.tempo_operacional_h), 0)) AS dpph,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(
            CAST(COUNTIF(f.flag_rota_concluida) AS FLOAT64),
            CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)) AS pct_rotas_concl,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(
            SUM(f.peso_kg),
            NULLIF(SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)), 0)
          ) AS ocup_composta
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1, 2, 3, 4
      )
      SELECT w.*,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(w.spr_volumes, m.meta_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(w.pct_entregas_efetivas, m.meta_entregas),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(w.pct_rotas_concl, m.meta_rotas),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(w.orh, m.meta_orh, 1.0, 2.1),
          IF(w.ader_vol IS NOT NULL,
             \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(w.ader_vol, m.meta_ader_vol),
             'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(w.ocup_composta)
        ), 1) AS score_operacional
      FROM weekly w
      CROSS JOIN metas m
      ORDER BY semana_inicio DESC
      LIMIT @semanas
    `, params);
    res.json(rows.reverse().map((row) => ({
      anoSemana: row.ano_semana,
      semanaLabel: row.semana_label,
      semanaInicio: formatDate(row.semana_inicio),
      semanaFim: formatDate(row.semana_fim),
      rotas: Number(row.rotas ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      volumes: Number(row.volumes ?? 0),
      entregas: Number(row.entregas ?? 0),
      insucessos: Number(row.insucessos ?? 0),
      entregasEfetivas: Number(row.pct_entregas_efetivas ?? 0),
      sprPedidos: Number(row.spr_pedidos ?? 0),
      sprVolumes: Number(row.spr_volumes ?? 0),
      scoreOperacional: Number(row.score_operacional ?? 0),
    })));
  } catch (error) {
    sendError(res, 500, "TREND_QUERY_FAILED", "Falha ao consultar tendência semanal", { message: error.message });
  }
});

app.get("/api/filiais/performance", async (req, res) => {
  try {
    const params = {};
    const where = `${buildFctWhere(req.query, params, { alias: "f" })} AND f.tipo_filial = 'Unidade'`;
    const rows = await runQuery(`
      WITH metas_pivot AS (
        SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`
      ),
      filial_dim AS (
        SELECT
          Filial,
          ANY_VALUE(` + "`Nome Filial`" + `) AS nome_filial,
          ANY_VALUE(` + "`Meta SPR`" + `) AS meta_spr
        FROM \`${projectId}.${dataset}.Resumo_Filial\`
        GROUP BY Filial
      ),
      base AS (
        SELECT
          f.filial AS filial,
          ANY_VALUE(f.tipo_filial) AS tipoFilial,
          ANY_VALUE(f.regiao) AS regiao,
          COUNT(DISTINCT f.data_planejada) AS diasCobertos,
          COUNT(DISTINCT f.id_carga) AS rotas,
          COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS placasDistintas,
          SUM(f.qtd_pedidos) AS pedidosReal,
          SUM(f.pedidos_plan) AS pedidosPlan,
          SUM(f.qtd_volumes) AS volumesReal,
          SUM(f.volumes_plan) AS volumesPlan,
          SUM(f.peso_kg) AS pesoReal,
          SUM(f.peso_plan_kg) AS pesoPlan,
          SUM(f.entregues) AS entregues,
          SUM(f.insucessos) AS insucessos,
          SUM(f.tempo_operacional_h) AS tempoReal,
          SUM(f.tempo_plan) AS tempoPlan,
          SUM(f.km_realizado) AS kmReal,
          SUM(f.km_planejado) AS kmPlan,
          COUNTIF(f.flag_rota_concluida) AS rotasConcluidas,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidadePesoTotal
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1
      )
      SELECT
        b.filial AS filial,
        COALESCE(fd.nome_filial, b.filial) AS nomeFilial,
        b.tipoFilial AS tipoFilial,
        b.regiao AS regiao,
        COALESCE(fd.meta_spr, mp.meta_spr_ped) AS metaSpr,
        b.diasCobertos AS diasCobertos,
        b.rotas AS rotas,
        b.placasDistintas AS placasDistintas,
        b.pedidosReal AS pedidosReal,
        b.pedidosPlan AS pedidosPlan,
        b.volumesReal AS volumesReal,
        b.volumesPlan AS volumesPlan,
        ROUND(b.pesoReal, 2) AS pesoReal,
        ROUND(b.pesoPlan, 2) AS pesoPlan,
        b.entregues AS entregues,
        b.insucessos AS insucessos,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.entregues, b.entregues + b.insucessos), 4) AS entregasEfetivas,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.volumesReal, CAST(b.rotas AS FLOAT64)), 2) AS sprVolumesReal,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.pedidosReal, CAST(b.rotas AS FLOAT64)), 2) AS sprPedidosReal,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.pedidosReal, CAST(b.rotas AS FLOAT64)) - COALESCE(fd.meta_spr, mp.meta_spr_ped), 2) AS sprVsMeta,
        ROUND(b.tempoReal, 2) AS tempoReal,
        ROUND(b.tempoPlan, 2) AS tempoPlan,
        ROUND(b.tempoReal - b.tempoPlan, 2) AS desvioTempoH,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.tempoReal - b.tempoPlan, NULLIF(b.tempoPlan, 0)), 4) AS desvioTempoPct,
        ROUND(b.kmReal, 2) AS kmReal,
        ROUND(b.kmPlan, 2) AS kmPlan,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(b.rotasConcluidas AS FLOAT64), CAST(b.rotas AS FLOAT64)), 4) AS progressoPct,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.volumesReal, CAST(b.rotas AS FLOAT64)), mp.meta_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.entregues, b.entregues + b.insucessos), mp.meta_entregas),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(b.rotasConcluidas AS FLOAT64), CAST(b.rotas AS FLOAT64)), mp.meta_rotas),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(
            \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.tempoReal, CAST(b.rotas AS FLOAT64)), mp.meta_orh, 1.0, 2.1),
          IF(b.volumesPlan > 0,
             \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(
               \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.volumesReal, b.volumesPlan), mp.meta_ader_vol),
             'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(
            \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.pesoReal, NULLIF(b.capacidadePesoTotal, 0)))
        ), 1) AS scoreOperacional,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.pedidosReal, b.pedidosPlan), 4) AS aderenciaPedidos,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.volumesReal, b.volumesPlan), 4) AS aderenciaVolumes,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.pesoReal, b.pesoPlan), 4) AS aderenciaPeso,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.kmReal, b.kmPlan), 4) AS aderenciaKm,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.tempoReal, b.tempoPlan), 4) AS aderenciaTempo
      FROM base b
      CROSS JOIN metas_pivot mp
      LEFT JOIN filial_dim fd ON fd.Filial = b.filial
      ORDER BY scoreOperacional DESC, filial
    `, params);
    res.json(rows.map((row) => ({
      filial: row.filial,
      nomeFilial: normalizeEntityLabel(row.nomeFilial, row.filial),
      tipoFilial: row.tipoFilial,
      regiao: row.regiao,
      metaSpr: Number(row.metaSpr ?? 0),
      diasCobertos: Number(row.diasCobertos ?? 0),
      rotas: Number(row.rotas ?? 0),
      placasDistintas: Number(row.placasDistintas ?? 0),
      pedidosReal: Number(row.pedidosReal ?? 0),
      pedidosPlan: row.pedidosPlan == null ? null : Number(row.pedidosPlan),
      volumesReal: Number(row.volumesReal ?? 0),
      volumesPlan: row.volumesPlan == null ? null : Number(row.volumesPlan),
      pesoReal: Number(row.pesoReal ?? 0),
      pesoPlan: row.pesoPlan == null ? null : Number(row.pesoPlan),
      entregues: Number(row.entregues ?? 0),
      insucessos: Number(row.insucessos ?? 0),
      entregasEfetivas: Number(row.entregasEfetivas ?? 0),
      sprVolumesReal: Number(row.sprVolumesReal ?? 0),
      sprPedidosReal: Number(row.sprPedidosReal ?? 0),
      sprVsMeta: Number(row.sprVsMeta ?? 0),
      tempoReal: Number(row.tempoReal ?? 0),
      tempoPlan: row.tempoPlan == null ? null : Number(row.tempoPlan),
      desvioTempoH: row.desvioTempoH == null ? null : Number(row.desvioTempoH),
      desvioTempoPct: row.desvioTempoPct == null ? null : Number(row.desvioTempoPct),
      kmReal: Number(row.kmReal ?? 0),
      kmPlan: row.kmPlan == null ? null : Number(row.kmPlan),
      progressoPct: Number(row.progressoPct ?? 0),
      scoreOperacional: Number(row.scoreOperacional ?? 0),
      aderenciaPedidos: row.aderenciaPedidos == null ? null : Number(row.aderenciaPedidos),
      aderenciaVolumes: row.aderenciaVolumes == null ? null : Number(row.aderenciaVolumes),
      aderenciaPeso: row.aderenciaPeso == null ? null : Number(row.aderenciaPeso),
      aderenciaKm: row.aderenciaKm == null ? null : Number(row.aderenciaKm),
      aderenciaTempo: row.aderenciaTempo == null ? null : Number(row.aderenciaTempo),
    })));
  } catch (error) {
    sendError(res, 500, "FILIAL_PERFORMANCE_QUERY_FAILED", "Falha ao consultar performance de filiais", { message: error.message });
  }
});

function buildAlertTypeFilter(tipo, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  switch (tipo) {
    case "nao_planejada":
      return ` AND ${prefix}\`Flag Nao Planejada\``;
    case "sem_tempo":
      return ` AND ${prefix}\`Flag Sem Tempo\``;
    case "overtime":
      return ` AND ${prefix}\`Flag Overtime\``;
    case "entrega_critica":
      return ` AND ${prefix}\`Flag Entrega Critica\``;
    case "match_critico":
      return ` AND ${prefix}\`Flag Match Critico\``;
    default:
      return "";
  }
}

app.get("/api/alertas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    let where = buildAlertasWhere(req.query, params);
    where += buildAlertTypeFilter(req.query.tipo);

    const countRows = await runQuery(`SELECT COUNT(*) AS total FROM \`${projectId}.${dataset}.alertas_rotas\`${where}`, params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(`
      SELECT
        *,
        \`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(\`Tipo de Veiculo Padrao\`) AS capacidade_peso_unit_kg
      FROM \`${projectId}.${dataset}.alertas_rotas\`
      ${where}
      ORDER BY Data DESC, Prioridade ASC, Rota ASC
      LIMIT @limit OFFSET @offset
    `, params);

    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.Data),
        filial: row.Filial,
        nomeFilial: normalizeEntityLabel(row["Nome Filial"], row.Filial),
        regiao: row.Regiao,
        transportador: normalizeEntityLabel(row.Transportador, "Transportador não informado"),
        rota: row.Rota,
        rotaPlanejada: row["Rota Planejada"],
        placa: row.Placa,
        motorista: normalizeEntityLabel(row.Motorista, "Motorista não informado"),
        tipoVeiculo: row["Tipo de Veiculo Padrao"],
        status: row.Status,
        statusRota: normalizeStatus(row["Status Rota"]),
        cor: colorHex(row["Status Rota Cor"]),
        pedidos: Number(row["Pedidos da Rota"] ?? 0),
        volumes: Number(row["Volumes da Rota"] ?? 0),
        peso: Number(row["Peso kg"] ?? 0),
        entregues: Number(row.Entregues ?? 0),
        insucessos: Number(row.Insucessos ?? 0),
        kmPlanejado: Number(row["KM Planejado"] ?? 0),
        kmRealizado: Number(row["KM Realizado"] ?? 0),
        tempoPlanejado: Number(row["Tempo Planejado h"] ?? 0),
        tempoRealizado: Number(row["Tempo Realizado h"] ?? 0),
        entregaEfetivaRota: Number(row["Entrega Efetiva Rota"] ?? 0),
        ocupacaoComposta: Number(row["Ocupacao Composta Rota"] ?? 0),
        ocupacaoPeso: computeRatioOrNull(row["Peso kg"], row.capacidade_peso_unit_kg),
        flagNaoPlanejada: Boolean(row["Flag Nao Planejada"]),
        flagSemTempo: Boolean(row["Flag Sem Tempo"]),
        flagOvertime: Boolean(row["Flag Overtime"]),
        flagMatchCritico: Boolean(row["Flag Match Critico"]),
        flagEntregaCritica: Boolean(row["Flag Entrega Critica"]),
        matchTemporal: row["Match Temporal"],
        prioridade: row.Prioridade,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    sendError(res, 500, "ALERTAS_QUERY_FAILED", "Falha ao consultar alertas", { message: error.message });
  }
});

app.get("/api/alertas/contagem", async (req, res) => {
  try {
    const params = {};
    const where = buildAlertasWhere(req.query, params, { exclude: ["status", "prioridade", "tipoVeiculo"] });
    const rows = await runQuery(`
      SELECT
        COUNTIF(\`Flag Nao Planejada\`) AS naoPlanejada,
        COUNTIF(\`Flag Sem Tempo\`) AS semTempo,
        COUNTIF(\`Flag Overtime\`) AS overtime,
        COUNTIF(\`Flag Entrega Critica\`) AS entregaCritica,
        COUNTIF(\`Flag Match Critico\`) AS matchCritico,
        COUNT(*) AS total
      FROM \`${projectId}.${dataset}.alertas_rotas\`
      ${where}
    `, params);
    res.json(rows[0] || { naoPlanejada: 0, semTempo: 0, overtime: 0, entregaCritica: 0, matchCritico: 0, total: 0 });
  } catch (error) {
    sendError(res, 500, "ALERTAS_COUNT_QUERY_FAILED", "Falha ao consultar contagem de alertas", { message: error.message });
  }
});

app.get("/api/drill-rotas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    let where = " WHERE Tipo = 'Unidade'";
    where += buildDateFilter("Data", req.query.periodo, params);
    if (req.query.filial) {
      params.filial = String(req.query.filial);
      where += " AND Filial = @filial";
    }
    if (req.query.transportador) {
      params.transportador = normalizeEntityKey(req.query.transportador);
      where += ` AND ${bqNormalizeText}(Transportador) = @transportador`;
    }
    if (req.query.status) {
      params.status = String(req.query.status);
      where += " AND Status = @status";
    }
    if (req.query.tipoVeiculo) {
      params.tipoVeiculo = String(req.query.tipoVeiculo);
      where += " AND `Tipo de Veiculo Padrao` = @tipoVeiculo";
    }
    if (req.query.prioridade) {
      params.prioridade = String(req.query.prioridade);
      where += ` AND EXISTS (SELECT 1 FROM \`${projectId}.${dataset}.alertas_rotas\` a WHERE a.Data = drill_rotas.Data AND a.Rota = drill_rotas.Rota AND a.Prioridade = @prioridade)`;
    }
    const orderMap = {
      data: "Data",
      scoreOperacional: "score_operacional",
      pedidos: "`Pedidos da Rota`",
      volumes: "`Volumes da Rota`",
      kmRealizado: "`KM Realizado`",
      ocupacaoComposta: "SAFE_DIVIDE(`Peso kg`, NULLIF(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(`Tipo de Veiculo Padrao`), 0))",
    };
    const sortField = orderMap[req.query.sort] || "Data";
    const orderDirection = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";
    const countRows = await runQuery(`SELECT COUNT(*) AS total FROM \`${projectId}.${dataset}.drill_rotas\` drill_rotas ${where}`, params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(`
      WITH mp AS (SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`)
      SELECT
        drill_rotas.*,
        \`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(\`Tipo de Veiculo Padrao\`) AS capacidade_peso_unit_kg,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(` + "`Volumes da Rota`" + `, mp.meta_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(` + "`Entrega Efetiva Rota`" + `, mp.meta_entregas),
          IF(` + "`Rota Concluida`" + ` = 'Sim', 'OK', \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(0.0, mp.meta_rotas)),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(
            COALESCE(` + "`Tempo Realizado h`" + `, ` + "`Tempo Planejado h`" + `), mp.meta_orh, 1.0, 2.1),
          IF(` + "`Possui Planejado`" + ` = 'Sim',
             \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(
               SAFE_DIVIDE(` + "`Volumes da Rota`" + `, NULLIF(` + "`Volumes Planejados`" + `, 0)), mp.meta_ader_vol),
             'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(` + "`Ocupacao Composta Rota`" + `)
        ), 1) AS score_operacional
      FROM \`${projectId}.${dataset}.drill_rotas\` drill_rotas
      CROSS JOIN mp
      ${where}
      ORDER BY ${sortField} ${orderDirection}, Rota ASC
      LIMIT @limit OFFSET @offset
    `, params);
    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.Data),
        filial: row.Filial,
        nomeFilial: row.Filial,
        transportador: normalizeEntityLabel(row.Transportador, "Transportador não informado"),
        rota: row.Rota,
        placa: row.Placa,
        motorista: normalizeEntityLabel(row.Motorista, "Motorista não informado"),
        tipoVeiculo: row["Tipo de Veiculo Padrao"],
        status: row.Status,
        pedidos: Number(row["Pedidos da Rota"] ?? 0),
        volumes: Number(row["Volumes da Rota"] ?? 0),
        peso: Number(row["Peso kg"] ?? 0),
        entregas: Number(row.Entregues ?? 0),
        insucessos: Number(row.Insucessos ?? 0),
        kmPlanejado: Number(row["KM Planejado"] ?? 0),
        kmRealizado: Number(row["KM Realizado"] ?? 0),
        tempoPlanejado: Number(row["Tempo Planejado h"] ?? 0),
        tempoRealizado: Number(row["Tempo Realizado h"] ?? 0),
        entregaEfetiva: Number(row["Entrega Efetiva Rota"] ?? 0),
        ocupacaoPedidos: Number(row["Ocupacao Pedidos Rota"] ?? 0),
        ocupacaoVolumes: Number(row["Ocupacao Volumes Rota"] ?? 0),
        ocupacaoComposta: Number(row["Ocupacao Composta Rota"] ?? 0),
        ocupacaoPeso: computeRatioOrNull(row["Peso kg"], row.capacidade_peso_unit_kg),
        aderenciaVolumes: row["Possui Planejado"] === "Sim"
          ? computeRatioOrNull(row["Volumes da Rota"], row["Volumes Planejados"])
          : null,
        custoMedioCarga: 0,
        scoreOperacional: Number(row.score_operacional ?? 0),
        flagOvertime: Boolean(row["Flag Overtime"]),
        flagEntregaCritica: Boolean(row["Flag Entrega Critica"]),
        alertaOperacional: row["Match Temporal"],
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    sendError(res, 500, "DRILL_QUERY_FAILED", "Falha ao consultar drill de rotas", { message: error.message });
  }
});

app.get("/api/transportadores", async (req, res) => {
  try {
    const params = {};
    const where = `${buildFctWhere(req.query, params, { alias: "f" })} AND f.tipo_filial = 'Unidade'`;
    const rows = await runQuery(`
      WITH metas AS (
        SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`
      ),
      base AS (
        SELECT
          ${bqNormalizeText}(f.transportador) AS transportador_key,
          ARRAY_AGG(f.transportador ORDER BY LENGTH(TRIM(f.transportador)) DESC, f.transportador LIMIT 1)[SAFE_OFFSET(0)] AS transportador_nome,
          COUNT(DISTINCT f.id_carga) AS rotas,
          SUM(f.qtd_pedidos) AS pedidos,
          SUM(f.qtd_volumes) AS volumes,
          SUM(f.entregues) AS entregues,
          SUM(f.insucessos) AS insucessos,
          SUM(f.tempo_operacional_h) AS tempo_oper_total,
          SUM(f.volumes_plan) AS volumes_plan,
          COUNTIF(f.flag_rota_concluida) AS rotas_concluidas,
          SUM(f.peso_kg) AS peso_total,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidade_peso_total,
          SUM(f.valor_total) AS valor_total
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1
      )
      SELECT
        COALESCE(b.transportador_nome, b.transportador_key, 'Transportador não informado') AS transportador,
        b.rotas AS rotas,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(b.rotas AS FLOAT64), SUM(b.rotas) OVER ()), 4) AS share,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.valor_total, NULLIF(b.rotas, 0)), 2) AS custo_medio_carga,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.valor_total, NULLIF(b.volumes, 0)), 2) AS custo_medio_volume,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.valor_total, NULLIF(b.pedidos, 0)), 2) AS custo_medio_pedido,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.entregues, b.entregues + b.insucessos), 4) AS entregas_efetivas,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.volumes, CAST(b.rotas AS FLOAT64)), m.meta_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.entregues, b.entregues + b.insucessos), m.meta_entregas),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.rotas AS FLOAT64)), m.meta_rotas),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.tempo_oper_total, CAST(b.rotas AS FLOAT64)), m.meta_orh, 1.0, 2.1),
          IF(b.volumes_plan > 0,
             \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.volumes, b.volumes_plan), m.meta_ader_vol),
             'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.peso_total, NULLIF(b.capacidade_peso_total, 0)))
        ), 1) AS score_operacional,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.pedidos, CAST(b.rotas AS FLOAT64)), 2) AS spr_pedidos,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.volumes, CAST(b.rotas AS FLOAT64)), 2) AS spr_volumes,
        b.pedidos AS pedidos,
        b.volumes AS volumes,
        ROUND(b.valor_total, 2) AS valor_total
      FROM base b
      CROSS JOIN metas m
      ORDER BY b.rotas DESC, transportador
    `, params);
    res.json(rows.map((row) => ({
      transportador: normalizeEntityLabel(row.transportador, "Transportador não informado"),
      rotas: Number(row.rotas ?? 0),
      share: Number(row.share ?? 0),
      custoMedioCarga: Number(row.custo_medio_carga ?? 0),
      custoMedioVolume: Number(row.custo_medio_volume ?? 0),
      custoMedioPedido: Number(row.custo_medio_pedido ?? 0),
      entregasEfetivas: Number(row.entregas_efetivas ?? 0),
      scoreOperacional: Number(row.score_operacional ?? 0),
      sprPedidos: Number(row.spr_pedidos ?? 0),
      sprVolumes: Number(row.spr_volumes ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      volumes: Number(row.volumes ?? 0),
      valorTotal: Number(row.valor_total ?? 0),
      status: Number(row.score_operacional ?? 0) >= 80 ? "OK" : Number(row.score_operacional ?? 0) >= 60 ? "Atenção" : "Crítico",
      statusCor: Number(row.score_operacional ?? 0) >= 80 ? "#12B76A" : Number(row.score_operacional ?? 0) >= 60 ? "#F79009" : "#F04438",
    })));
  } catch (error) {
    sendError(res, 500, "TRANSPORTADORES_QUERY_FAILED", "Falha ao consultar transportadores", { message: error.message });
  }
});

app.get("/api/frota/ocupacao-tipo", async (req, res) => {
  try {
    const params = {};
    let where = " WHERE 1 = 1";
    where += buildDateFilter("Data", req.query.periodo, params);
    if (req.query.transportador) {
      params.transportador = normalizeEntityKey(req.query.transportador);
      where += ` AND ${bqNormalizeText}(Transportador) = @transportador`;
    }
    if (req.query.tipoVeiculo) {
      params.tipoVeiculo = String(req.query.tipoVeiculo);
      where += " AND `Tipo de Veiculo` = @tipoVeiculo";
    }
    const rows = await runQuery(`
      SELECT
        ` + "`Tipo de Veiculo`" + ` AS tipo_veiculo,
        SUM(Rotas) AS rotas,
        SUM(` + "`Placas Distintas`" + `) AS placas_distintas,
        ROUND(AVG(` + "`Media Pedidos por Rota`" + `), 2) AS media_pedidos_rota,
        ROUND(AVG(` + "`Media Volumes por Rota`" + `), 2) AS media_volumes_rota,
        ROUND(AVG(` + "`Media Peso por Rota kg`" + `), 2) AS media_peso_rota,
        SUM(` + "`Peso Total kg`" + `) AS peso_total_kg,
        SUM(` + "`Capacidade Peso Total kg`" + `) AS capacidade_peso_total_kg,
        ROUND(SAFE_DIVIDE(SUM(` + "`Peso Total kg`" + `), NULLIF(SUM(` + "`Capacidade Peso Total kg`" + `), 0)), 4) AS ocupacao_peso,
        ROUND(AVG(` + "`SPR por Veiculo`" + `), 2) AS spr_por_veiculo,
        ROUND(AVG(ORH), 2) AS orh,
        ROUND(SAFE_DIVIDE(SUM(` + "`Valor Pagamento Carga Total`" + `), NULLIF(SUM(Volumes), 0)), 2) AS custo_medio_volume
      FROM \`${projectId}.${dataset}.Resumo_Ocupacao_Veic_Transp\`
      ${where}
      GROUP BY ` + "`Tipo de Veiculo`" + `
      ORDER BY rotas DESC, tipo_veiculo
    `, params);
    res.json(rows.map((row) => ({
      tipoVeiculo: row.tipo_veiculo,
      rotas: Number(row.rotas ?? 0),
      placasDistintas: Number(row.placas_distintas ?? 0),
      mediaPedidosRota: Number(row.media_pedidos_rota ?? 0),
      mediaVolumesRota: Number(row.media_volumes_rota ?? 0),
      mediaPesoRota: Number(row.media_peso_rota ?? 0),
      pesoTotalKg: Number(row.peso_total_kg ?? 0),
      capacidadePesoTotalKg: Number(row.capacidade_peso_total_kg ?? 0),
      ocupacaoPeso: Number(row.ocupacao_peso ?? 0),
      sprPorVeiculo: Number(row.spr_por_veiculo ?? 0),
      orh: Number(row.orh ?? 0),
      custoMedioVolume: Number(row.custo_medio_volume ?? 0),
    })));
  } catch (error) {
    sendError(res, 500, "OCUPACAO_QUERY_FAILED", "Falha ao consultar ocupação por tipo", { message: error.message });
  }
});

app.get("/api/motoristas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    let where = `${buildFctWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, { alias: "f" })} AND f.tipo_filial = 'Unidade' AND f.motorista IS NOT NULL AND f.motorista != ''`;
    if (req.query.filial) {
      params.filial = String(req.query.filial);
      where += " AND f.filial = @filial";
    }
    if (req.query.transportador) {
      params.transportador = normalizeEntityKey(req.query.transportador);
      where += ` AND ${bqNormalizeText}(f.transportador) = @transportador`;
    }
    const groupedQuery = `
      WITH metas AS (
        SELECT * FROM \`${projectId}.${dataset}.metas_pivot\`
      ),
      base AS (
        SELECT
          f.data_planejada AS data,
          f.filial AS filial,
          ${bqNormalizeText}(f.transportador) AS transportador_key,
          ARRAY_AGG(f.transportador ORDER BY LENGTH(TRIM(f.transportador)) DESC, f.transportador LIMIT 1)[SAFE_OFFSET(0)] AS transportador_nome,
          ${bqNormalizeText}(f.motorista) AS motorista_key,
          ARRAY_AGG(f.motorista ORDER BY LENGTH(TRIM(f.motorista)) DESC, f.motorista LIMIT 1)[SAFE_OFFSET(0)] AS motorista_nome,
          ARRAY_AGG(f.placa ORDER BY f.placa LIMIT 1)[SAFE_OFFSET(0)] AS placa,
          COUNT(DISTINCT f.id_carga) AS qtd_rotas,
          ROUND(SUM(f.tempo_operacional_h), 2) AS horas_jornada,
          LOGICAL_OR(f.flag_overtime) AS flag_overtime,
          SUM(f.entregues) AS entregas,
          SUM(f.insucessos) AS insucessos,
          SUM(f.qtd_pedidos) AS pedidos,
          SUM(f.qtd_volumes) AS volumes,
          COUNTIF(f.flag_rota_concluida) AS rotas_concluidas,
          SUM(f.volumes_plan) AS volumes_plan,
          SUM(f.peso_kg) AS peso_total,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidade_peso_total
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1, 2, 3, 5
      ),
      grouped AS (
        SELECT
          b.data,
          b.filial,
          b.transportador_key,
          b.transportador_nome,
          b.motorista_key,
          b.motorista_nome,
          b.placa,
          b.qtd_rotas,
          b.horas_jornada,
          b.flag_overtime,
          b.entregas,
          b.insucessos,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
            \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.volumes, CAST(b.qtd_rotas AS FLOAT64)), m.meta_spr_vol),
            \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.entregas, b.entregas + b.insucessos), m.meta_entregas),
            \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)), m.meta_rotas),
            \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.horas_jornada, CAST(b.qtd_rotas AS FLOAT64)), m.meta_orh, 1.0, 2.1),
            IF(b.volumes_plan > 0,
               \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(\`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(b.volumes, b.volumes_plan), m.meta_ader_vol),
               'Informativo'),
            \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(b.peso_total, NULLIF(b.capacidade_peso_total, 0)))
          ), 1) AS score_operacional,
          b.pedidos,
          b.volumes
        FROM base b
        CROSS JOIN metas m
      )
    `;
    const overtimeFilter = String(req.query.overtime || "") === "true" ? " WHERE flag_overtime = TRUE" : "";
    const countRows = await runQuery(`${groupedQuery} SELECT COUNT(*) AS total FROM grouped${overtimeFilter}`, params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(`${groupedQuery}
      SELECT *
      FROM grouped
      ${overtimeFilter}
      ORDER BY data DESC, horas_jornada DESC, motorista_nome ASC
      LIMIT @limit OFFSET @offset
    `, params);
    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.data),
        filial: row.filial,
        nomeFilial: row.filial,
        transportador: normalizeEntityLabel(row.transportador_nome, "Transportador não informado"),
        motorista: normalizeEntityLabel(row.motorista_nome, "Motorista não informado"),
        placa: row.placa,
        qtdRotas: Number(row.qtd_rotas ?? 0),
        horasJornada: Number(row.horas_jornada ?? 0),
        flagOvertime: Boolean(row.flag_overtime),
        entregas: Number(row.entregas ?? 0),
        insucessos: Number(row.insucessos ?? 0),
        scoreOperacional: Number(row.score_operacional ?? 0),
        pedidos: Number(row.pedidos ?? 0),
        volumes: Number(row.volumes ?? 0),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    sendError(res, 500, "MOTORISTAS_QUERY_FAILED", "Falha ao consultar motoristas", { message: error.message });
  }
});

app.get("/api/motoristas/kpis", async (req, res) => {
  try {
    const params = {};
    let where = `${buildFctWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, { alias: "f" })} AND f.tipo_filial = 'Unidade' AND f.motorista IS NOT NULL AND f.motorista != ''`;
    if (req.query.filial) {
      params.filial = String(req.query.filial);
      where += " AND f.filial = @filial";
    }
    if (req.query.transportador) {
      params.transportador = normalizeEntityKey(req.query.transportador);
      where += ` AND ${bqNormalizeText}(f.transportador) = @transportador`;
    }
    const rows = await runQuery(`
      WITH grouped AS (
        SELECT
          f.data_planejada AS data,
          ${bqNormalizeText}(f.motorista) AS motorista_key,
          COUNT(DISTINCT f.id_carga) AS qtd_rotas,
          SUM(f.tempo_operacional_h) AS horas_jornada,
          LOGICAL_OR(f.flag_overtime) AS flag_overtime,
          SUM(f.entregues) AS entregas
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1, 2
      )
      SELECT
        COUNT(DISTINCT motorista_key) AS motoristasAtivos,
        ROUND(AVG(qtd_rotas), 2) AS mediaRotasDia,
        ROUND(AVG(horas_jornada), 2) AS jornadaMedia,
        COUNT(DISTINCT CASE WHEN flag_overtime THEN motorista_key END) AS qtdOvertime,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(SUM(entregas), NULLIF(SUM(horas_jornada), 0)), 2) AS dpph
      FROM grouped
    `, params);
    res.json(rows[0] || { motoristasAtivos: 0, mediaRotasDia: 0, jornadaMedia: 0, qtdOvertime: 0, dpph: 0 });
  } catch (error) {
    sendError(res, 500, "MOTORISTAS_KPIS_QUERY_FAILED", "Falha ao consultar KPIs de motoristas", { message: error.message });
  }
});

app.get("/api/kpi-diario", async (req, res) => {
  try {
    const params = {};
    const where = buildFctWhere(req.query, params, { alias: "f" });
    const rows = await runQuery(`
      WITH agg AS (
        SELECT
          MAX(f.data_planejada) AS data,
          COUNT(DISTINCT f.id_carga) AS rotas,
          SUM(f.qtd_pedidos) AS pedidos,
          SUM(f.qtd_volumes) AS volumes,
          SUM(f.entregues) AS entregas,
          SUM(f.insucessos) AS insucessos,
          COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS veiculosAtivos,
          COUNT(DISTINCT CASE WHEN f.motorista IS NOT NULL AND f.motorista != '' THEN UPPER(TRIM(f.motorista)) END) AS motoristasAtivos,
          SUM(f.km_realizado) AS totalKmRealizado,
          SUM(f.peso_kg) AS totalPesoKg,
          SUM(f.pedidos_plan) AS pedidosPlan,
          SUM(f.volumes_plan) AS volumesPlan,
          SUM(f.peso_plan_kg) AS pesoPlanKg,
          SUM(f.tempo_operacional_h) AS tempoOperacionalTotal,
          SUM(f.km_planejado) AS kmPlan,
          SUM(f.tempo_plan) AS tempoPlan,
          COUNTIF(f.flag_rota_concluida) AS rotasConcluidas,
          COUNTIF(f.flag_overtime) AS rotasOvertime,
          COUNTIF(f.flag_nao_planejada) AS qtdNaoPlanejada,
          COUNTIF(f.match_temporal != 'Sem Planejado' AND f.match_temporal IS NOT NULL) AS rotasPlanejadas,
          COUNTIF(f.match_temporal = 'Mesmo Dia') AS matchMesmoDia,
          ROUND(SUM(f.valor_total), 2) AS valorPagamentoTotal,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidadePesoTotalKg
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
      ),
      metrics AS (
        SELECT
          o.data,
          o.rotas,
          o.pedidos,
          o.volumes,
          o.entregas,
          o.insucessos,
          o.veiculosAtivos,
          o.motoristasAtivos,
          o.totalKmRealizado,
          o.totalPesoKg,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.pedidos, CAST(o.rotas AS FLOAT64)) AS sprPedidos,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.volumes, CAST(o.rotas AS FLOAT64)) AS sprVolumes,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.entregas, o.entregas + o.insucessos) AS pctEntregasEfetivas,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(o.rotasConcluidas AS FLOAT64), CAST(o.rotas AS FLOAT64)) AS pctRotasConcluidas,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64)) AS tempoMedRealizado,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64) * 8.0) AS pctUtilizacaoJornada,
          GREATEST(0, 1.0 - IFNULL(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64) * 8.0), 0)) AS pctOciosidadeJornada,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(o.rotasOvertime AS FLOAT64), CAST(o.rotas AS FLOAT64)) AS pctRotasOvertime,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.pedidos, NULLIF(o.pedidosPlan, 0)) AS pctOcupacaoPedidos,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.volumes, NULLIF(o.volumesPlan, 0)) AS pctOcupacaoVolumes,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.totalPesoKg, NULLIF(o.capacidadePesoTotalKg, 0)) AS pctOcupacaoComposta,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.totalPesoKg, NULLIF(o.capacidadePesoTotalKg, 0)) AS pctOcupacaoPeso,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(o.pedidos, o.pedidosPlan) AS pctAderPedidos,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(o.volumes, o.volumesPlan) AS pctAderVolumes,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(o.totalPesoKg, o.pesoPlanKg) AS pctAderPeso,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(o.totalKmRealizado, o.kmPlan) AS pctAderKm,
          \`data-aileron-482822-d0.monitoramento_carga.adherence_ratio\`(o.tempoOperacionalTotal, o.tempoPlan) AS pctAderTempo,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(CAST(o.matchMesmoDia AS FLOAT64), NULLIF(CAST(o.rotasPlanejadas AS FLOAT64), 0)) AS pctMatchMesmoDia,
          o.valorPagamentoTotal,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.valorPagamentoTotal, CAST(o.rotas AS FLOAT64)), 2) AS custoMedioCarga,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.valorPagamentoTotal, NULLIF(o.volumes, 0)), 2) AS custoMedioVolume,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.valorPagamentoTotal, NULLIF(o.pedidos, 0)), 2) AS custoMedioPedido,
          ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(o.entregas, NULLIF(o.tempoOperacionalTotal, 0)), 2) AS dpph
        FROM agg o
      )
      SELECT
        *,
        ROUND(tempoMedRealizado - m.m_orh, 2) AS gapOrhVsMeta,
        m.m_entregas AS metaEntregas,
        m.m_rotas AS metaRotasConcluidas,
        m.m_ocup_peso AS metaOcupacaoPeso,
        m.m_ocup AS metaOcupacaoComposta,
        m.m_ader_vol AS metaAderenciaVolumes,
        m.m_orh AS metaOrhTempo,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(sprVolumes, m.m_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(pctEntregasEfetivas, m.m_entregas),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(pctRotasConcluidas, m.m_rotas),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(tempoMedRealizado, m.m_orh, 1.0, 2.1),
          IF(pctAderVolumes IS NOT NULL, \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(pctAderVolumes, m.m_ader_vol), 'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(pctOcupacaoComposta)
        ), 1) AS scoreOperacional
      FROM metrics
      CROSS JOIN (
        SELECT
          meta_spr_ped AS m_spr_ped,
          meta_spr_vol AS m_spr_vol,
          meta_orh AS m_orh,
          meta_entregas AS m_entregas,
          meta_rotas AS m_rotas,
          meta_ocup AS m_ocup,
          meta_ocup AS m_ocup_peso,
          meta_ader_vol AS m_ader_vol,
          meta_dpph AS m_dpph
        FROM \`${projectId}.${dataset}.metas_pivot\`
      ) m
    `, params);
    const row = rows[0] || {};
    res.json({
      ...row,
      data: formatDate(row.data),
    });
  } catch (error) {
    sendError(res, 500, "KPI_DIARIO_QUERY_FAILED", "Falha ao consultar KPI diário", { message: error.message });
  }
});

app.get("/api/executivo/serie-diaria", async (req, res) => {
  try {
    const query = { ...req.query };
    if (!query.periodo) {
      const janela = resolveJanelaPeriodo(query.janela);
      query.periodo = `${janela.startDate},${janela.endDate}`;
    }

    const params = {};
    const where = buildFctWhere(query, params, { alias: "f" });
    const rows = await runQuery(`
      WITH daily AS (
        SELECT
          f.data_planejada AS data,
          COUNT(DISTINCT f.id_carga) AS rotas,
          SUM(f.qtd_pedidos) AS pedidos,
          SUM(f.qtd_volumes) AS volumes,
          SUM(f.entregues) AS entregues,
          SUM(f.insucessos) AS insucessos,
          SUM(f.tempo_operacional_h) AS tempoOperacionalTotal,
          COUNTIF(f.flag_nao_planejada) AS qtdRotasNaoPlanejadas,
          COUNTIF(f.flag_sem_tempo) AS qtdRotasSemTempo,
          SUM(f.pedidos_plan) AS pedidosPlanejados,
          SUM(f.volumes_plan) AS volumesPlanejados,
          SUM(f.peso_kg) AS pesoRealizado,
          SUM(f.peso_plan_kg) AS pesoPlanejado,
          SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)) AS capacidadePesoTotalKg,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(
            SUM(f.peso_kg),
            NULLIF(SUM(\`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity\`(f.tipo_veiculo)), 0)
          ) AS ocupacaoComposta,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(
            CAST(COUNTIF(f.flag_rota_concluida) AS FLOAT64), CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)) AS pctRotasConcl
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1
      ),
      filial_daily AS (
        SELECT
          f.data_planejada AS data,
          f.filial AS Filial,
          \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(
            SUM(f.qtd_volumes),
            CAST(COUNT(DISTINCT f.id_carga) AS FLOAT64)
          ) AS sprVolumes
        FROM \`${projectId}.${dataset}.fct_execucao\` f
        ${where}
        GROUP BY 1, 2
      ),
      filial_criticas AS (
        SELECT
          fd.data,
          COUNTIF(fd.sprVolumes < mp.meta_spr_vol) AS qtdFiliaisCriticasSpr
        FROM filial_daily fd
        CROSS JOIN \`${projectId}.${dataset}.metas_pivot\` mp
        GROUP BY 1
      )
      SELECT
        d.data,
        d.rotas,
        d.pedidos,
        d.volumes,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.entregues, d.entregues + d.insucessos), 4) AS entregasEfetivas,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.pedidos, CAST(d.rotas AS FLOAT64)), 2) AS sprPedidos,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.volumes, CAST(d.rotas AS FLOAT64)), 2) AS sprVolumes,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional\`(
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(
            \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.volumes, CAST(d.rotas AS FLOAT64)), m.meta_spr_vol),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(
            \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.entregues, d.entregues + d.insucessos), m.meta_entregas),
          \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(d.pctRotasConcl, m.meta_rotas),
          \`data-aileron-482822-d0.monitoramento_carga.status_target_band\`(
            \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.tempoOperacionalTotal, CAST(d.rotas AS FLOAT64)), m.meta_orh, 1.0, 2.1),
          IF(d.volumesPlanejados > 0,
             \`data-aileron-482822-d0.monitoramento_carga.status_higher\`(
               \`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.volumes, NULLIF(d.volumesPlanejados, 0)), m.meta_ader_vol),
             'Informativo'),
          \`data-aileron-482822-d0.monitoramento_carga.capacity_status\`(d.ocupacaoComposta)
        ), 1) AS scoreOperacional,
        ROUND(d.ocupacaoComposta, 4) AS ocupacaoComposta,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.volumes, NULLIF(d.volumesPlanejados, 0)), 4) AS aderenciaVolumes,
        ROUND(\`data-aileron-482822-d0.monitoramento_carga.safe_div\`(d.tempoOperacionalTotal, CAST(d.rotas AS FLOAT64)), 2) AS tempoMedRealizado,
        d.qtdRotasNaoPlanejadas,
        d.qtdRotasSemTempo,
        COALESCE(fc.qtdFiliaisCriticasSpr, 0) AS qtdFiliaisCriticasSpr
      FROM daily d
      CROSS JOIN \`${projectId}.${dataset}.metas_pivot\` m
      LEFT JOIN filial_criticas fc ON fc.data = d.data
      ORDER BY d.data ASC
    `, params);

    res.json(rows.map((row) => ({
      data: formatDate(row.data),
      rotas: Number(row.rotas ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      volumes: Number(row.volumes ?? 0),
      entregasEfetivas: Number(row.entregasEfetivas ?? 0),
      sprPedidos: Number(row.sprPedidos ?? 0),
      sprVolumes: Number(row.sprVolumes ?? 0),
      scoreOperacional: Number(row.scoreOperacional ?? 0),
      ocupacaoComposta: Number(row.ocupacaoComposta ?? 0),
      aderenciaVolumes: toNumberOrNull(row.aderenciaVolumes),
      tempoMedRealizado: Number(row.tempoMedRealizado ?? 0),
      qtdRotasNaoPlanejadas: Number(row.qtdRotasNaoPlanejadas ?? 0),
      qtdRotasSemTempo: Number(row.qtdRotasSemTempo ?? 0),
      qtdFiliaisCriticasSpr: Number(row.qtdFiliaisCriticasSpr ?? 0),
    })));
  } catch (error) {
    sendError(res, 500, "COCKPIT_SERIE_DIARIA_QUERY_FAILED", "Falha ao consultar série diária executiva", { message: error.message });
  }
});

app.use((error, _req, res, _next) => {
  if (String(error.message || "").startsWith("Origin not allowed")) {
    sendError(res, 403, "CORS_ORIGIN_DENIED", error.message);
    return;
  }
  sendError(res, 500, "UNHANDLED_ERROR", "Erro inesperado no servidor", { message: error.message });
});

app.listen(port, () => {
  console.log(`Dashboard API listening on port ${port}`);
});
