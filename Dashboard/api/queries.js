// queries.js — SQL templates para todos os endpoints da API
// Cada função retorna uma string SQL pronta para execução via BigQuery.
// `ns` = namespace completo `project.dataset` para tabelas e UDFs.
//
// UNIDADES (2026-03-25):
// - peso_real_kg: pipeline_dashboard_v7.sql converte de gramas para kg na camada SQL
// - valor_total: pipeline_dashboard_v7.sql converte componentes de centavos para reais na camada SQL
// - capacidade_peso_kg (UDF) já está em KG — sem conversão
// - peso_plan_kg (planejamento) já está em KG — sem conversão
// FONTE ÚNICA DE CONVERSÃO: pipeline_dashboard_v7.sql (base_execucao_canonica)
//
// ARQUITETURA: Agregação dinâmica sobre base_execucao_canonica (camada atômica).
// Filtros são aplicados ANTES da agregação — por isso KPIs são recalculados em cada query.
// BigQuery cache mitiga o custo de recomputação.
//
// PADRÃO CANÔNICO:
// - Score operacional é calculado via `scoreExpr()` — função única, nunca duplicada
// - Metas vêm de `metas_globais` (view canônica), pivotadas via `metas_pivot_canonico`
// - Nomenclatura: snake_case no SQL, server.js converte para camelCase no response
//
// Última atualização: 2026-03-23

function ns(projectId, dataset) {
  return `${projectId}.${dataset}`;
}

// ── Score Operacional — Fragmento SQL canônico (DRY) ────────────────────────
// Gera a expressão SQL para fn_score_operacional a partir de argumentos nomeados.
// Elimina duplicação: antes era copiado 8+ vezes; agora é gerado por esta função.
//
// Parâmetros: expressões SQL em strings puras (sem escaping de backtick).
//   sprVol      — expressão que retorna SPR volumes
//   entregasEf  — expressão que retorna entregas efetivas (fração 0-1)
//   rotasConcl  — expressão que retorna rotas concluídas (fração 0-1)
//   orh         — expressão que retorna ORH tempo médio (horas)
//   aderVol     — expressão que retorna aderência volumes (fração 0-1 ou NULL)
//   volPlan     — expressão para volume planejado (determina se aderência é aplicável)
//   ocupPeso    — expressão que retorna ocupação peso (fração 0-1)

function scoreExpr(n, { sprVol, entregasEf, rotasConcl, orh, aderVol, volPlan, ocupPeso }, metasAlias) {
  const bq = (fn) => "`" + n + "." + fn + "`";
  const ma = metasAlias || "m";
  // Inline score: NULL-aware averaging that excludes 'Informativo' dimensions.
  // Fixes: fn_score_operacional UDF returns NULL when any status_score is NULL
  // (Informativo/Saturado), which propagates NULL through the SUM.
  const sc = (s) => "CASE " + s
    + " WHEN 'OK' THEN 1.0 WHEN 'Atencao' THEN 0.5 WHEN 'Critico' THEN 0.0"
    + " WHEN 'Saturado' THEN 0.0 ELSE CAST(NULL AS FLOAT64) END";
  const dims = [
    sc(bq("status_higher") + "(" + sprVol + ", " + ma + ".meta_spr_vol)"),
    sc(bq("status_higher") + "(" + entregasEf + ", " + ma + ".meta_entregas)"),
    sc(bq("status_higher") + "(" + rotasConcl + ", " + ma + ".meta_rotas)"),
    sc(bq("status_target_band") + "(" + orh + ", " + ma + ".meta_orh, 1.0, 2.1)"),
    sc("IF(" + volPlan + " > 0, " + bq("status_higher") + "(" + aderVol + ", " + ma + ".meta_ader_vol), 'Informativo')"),
    sc(bq("capacity_status") + "(" + ocupPeso + ")"),
  ];
  const sumExpr = dims.map((d) => "COALESCE(" + d + ", 0)").join(" + ");
  const cntExpr = dims.map((d) => "IF((" + d + ") IS NOT NULL, 1, 0)").join(" + ");
  return "ROUND((" + sumExpr + ") / NULLIF(" + cntExpr + ", 0) * 100.0, 1)";
}

// Helper: safe_div SQL expression
function sd(n, num, den) {
  return "`" + n + ".safe_div`(" + num + ", " + den + ")";
}

// Helper: adherence_ratio SQL expression
function ar(n, real, plan) {
  return "`" + n + ".adherence_ratio`(" + real + ", " + plan + ")";
}

// Alias curto para `metas_pivot_canonico` CTE
function metasCTE(n) {
  return "metas AS (SELECT * FROM `" + n + ".metas_pivot_canonico`)";
}

// Helper: standard aggregation base columns used by multiple queries
function stdAggCols(n, alias) {
  const b = alias;
  return `
        COUNT(DISTINCT ${b}.id_carga) AS qtd_rotas,
        SUM(${b}.qtd_pedidos) AS qtd_pedidos,
        SUM(${b}.qtd_volumes) AS qtd_volumes,
        SUM(${b}.qtd_entregues) AS qtd_entregas,
        SUM(${b}.qtd_insucessos) AS qtd_insucessos,
        SUM(${b}.tempo_operacional_h) AS tempo_oper_total,
        SUM(${b}.volumes_plan) AS volumes_plan,
        SUM(IF(${b}.possui_planejamento, ${b}.qtd_volumes, NULL)) AS volumes_com_plan,
        SUM(IF(${b}.capacidade_peso_kg IS NOT NULL, ${b}.peso_real_kg, NULL)) AS total_peso_kg,
        SUM(${b}.capacidade_peso_kg) AS capacidade_peso_total,
        COUNTIF(${b}.flag_rota_concluida) AS qtd_rotas_concluidas`;
}

// ── Metas ───────────────────────────────────────────────────────────────────

export function metasQuery(projectId, dataset) {
  return `
    SELECT
      kpi_id,
      kpi_nome,
      meta,
      sentido,
      unidade
    FROM \`${ns(projectId, dataset)}.metas_globais\`
    ORDER BY kpi_id
  `;
}

// ── Filtros ─────────────────────────────────────────────────────────────────

export function filterPeriodosQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT FORMAT_DATE('%Y-%m', b.data_referencia) AS value
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    AND b.data_referencia IS NOT NULL
    ORDER BY value DESC
    LIMIT 18
  `;
}

export function filterFiliaisQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT b.filial AS value, b.filial AS label
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    ORDER BY label
  `;
}

export function filterTransportadoresQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT
      b.transportador AS value,
      COALESCE(b.transportador_display, b.transportador) AS label
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    AND b.transportador IS NOT NULL AND TRIM(b.transportador) != ''
    ORDER BY label
  `;
}

export function filterTiposVeiculoQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT b.tipo_veiculo AS value
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    AND b.tipo_veiculo IS NOT NULL AND TRIM(b.tipo_veiculo) != ''
    ORDER BY value
  `;
}

