CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_resumo_semana_filial_matriz` AS
WITH daily AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.vw_resumo_semana_filial_diario`
),
metrics AS (
  SELECT d.`Semana Inicio`, d.`Label Semana`, d.Filial, d.`Nome Filial`, d.`Tipo Filial`,
    grupo, medida,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 2 THEN val END) AS Seg,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 3 THEN val END) AS Ter,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 4 THEN val END) AS Qua,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 5 THEN val END) AS Qui,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 6 THEN val END) AS Sex,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 7 THEN val END) AS Sab,
    MAX(CASE WHEN EXTRACT(DAYOFWEEK FROM d.Data) = 1 THEN val END) AS Dom
  FROM daily d
  CROSS JOIN UNNEST([
    STRUCT('Operacao' AS grupo, 'Total Cargas/Rotas' AS medida, CAST(`Total Cargas/Rotas` AS FLOAT64) AS val),
    STRUCT('Operacao', 'Total Peso Realizado (kg)', `Total Peso Realizado (kg)`),
    STRUCT('Operacao', 'Total Peso Pedidos (kg)', `Total Peso Pedidos (kg)`),
    STRUCT('Operacao', 'Total Placas Distintas', CAST(`Total Placas Distintas` AS FLOAT64)),
    STRUCT('Execucao', 'Rotas Finalizadas', CAST(`Rotas Finalizadas` AS FLOAT64)),
    STRUCT('Execucao', 'Rotas Em Rota', CAST(`Rotas Em Rota` AS FLOAT64)),
    STRUCT('Execucao', 'Rotas Parciais', CAST(`Rotas Parciais` AS FLOAT64)),
    STRUCT('Execucao', 'Rotas Roteirizadas', CAST(`Rotas Roteirizadas` AS FLOAT64)),
    STRUCT('Execucao', 'Progresso Execucao (%)', `Progresso Execucao (%)`),
    STRUCT('Volume', 'Volumes Planejados', `Volumes Planejados`),
    STRUCT('Volume', 'Volumes Realizados', `Volumes Realizados`),
    STRUCT('SPR', 'SPR Volumes Planejado', `SPR Volumes Planejado`),
    STRUCT('SPR', 'SPR Volumes Realizado', `SPR Volumes Realizado`),
    STRUCT('SPR', 'SPR vs Meta', `SPR vs Meta`),
    STRUCT('Tempo', 'Tempo Planejado (h)', `Tempo Planejado (h)`),
    STRUCT('Tempo', 'Tempo Realizado (h)', `Tempo Realizado (h)`),
    STRUCT('Tempo', 'ORH Tempo Planejado', `ORH Tempo Planejado`),
    STRUCT('Tempo', 'ORH Tempo Realizado', `ORH Tempo Realizado`),
    STRUCT('Produtividade', 'DPPH Planejado', `DPPH Planejado`),
    STRUCT('Produtividade', 'DPPH Realizado', `DPPH Realizado`),
    STRUCT('Volume', 'Aderencia Cap Vol Dia (%)', `Aderencia Cap Vol Dia (%)`)
  ])
  GROUP BY 1,2,3,4,5,6,7
),
-- Total semana: agregar diários por semana/filial
weekly_totals AS (
  SELECT
    `Semana Inicio`, `Label Semana`, Filial, `Nome Filial`, `Tipo Filial`,
    -- Totais da semana
    SUM(`Total Cargas/Rotas`) AS total_cargas,
    SUM(`Total Peso Realizado (kg)`) AS total_peso_real,
    SUM(`Total Peso Pedidos (kg)`) AS total_peso_plan,
    SUM(`Total Placas Distintas`) AS total_placas,
    SUM(`Rotas Finalizadas`) AS total_finalizadas,
    SUM(`Rotas Em Rota`) AS total_em_rota,
    SUM(`Rotas Parciais`) AS total_parciais,
    SUM(`Rotas Roteirizadas`) AS total_roteirizadas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(SUM(`Rotas Finalizadas`) AS FLOAT64), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) AS prog_exec,
    SUM(`Volumes Planejados`) AS total_vol_plan,
    SUM(`Volumes Realizados`) AS total_vol_real,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes Planejados`), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) AS spr_vol_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes Realizados`), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) AS spr_vol_real,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes Realizados`), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) - MAX(`MetaSPR Filial`) AS spr_vs_meta,
    SUM(`Tempo Planejado (h)`) AS total_tempo_plan,
    SUM(`Tempo Realizado (h)`) AS total_tempo_real,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Tempo Planejado (h)`), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) AS orh_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Tempo Realizado (h)`), CAST(SUM(`Total Cargas/Rotas`) AS FLOAT64)) AS orh_real,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Pedidos da Rota`), NULLIF(SUM(`Tempo Planejado (h)`), 0)) AS dpph_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Pedidos da Rota`), NULLIF(SUM(`Tempo Realizado (h)`), 0)) AS dpph_real,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes Realizados`), NULLIF(MAX(`Capacidade Volume Dia`), 0)) AS ader_cap_vol
  FROM (
    SELECT d.*, b.`Pedidos da Rota`
    FROM `data-aileron-482822-d0.monitoramento_carga.vw_resumo_semana_filial_diario` d
    LEFT JOIN (
      SELECT `Data Planejada`, Filial, SUM(`Pedidos da Rota`) AS `Pedidos da Rota`
      FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
      GROUP BY 1,2
    ) b ON d.Data = b.`Data Planejada` AND d.Filial = b.Filial
  )
  GROUP BY 1,2,3,4,5
)
SELECT
  m.`Semana Inicio`, m.`Label Semana`, m.Filial, m.`Nome Filial`, m.`Tipo Filial`,
  m.grupo AS Grupo, m.medida AS Medida,
  m.Seg, m.Ter, m.Qua, m.Qui, m.Sex, m.Sab, m.Dom,
  CASE m.medida
    WHEN 'Total Cargas/Rotas' THEN w.total_cargas
    WHEN 'Total Peso Realizado (kg)' THEN w.total_peso_real
    WHEN 'Total Peso Pedidos (kg)' THEN w.total_peso_plan
    WHEN 'Total Placas Distintas' THEN w.total_placas
    WHEN 'Rotas Finalizadas' THEN CAST(w.total_finalizadas AS FLOAT64)
    WHEN 'Rotas Em Rota' THEN CAST(w.total_em_rota AS FLOAT64)
    WHEN 'Rotas Parciais' THEN CAST(w.total_parciais AS FLOAT64)
    WHEN 'Rotas Roteirizadas' THEN CAST(w.total_roteirizadas AS FLOAT64)
    WHEN 'Progresso Execucao (%)' THEN w.prog_exec
    WHEN 'Volumes Planejados' THEN w.total_vol_plan
    WHEN 'Volumes Realizados' THEN w.total_vol_real
    WHEN 'SPR Volumes Planejado' THEN w.spr_vol_plan
    WHEN 'SPR Volumes Realizado' THEN w.spr_vol_real
    WHEN 'SPR vs Meta' THEN w.spr_vs_meta
    WHEN 'Tempo Planejado (h)' THEN w.total_tempo_plan
    WHEN 'Tempo Realizado (h)' THEN w.total_tempo_real
    WHEN 'ORH Tempo Planejado' THEN w.orh_plan
    WHEN 'ORH Tempo Realizado' THEN w.orh_real
    WHEN 'DPPH Planejado' THEN w.dpph_plan
    WHEN 'DPPH Realizado' THEN w.dpph_real
    WHEN 'Aderencia Cap Vol Dia (%)' THEN w.ader_cap_vol
  END AS `Total Semana`
FROM metrics m
LEFT JOIN weekly_totals w
  ON m.`Semana Inicio` = w.`Semana Inicio` AND m.Filial = w.Filial
ORDER BY m.`Semana Inicio` DESC, m.`Nome Filial`, m.grupo, m.medida