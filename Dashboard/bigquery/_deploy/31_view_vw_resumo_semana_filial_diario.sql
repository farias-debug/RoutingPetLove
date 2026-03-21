CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_resumo_semana_filial_diario` AS
WITH agg AS (
  SELECT
    `Semana Inicio`,
    `Label Semana`,
    `Data Planejada` AS Data,
    `Dia Semana`,
    EXTRACT(DAYOFWEEK FROM `Data Planejada`) AS `Dia Ordem`,
    Filial,
    `Nome Filial`,
    `Tipo Filial`,
    `MetaSPR Filial`,
    -- Contadores
    COUNT(DISTINCT IdCarga) AS `Total Cargas/Rotas`,
    COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END) AS `Total Placas Distintas`,
    SUM(`Peso Realizado (kg)`) AS `Total Peso Realizado (kg)`,
    SUM(`Peso Planejado (kg)`) AS `Total Peso Pedidos (kg)`,
    SUM(`Volumes Planejados`) AS `Volumes Planejados`,
    SUM(`Volumes da Rota`) AS `Volumes Realizados`,
    -- SPR
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes Planejados`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Volumes Planejado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Volumes da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Volumes Realizado`,
    -- Tempo
    SUM(`Tempo Planejado (h)`) AS `Tempo Planejado (h)`,
    SUM(`Tempo Realizado (h)`) AS `Tempo Realizado (h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Tempo Planejado (h)`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `ORH Tempo Planejado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Tempo Realizado (h)`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `ORH Tempo Realizado`,
    -- DPPH
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Pedidos da Rota`), NULLIF(SUM(`Tempo Planejado (h)`), 0)) AS `DPPH Planejado`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      SUM(`Pedidos da Rota`), NULLIF(SUM(`Tempo Realizado (h)`), 0)) AS `DPPH Realizado`,
    -- Capacidade
    MAX(`Capacidade Volume Dia`) AS `Capacidade Volume Dia`,
    -- Status rotas
    SUM(`Rota Concluida`) AS `Rotas Finalizadas`,
    SUM(CASE WHEN UPPER(Status) LIKE '%ROTA%' THEN 1 ELSE 0 END) AS `Rotas Em Rota`,
    SUM(CASE WHEN UPPER(Status) LIKE '%PARCIAL%' THEN 1 ELSE 0 END) AS `Rotas Parciais`,
    SUM(CASE WHEN UPPER(Status) LIKE '%ROTEIRIZA%' THEN 1 ELSE 0 END) AS `Rotas Roteirizadas`
  FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
  GROUP BY 1,2,3,4,5,6,7,8,9
)
SELECT
  a.*,
  -- SPR vs Meta
  a.`SPR Volumes Realizado` - a.`MetaSPR Filial` AS `SPR vs Meta`,
  -- Aderência Capacidade Volume Dia
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.`Volumes Realizados`, NULLIF(a.`Capacidade Volume Dia`, 0)) AS `Aderencia Cap Vol Dia (%)`,
  -- Progresso Execução
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    CAST(a.`Rotas Finalizadas` AS FLOAT64), CAST(a.`Total Cargas/Rotas` AS FLOAT64)) AS `Progresso Execucao (%)`
FROM agg a
ORDER BY Data DESC, Filial