export function filterStatusQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT b.status_tms AS value
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    AND b.status_tms IS NOT NULL AND TRIM(b.status_tms) != ''
    ORDER BY value
  `;
}

export function filterPrioridadesQuery(projectId, dataset, where) {
  return `
    SELECT DISTINCT CASE
      WHEN b.flag_entrega_critica OR b.flag_match_critico THEN 'Crítico'
      WHEN b.flag_overtime OR b.flag_nao_planejada THEN 'Atenção'
      ELSE 'OK'
    END AS value
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` b
    ${where}
    ORDER BY value
  `;
}

// ── Cards (Resumo) ──────────────────────────────────────────────────────────

export function cardsQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: sd(n, 'd.qtd_volumes', 'CAST(d.qtd_rotas AS FLOAT64)'),
    entregasEf: sd(n, 'd.qtd_entregas', 'd.qtd_entregas + d.qtd_insucessos'),
    rotasConcl: sd(n, 'CAST(d.qtd_rotas_concluidas AS FLOAT64)', 'CAST(d.qtd_rotas AS FLOAT64)'),
    orh: sd(n, 'd.tempo_oper_total', 'CAST(d.qtd_rotas AS FLOAT64)'),
    aderVol: ar(n, 'd.volumes_com_plan', 'd.volumes_plan'),
    volPlan: 'd.volumes_plan',
    ocupPeso: sd(n, 'd.total_peso_kg', 'NULLIF(d.capacidade_peso_total, 0)'),
  });
  return `
    WITH ${metasCTE(n)},
    daily AS (
      SELECT
        b.data_referencia AS data,
        COUNT(DISTINCT b.id_carga) AS qtd_rotas,
        SUM(b.qtd_pedidos) AS qtd_pedidos,
        SUM(b.qtd_volumes) AS qtd_volumes,
        SUM(b.qtd_entregues) AS qtd_entregas,
        SUM(b.qtd_insucessos) AS qtd_insucessos,
        SUM(b.tempo_operacional_h) AS tempo_oper_total,
        SUM(b.pedidos_plan) AS pedidos_plan,
        SUM(b.volumes_plan) AS volumes_plan,
        SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)) AS volumes_com_plan,
        SUM(b.peso_real_kg) AS total_peso_kg_all,
        SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)) AS total_peso_kg,
        SUM(b.capacidade_peso_kg) AS capacidade_peso_total,
        COUNTIF(b.flag_nao_planejada) AS qtd_nao_plan,
        COUNTIF(b.flag_rota_concluida) AS qtd_rotas_concluidas
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1
    ),
    kpis AS (
      SELECT d.*,
        \`${n}.safe_div\`(d.qtd_pedidos, CAST(d.qtd_rotas AS FLOAT64)) AS spr_pedidos,
        \`${n}.safe_div\`(d.qtd_volumes, CAST(d.qtd_rotas AS FLOAT64)) AS spr_volumes,
        \`${n}.safe_div\`(d.qtd_entregas, d.qtd_entregas + d.qtd_insucessos) AS entregas_efetivas,
        \`${n}.safe_div\`(d.tempo_oper_total, CAST(d.qtd_rotas AS FLOAT64)) AS orh,
        \`${n}.safe_div\`(d.total_peso_kg, NULLIF(d.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
        \`${n}.adherence_ratio\`(d.volumes_com_plan, d.volumes_plan) AS ader_vol,
        \`${n}.safe_div\`(d.volumes_com_plan, NULLIF(d.volumes_plan, 0)) AS ader_vol_exibicao,
        ROUND(\`${n}.safe_div\`(d.qtd_entregas, NULLIF(d.tempo_oper_total, 0)), 2) AS dpph,
        ${score} AS score_operacional
      FROM daily d
      CROSS JOIN metas m
    ),
    metrics AS (
      SELECT k.*,
        CAST(k.qtd_pedidos AS FLOAT64) AS pedidos_f,
        CAST(k.qtd_volumes AS FLOAT64) AS volumes_f,
        CAST(k.qtd_rotas AS FLOAT64) AS rotas_f,
        CAST(k.total_peso_kg_all AS FLOAT64) AS peso_total_f,
        k.ocup_peso_veiculo AS ocupacao_peso
      FROM kpis k
    ),
    ordered_complete AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn
      FROM metrics
      WHERE qtd_entregas > 0
        AND tempo_oper_total > 0
    ),
    ordered_fallback AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn
      FROM metrics
      WHERE qtd_entregas > 0
    ),
    source_choice AS (
      SELECT EXISTS(SELECT 1 FROM ordered_complete WHERE rn = 1) AS use_complete
    ),
    latest AS (
      SELECT oc.*
      FROM ordered_complete oc
      CROSS JOIN source_choice sc
      WHERE sc.use_complete AND oc.rn = 1
      UNION ALL
      SELECT ofb.*
      FROM ordered_fallback ofb
      CROSS JOIN source_choice sc
      WHERE NOT sc.use_complete AND ofb.rn = 1
    ),
    prev AS (
      SELECT oc.*
      FROM ordered_complete oc
      CROSS JOIN source_choice sc
      WHERE sc.use_complete AND oc.rn = 2
      UNION ALL
      SELECT ofb.*
      FROM ordered_fallback ofb
      CROSS JOIN source_choice sc
      WHERE NOT sc.use_complete AND ofb.rn = 2
    ),
    wow AS (
      SELECT *
      FROM metrics
      WHERE data = (SELECT DATE_SUB(data, INTERVAL 7 DAY) FROM latest)
    )
    SELECT metric.*
    FROM latest l
    LEFT JOIN prev p ON TRUE
    LEFT JOIN wow w ON TRUE
    CROSS JOIN UNNEST([
      STRUCT(1 AS sort_order, 'Qtd Pedidos' AS kpi, l.pedidos_f AS valor, CAST(NULL AS FLOAT64) AS meta, CAST(NULL AS FLOAT64) AS delta, 'Informativo' AS status, l.pedidos_f - COALESCE(p.pedidos_f, 0) AS trend_d1, l.pedidos_f - COALESCE(w.pedidos_f, 0) AS trend_wow, l.data AS database_dt, 'Avaliar volume e mix por filial' AS acao),
      STRUCT(2, 'Qtd Volumes', l.volumes_f, CAST(NULL AS FLOAT64), CAST(NULL AS FLOAT64), 'Informativo', l.volumes_f - COALESCE(p.volumes_f, 0), l.volumes_f - COALESCE(w.volumes_f, 0), l.data, 'Monitorar carga movimentada no escopo canônico'),
      STRUCT(3, 'Qtd Embarques', l.rotas_f, CAST(NULL AS FLOAT64), CAST(NULL AS FLOAT64), 'Informativo', l.rotas_f - COALESCE(p.rotas_f, 0), l.rotas_f - COALESCE(w.rotas_f, 0), l.data, 'Total de cargas/rotas embarcadas no recorte'),
      STRUCT(4, 'Peso Total', l.peso_total_f, CAST(NULL AS FLOAT64), CAST(NULL AS FLOAT64), 'Informativo', l.peso_total_f - COALESCE(p.peso_total_f, 0), l.peso_total_f - COALESCE(w.peso_total_f, 0), l.data, 'Acompanhar peso embarcado dos veículos em escopo'),
      STRUCT(5, 'SPR Volumes', l.spr_volumes, (SELECT meta_spr_vol FROM metas LIMIT 1), l.spr_volumes - (SELECT meta_spr_vol FROM metas LIMIT 1), \`${n}.status_higher\`(l.spr_volumes, (SELECT meta_spr_vol FROM metas LIMIT 1)), l.spr_volumes - COALESCE(p.spr_volumes, 0), l.spr_volumes - COALESCE(w.spr_volumes, 0), l.data, 'Rebalancear densidade de volumes por rota'),
      STRUCT(6, 'SPR Pedidos', l.spr_pedidos, (SELECT meta_spr_ped FROM metas LIMIT 1), l.spr_pedidos - (SELECT meta_spr_ped FROM metas LIMIT 1), \`${n}.status_higher\`(l.spr_pedidos, (SELECT meta_spr_ped FROM metas LIMIT 1)), l.spr_pedidos - COALESCE(p.spr_pedidos, 0), l.spr_pedidos - COALESCE(w.spr_pedidos, 0), l.data, 'Revisar consolidacao, mix e ocupacao'),
      STRUCT(7, 'Entregas Efetivas', l.entregas_efetivas, (SELECT meta_entregas FROM metas LIMIT 1), l.entregas_efetivas - (SELECT meta_entregas FROM metas LIMIT 1), \`${n}.status_higher\`(l.entregas_efetivas, (SELECT meta_entregas FROM metas LIMIT 1)), l.entregas_efetivas - COALESCE(p.entregas_efetivas, 0), l.entregas_efetivas - COALESCE(w.entregas_efetivas, 0), l.data, 'Atacar insucessos e janelas criticas'),
      STRUCT(8, 'Capacidade Utilizada', l.ocupacao_peso, (SELECT meta_ocup FROM metas LIMIT 1), l.ocupacao_peso - (SELECT meta_ocup FROM metas LIMIT 1), \`${n}.capacity_status\`(l.ocupacao_peso), l.ocupacao_peso - COALESCE(p.ocupacao_peso, 0), l.ocupacao_peso - COALESCE(w.ocupacao_peso, 0), l.data, 'Ajustar mix e capacidade por tipo de veiculo'),
      STRUCT(9, 'ORH', l.orh, (SELECT meta_orh FROM metas LIMIT 1), l.orh - (SELECT meta_orh FROM metas LIMIT 1), \`${n}.status_target_band\`(l.orh, (SELECT meta_orh FROM metas LIMIT 1), 1.0, 2.1), l.orh - COALESCE(p.orh, 0), l.orh - COALESCE(w.orh, 0), l.data, 'Rebalancear jornadas e overtime'),
      STRUCT(10, 'Aderencia Volumes', l.ader_vol_exibicao, (SELECT meta_ader_vol FROM metas LIMIT 1), l.ader_vol_exibicao - (SELECT meta_ader_vol FROM metas LIMIT 1), CASE WHEN l.ader_vol_exibicao > 1.05 THEN 'Crítico' ELSE \`${n}.status_higher\`(l.ader_vol_exibicao, (SELECT meta_ader_vol FROM metas LIMIT 1)) END, l.ader_vol_exibicao - COALESCE(p.ader_vol_exibicao, 0), l.ader_vol_exibicao - COALESCE(w.ader_vol_exibicao, 0), l.data, 'Revisar cobertura do planejamento publicado'),
      STRUCT(11, 'DPPH', l.dpph, (SELECT meta_dpph FROM metas LIMIT 1), l.dpph - (SELECT meta_dpph FROM metas LIMIT 1), \`${n}.status_higher\`(l.dpph, (SELECT meta_dpph FROM metas LIMIT 1)), l.dpph - COALESCE(p.dpph, 0), l.dpph - COALESCE(w.dpph, 0), l.data, 'Revisar produtividade por hora trabalhada')
    ]) AS metric
    ORDER BY metric.sort_order
  `;
}

