CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_kpi_filial_dia` AS
WITH base_agg AS (
  SELECT
    `Data Planejada` AS Data,
    Filial,
    Regiao,
    `Tipo Filial` AS Tipo,
    -- Contadores
    COUNT(DISTINCT IdCarga) AS `Qtd Rotas`,
    SUM(`Pedidos da Rota`) AS `Qtd Pedidos`,
    SUM(`Volumes da Rota`) AS `Qtd Volumes`,
    SUM(Entregues) AS `Qtd Entregas`,
    SUM(`Insucessos Clean`) AS `Qtd Insucessos`,
    SUM(Baixas) AS `Qtd Baixas`,
    SUM(Clientes) AS `Qtd Clientes`,
    SUM(Paradas) AS `Qtd Paradas`,
    COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END) AS `Qtd Veiculos Ativos`,
    COUNT(DISTINCT CASE WHEN Motorista IS NOT NULL AND Motorista != ''
      THEN UPPER(TRIM(Motorista)) END) AS `Qtd Motoristas Ativos`,
    SUM(`KM Realizado`) AS `Total KM Realizado`,
    SUM(`Peso Realizado (kg)`) AS `Total Peso (kg)`,
    SUM(`Tempo Realizado (h)`) AS tempo_real_total,
    SUM(`Tempo Operacional KPI (h)`) AS tempo_oper_total,
    SUM(`Tempo Planejado (h)`) AS tempo_plan_total,
    SUM(`Pedidos Planejados`) AS pedidos_plan,
    SUM(`Volumes Planejados`) AS volumes_plan,
    SUM(`Peso Planejado (kg)`) AS peso_plan,
    SUM(`KM Planejado`) AS km_plan,
    SUM(`Rota Concluida`) AS rotas_concluidas,
    SUM(`Flag Nao Planejada`) AS qtd_nao_plan,
    SUM(`Flag Sem Tempo`) AS qtd_sem_tempo,
    COUNTIF(`Tempo Operacional KPI (h)` > 0 AND `Tempo Operacional KPI (h)` < 4) AS rotas_curtas,
    COUNTIF(`Tempo Operacional KPI (h)` > 8) AS rotas_overtime,
    COUNTIF(`Match Temporal` = 'Mesmo Dia') AS match_mesmo_dia
  FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
  GROUP BY 1,2,3,4
),
kpis AS (
  SELECT
    a.*,
    -- SPR
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Qtd Pedidos`, CAST(a.`Qtd Rotas` AS FLOAT64)) AS `SPR Ped Realizado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Qtd Volumes`, CAST(a.`Qtd Rotas` AS FLOAT64)) AS `SPR Vol Realizado`,
    -- Entregas
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Qtd Entregas`, a.`Qtd Entregas` + a.`Qtd Insucessos`) AS `% Entregas Efetivas`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.rotas_concluidas AS FLOAT64), CAST(a.`Qtd Rotas` AS FLOAT64)) AS `% Rotas Concluidas`,
    -- Tempo
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_oper_total, CAST(a.`Qtd Rotas` AS FLOAT64)) AS `Tempo Med Realizado (h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_oper_total, CAST(a.`Qtd Rotas` AS FLOAT64) * 8.0) AS `% Utilizacao Jornada 8h`,
    GREATEST(0, 1.0 - IFNULL(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_oper_total, CAST(a.`Qtd Rotas` AS FLOAT64) * 8.0), 0)) AS `% Ociosidade Jornada 8h`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_oper_total, CAST(a.`Qtd Rotas` AS FLOAT64)) - 7.0 AS `Gap ORH vs Meta (h)`,
    GREATEST(0, CAST(a.`Qtd Rotas` AS FLOAT64) * 8.0 - a.tempo_oper_total) AS `Horas Ociosas Totais`,
    -- Rotas especiais
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.rotas_curtas AS FLOAT64), CAST(a.`Qtd Rotas` AS FLOAT64)) AS `% Rotas Curtas (<4h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.rotas_overtime AS FLOAT64), CAST(a.`Qtd Rotas` AS FLOAT64)) AS `% Rotas Overtime (>8h)`,
    a.qtd_nao_plan AS `Qtd Rotas Nao Planejadas`,
    a.qtd_sem_tempo AS `Qtd Rotas Sem Tempo`,
    -- Ocupação
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Qtd Pedidos`, NULLIF(a.pedidos_plan, 0)) AS `% Ocupacao Pedidos`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Qtd Volumes`, NULLIF(a.volumes_plan, 0)) AS `% Ocupacao Volumes`,
    -- Aderências
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.`Qtd Pedidos`, a.pedidos_plan) AS `% Ader Pedidos`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.`Qtd Volumes`, a.volumes_plan) AS `% Ader Volumes`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.`Total Peso (kg)`, a.peso_plan) AS `% Ader Peso`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.`Total KM Realizado`, a.km_plan) AS `% Ader KM`,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.tempo_oper_total, a.tempo_plan_total) AS `% Ader Tempo`,
    -- Match
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(a.match_mesmo_dia AS FLOAT64),
      GREATEST(CAST(a.`Qtd Rotas` AS FLOAT64) - a.qtd_nao_plan, 1)) AS `% Match Mesmo Dia`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(a.qtd_nao_plan AS FLOAT64), CAST(a.`Qtd Rotas` AS FLOAT64)) AS `% Sem Planejado`,
    -- Ocupação peso (para composta)
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.`Total Peso (kg)`, NULLIF(a.peso_plan, 0)) AS ocup_peso_agg
  FROM base_agg a
),
with_composta AS (
  SELECT k.*,
    -- Ocupação composta: média das não-null entre pedidos, volumes, peso
    (IFNULL(`% Ocupacao Pedidos`, 0) * IF(`% Ocupacao Pedidos` IS NOT NULL, 1, 0)
     + IFNULL(`% Ocupacao Volumes`, 0) * IF(`% Ocupacao Volumes` IS NOT NULL, 1, 0)
     + IFNULL(ocup_peso_agg, 0) * IF(ocup_peso_agg IS NOT NULL, 1, 0)
    ) / NULLIF(
      IF(`% Ocupacao Pedidos` IS NOT NULL, 1, 0)
      + IF(`% Ocupacao Volumes` IS NOT NULL, 1, 0)
      + IF(ocup_peso_agg IS NOT NULL, 1, 0), 0
    ) AS `% Ocupacao Composta`
  FROM kpis k
),
with_status AS (
  SELECT
    wc.*,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(wc.`% Ocupacao Composta`) AS `Status Capacidade`,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(wc.`% Ocupacao Composta`)
    ) AS `Status Capacidade Cor`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`SPR Ped Realizado`, 42.0) AS `SPR Pedidos Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`SPR Vol Realizado`, 67.0) AS `SPR Volumes Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Entregas Efetivas`, 0.98) AS `Entregas Efetivas Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Rotas Concluidas`, 0.95) AS `Rotas Concluidas Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(wc.`Tempo Med Realizado (h)`, 7.0, 1.0, 2.1) AS `ORH Status`,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(wc.`% Ader Volumes`, 0.90) AS `Aderencia Volumes Status`,
    -- Metas fixas
    42.0 AS `Meta SPR Pedidos`,
    67.0 AS `Meta SPR Volumes`,
    7.0 AS `Meta ORH Tempo (h)`,
    0.98 AS `Meta Global % Entregas`,
    0.95 AS `Meta Global % Rotas Concluidas`,
    0.85 AS `Meta Global Ocupacao Composta`,
    0.90 AS `Meta Aderencia Volumes`,
    -- Vs Meta
    wc.`SPR Ped Realizado` - 42.0 AS `SPR Pedidos vs Meta`,
    wc.`SPR Vol Realizado` - 67.0 AS `SPR Volumes vs Meta`,
    wc.`% Entregas Efetivas` - 0.98 AS `Entregas Efetivas vs Meta`,
    wc.`% Rotas Concluidas` - 0.95 AS `Rotas Concluidas vs Meta`,
    wc.`% Ocupacao Composta` - 0.85 AS `Capacidade Utilizada vs Meta`,
    wc.`% Ader Volumes` - 0.90 AS `Aderencia Volumes vs Meta`
  FROM with_composta wc
),
with_score AS (
  SELECT
    ws.*,
    -- Score Operacional
    (
      `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`SPR Pedidos Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`SPR Volumes Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Entregas Efetivas Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Rotas Concluidas Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`ORH Status`)
      + `data-aileron-482822-d0.monitoramento_carga.status_score`(ws.`Aderencia Volumes Status`)
    ) / 6.0 * 100.0 AS `Score Operacional`,
    -- Alerta
    CASE
      WHEN ws.`Qtd Rotas Nao Planejadas` > 0 THEN 'Rotas sem planejamento'
      WHEN ws.`SPR Volumes Status` = 'Critico' THEN 'SPR abaixo da meta'
      WHEN ws.`Entregas Efetivas Status` = 'Critico' THEN 'Entrega critica'
      WHEN ws.`ORH Status` = 'Critico' THEN 'Jornada acima da meta'
      WHEN ws.`Qtd Rotas Sem Tempo` > 0 THEN 'Rotas sem tempo'
      WHEN ws.`Status Capacidade` IN ('Saturado', 'Critico') THEN 'Capacidade fora da faixa'
      ELSE 'OK'
    END AS `Alerta Operacional`
  FROM with_status ws
)
SELECT
  Data, Filial, Regiao, Tipo,
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
  `Score Operacional`, `Alerta Operacional`
FROM with_score
ORDER BY Data DESC, Filial