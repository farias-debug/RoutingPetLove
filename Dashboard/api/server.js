import express from "express";
import cors from "cors";
import { BigQuery } from "@google-cloud/bigquery";

import {
  normalizeEntityKey, normalizeEntityLabel, truncateWords, uniqueOptions,
  normalizeStatus, colorHex, formatDate, toNumberOrNull,
  resolveJanelaPeriodo, bqNormalizeText,
  buildCanonWhere, buildCanonAlertWhere, buildCanonAlertTypeFilter, buildDateFilter,
  formatCardMetric, sendError,
} from "./helpers.js";

import * as Q from "./queries.js";

// ── Boot ────────────────────────────────────────────────────────────────────

const app = express();
// Em Cloud Run o PORT vem do ambiente; localmente padronizamos a API em 3001.
const port = Number(process.env.PORT || 3001);
const projectId = process.env.BIGQUERY_PROJECT_ID || "data-aileron-482822-d0";
const dataset = process.env.BIGQUERY_DATASET || "monitoramento_carga";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:4173,http://localhost:5173,http://localhost:5174,https://data-aileron-482822-d0.web.app,https://data-aileron-482822-d0.firebaseapp.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const bigquery = new BigQuery({ projectId });
const firebasePreviewPattern = /^https:\/\/data-aileron-482822-d0--[a-z0-9-]+\.web\.app$/i;
const lovablePattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i;
const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;
const localhostPattern = /^http:\/\/localhost:\d+$/;

app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || firebasePreviewPattern.test(origin) || lovablePattern.test(origin) || lovableAppPattern.test(origin) || localhostPattern.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ["GET", "OPTIONS"],
}));

async function runQuery(query, params = {}) {
  const [rows] = await bigquery.query({
    query,
    params,
    useLegacySql: false,
    location: "US",
  });
  return rows;
}

// Opções padrão de filtro para base_execucao_canonica
const canonOpts = (extra = {}) => ({
  alias: "b",
  dateField: "b.data_referencia",
  filialField: "b.filial",
  transportadorField: "b.transportador",
  statusField: "b.status_tms",
  tipoVeiculoField: "b.tipo_veiculo",
  tipoFilialField: "b.tipo_filial",
  unitOnly: true,
  ...extra,
});

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  const health = { ok: true, projectId, dataset };

  try {
    const [rows] = await bigquery.query({
      query: `SELECT MAX(data_referencia) AS last_date, COUNT(DISTINCT data_referencia) AS total_days FROM \`${projectId}.${dataset}.base_execucao_canonica\` WHERE data_referencia >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`,
    });
    const row = rows[0] || {};
    const lastDate = row.last_date?.value || null;
    const ageMs = lastDate ? Date.now() - new Date(lastDate).getTime() : null;
    health.dataFreshness = {
      lastDate,
      daysInLast7: Number(row.total_days || 0),
      ageHours: ageMs ? Math.round(ageMs / 3600000) : null,
      stale: ageMs ? ageMs > 48 * 3600000 : true,
    };
  } catch {
    health.dataFreshness = null;
  }

  res.json(health);
});

// ── Metas ────────────────────────────────────────────────────────────────────

app.get("/api/metas", async (_req, res) => {
  try {
    const rows = await runQuery(Q.metasQuery(projectId, dataset));
    res.json(rows.map((row) => ({
      kpiId: row.kpi_id,
      kpiNome: row.kpi_nome,
      meta: Number(row.meta ?? 0),
      sentido: row.sentido,
      unidade: row.unidade,
    })));
  } catch (error) {
    sendError(res, 500, "METAS_QUERY_FAILED", "Falha ao consultar metas", { message: error.message });
  }
});

// ── Filtros / Opções ─────────────────────────────────────────────────────────