// ── Tendência Semanal ───────────────────────────────────────────────────────

export function tendenciaSemanalQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: 'w.spr_volumes',
    entregasEf: 'w.pct_entregas_efetivas',
    rotasConcl: 'w.pct_rotas_concl',
    orh: 'w.orh',
    aderVol: 'w.ader_vol',
    volPlan: 'w.volumes_plan',
    ocupPeso: 'w.ocupacao_peso',
  });
  return `
    WITH metas AS (
      SELECT * FROM \`${n}.metas_pivot_canonico\`
    ),
    weekly AS (
      SELECT
        DATE_TRUNC(b.data_referencia, ISOWEEK) AS semana_inicio,
        DATE_ADD(DATE_TRUNC(b.data_referencia, ISOWEEK), INTERVAL 6 DAY) AS semana_fim,
        CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM b.data_referencia) AS STRING), 2, '0'), ' ', FORMAT_DATE('%d/%m', DATE_TRUNC(b.data_referencia, ISOWEEK)), '-', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(b.data_referencia, ISOWEEK), INTERVAL 6 DAY))) AS semana_label,
        FORMAT_DATE('%G-W%V', b.data_referencia) AS ano_semana,
        COUNT(DISTINCT b.id_carga) AS rotas,
        SUM(b.qtd_pedidos) AS pedidos,
        SUM(b.qtd_volumes) AS volumes,
        SUM(b.qtd_entregues) AS entregas,
        SUM(b.qtd_insucessos) AS insucessos,
        \`${n}.safe_div\`(SUM(b.qtd_entregues), SUM(b.qtd_entregues) + SUM(b.qtd_insucessos)) AS pct_entregas_efetivas,
        \`${n}.safe_div\`(SUM(b.qtd_pedidos), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)) AS spr_pedidos,
        \`${n}.safe_div\`(SUM(b.qtd_volumes), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)) AS spr_volumes,
        \`${n}.safe_div\`(SUM(b.tempo_operacional_h), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)) AS orh,
        \`${n}.adherence_ratio\`(SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)), SUM(b.volumes_plan)) AS ader_vol,
        \`${n}.safe_div\`(SUM(b.qtd_entregues), NULLIF(SUM(b.tempo_operacional_h), 0)) AS dpph,
        \`${n}.safe_div\`(CAST(COUNTIF(b.flag_rota_concluida) AS FLOAT64), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)) AS pct_rotas_concl,
        \`${n}.safe_div\`(SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)), NULLIF(SUM(b.capacidade_peso_kg), 0)) AS ocupacao_peso,
        SUM(b.volumes_plan) AS volumes_plan
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1, 2, 3, 4
    )
    SELECT w.*,
      ${score} AS score_operacional
    FROM weekly w
    CROSS JOIN metas m
    ORDER BY semana_inicio DESC
    LIMIT @semanas
  `;
}

// ── Filiais Performance ─────────────────────────────────────────────────────

