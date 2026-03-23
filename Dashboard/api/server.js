import express from "express";
import cors from "cors";
import { BigQuery } from "@google-cloud/bigquery";

import {
  normalizeEntityKey, normalizeEntityLabel, uniqueOptions,
  normalizeStatus, colorHex, formatDate, toNumberOrNull,
  mapMetaKpiId, resolveJanelaPeriodo, bqNormalizeText,
  buildCanonWhere, buildCanonAlertWhere, buildCanonAlertTypeFilter, buildDateFilter,
  formatCardMetric, sendError,
} from "./helpers.js";

import * as Q from "./queries.js";

// ── Boot ────────────────────────────────────────────────────────────────────

const app = express();
const port = Number(process.env.PORT || 8080);
const projectId = process.env.BIGQUERY_PROJECT_ID || "data-aileron-482822-d0";
const dataset = process.env.BIGQUERY_DATASET || "monitoramento_carga";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:4173,http://localhost:5173,https://data-aileron-482822-d0.web.app,https://data-aileron-482822-d0.firebaseapp.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const bigquery = new BigQuery({ projectId });
const firebasePreviewPattern = /^https:\/\/data-aileron-482822-d0--[a-z0-9-]+\.web\.app$/i;
const lovablePattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i;
const lovableAppPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;

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

app.get("/health", (_req, res) => {
  res.json({ ok: true, projectId, dataset });
});

// ── Metas ────────────────────────────────────────────────────────────────────

