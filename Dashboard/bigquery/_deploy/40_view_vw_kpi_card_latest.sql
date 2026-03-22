CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_kpi_card_latest` AS
WITH ordered AS (
  SELECT *, ROW_NUMBER() OVER (ORDER BY Data DESC) AS rn
  FROM `data-aileron-482822-d0.monitoramento_carga.vw_kpi_resumo_diario`
),
latest AS (SELECT * FROM ordered WHERE rn = 1),
prev AS (SELECT * FROM ordered WHERE rn = 2),
wow AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.vw_kpi_resumo_diario`
  WHERE Data = (SELECT DATE_SUB(Data, INTERVAL 7 DAY) FROM latest)
),
cards AS (
  SELECT * FROM UNNEST([
    STRUCT(
      'Qtd Rotas' AS KPI,
      (SELECT CAST(`Qtd Rotas` AS FLOAT64) FROM latest) AS Valor,
      CAST(NULL AS FLOAT64) AS Meta,
      CAST(NULL AS FLOAT64) AS Delta,
      'Informativo' AS Status,
      (SELECT CAST(`Qtd Rotas` AS FLOAT64) FROM latest) - (SELECT CAST(`Qtd Rotas` AS FLOAT64) FROM prev) AS `Trend D-1`,
      (SELECT CAST(`Qtd Rotas` AS FLOAT64) FROM latest) - (SELECT CAST(`Qtd Rotas` AS FLOAT64) FROM wow) AS `Trend WoW`,
      (SELECT Data FROM latest) AS DataBase,
      'Atuar em excecoes e capacidade' AS Acao
    ),
    STRUCT(
      'Qtd Pedidos',
      (SELECT `Qtd Pedidos` FROM latest), NULL, NULL, 'Informativo',
      (SELECT `Qtd Pedidos` FROM latest) - (SELECT `Qtd Pedidos` FROM prev),
      (SELECT `Qtd Pedidos` FROM latest) - (SELECT `Qtd Pedidos` FROM wow),
      (SELECT Data FROM latest),
      'Avaliar volume e mix por filial'
    ),
    STRUCT(
      'SPR Pedidos',
      (SELECT `SPR Ped Realizado` FROM latest),
      42.0,
      (SELECT `SPR Pedidos vs Meta` FROM latest),
      (SELECT `SPR Pedidos Status` FROM latest),
      (SELECT `SPR Ped Realizado` FROM latest) - (SELECT `SPR Ped Realizado` FROM prev),
      (SELECT `SPR Ped Realizado` FROM latest) - (SELECT `SPR Ped Realizado` FROM wow),
      (SELECT Data FROM latest),
      'Revisar consolidacao, mix e ocupacao'
    ),
    STRUCT(
      'Entregas Efetivas',
      (SELECT `% Entregas Efetivas` FROM latest),
      0.98,
      (SELECT `Entregas Efetivas vs Meta` FROM latest),
      (SELECT `Entregas Efetivas Status` FROM latest),
      (SELECT `% Entregas Efetivas` FROM latest) - (SELECT `% Entregas Efetivas` FROM prev),
      (SELECT `% Entregas Efetivas` FROM latest) - (SELECT `% Entregas Efetivas` FROM wow),
      (SELECT Data FROM latest),
      'Atacar insucessos e janelas criticas'
    ),
    STRUCT(
      'ORH',
      (SELECT `Tempo Med Realizado (h)` FROM latest),
      7.0,
      (SELECT `Gap ORH vs Meta (h)` FROM latest),
      (SELECT `ORH Status` FROM latest),
      (SELECT `Tempo Med Realizado (h)` FROM latest) - (SELECT `Tempo Med Realizado (h)` FROM prev),
      (SELECT `Tempo Med Realizado (h)` FROM latest) - (SELECT `Tempo Med Realizado (h)` FROM wow),
      (SELECT Data FROM latest),
      'Rebalancear jornadas e overtime'
    ),
    STRUCT(
      'Capacidade Utilizada',
      (SELECT `% Ocupacao Composta` FROM latest),
      0.85,
      (SELECT `Capacidade Utilizada vs Meta` FROM latest),
      (SELECT `Status Capacidade` FROM latest),
      (SELECT `% Ocupacao Composta` FROM latest) - (SELECT `% Ocupacao Composta` FROM prev),
      (SELECT `% Ocupacao Composta` FROM latest) - (SELECT `% Ocupacao Composta` FROM wow),
      (SELECT Data FROM latest),
      'Ajustar ocupacao e tipo de veiculo'
    ),
    STRUCT(
      'Aderencia Volumes',
      (SELECT `% Ader Volumes` FROM latest),
      0.90,
      (SELECT `Aderencia Volumes vs Meta` FROM latest),
      (SELECT `Aderencia Volumes Status` FROM latest),
      (SELECT `% Ader Volumes` FROM latest) - (SELECT `% Ader Volumes` FROM prev),
      (SELECT `% Ader Volumes` FROM latest) - (SELECT `% Ader Volumes` FROM wow),
      (SELECT Data FROM latest),
      'Comparar planejamento e executado'
    ),
    STRUCT(
      'Qtd Rotas Nao Planejadas',
      (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM latest),
      0.0,
      (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM latest),
      CASE WHEN (SELECT `Qtd Rotas Nao Planejadas` FROM latest) > 0 THEN 'Critico' ELSE 'OK' END,
      (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM latest) - (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM prev),
      (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM latest) - (SELECT CAST(`Qtd Rotas Nao Planejadas` AS FLOAT64) FROM wow),
      (SELECT Data FROM latest),
      'Atuar na governanca do planejamento'
    )
  ])
)
SELECT
  KPI, Valor, Meta, Delta, Status,
  `data-aileron-482822-d0.monitoramento_carga.status_color`(Status) AS Cor,
  `Trend D-1`, `Trend WoW`, DataBase,
  CAST(Valor AS STRING) AS `Valor Texto`,
  CAST(Meta AS STRING) AS `Meta Texto`,
  CAST(Delta AS STRING) AS `Delta Texto`,
  CAST(`Trend D-1` AS STRING) AS `Trend D-1 Texto`,
  CAST(`Trend WoW` AS STRING) AS `Trend WoW Texto`,
  Acao
FROM cards