export function filiaisPerformanceQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: sd(n, 'b.volumesReal', 'CAST(b.rotas AS FLOAT64)'),
    entregasEf: sd(n, 'b.entregues', 'b.entregues + b.insucessos'),
    rotasConcl: sd(n, 'CAST(b.rotasConcluidas AS FLOAT64)', 'CAST(b.rotas AS FLOAT64)'),
    orh: sd(n, 'b.tempoReal', 'CAST(b.rotas AS FLOAT64)'),
    aderVol: ar(n, 'b.volumesComPlan', 'b.volumesPlan'),
    volPlan: 'b.volumesPlan',
    ocupPeso: sd(n, 'b.pesoRealCapacidade', 'NULLIF(b.capacidadePesoTotal, 0)'),
  }, 'mp');
  return `
    WITH base AS (
      SELECT
        b.filial AS filial,
        ANY_VALUE(b.tipo_filial) AS tipoFilial,
        ANY_VALUE(b.regiao) AS regiao,
        ANY_VALUE(b.meta_spr_filial) AS metaSprFilial,
        COUNT(DISTINCT b.data_referencia) AS diasCobertos,
        COUNT(DISTINCT b.id_carga) AS rotas,
        COUNT(DISTINCT CASE WHEN b.placa IS NOT NULL AND b.placa != '' THEN UPPER(b.placa) END) AS placasDistintas,
        SUM(b.qtd_pedidos) AS pedidosReal,
        SUM(b.pedidos_plan) AS pedidosPlan,
        SUM(b.qtd_volumes) AS volumesReal,
        SUM(b.volumes_plan) AS volumesPlan,
        SUM(b.peso_real_kg) AS pesoReal,
        SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)) AS pesoRealCapacidade,
        SUM(b.peso_plan_kg) AS pesoPlan,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        SUM(b.tempo_operacional_h) AS tempoReal,
        SUM(b.tempo_plan_h) AS tempoPlan,
        SUM(b.km_real) AS kmReal,
        SUM(b.km_plan) AS kmPlan,
        COUNTIF(b.flag_rota_concluida) AS rotasConcluidas,
        SUM(b.capacidade_peso_kg) AS capacidadePesoTotal,
        -- Somente rotas com planejamento (para aderência)
        SUM(IF(b.possui_planejamento, b.qtd_pedidos, NULL)) AS pedidosComPlan,
        SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)) AS volumesComPlan,
        SUM(IF(b.possui_planejamento, b.peso_real_kg, NULL)) AS pesoComPlan,
        SUM(IF(b.possui_planejamento, b.km_real, NULL)) AS kmComPlan,
        SUM(IF(b.possui_planejamento, b.tempo_operacional_h, NULL)) AS tempoComPlan
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1
    )
    SELECT
      b.filial AS filial,
      b.filial AS nomeFilial,
      b.tipoFilial AS tipoFilial,
      b.regiao AS regiao,
      COALESCE(b.metaSprFilial, mp.meta_spr_ped) AS metaSpr,
      mp.meta_spr_vol AS metaSprVolumes,
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
      ROUND(\`${n}.safe_div\`(b.entregues, b.entregues + b.insucessos), 4) AS entregasEfetivas,
      ROUND(\`${n}.safe_div\`(b.volumesReal, CAST(b.rotas AS FLOAT64)), 2) AS sprVolumesReal,
      ROUND(\`${n}.safe_div\`(b.pedidosReal, CAST(b.rotas AS FLOAT64)), 2) AS sprPedidosReal,
      ROUND(\`${n}.safe_div\`(b.pedidosReal, CAST(b.rotas AS FLOAT64)) - COALESCE(b.metaSprFilial, mp.meta_spr_ped), 2) AS sprVsMeta,
      ROUND(b.tempoReal, 2) AS tempoReal,
      ROUND(b.tempoPlan, 2) AS tempoPlan,
      ROUND(b.tempoReal - b.tempoPlan, 2) AS desvioTempoH,
      ROUND(\`${n}.safe_div\`(b.tempoReal - b.tempoPlan, NULLIF(b.tempoPlan, 0)), 4) AS desvioTempoPct,
      ROUND(b.kmReal, 2) AS kmReal,
      ROUND(b.kmPlan, 2) AS kmPlan,
      ROUND(\`${n}.safe_div\`(CAST(b.rotasConcluidas AS FLOAT64), CAST(b.rotas AS FLOAT64)), 4) AS progressoPct,
      ${score} AS scoreOperacional,
      ROUND(\`${n}.safe_div\`(b.pedidosComPlan, NULLIF(b.pedidosPlan, 0)), 4) AS aderenciaPedidos,
      ROUND(\`${n}.safe_div\`(b.volumesComPlan, NULLIF(b.volumesPlan, 0)), 4) AS aderenciaVolumes,
      ROUND(\`${n}.safe_div\`(b.pesoComPlan, NULLIF(b.pesoPlan, 0)), 4) AS aderenciaPeso,
      ROUND(\`${n}.safe_div\`(b.kmComPlan, NULLIF(b.kmPlan, 0)), 4) AS aderenciaKm,
      ROUND(\`${n}.safe_div\`(b.tempoComPlan, NULLIF(b.tempoPlan, 0)), 4) AS aderenciaTempo
    FROM base b
    CROSS JOIN \`${n}.metas_pivot_canonico\` mp
    ORDER BY scoreOperacional DESC, filial
  `;
}

// ── Alertas ─────────────────────────────────────────────────────────────────

export function alertasCountQuery(projectId, dataset, where) {
  return `
    SELECT COUNT(*) AS total
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` a
    ${where}
    AND (a.flag_nao_planejada OR a.flag_sem_tempo OR a.flag_overtime OR a.flag_entrega_critica OR a.flag_match_critico)
  `;
}

export function alertasQuery(projectId, dataset, where) {
  return `
    SELECT
      a.data_referencia AS data,
      a.filial,
      a.filial AS nomeFilial,
      a.regiao,
      a.tipo_filial AS tipoFilial,
      COALESCE(a.transportador_display, a.transportador, 'Não informado') AS transportador,
      a.rota,
      a.placa,
      COALESCE(a.motorista_display, a.motorista) AS motorista,
      a.tipo_veiculo,
      a.status_tms AS status,
      a.qtd_pedidos AS pedidosRota,
      a.qtd_volumes AS volumesRota,
      ROUND(a.peso_real_kg, 2) AS pesoReal,
      a.pedidos_plan AS pedidosPlanejados,
      a.volumes_plan AS volumesPlanejados,
      ROUND(a.km_plan, 2) AS kmPlanejado,
      ROUND(a.km_real, 2) AS kmRealizado,
      ROUND(a.tempo_plan_h, 2) AS tempoPlaneadoH,
      ROUND(a.tempo_operacional_h, 2) AS tempoRealizadoH,
      a.qtd_entregues AS entregues,
      a.qtd_insucessos AS insucessos,
      ROUND(a.pct_entrega_efetiva, 4) AS entregaEfetivaRota,
      ROUND(a.aderencia_volumes, 4) AS aderenciaVolumes,
      ROUND(a.peso_real_kg / NULLIF(a.capacidade_peso_kg, 0), 4) AS ocupacaoPeso,
      a.flag_rota_concluida AS rotaConcluida,
      a.flag_nao_planejada AS flagNaoPlanejada,
      a.flag_overtime AS flagOvertime,
      a.flag_sem_tempo AS flagSemTempo,
      a.flag_entrega_critica AS flagEntregaCritica,
      a.flag_match_critico AS flagMatchCritico,
      CASE
        WHEN a.flag_entrega_critica OR a.flag_match_critico THEN 'Crítico'
        WHEN a.flag_overtime OR a.flag_sem_tempo OR a.flag_nao_planejada THEN 'Atenção'
        ELSE 'OK'
      END AS statusRota,
      CASE
        WHEN a.flag_entrega_critica OR a.flag_match_critico THEN '#F04438'
        WHEN a.flag_overtime OR a.flag_sem_tempo OR a.flag_nao_planejada THEN '#F79009'
        ELSE '#12B76A'
      END AS statusRotaCor,
      CASE
        WHEN a.flag_entrega_critica OR a.flag_match_critico THEN 'Crítico'
        WHEN a.flag_overtime OR a.flag_sem_tempo OR a.flag_nao_planejada THEN 'Atenção'
        ELSE 'OK'
      END AS prioridade
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` a
    ${where}
    AND (a.flag_nao_planejada OR a.flag_sem_tempo OR a.flag_overtime OR a.flag_entrega_critica OR a.flag_match_critico)
    ORDER BY a.data_referencia DESC, prioridade ASC, a.rota ASC
    LIMIT @limit OFFSET @offset
  `;
}