app.get("/api/metas", async (_req, res) => {
  try {
    const rows = await runQuery(Q.metasQuery(projectId, dataset));
    res.json(rows.map((row) => ({
      kpiId: row["KPI ID"] || mapMetaKpiId(row.KPI),
      kpiNome: row.KPI,
      meta: Number(row.Meta ?? 0),
      sentido: row.Sentido,
      unidade: row.Unidade,
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
      const where = buildCanonAlertWhere(req.query, params, { alias: "a" });
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
        nomeFilial: normalizeEntityLabel(row.filial, row.filial),
        regiao: row.regiao,
        transportador: normalizeEntityLabel(row.transportador, "Transportador não informado"),
        rota: row.rota,
        rotaPlanejada: null,
        placa: row.placa,
        motorista: normalizeEntityLabel(row.motorista, "Motorista não informado"),
        tipoVeiculo: row.tipo_veiculo,
        status: row.status,
        statusRota: normalizeStatus(row.status_rota),
        cor: colorHex(row.status_rota_cor),
        pedidos: Number(row.qtd_pedidos ?? 0),
        volumes: Number(row.qtd_volumes ?? 0),
        peso: null,
        entregues: Number(row.qtd_entregues ?? 0),
        insucessos: Number(row.qtd_insucessos ?? 0),
        kmPlanejado: null,
        kmRealizado: null,
        tempoPlanejado: null,
        tempoRealizado: Number(row.tempo_operacional_h ?? 0),
        entregaEfetivaRota: Number(row.pct_entregas_efetivas ?? 0),
        ocupacaoComposta: Number(row.ocupacao_peso ?? 0),
        ocupacaoPeso: Number(row.ocupacao_peso ?? 0),
        flagNaoPlanejada: Boolean(row.flag_nao_planejada),
        flagSemTempo: Boolean(row.flag_sem_tempo),
        flagOvertime: Boolean(row.flag_overtime),
        flagMatchCritico: Boolean(row.flag_match_critico),
        flagEntregaCritica: Boolean(row.flag_entrega_critica),
        matchTemporal: row.match_temporal,
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
    const where = buildCanonAlertWhere(req.query, params);
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
      scoreOperacional: "score_operacional",
      pedidos: "d.qtd_pedidos",
      volumes: "d.qtd_volumes",
      kmRealizado: "d.km_realizado",
      ocupacaoComposta: "d.ocup_peso_veiculo",
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
        nomeFilial: row.filial,
        transportador: normalizeEntityLabel(row.transportador, "Transportador não informado"),
        rota: row.rota,
        placa: row.placa,
        motorista: normalizeEntityLabel(row.motorista, "Motorista não informado"),
        tipoVeiculo: row.tipo_veiculo,
        status: row.status,
        pedidos: Number(row.qtd_pedidos ?? 0),
        volumes: Number(row.qtd_volumes ?? 0),
        peso: Number(row.peso_real_kg ?? 0),
        entregas: Number(row.qtd_entregues ?? 0),
        insucessos: Number(row.qtd_insucessos ?? 0),
        kmPlanejado: Number(row.km_plan ?? 0),
        kmRealizado: Number(row.km_real ?? 0),
        tempoPlanejado: Number(row.tempo_plan_h ?? 0),
        tempoRealizado: Number(row.tempo_operacional_h ?? 0),
        entregaEfetiva: Number(row.pct_entregas_efetivas ?? 0),
        ocupacaoPedidos: row.ocupacao_pedidos == null ? null : Number(row.ocupacao_pedidos),
        ocupacaoVolumes: row.aderencia_volumes == null ? null : Number(row.aderencia_volumes),
        ocupacaoComposta: Number(row.ocupacao_composta ?? 0),
        ocupacaoPeso: Number(row.ocupacao_peso ?? 0),
        aderenciaVolumes: row.aderencia_volumes == null ? null : Number(row.aderencia_volumes),
        custoMedioCarga: row.valor_total == null ? null : Number(row.valor_total),
        scoreOperacional: Number(row.score_operacional ?? 0),
        flagOvertime: Boolean(row.flag_overtime),
        flagEntregaCritica: Boolean(row.flag_entrega_critica),
        alertaOperacional: row.match_temporal,
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
    const where = buildCanonWhere(req.query, params, {
      alias: "t",
      dateField: "t.data",
      filialField: "t.filial",
      transportadorField: "t.transportador",
      statusField: "t.status",
      tipoVeiculoField: "t.tipo_veiculo",
    });
    const rows = await runQuery(Q.transportadoresQuery(projectId, dataset, where), params);
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

// ── Frota / Ocupação por Tipo ────────────────────────────────────────────────

app.get("/api/frota/ocupacao-tipo", async (req, res) => {
  try {
    const params = {};
    let where = " WHERE 1 = 1";
    where += buildDateFilter("data_referencia", req.query.periodo, params);
    if (req.query.transportador) {
      params.transportador = normalizeEntityKey(req.query.transportador);
      where += ` AND ${bqNormalizeText}(transportador) = @transportador`;
    }
    if (req.query.tipoVeiculo) {
      params.tipoVeiculo = String(req.query.tipoVeiculo);
      where += " AND tipo_veiculo = @tipoVeiculo";
    }
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
    const where = buildCanonWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, { alias: "m", dateField: "m.data" });
    const overtimeClause = String(req.query.overtime || "") === "true" ? " AND flag_overtime = TRUE" : "";

    const countRows = await runQuery(Q.motoristasCountQuery(projectId, dataset, where, overtimeClause), params);
    const total = Number(countRows[0]?.total || 0);
    const rows = await runQuery(Q.motoristasQuery(projectId, dataset, where, overtimeClause), params);

    res.json({
      data: rows.map((row) => ({
        data: formatDate(row.data),
        filial: row.filial,
        nomeFilial: row.filial,
        transportador: normalizeEntityLabel(row.transportador, "Transportador não informado"),
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
    const where = buildCanonWhere({ ...req.query, periodo: req.query.periodo || req.query.data }, params, { alias: "m", dateField: "m.data" });
    const rows = await runQuery(Q.motoristasKpisQuery(projectId, dataset, where), params);
    res.json(rows[0] || { motoristasAtivos: 0, mediaRotasDia: 0, jornadaMedia: 0, qtdOvertime: 0, dpph: 0 });
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
      ...row,
      data: formatDate(row.data),
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