app.get("/api/filtros/opcoes", async (req, res) => {
  try {
    const mkWhere = (exclude) => {
      const params = {};
      const where = buildCanonWhere(req.query, params, canonOpts({ exclude }));
      return { where, params };
    };
    const mkAlertWhere = () => {
      const params = {};
      const where = buildCanonAlertWhere(req.query, params, { alias: "b" });
      return { where, params };
    };

    const p = mkWhere(["periodo"]);
    const f = mkWhere(["filial"]);
    const tr = mkWhere(["transportador"]);
    const tv = mkWhere(["tipoVeiculo"]);
    const st = mkWhere(["status"]);
    const pr = mkAlertWhere();

    const [periodos, filiais, transportadores, tiposVeiculo, status, prioridades] = await Promise.all([
      runQuery(Q.filterPeriodosQuery(projectId, dataset, p.where), p.params),
      runQuery(Q.filterFiliaisQuery(projectId, dataset, f.where), f.params),
      runQuery(Q.filterTransportadoresQuery(projectId, dataset, tr.where), tr.params),
      runQuery(Q.filterTiposVeiculoQuery(projectId, dataset, tv.where), tv.params),
      runQuery(Q.filterStatusQuery(projectId, dataset, st.where), st.params),
      runQuery(Q.filterPrioridadesQuery(projectId, dataset, pr.where), pr.params),
    ]);

    res.json({
      periodos: periodos.map((row) => ({
        value: row.value,
        label: new Date(`${row.value}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (l) => l.toUpperCase()),
      })),
      filiais: uniqueOptions(
        filiais,
        (row) => String(row.value || "").trim(),
        (row, value) => row.label || value,
      ),
      transportadores: uniqueOptions(
        transportadores,
        (row) => normalizeEntityKey(row.value),
        (row) => truncateWords(normalizeEntityLabel(row.label || row.value, "Transportador não informado")),
      ),
      tiposVeiculo: tiposVeiculo.map((row) => ({ value: row.value, label: row.value })),
      status: status.map((row) => ({ value: row.value, label: row.value })),
      prioridades: prioridades.map((row) => ({ value: row.value, label: row.value })),
    });
  } catch (error) {
    sendError(res, 500, "FILTER_OPTIONS_QUERY_FAILED", "Falha ao consultar opções de filtro", { message: error.message });
  }
});

// ── Resumo / Cards ───────────────────────────────────────────────────────────

app.get("/api/resumo/cards", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere(req.query, params, canonOpts());
    const rows = await runQuery(Q.cardsQuery(projectId, dataset, where), params);
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

// ── Tendência Semanal ────────────────────────────────────────────────────────

app.get("/api/resumo/tendencia-semanal", async (req, res) => {
  try {
    const semanas = Math.max(1, Math.min(Number(req.query.semanas || 8), 26));
    const params = { semanas };
    const where = buildCanonWhere(req.query, params, canonOpts());
    const rows = await runQuery(Q.tendenciaSemanalQuery(projectId, dataset, where), params);
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

// ── Filiais / Performance ────────────────────────────────────────────────────

app.get("/api/filiais/performance", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere(req.query, params, canonOpts());
    const rows = await runQuery(Q.filiaisPerformanceQuery(projectId, dataset, where), params);
    res.json(rows.map((row) => ({
      filial: row.filial,
      nomeFilial: row.nomeFilial || row.filial,
      tipoFilial: row.tipoFilial,
      regiao: row.regiao,
      metaSpr: Number(row.metaSpr ?? 0),
      metaSprVolumes: Number(row.metaSprVolumes ?? 0),
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

// ── Alertas ──────────────────────────────────────────────────────────────────

app.get("/api/alertas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    let where = buildCanonAlertWhere(req.query, params, { alias: "a" });
    where += buildCanonAlertTypeFilter(req.query.tipo, "a");
    if (req.query.prioridade) {
      params.prioridade = String(req.query.prioridade).toLowerCase();
      where += ` AND CASE
        WHEN a.flag_entrega_critica OR a.flag_match_critico THEN 'critico'
        WHEN a.flag_overtime OR a.flag_sem_tempo OR a.flag_nao_planejada THEN 'atencao'
        ELSE 'ok'
      END = @prioridade`;
    }

    const countRows = await runQuery(Q.alertasCountQuery(projectId, dataset, where), params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(Q.alertasQuery(projectId, dataset, where), params);

    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.data),
        filial: row.filial,
        nomeFilial: row.nomeFilial || row.filial,
        regiao: row.regiao,
        transportador: truncateWords(normalizeEntityLabel(row.transportador, "Transportador não informado")),
        rota: row.rota,
        rotaPlanejada: null,
        placa: row.placa,
        motorista: normalizeEntityLabel(row.motorista, "Motorista não informado"),
        tipoVeiculo: row.tipo_veiculo,
        status: row.status,
        statusRota: normalizeStatus(row.statusRota),
        cor: colorHex(row.statusRotaCor),
        pedidos: Number(row.pedidosRota ?? 0),
        volumes: Number(row.volumesRota ?? 0),
        peso: Number(row.pesoReal ?? 0),
        entregues: Number(row.entregues ?? 0),
        insucessos: Number(row.insucessos ?? 0),
        kmPlanejado: Number(row.kmPlanejado ?? 0),
        kmRealizado: Number(row.kmRealizado ?? 0),
        tempoPlanejado: Number(row.tempoPlaneadoH ?? 0),
        tempoRealizado: Number(row.tempoRealizadoH ?? 0),
        entregaEfetivaRota: Number(row.entregaEfetivaRota ?? 0),
        ocupacaoPeso: Number(row.ocupacaoPeso ?? 0),
        flagNaoPlanejada: Boolean(row.flagNaoPlanejada),
        flagSemTempo: Boolean(row.flagSemTempo),
        flagOvertime: Boolean(row.flagOvertime),
        flagMatchCritico: Boolean(row.flagMatchCritico),
        flagEntregaCritica: Boolean(row.flagEntregaCritica),
        matchTemporal: null,
        prioridade: row.prioridade,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    sendError(res, 500, "ALERTAS_QUERY_FAILED", "Falha ao consultar alertas", { message: error.message });
  }
});

// ── Alertas / Contagem ───────────────────────────────────────────────────────

app.get("/api/alertas/contagem", async (req, res) => {
  try {
    const params = {};
    let where = buildCanonAlertWhere(req.query, params);
    if (req.query.prioridade) {
      params.prioridade = String(req.query.prioridade).toLowerCase();
      where += ` AND CASE
        WHEN flag_entrega_critica OR flag_match_critico THEN 'critico'
        WHEN flag_overtime OR flag_nao_planejada OR flag_sem_tempo THEN 'atencao'
        ELSE 'ok'
      END = @prioridade`;
    }
    const rows = await runQuery(Q.alertasContagemQuery(projectId, dataset, where), params);
    res.json(rows[0] || { naoPlanejada: 0, semTempo: 0, overtime: 0, entregaCritica: 0, matchCritico: 0, total: 0 });
  } catch (error) {
    sendError(res, 500, "ALERTAS_COUNT_QUERY_FAILED", "Falha ao consultar contagem de alertas", { message: error.message });
  }
});

// ── Drill / Rotas ────────────────────────────────────────────────────────────

app.get("/api/drill-rotas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    let where = buildCanonWhere(req.query, params, {
      alias: "d",
      dateField: "d.data_referencia",
      filialField: "d.filial",
      transportadorField: "d.transportador",
      statusField: "d.status_tms",
      tipoVeiculoField: "d.tipo_veiculo",
      tipoFilialField: "d.tipo_filial",
      unitOnly: true,
    });
    if (req.query.prioridade) {
      params.prioridade = String(req.query.prioridade).toLowerCase();
      where += ` AND CASE
        WHEN d.flag_entrega_critica OR d.flag_match_critico THEN 'critico'
        WHEN d.flag_overtime OR d.flag_nao_planejada OR d.flag_sem_tempo THEN 'atencao'
        ELSE 'ok'
      END = @prioridade`;
    }
    const orderMap = {
      data: "d.data_referencia",
      scoreOperacional: "scoreOperacional",
      pedidos: "d.qtd_pedidos",
      volumes: "d.qtd_volumes",
      kmRealizado: "d.km_real",
      ocupacaoPeso: "d.ocup_peso_veiculo",
    };
    const sortField = orderMap[req.query.sort] || "d.data_referencia";
    const orderDirection = String(req.query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const countRows = await runQuery(Q.drillRotasCountQuery(projectId, dataset, where), params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(Q.drillRotasQuery(projectId, dataset, where, sortField, orderDirection), params);

    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.data),
        filial: row.filial,
        nomeFilial: row.nomeFilial || row.filial,
        regiao: row.regiao ?? null,
        transportador: truncateWords(normalizeEntityLabel(row.transportador, "Transportador não informado")),
        rota: row.rota,
        placa: row.placa,
        motorista: normalizeEntityLabel(row.motorista, "Motorista não informado"),
        tipoVeiculo: row.tipo_veiculo,
        status: row.status,
        pedidos: Number(row.pedidosRota ?? 0),
        volumes: Number(row.volumesRota ?? 0),
        peso: Number(row.pesoReal ?? 0),
        entregas: Number(row.entregues ?? 0),
        insucessos: Number(row.insucessos ?? 0),
        kmPlanejado: Number(row.kmPlanejado ?? 0),
        kmRealizado: Number(row.kmRealizado ?? 0),
        tempoPlanejado: Number(row.tempoPlaneadoH ?? 0),
        tempoRealizado: Number(row.tempoRealizadoH ?? 0),
        entregaEfetiva: Number(row.entregaEfetivaRota ?? 0),
        ocupacaoPeso: Number(row.ocupacaoPeso ?? 0),
        aderenciaVolumes: row.aderenciaVolumes == null ? null : Number(row.aderenciaVolumes),
        valorTotalRota: row.valorTotal == null ? null : Number(row.valorTotal),
        scoreOperacional: Number(row.scoreOperacional ?? 0),
        flagOvertime: Boolean(row.flagOvertime),
        flagEntregaCritica: Boolean(row.flagEntregaCritica),
        alertaOperacional: row.statusRota,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    sendError(res, 500, "DRILL_QUERY_FAILED", "Falha ao consultar drill de rotas", { message: error.message });
  }
});

// ── Transportadores ──────────────────────────────────────────────────────────

app.get("/api/transportadores", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere(req.query, params, canonOpts());
    const rows = await runQuery(Q.transportadoresQuery(projectId, dataset, where), params);
    res.json(rows.map((row) => ({
      transportador: truncateWords(normalizeEntityLabel(row.transportador, "Transportador não informado")),
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
      status: normalizeStatus(row.status_transportador ?? (Number(row.score_operacional ?? 0) >= 80 ? "OK" : Number(row.score_operacional ?? 0) >= 60 ? "Atencao" : "Critico")),
      statusCor: (normalizeStatus(row.status_transportador) === "OK") ? "#12B76A" : (normalizeStatus(row.status_transportador) === "Atenção") ? "#F79009" : "#F04438",
    })));
  } catch (error) {
    sendError(res, 500, "TRANSPORTADORES_QUERY_FAILED", "Falha ao consultar transportadores", { message: error.message });
  }
});

// ── Frota / Ocupação por Tipo ────────────────────────────────────────────────

app.get("/api/frota/ocupacao-tipo", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere(req.query, params, {
      dateField: "data_referencia",
      filialField: "filial",
      transportadorField: "transportador",
      statusField: "status_tms",
      tipoVeiculoField: "tipo_veiculo",
      tipoFilialField: "tipo_filial",
      unitOnly: true,
    });
    const rows = await runQuery(Q.frotaOcupacaoQuery(projectId, dataset, where), params);
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

// ── Motoristas ───────────────────────────────────────────────────────────────

app.get("/api/motoristas", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const params = { limit, offset };
    const where = buildCanonWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, canonOpts({ alias: "b", dateField: "b.data_referencia" }));
    const overtimeClause = String(req.query.overtime || "") === "true" ? " AND flag_overtime = TRUE" : "";

    const countRows = await runQuery(Q.motoristasCountQuery(projectId, dataset, where, overtimeClause), params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(Q.motoristasQuery(projectId, dataset, where, overtimeClause), params);

    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.data),
        filial: row.filial,
        nomeFilial: row.filial,
        transportador: truncateWords(normalizeEntityLabel(row.transportador, "Transportador não informado")),
        motorista: normalizeEntityLabel(row.motorista, "Motorista não informado"),
        placa: null,
        qtdRotas: Number(row.qtd_rotas ?? 0),
        horasJornada: Number(row.horas_jornada ?? 0),
        flagOvertime: Boolean(row.flag_overtime),
        entregas: Number(row.entregues ?? 0),
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

// ── Motoristas / KPIs ────────────────────────────────────────────────────────

app.get("/api/motoristas/kpis", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, canonOpts({ alias: "b", dateField: "b.data_referencia" }));
    const rows = await runQuery(Q.motoristasKpisQuery(projectId, dataset, where), params);
    res.json(rows[0] || { motoristasAtivos: 0, mediaRotasDia: 0, jornadaMedia: 0, qtdOvertime: 0, dpph: 0, volumesPerMotorista: 0, efetividadeMedia: 0 });
  } catch (error) {
    sendError(res, 500, "MOTORISTAS_KPIS_QUERY_FAILED", "Falha ao consultar KPIs de motoristas", { message: error.message });
  }
});

// ── KPI Diário ───────────────────────────────────────────────────────────────

app.get("/api/kpi-diario", async (req, res) => {
  try {
    const params = {};
    const where = buildCanonWhere(req.query, params, canonOpts());
    const rows = await runQuery(Q.kpiDiarioQuery(projectId, dataset, where), params);
    const row = rows[0] || {};
    res.json({
      data: formatDate(row.data),
      rotas: Number(row.rotas ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      volumes: Number(row.volumes ?? 0),
      entregas: Number(row.entregas ?? 0),
      insucessos: Number(row.insucessos ?? 0),
      veiculosAtivos: Number(row.veiculosAtivos ?? 0),
      motoristasAtivos: Number(row.motoristasAtivos ?? 0),
      totalKmRealizado: Number(row.totalKmRealizado ?? 0),
      totalPesoKg: Number(row.totalPesoKg ?? 0),
      sprPedidos: Number(row.sprPedidos ?? 0),
      sprVolumes: Number(row.sprVolumes ?? 0),
      pctEntregasEfetivas: Number(row.pctEntregasEfetivas ?? 0),
      pctRotasConcluidas: Number(row.pctRotasConcluidas ?? 0),
      tempoMedRealizado: Number(row.tempoMedRealizado ?? 0),
      pctUtilizacaoJornada: Number(row.pctUtilizacaoJornada ?? 0),
      pctOciosidadeJornada: Number(row.pctOciosidadeJornada ?? 0),
      pctRotasOvertime: Number(row.pctRotasOvertime ?? 0),
      pctOcupacaoPedidos: toNumberOrNull(row.pctOcupacaoPedidos),
      pctOcupacaoVolumes: toNumberOrNull(row.pctOcupacaoVolumes),
      pctOcupacaoPeso: toNumberOrNull(row.pctOcupacaoPeso),
      pctAderPedidos: toNumberOrNull(row.pctAderPedidos),
      pctAderVolumes: toNumberOrNull(row.pctAderVolumes),
      pctAderPeso: toNumberOrNull(row.pctAderPeso),
      pctAderKm: toNumberOrNull(row.pctAderKm),
      pctAderTempo: toNumberOrNull(row.pctAderTempo),
      pctMatchMesmoDia: toNumberOrNull(row.pctMatchMesmoDia),
      valorPagamentoTotal: Number(row.valorPagamentoTotal ?? 0),
      custoMedioCarga: Number(row.custoMedioCarga ?? 0),
      custoMedioVolume: Number(row.custoMedioVolume ?? 0),
      custoMedioPedido: Number(row.custoMedioPedido ?? 0),
      dpph: Number(row.dpph ?? 0),
      scoreOperacional: Number(row.scoreOperacional ?? 0),
      metaEntregas: toNumberOrNull(row.metaEntregas),
      metaRotasConcluidas: toNumberOrNull(row.metaRotasConcluidas),
      metaOcupacaoPeso: toNumberOrNull(row.metaOcupacaoPeso),
      metaAderenciaVolumes: toNumberOrNull(row.metaAderenciaVolumes),
      metaOrhTempo: toNumberOrNull(row.metaOrhTempo),
      gapOrhVsMeta: Number(row.gapOrhVsMeta ?? 0),
    });
  } catch (error) {
    sendError(res, 500, "KPI_DIARIO_QUERY_FAILED", "Falha ao consultar KPI diário", { message: error.message });
  }
});

// ── Executivo / Série Diária ─────────────────────────────────────────────────

app.get("/api/executivo/serie-diaria", async (req, res) => {
  try {
    const query = { ...req.query };
    if (!query.periodo) {
      const janela = resolveJanelaPeriodo(query.janela);
      query.periodo = `${janela.startDate},${janela.endDate}`;
    }
    const params = {};
    const where = buildCanonWhere(query, params, canonOpts());
    const rows = await runQuery(Q.serieDiariaQuery(projectId, dataset, where), params);
    res.json(rows.map((row) => ({
      data: formatDate(row.data),
      rotas: Number(row.rotas ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      volumes: Number(row.volumes ?? 0),
      entregasEfetivas: Number(row.entregasEfetivas ?? 0),
      sprPedidos: Number(row.sprPedidos ?? 0),
      sprVolumes: Number(row.sprVolumes ?? 0),
      scoreOperacional: Number(row.scoreOperacional ?? 0),
      ocupacaoPeso: Number(row.ocupacaoPeso ?? 0),
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

// ── Error Handler ────────────────────────────────────────────────────────────

app.use((error, _req, res, _next) => {
  if (String(error.message || "").startsWith("Origin not allowed")) {
    sendError(res, 403, "CORS_ORIGIN_DENIED", error.message);
    return;
  }
  sendError(res, 500, "UNHANDLED_ERROR", "Erro inesperado no servidor", { message: error.message });
});

app.listen(port, () => {
  console.log(`Dashboard API listening on port ${port}`);
  console.log(`BigQuery: ${projectId}.${dataset}`);
});