export function alertasContagemQuery(projectId, dataset, where) {
  return `
    -- IMPORTANTE: Uma rota pode ter múltiplas flags true simultaneamente.
    -- A soma das sub-categorias (naoPlanejada + semTempo + overtime + entregaCritica + matchCritico)
    -- pode EXCEDER o total de rotas, pois cada flag é contada independentemente.
    -- Exemplo: uma rota pode ter flag_overtime=true E flag_entrega_critica=true ao mesmo tempo.
    SELECT
      COUNTIF(flag_nao_planejada) AS naoPlanejada,
      COUNTIF(flag_sem_tempo) AS semTempo,
      COUNTIF(flag_overtime) AS overtime,
      COUNTIF(flag_entrega_critica) AS entregaCritica,
      COUNTIF(flag_match_critico) AS matchCritico,
      COUNT(*) AS total
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\`
    ${where}
  `;
}

// ── Drill Rotas ─────────────────────────────────────────────────────────────

export function drillRotasCountQuery(projectId, dataset, where) {
  return `
    SELECT COUNT(*) AS total
    FROM \`${ns(projectId, dataset)}.base_execucao_canonica\` d
    ${where}
  `;
}

export function drillRotasQuery(projectId, dataset, where, sortField, orderDirection) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: 'd.qtd_volumes',
    entregasEf: 'd.pct_entrega_efetiva',
    rotasConcl: 'IF(d.flag_rota_concluida, 1.0, 0.0)',
    orh: 'd.tempo_operacional_h',
    aderVol: 'd.aderencia_volumes',
    volPlan: 'COALESCE(d.volumes_plan, 0)',
    ocupPeso: '(d.peso_real_kg / NULLIF(d.capacidade_peso_kg, 0))',
  });
  return `
    SELECT
      d.data_referencia AS data,
      d.filial,
      d.filial AS nomeFilial,
      d.regiao,
      d.tipo_filial AS tipoFilial,
      COALESCE(d.transportador_display, d.transportador, 'Não informado') AS transportador,
      d.rota,
      d.placa,
      COALESCE(d.motorista_display, d.motorista) AS motorista,
      d.tipo_veiculo,
      d.status_tms AS status,
      d.qtd_pedidos AS pedidosRota,
      d.qtd_volumes AS volumesRota,
      ROUND(d.peso_real_kg, 2) AS pesoReal,
      d.pedidos_plan AS pedidosPlanejados,
      d.volumes_plan AS volumesPlanejados,
      ROUND(d.km_plan, 2) AS kmPlanejado,
      ROUND(d.km_real, 2) AS kmRealizado,
      ROUND(d.tempo_plan_h, 2) AS tempoPlaneadoH,
      ROUND(d.tempo_operacional_h, 2) AS tempoRealizadoH,
      d.qtd_entregues AS entregues,
      d.qtd_insucessos AS insucessos,
      ROUND(d.pct_entrega_efetiva, 4) AS entregaEfetivaRota,
      ROUND(d.aderencia_volumes, 4) AS aderenciaVolumes,
      ROUND(d.peso_real_kg / NULLIF(d.capacidade_peso_kg, 0), 4) AS ocupacaoPeso,
      ROUND(d.valor_total, 2) AS valorTotal,
      d.flag_rota_concluida AS rotaConcluida,
      d.flag_nao_planejada AS flagNaoPlanejada,
      d.flag_overtime AS flagOvertime,
      d.flag_sem_tempo AS flagSemTempo,
      d.flag_entrega_critica AS flagEntregaCritica,
      d.flag_match_critico AS flagMatchCritico,
      CASE
        WHEN d.flag_entrega_critica OR d.flag_match_critico THEN 'Crítico'
        WHEN d.flag_overtime OR d.flag_sem_tempo OR d.flag_nao_planejada THEN 'Atenção'
        ELSE 'OK'
      END AS prioridade,
      CASE
        WHEN d.flag_entrega_critica OR d.flag_match_critico THEN 'Crítico'
        WHEN d.flag_overtime OR d.flag_nao_planejada THEN 'Atenção'
        WHEN d.flag_rota_concluida THEN 'OK'
        ELSE 'Pendente'
      END AS statusRota,
      ${score} AS scoreOperacional
    FROM \`${n}.base_execucao_canonica\` d
    CROSS JOIN \`${n}.metas_pivot_canonico\` m
    ${where}
    ORDER BY ${sortField} ${orderDirection}, d.rota ASC
    LIMIT @limit OFFSET @offset
  `;
}

// ── Transportadores ─────────────────────────────────────────────────────────

