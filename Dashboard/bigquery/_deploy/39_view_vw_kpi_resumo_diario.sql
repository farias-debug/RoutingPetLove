CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_kpi_resumo_diario` AS
WITH filial_kpis AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.vw_kpi_filial_dia`
),
-- Agrega KPIs das filiais por dia
daily AS (
  SELECT
    Data,
    SUM(`Qtd Rotas`) AS `Qtd Rotas`,
    SUM(`Qtd Pedidos`) AS `Qtd Pedidos`,
    SUM(`Qtd Volumes`) AS `Qtd Volumes`,
    SUM(`Qtd Entregas`) AS `Qtd Entregas`,
    SUM(`Qtd Insucessos`) AS `Qtd Insucessos`,
    SUM(`Qtd Baixas`) AS `Qtd Baixas`,
    SUM(`Qtd Clientes`) AS `Qtd Clientes`,
    SUM(`Qtd Paradas`) AS `Qtd Paradas`,
    SUM(`Qtd Veiculos Ativos`) AS `Qtd Veiculos Ativos`,
    SUM(`Qtd Motoristas Ativos`) AS `Qtd Motoristas Ativos`,
    SUM(`Total KM Realizado`) AS `Total KM Realizado`,
    SUM(`Total Peso (kg)`) AS `Total Peso (kg)`
  FROM filial_kpis
  GROUP BY Data
),
-- Recalcular KPIs no nível dia (a partir da base_execucao, não via sub-kpis)
daily_from_base AS (
  SELECT
    `Data Planejada` AS Data,
    COUNT(DISTINCT IdCarga) AS rotas,
    SUM(`Pedidos da Rota`) AS pedidos,
    SUM(`Volumes da Rota`) AS volumes,
    SUM(Entregues) AS entregas,
    SUM(`Insucessos Clean`) AS insucessos,
    SUM(`Tempo Operacional KPI (h)`) AS tempo_oper,
    SUM(`Tempo Planejado (h)`) AS tempo_plan,
    SUM(`Pedidos Planejados`) AS pedidos_plan,
    SUM(`Volumes Planejados`) AS volumes_plan,
    SUM(`Peso Realizado (kg)`) AS peso_real,
    SUM(`Peso Planejado (kg)`) AS peso_plan,
    SUM(`KM Realizado`) AS km_real,
    SUM(`KM Planejado`) AS km_plan,
    SUM(`Rota Concluida`) AS rotas_concluidas,
    SUM(`Flag Nao Planejada`) AS qtd_nao_plan,
    SUM(`Flag Sem Tempo`) AS qtd_sem_tempo,
    COUNTIF(`Tempo Operacional KPI (h)` > 0 AND `Tempo Operacional KPI (h)` < 4) AS rotas_curtas,
    COUNTIF(`Tempo Operacional KPI (h)` > 8) AS rotas_overtime,
    COUNTIF(`Match Temporal` = 'Mesmo Dia') AS match_mesmo_dia
  FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
  GROUP BY 1
),
kpis AS (
  SELECT
    d.Data,
    dy.`Qtd Rotas`, dy.`Qtd Pedidos`, dy.`Qtd Volumes`, dy.`Qtd Entregas`, dy.`Qtd Insucessos`,
    dy.`Qtd Baixas`, dy.`Qtd Clientes`, dy.`Qtd Paradas`, dy.`Qtd Veiculos Ativos`, dy.`Qtd Motoristas Ativos`,
    dy.`Total KM Realizado`, dy.`Total Peso (kg)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.pedidos, CAST(d.rotas AS FLOAT64)) AS `SPR Ped Realizado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.volumes, CAST(d.rotas AS FLOAT64)) AS `SPR Vol Realizado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.entregas, d.entregas + d.insucessos) AS `% Entregas Efetivas`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(d.rotas_concluidas AS FLOAT64), CAST(d.rotas AS FLOAT64)) AS `% Rotas Concluidas`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.tempo_oper, CAST(d.rotas AS FLOAT64)) AS `Tempo Med Realizado (h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.tempo_oper, CAST(d.rotas AS FLOAT64) * 8.0) AS `% Utilizacao Jornada 8h`,
    GREATEST(0, 1.0 - IFNULL(`data-aileron-482822-d0.monitoramento_carga.safe_div`(d.tempo_oper, CAST(d.rotas AS FLOAT64) * 8.0), 0)) AS `% Ociosidade Jornada 8h`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.tempo_oper, CAST(d.rotas AS FLOAT64)) - 7.0 AS `Gap ORH vs Meta (h)`,
    GREATEST(0, CAST(d.rotas AS FLOAT64) * 8.0 - d.tempo_oper) AS `Horas Ociosas Totais`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(d.rotas_curtas AS FLOAT64), CAST(d.rotas AS FLOAT64)) AS `% Rotas Curtas (<4h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(d.rotas_overtime AS FLOAT64), CAST(d.rotas AS FLOAT64)) AS `% Rotas Overtime (>8h)`,
    d.qtd_nao_plan AS `Qtd Rotas Nao Planejadas`,
    d.qtd_sem_tempo AS `Qtd Rotas Sem Tempo`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.pedidos, NULLIF(d.pedidos_plan, 0)) AS `% Ocupacao Pedidos`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.volumes, NULLIF(d.volumes_plan, 0)) AS `% Ocupacao Volumes`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(d.peso_real, NULLIF(d.peso_plan, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(d.pedidos, d.pedidos_plan) AS `% Ader Pedidos`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(d.volumes, d.volumes_plan) AS `% Ader Volumes`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(d.peso_real, d.peso_plan) AS `% Ader Peso`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(d.km_real, d.km_plan) AS `% Ader KM`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(d.tempo_oper, d.tempo_plan) AS `% Ader Tempo`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(d.match_mesmo_dia AS FLOAT64),
      GREATEST(CAST(d.rotas AS FLOAT64) - d.qtd_nao_plan, 1)) AS `% Match Mesmo Dia`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(d.qtd_nao_plan AS FLOAT64), CAST(d.rotas AS FLOAT64)) AS `% Sem Planejado`,
    d.pedidos_plan, d.volumes_plan, d.peso_plan
  FROM daily_from_base d
  JOIN daily dy ON d.Data = dy.Data
),
with_composta AS (
  SELECT k.*,
    (IFNULL(`% Ocupacao Pedidos`, 0) * IF(`% Ocupacao Pedidos` IS NOT NULL, 1, 0)
     + IFNULL(`% Ocupacao Volumes`, 0) * IF(`% Ocupacao Volumes` IS NOT NULL, 1, 0)
     + IFNULL(ocup_peso, 0) * IF(ocup_peso IS NOT NULL, 1, 0)
    ) / NULLIF(
      IF(`% Ocupacao Pedidos` IS NOT NULL, 1, 0)
      + IF(`% Ocupacao Volumes` IS NOT NULL, 1, 0)
      + IF(ocup_peso IS NOT NULL, 1, 0), 0
    ) AS `% Ocupacao Composta`
  FROM kpis k
),
with_status AS (
  SELECT wc.*,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(wc.`% Ocupacao Composta`) AS `Status Capacidade`,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(wc.`% Ocupacao Composta`)) AS `Status Capacidade Cor`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`SPR Ped Realizado`, 42.0) AS `SPR Pedidos Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`SPR Vol Realizado`, 67.0) AS `SPR Volumes Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Entregas Efetivas`, 0.98) AS `Entregas Efetivas Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Rotas Concluidas`, 0.95) AS `Rotas Concluidas Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(wc.`Tempo Med Realizado (h)`, 7.0, 1.0, 2.1) AS `ORH Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Ader Volumes`, 0.90) AS `Aderencia Volumes Status`
  FROM with_composta wc
),
with_score AS (
  SELECT ws.*,
    (
      `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`SPR Pedidos Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`SPR Volumes Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Entregas Efetivas Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Rotas Concluidas Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`ORH Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Aderencia Volumes Status`)
    ) / 6.0 * 100.0 AS `Score Operacional`,
    -- Calendario
    EXTRACT(YEAR FROM ws.Data) AS Ano,
    EXTRACT(MONTH FROM ws.Data) AS MesNumero,
    FORMAT_DATE('%B', ws.Data) AS MesNome,
    FORMAT_DATE('%Y-%m', ws.Data) AS MesKey,
    DATE_TRUNC(ws.Data, ISOWEEK) AS SemanaInicio,
    DATE_ADD(DATE_TRUNC(ws.Data, ISOWEEK), INTERVAL 6 DAY) AS SemanaFim,
    CONCAT(CAST(EXTRACT(YEAR FROM ws.Data) AS STRING), '-S',
      LPAD(CAST(EXTRACT(ISOWEEK FROM ws.Data) AS STRING), 2, '0')) AS AnoSemana,
    CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM ws.Data) AS STRING), 2, '0'),
           ' ', FORMAT_DATE('%d/%m', DATE_TRUNC(ws.Data, ISOWEEK)),
           '-', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(ws.Data, ISOWEEK), INTERVAL 6 DAY))
    ) AS SemanaLabel,
    -- Filiais criticas SPR (do kpi_filial_dia)
    COUNTIF_filiais.criticas AS `Qtd Filiais Criticas SPR`,
    COUNTIF_filiais.abaixo_meta AS `Qtd Filiais Abaixo Meta SPR`,
    COUNTIF_filiais.top3 AS `Top 3 Piores SPR`
  FROM with_status ws
  LEFT JOIN (
    SELECT
      Data,
      COUNTIF(`SPR Volumes Status` = 'Critico') AS criticas,
      COUNTIF(`SPR Volumes Status` != 'OK') AS abaixo_meta,
      ARRAY_TO_STRING(ARRAY(
        SELECT Filial
        FROM `data-aileron-482822-d0.monitoramento_carga.vw_kpi_filial_dia` sub
        WHERE sub.Data = fk.Data AND sub.`SPR Vol Realizado` IS NOT NULL
        ORDER BY sub.`SPR Vol Realizado` ASC
        LIMIT 3
      ), ', ') AS top3
    FROM `data-aileron-482822-d0.monitoramento_carga.vw_kpi_filial_dia` fk
    GROUP BY Data
  ) COUNTIF_filiais ON ws.Data = COUNTIF_filiais.Data
),
-- Variações D-1
with_var AS (
  SELECT
    s.*,
    42.0 AS `Meta SPR Pedidos`, 67.0 AS `Meta SPR Volumes`, 7.0 AS `Meta ORH Tempo (h)`,
    0.98 AS `Meta Global % Entregas`, 0.95 AS `Meta Global % Rotas Concluidas`,
    0.85 AS `Meta Global Ocupacao Composta`, 0.90 AS `Meta Aderencia Volumes`,
    s.`SPR Ped Realizado` - 42.0 AS `SPR Pedidos vs Meta`,
    s.`SPR Vol Realizado` - 67.0 AS `SPR Volumes vs Meta`,
    s.`% Entregas Efetivas` - 0.98 AS `Entregas Efetivas vs Meta`,
    s.`% Rotas Concluidas` - 0.95 AS `Rotas Concluidas vs Meta`,
    s.`% Ocupacao Composta` - 0.85 AS `Capacidade Utilizada vs Meta`,
    s.`% Ader Volumes` - 0.90 AS `Aderencia Volumes vs Meta`,
    -- Alerta
    CASE
      WHEN s.`Qtd Rotas Nao Planejadas` > 0 THEN 'Rotas sem planejamento'
      WHEN s.`SPR Volumes Status` = 'Critico' THEN 'SPR abaixo da meta'
      WHEN s.`Entregas Efetivas Status` = 'Critico' THEN 'Entrega critica'
      WHEN s.`ORH Status` = 'Critico' THEN 'Jornada acima da meta'
      WHEN s.`Qtd Rotas Sem Tempo` > 0 THEN 'Rotas sem tempo'
      WHEN s.`Status Capacidade` IN ('Saturado', 'Critico') THEN 'Capacidade fora da faixa'
      ELSE 'OK'
    END AS `Alerta Operacional`,
    -- D-1 variations
    s.`Qtd Rotas` - LAG(s.`Qtd Rotas`) OVER (ORDER BY s.Data) AS `Var D-1 Rotas`,
    s.`Qtd Pedidos` - LAG(s.`Qtd Pedidos`) OVER (ORDER BY s.Data) AS `Var D-1 Pedidos`,
    s.`SPR Ped Realizado` - LAG(s.`SPR Ped Realizado`) OVER (ORDER BY s.Data) AS `Var D-1 SPR Ped`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(s.tempo_oper_total, CAST(s.rotas AS FLOAT64))
      - LAG(`data-aileron-482822-d0.monitoramento_carga.safe_div`(s.tempo_oper_total, CAST(s.rotas AS FLOAT64))) OVER (ORDER BY s.Data) AS `Var D-1 ORH`
  FROM with_score s
)
SELECT
  Data,
  `Qtd Rotas`, `Qtd Pedidos`, `Qtd Volumes`, `Qtd Entregas`, `Qtd Insucessos`,
  `Qtd Baixas`, `Qtd Clientes`, `Qtd Paradas`, `Qtd Veiculos Ativos`, `Qtd Motoristas Ativos`,
  `Total KM Realizado`, `Total Peso (kg)`,
  `SPR Ped Realizado`, `SPR Vol Realizado`,
  `% Entregas Efetivas`, `% Rotas Concluidas`,
  `Tempo Med Realizado (h)`, `% Utilizacao Jornada 8h`, `% Ociosidade Jornada 8h`,
  `Gap ORH vs Meta (h)`, `Horas Ociosas Totais`,
  `% Rotas Curtas (<4h)`, `% Rotas Overtime (>8h)`,
  `Qtd Rotas Nao Planejadas`, `Qtd Rotas Sem Tempo`,
  `% Ocupacao Pedidos`, `% Ocupacao Volumes`, `% Ocupacao Composta`,
  `Status Capacidade`,
  `data-aileron-482822-d0.monitoramento_carga.capacity_status`(`% Ocupacao Composta`) AS `Status Capacidade Visual`,
  `Status Capacidade Cor`,
  `% Ader Pedidos`, `% Ader Volumes`, `% Ader Peso`, `% Ader KM`, `% Ader Tempo`,
  `% Match Mesmo Dia`, `% Sem Planejado`,
  `Meta SPR Pedidos`, `Meta SPR Volumes`, `Meta ORH Tempo (h)`,
  `Meta Global % Entregas`, `Meta Global % Rotas Concluidas`,
  `Meta Global Ocupacao Composta`, `Meta Aderencia Volumes`,
  `SPR Pedidos vs Meta`, `SPR Volumes vs Meta`,
  `Entregas Efetivas vs Meta`, `Rotas Concluidas vs Meta`,
  `Capacidade Utilizada vs Meta`, `Aderencia Volumes vs Meta`,
  `SPR Pedidos Status`, `SPR Volumes Status`,
  `Entregas Efetivas Status`, `Rotas Concluidas Status`,
  `ORH Status`, `Aderencia Volumes Status`,
  `Score Operacional`,
  Ano, MesNumero, MesNome, MesKey, SemanaInicio, SemanaFim, AnoSemana, SemanaLabel,
  `Qtd Filiais Criticas SPR`, `Qtd Filiais Abaixo Meta SPR`, `Top 3 Piores SPR`,
  `Alerta Operacional`,
  `Var D-1 Rotas`, `Var D-1 Pedidos`, `Var D-1 SPR Ped`, `Var D-1 ORH`
FROM with_var
ORDER BY Data DESC