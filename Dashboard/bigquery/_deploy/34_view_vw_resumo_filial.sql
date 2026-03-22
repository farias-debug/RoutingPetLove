CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_resumo_filial` AS
SELECT
  Filial,
  `Nome Filial`,
  `Tipo Filial`,
  `MetaSPR Filial` AS `Meta SPR`,
  COUNT(DISTINCT `Data Planejada`) AS `Dias Cobertos`,
  COUNT(DISTINCT IdCarga) AS `Total Cargas`,
  COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END) AS `Placas Distintas`,
  SUM(`Pedidos da Rota`) AS `Pedidos Real`,
  SUM(`Volumes da Rota`) AS `Volumes Real`,
  SUM(`Peso Realizado (kg)`) AS `Peso Real (kg)`,
  SUM(Entregues) AS Entregues,
  SUM(`Insucessos Clean`) AS Insucessos,
  SUM(`Pedidos Planejados`) AS `Pedidos Plan`,
  SUM(`Volumes Planejados`) AS `Volumes Plan`,
  SUM(`Peso Planejado (kg)`) AS `Peso Plan (kg)`,
  SUM(`Pedidos da Rota`) - SUM(`Pedidos Planejados`) AS `Delta Pedidos`,
  SUM(`Volumes da Rota`) - SUM(`Volumes Planejados`) AS `Delta Volumes`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Volumes da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Vol Real`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Pedidos da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Ped Real`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Volumes Planejados`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Vol Plan`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Pedidos Planejados`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR Ped Plan`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Volumes da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) - `MetaSPR Filial` AS `SPR vs Meta`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(Entregues), SUM(Entregues) + SUM(`Insucessos Clean`)) AS `Entrega Efetiva`,
  SUM(`Tempo Realizado (h)`) AS `Tempo Real (h)`,
  SUM(`Tempo Planejado (h)`) AS `Tempo Plan (h)`,
  SUM(`Tempo Realizado (h)`) - SUM(`Tempo Planejado (h)`) AS `Desvio H`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Tempo Realizado (h)`) - SUM(`Tempo Planejado (h)`), NULLIF(SUM(`Tempo Planejado (h)`), 0)) AS `Desvio %`,
  SUM(`KM Realizado`) AS `KM Real`,
  SUM(`KM Planejado`) AS `KM Plan`,
  SUM(`Rota Concluida`) AS Finalizadas,
  SUM(CASE WHEN UPPER(Status) LIKE '%ROTA%' THEN 1 ELSE 0 END) AS `Em Rota`,
  SUM(CASE WHEN UPPER(Status) LIKE '%PARCIAL%' THEN 1 ELSE 0 END) AS Parciais,
  SUM(CASE WHEN UPPER(Status) LIKE '%ROTEIRIZA%' THEN 1 ELSE 0 END) AS Roteirizadas,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    CAST(SUM(`Rota Concluida`) AS FLOAT64), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `Progresso %`
FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
GROUP BY Filial, `Nome Filial`, `Tipo Filial`, `MetaSPR Filial`
ORDER BY Filial