export function transportadoresQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: sd(n, 'b.volumes', 'CAST(b.rotas AS FLOAT64)'),
    entregasEf: sd(n, 'b.entregues', 'b.entregues + b.insucessos'),
    rotasConcl: sd(n, 'CAST(b.rotas_concluidas AS FLOAT64)', 'CAST(b.rotas AS FLOAT64)'),
    orh: sd(n, 'b.tempo_oper_total', 'CAST(b.rotas AS FLOAT64)'),
    aderVol: ar(n, 'b.volumes_com_plan', 'b.volumes_plan'),
    volPlan: 'b.volumes_plan',
    ocupPeso: sd(n, 'b.peso_total', 'NULLIF(b.capacidade_peso_total, 0)'),
  });
  return `
    WITH
    base AS (
      SELECT
        COALESCE(NULLIF(TRIM(b.transportador_display), ''), NULLIF(TRIM(b.transportador), ''), 'Transportador não informado') AS transportador,
        COUNT(DISTINCT b.id_carga) AS rotas,
        SUM(b.qtd_pedidos) AS pedidos,
        SUM(b.qtd_volumes) AS volumes,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        SUM(b.tempo_operacional_h) AS tempo_oper_total,
        SUM(b.volumes_plan) AS volumes_plan,
        SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)) AS volumes_com_plan,
        COUNTIF(b.flag_rota_concluida) AS rotas_concluidas,
        SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)) AS peso_total,
        SUM(b.capacidade_peso_kg) AS capacidade_peso_total,
        SUM(b.valor_total) AS valor_total
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1
    ),
    scored AS (
      SELECT
        b.transportador,
        b.rotas,
        ROUND(\`${n}.safe_div\`(CAST(b.rotas AS FLOAT64), SUM(b.rotas) OVER ()), 4) AS share,
        ROUND(\`${n}.safe_div\`(b.valor_total, NULLIF(b.rotas, 0)), 2) AS custo_medio_carga,
        ROUND(\`${n}.safe_div\`(b.valor_total, NULLIF(b.volumes, 0)), 2) AS custo_medio_volume,
        ROUND(\`${n}.safe_div\`(b.valor_total, NULLIF(b.pedidos, 0)), 2) AS custo_medio_pedido,
        ROUND(\`${n}.safe_div\`(b.entregues, b.entregues + b.insucessos), 4) AS entregas_efetivas,
        ${score} AS score_operacional,
        ROUND(\`${n}.safe_div\`(b.pedidos, CAST(b.rotas AS FLOAT64)), 2) AS spr_pedidos,
        ROUND(\`${n}.safe_div\`(b.volumes, CAST(b.rotas AS FLOAT64)), 2) AS spr_volumes,
        b.pedidos,
        b.volumes,
        ROUND(b.valor_total, 2) AS valor_total
      FROM base b
      CROSS JOIN \`${n}.metas_pivot_canonico\` m
    )
    SELECT s.*,
      CASE
        WHEN s.score_operacional >= 80 THEN 'OK'
        WHEN s.score_operacional >= 60 THEN 'Atencao'
        ELSE 'Critico'
      END AS status_transportador
    FROM scored s
    ORDER BY s.rotas DESC, s.transportador
  `;
}

// ── Frota / Ocupação por Tipo ───────────────────────────────────────────────

export function frotaOcupacaoQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  return `
    SELECT
      tipo_veiculo,
      COUNT(*) AS rotas,
      COUNT(DISTINCT placa) AS placas_distintas,
      ROUND(AVG(qtd_pedidos), 2) AS media_pedidos_rota,
      ROUND(AVG(qtd_volumes), 2) AS media_volumes_rota,
      ROUND(AVG(peso_real_kg), 2) AS media_peso_rota,
      SUM(peso_real_kg) AS peso_total_kg,
      SUM(capacidade_peso_kg) AS capacidade_peso_total_kg,
      ROUND(\`${n}.safe_div\`(SUM(IF(capacidade_peso_kg IS NOT NULL, peso_real_kg, NULL)), NULLIF(SUM(capacidade_peso_kg), 0)), 4) AS ocupacao_peso,
      ROUND(\`${n}.safe_div\`(SUM(qtd_volumes), NULLIF(COUNT(*), 0)), 2) AS spr_por_veiculo,
      ROUND(\`${n}.safe_div\`(SUM(tempo_operacional_h), NULLIF(COUNT(*), 0)), 2) AS orh,
      ROUND(\`${n}.safe_div\`(SUM(valor_total), NULLIF(SUM(qtd_volumes), 0)), 2) AS custo_medio_volume
    FROM \`${n}.base_execucao_canonica\`
    ${where}
    AND tipo_filial = 'Unidade'
    AND tipo_veiculo IS NOT NULL AND TRIM(tipo_veiculo) != ''
    GROUP BY tipo_veiculo
    ORDER BY rotas DESC, tipo_veiculo
  `;
}

// ── Motoristas ──────────────────────────────────────────────────────────────

export function motoristasCountQuery(projectId, dataset, where, overtimeClause) {
  const n = ns(projectId, dataset);
  return `
    WITH motorista_dia AS (
      SELECT
        b.data_referencia AS data,
        b.motorista_key_canonico AS motorista_key,
        COALESCE(b.motorista_display, b.motorista) AS motorista,
        COALESCE(b.transportador_display, b.transportador, 'Não informado') AS transportador,
        COALESCE(b.filial, 'Não informado') AS filial,
        COUNT(DISTINCT b.id_carga) AS qtd_rotas,
        SUM(b.tempo_operacional_h) AS horas_jornada,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        MAX(CASE WHEN b.flag_overtime THEN TRUE ELSE FALSE END) AS flag_overtime
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1, 2, 3, 4, 5
    )
    SELECT COUNT(*) AS total
    FROM motorista_dia m
    WHERE 1=1${overtimeClause}
      AND (COALESCE(m.horas_jornada, 0) > 0 OR COALESCE(m.entregues, 0) + COALESCE(m.insucessos, 0) > 0)
  `;
}

export function motoristasQuery(projectId, dataset, where, overtimeClause) {
  const n = ns(projectId, dataset);
  // Score calculado pós-agregação (alias md.*) para evitar GROUP BY em colunas de meta.
  const score = scoreExpr(n, {
    sprVol: sd(n, 'md.volumes', 'CAST(md.qtd_rotas AS FLOAT64)'),
    entregasEf: sd(n, 'md.entregues', 'md.entregues + md.insucessos'),
    rotasConcl: sd(n, 'CAST(md.rotas_concluidas AS FLOAT64)', 'CAST(md.qtd_rotas AS FLOAT64)'),
    orh: sd(n, 'md.horas_jornada', 'CAST(md.qtd_rotas AS FLOAT64)'),
    aderVol: ar(n, 'md.volumes', 'md.volumes_plan'),
    volPlan: 'md.volumes_plan',
    ocupPeso: sd(n, 'md.peso_capacidade', 'NULLIF(md.capacidade_peso_total, 0)'),
  });
  return `
    WITH motorista_dia AS (
      SELECT
        b.data_referencia AS data,
        b.motorista_key_canonico AS motorista_key,
        COALESCE(b.motorista_display, b.motorista) AS motorista,
        COALESCE(b.transportador_display, b.transportador, 'Não informado') AS transportador,
        COALESCE(b.filial, 'Não informado') AS filial,
        COUNT(DISTINCT b.id_carga) AS qtd_rotas,
        SUM(b.tempo_operacional_h) AS horas_jornada,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        SUM(b.qtd_pedidos) AS pedidos,
        SUM(b.qtd_volumes) AS volumes,
        SUM(b.volumes_plan) AS volumes_plan,
        COUNTIF(b.flag_rota_concluida) AS rotas_concluidas,
        SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)) AS peso_capacidade,
        SUM(b.capacidade_peso_kg) AS capacidade_peso_total,
        MAX(CASE WHEN b.flag_overtime THEN TRUE ELSE FALSE END) AS flag_overtime,
        ROUND(\`${n}.safe_div\`(SUM(b.qtd_entregues), SUM(b.qtd_entregues) + SUM(b.qtd_insucessos)), 4) AS pct_entregas_efetivas
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1, 2, 3, 4, 5
    )
    SELECT
      md.data, md.motorista_key, md.motorista, md.transportador, md.filial,
      md.qtd_rotas, md.horas_jornada, md.entregues, md.insucessos,
      md.pedidos, md.volumes, md.flag_overtime, md.pct_entregas_efetivas,
      ${score} AS score_operacional
    FROM motorista_dia md
    CROSS JOIN \`${n}.metas_pivot_canonico\` m
    WHERE 1=1
    ${overtimeClause}
      AND (COALESCE(md.horas_jornada, 0) > 0 OR COALESCE(md.entregues, 0) + COALESCE(md.insucessos, 0) > 0)
    ORDER BY md.data DESC, md.flag_overtime DESC, md.horas_jornada DESC, md.motorista ASC
    LIMIT @limit OFFSET @offset
  `;
}

