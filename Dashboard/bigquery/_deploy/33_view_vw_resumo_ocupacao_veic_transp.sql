CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_resumo_ocupacao_veic_transp` AS
SELECT
  `Data Planejada` AS Data,
  `Dia Semana`,
  `Semana Inicio`,
  `Label Semana`,
  `Mes Ref`,
  `Tipo de Veiculo Padrao` AS `Tipo de Veiculo`,
  Transportador,
  COUNT(DISTINCT IdCarga) AS Rotas,
  COUNT(*) AS `Quantidade Placas`,
  COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END) AS `Placas Distintas`,
  SUM(`Peso Realizado (kg)`) AS `Peso Total (kg)`,
  `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(`Tipo de Veiculo Padrao`) AS `Capacidade Peso Unit. (kg)`,
  `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(`Tipo de Veiculo Padrao`)
    * COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END) AS `Capacidade Peso Total (kg)`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Peso Realizado (kg)`),
    `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(`Tipo de Veiculo Padrao`)
      * COUNT(DISTINCT CASE WHEN Placa IS NOT NULL AND Placa != '' THEN UPPER(Placa) END)
  ) AS `Ocupacao Peso (%)`,
  SUM(`Volumes da Rota`) AS Volumes,
  SUM(`Pedidos da Rota`) AS Pedidos,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Volumes da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `Media Volumes/Rota`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Pedidos da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `Media Pedidos/Rota`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Peso Realizado (kg)`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `Media Peso/Rota (kg)`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Volumes da Rota`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `SPR por Veiculo`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Tempo Operacional KPI (h)`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS ORH,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Pedidos da Rota`),
    NULLIF(SUM(`Tempo Operacional KPI (h)`), 0)) AS `Drop Size`,
  SUM(`Valor Pagamento Carga`) AS `Valor Pagamento Carga Total`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Valor Pagamento Carga`), CAST(COUNT(DISTINCT IdCarga) AS FLOAT64)) AS `Custo Medio/Carga`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Valor Pagamento Carga`), NULLIF(SUM(`Volumes da Rota`), 0)) AS `Custo Medio/Volume`,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    SUM(`Valor Pagamento Carga`), NULLIF(SUM(`Pedidos da Rota`), 0)) AS `Custo Medio/Pedido`
FROM `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao`
GROUP BY 1,2,3,4,5,6,7
ORDER BY Data DESC, `Tipo de Veiculo`, Transportador