export function motoristasKpisQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  return `
    WITH motorista_dia AS (
      SELECT
        b.motorista_key_canonico AS motorista_key,
        COUNT(DISTINCT b.id_carga) AS qtd_rotas,
        SUM(b.tempo_operacional_h) AS horas_jornada,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        SUM(b.qtd_volumes) AS volumes,
        MAX(CASE WHEN b.flag_overtime THEN TRUE ELSE FALSE END) AS flag_overtime
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1, b.data_referencia
    )
    SELECT
      COUNT(DISTINCT motorista_key) AS motoristasAtivos,
      ROUND(AVG(qtd_rotas), 2) AS mediaRotasDia,
      ROUND(AVG(horas_jornada), 2) AS jornadaMedia,
      COUNT(DISTINCT CASE WHEN flag_overtime THEN motorista_key END) AS qtdOvertime,
      ROUND(\`${n}.safe_div\`(SUM(entregues), NULLIF(SUM(horas_jornada), 0)), 2) AS dpph,
      ROUND(\`${n}.safe_div\`(SUM(volumes), NULLIF(COUNT(DISTINCT motorista_key), 0)), 1) AS volumesPerMotorista,
      ROUND(\`${n}.safe_div\`(SUM(entregues), NULLIF(SUM(entregues) + SUM(insucessos), 0)), 4) AS efetividadeMedia
    FROM motorista_dia m
    WHERE COALESCE(m.horas_jornada, 0) > 0 OR COALESCE(m.entregues, 0) > 0 OR COALESCE(m.insucessos, 0) > 0
  `;
}

// ── KPI Diário ──────────────────────────────────────────────────────────────

export function kpiDiarioQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: 'sprVolumes',
    entregasEf: 'pctEntregasEfetivas',
    rotasConcl: 'pctRotasConcluidas',
    orh: 'tempoMedRealizado',
    aderVol: 'pctAderVolumes',
    volPlan: 'CASE WHEN pctAderVolumes IS NOT NULL THEN 1 ELSE 0 END',
    ocupPeso: 'pctOcupacaoComposta',
  });
  return `
    WITH daily AS (
      SELECT
        b.data_referencia AS data,
        COUNT(DISTINCT b.id_carga) AS rotas,
        SUM(b.qtd_pedidos) AS pedidos,
        SUM(b.qtd_volumes) AS volumes,
        SUM(b.qtd_entregues) AS entregas,
        SUM(b.qtd_insucessos) AS insucessos,
        COUNT(DISTINCT CASE WHEN b.placa IS NOT NULL AND b.placa != '' THEN UPPER(b.placa) END) AS veiculosAtivos,
        COUNT(DISTINCT b.motorista_key_canonico) AS motoristasAtivos,
        SUM(b.km_real) AS totalKmRealizado,
        SUM(b.peso_real_kg) AS totalPesoKg,
        SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)) AS totalPesoKgCapacidade,
        -- Aderência: numerador restrito a rotas COM planejamento
        SUM(IF(b.possui_planejamento, b.qtd_pedidos, NULL)) AS pedidosComPlan,
        SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)) AS volumesComPlan,
        SUM(IF(b.possui_planejamento, b.peso_real_kg, NULL)) AS pesoComPlan,
        SUM(IF(b.possui_planejamento, b.tempo_operacional_h, NULL)) AS tempoComPlan,
        SUM(IF(b.possui_planejamento, b.km_real, NULL)) AS kmComPlan,
        SUM(b.pedidos_plan) AS pedidosPlan,
        SUM(b.volumes_plan) AS volumesPlan,
        SUM(b.peso_plan_kg) AS pesoPlanKg,
        SUM(b.tempo_operacional_h) AS tempoOperacionalTotal,
        SUM(b.km_plan) AS kmPlan,
        SUM(b.tempo_plan_h) AS tempoPlan,
        COUNTIF(b.flag_rota_concluida) AS rotasConcluidas,
        COUNTIF(b.flag_overtime) AS rotasOvertime,
        COUNTIF(b.flag_nao_planejada) AS qtdNaoPlanejada,
        COUNTIF(b.possui_planejamento) AS rotasPlanejadas,
        COUNTIF(b.flag_match_mesmo_dia) AS matchMesmoDia,
        ROUND(SUM(b.valor_total), 2) AS valorPagamentoTotal,
        SUM(b.capacidade_peso_kg) AS capacidadePesoTotalKg
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1
    ),
    ordered_complete AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn
      FROM daily
      WHERE entregas > 0
        AND tempoOperacionalTotal > 0
    ),
    ordered_fallback AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY data DESC) AS rn
      FROM daily
      WHERE entregas > 0
    ),
    source_choice AS (
      SELECT EXISTS(SELECT 1 FROM ordered_complete WHERE rn = 1) AS use_complete
    ),
    agg AS (
      SELECT oc.*
      FROM ordered_complete oc
      CROSS JOIN source_choice sc
      WHERE sc.use_complete AND oc.rn = 1
      UNION ALL
      SELECT ofb.*
      FROM ordered_fallback ofb
      CROSS JOIN source_choice sc
      WHERE NOT sc.use_complete AND ofb.rn = 1
    ),
    metrics AS (
      SELECT
        o.data,
        o.rotas,
        o.rotasConcluidas,
        o.rotasPlanejadas,
        o.qtdNaoPlanejada,
        o.pedidos,
        o.volumes,
        o.entregas,
        o.insucessos,
        o.veiculosAtivos,
        o.motoristasAtivos,
        o.totalKmRealizado,
        o.totalPesoKg,
        \`${n}.safe_div\`(o.pedidos, CAST(o.rotas AS FLOAT64)) AS sprPedidos,
        \`${n}.safe_div\`(o.volumes, CAST(o.rotas AS FLOAT64)) AS sprVolumes,
        \`${n}.safe_div\`(o.entregas, o.entregas + o.insucessos) AS pctEntregasEfetivas,
        \`${n}.safe_div\`(CAST(o.rotasConcluidas AS FLOAT64), CAST(o.rotas AS FLOAT64)) AS pctRotasConcluidas,
        \`${n}.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64)) AS tempoMedRealizado,
        \`${n}.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64) * 8.0) AS pctUtilizacaoJornada,
        GREATEST(0, 1.0 - IFNULL(\`${n}.safe_div\`(o.tempoOperacionalTotal, CAST(o.rotas AS FLOAT64) * 8.0), 0)) AS pctOciosidadeJornada,
        \`${n}.safe_div\`(CAST(o.rotasOvertime AS FLOAT64), CAST(o.rotas AS FLOAT64)) AS pctRotasOvertime,
        \`${n}.safe_div\`(o.pedidos, NULLIF(o.pedidosPlan, 0)) AS pctOcupacaoPedidos,
        \`${n}.safe_div\`(o.volumes, NULLIF(o.volumesPlan, 0)) AS pctOcupacaoVolumes,
        \`${n}.safe_div\`(o.totalPesoKgCapacidade, NULLIF(o.capacidadePesoTotalKg, 0)) AS pctOcupacaoComposta,
        \`${n}.safe_div\`(o.totalPesoKgCapacidade, NULLIF(o.capacidadePesoTotalKg, 0)) AS pctOcupacaoPeso,
        \`${n}.safe_div\`(o.pedidosComPlan, NULLIF(o.pedidosPlan, 0)) AS pctAderPedidos,
        \`${n}.safe_div\`(o.volumesComPlan, NULLIF(o.volumesPlan, 0)) AS pctAderVolumes,
        \`${n}.safe_div\`(o.pesoComPlan, NULLIF(o.pesoPlanKg, 0)) AS pctAderPeso,
        \`${n}.safe_div\`(o.kmComPlan, NULLIF(o.kmPlan, 0)) AS pctAderKm,
        \`${n}.safe_div\`(o.tempoComPlan, NULLIF(o.tempoPlan, 0)) AS pctAderTempo,
        \`${n}.safe_div\`(CAST(o.matchMesmoDia AS FLOAT64), NULLIF(CAST(o.rotasPlanejadas AS FLOAT64), 0)) AS pctMatchMesmoDia,
        o.valorPagamentoTotal,
        ROUND(\`${n}.safe_div\`(o.valorPagamentoTotal, CAST(o.rotas AS FLOAT64)), 2) AS custoMedioCarga,
        ROUND(\`${n}.safe_div\`(o.valorPagamentoTotal, NULLIF(o.volumes, 0)), 2) AS custoMedioVolume,
        ROUND(\`${n}.safe_div\`(o.valorPagamentoTotal, NULLIF(o.pedidos, 0)), 2) AS custoMedioPedido,
        ROUND(\`${n}.safe_div\`(o.entregas, NULLIF(o.tempoOperacionalTotal, 0)), 2) AS dpph
      FROM agg o
    )
    SELECT
      *,
      ROUND(tempoMedRealizado - m.meta_orh, 2) AS gapOrhVsMeta,
      m.meta_entregas AS metaEntregas,
      m.meta_rotas AS metaRotasConcluidas,
      m.meta_ocup AS metaOcupacaoPeso,
      m.meta_ocup AS metaOcupacaoComposta,
      m.meta_ader_vol AS metaAderenciaVolumes,
      m.meta_orh AS metaOrhTempo,
      ${score} AS scoreOperacional
    FROM metrics
    CROSS JOIN \`${n}.metas_pivot_canonico\` m
  `;
}

// ── Série Diária Executiva ──────────────────────────────────────────────────

export function serieDiariaQuery(projectId, dataset, where) {
  const n = ns(projectId, dataset);
  const score = scoreExpr(n, {
    sprVol: sd(n, 'd.volumes', 'CAST(d.rotas AS FLOAT64)'),
    entregasEf: sd(n, 'd.entregues', 'd.entregues + d.insucessos'),
    rotasConcl: 'd.pctRotasConcl',
    orh: sd(n, 'd.tempoOperacionalTotal', 'CAST(d.rotas AS FLOAT64)'),
    aderVol: ar(n, 'd.volumesComPlan', 'd.volumesPlanejados'),
    volPlan: 'd.volumesPlanejados',
    ocupPeso: 'd.ocupacaoPeso',
  });
  return `
    WITH daily AS (
      SELECT
        b.data_referencia AS data,
        COUNT(DISTINCT b.id_carga) AS rotas,
        SUM(b.qtd_pedidos) AS pedidos,
        SUM(b.qtd_volumes) AS volumes,
        SUM(b.qtd_entregues) AS entregues,
        SUM(b.qtd_insucessos) AS insucessos,
        SUM(b.tempo_operacional_h) AS tempoOperacionalTotal,
        COUNTIF(b.flag_nao_planejada) AS qtdRotasNaoPlanejadas,
        COUNTIF(b.flag_sem_tempo) AS qtdRotasSemTempo,
        SUM(b.pedidos_plan) AS pedidosPlanejados,
        SUM(b.volumes_plan) AS volumesPlanejados,
        SUM(IF(b.possui_planejamento, b.qtd_volumes, NULL)) AS volumesComPlan,
        SUM(b.peso_real_kg) AS pesoRealizado,
        SUM(b.peso_plan_kg) AS pesoPlanejado,
        SUM(b.capacidade_peso_kg) AS capacidadePesoTotalKg,
        \`${n}.safe_div\`(
          SUM(IF(b.capacidade_peso_kg IS NOT NULL, b.peso_real_kg, NULL)),
          NULLIF(SUM(b.capacidade_peso_kg), 0)
        ) AS ocupacaoPeso,
        \`${n}.safe_div\`(
          CAST(COUNTIF(b.flag_rota_concluida) AS FLOAT64), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)) AS pctRotasConcl
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1
    ),
    filial_daily AS (
      SELECT
        b.data_referencia AS data,
        b.filial AS Filial,
        \`${n}.safe_div\`(
          SUM(b.qtd_volumes),
          CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)
        ) AS sprVolumes
      FROM \`${n}.base_execucao_canonica\` b
      ${where}
      GROUP BY 1, 2
    ),
    filial_criticas AS (
      SELECT
        fd.data,
        COUNTIF(fd.sprVolumes < mp.meta_spr_vol) AS qtdFiliaisCriticasSpr
      FROM filial_daily fd
      CROSS JOIN \`${n}.metas_pivot_canonico\` mp
      GROUP BY 1
    )
    SELECT
      d.data,
      d.rotas,
      d.pedidos,
      d.volumes,
      ROUND(\`${n}.safe_div\`(d.entregues, d.entregues + d.insucessos), 4) AS entregasEfetivas,
      ROUND(\`${n}.safe_div\`(d.pedidos, CAST(d.rotas AS FLOAT64)), 2) AS sprPedidos,
      ROUND(\`${n}.safe_div\`(d.volumes, CAST(d.rotas AS FLOAT64)), 2) AS sprVolumes,
      ${score} AS scoreOperacional,
      ROUND(d.ocupacaoPeso, 4) AS ocupacaoPeso,
      ROUND(\`${n}.adherence_ratio\`(d.volumesComPlan, d.volumesPlanejados), 4) AS aderenciaVolumes,
      ROUND(\`${n}.safe_div\`(d.tempoOperacionalTotal, CAST(d.rotas AS FLOAT64)), 2) AS tempoMedRealizado,
      d.qtdRotasNaoPlanejadas,
      d.qtdRotasSemTempo,
      COALESCE(fc.qtdFiliaisCriticasSpr, 0) AS qtdFiliaisCriticasSpr
    FROM daily d
    CROSS JOIN \`${n}.metas_pivot_canonico\` m
    LEFT JOIN filial_criticas fc ON fc.data = d.data
    ORDER BY d.data ASC
  `;
}

