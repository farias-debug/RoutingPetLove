CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_planejamento_lookup` AS
SELECT
  CONCAT(
    CAST(`Id Carga` AS STRING), '|',
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial)
  ) AS planning_key,
  Rota AS rota_planejada,
  MIN(`Data Planejada`) AS data_planejada_plan,
  SUM(IFNULL(Pedidos, 0)) AS pedidos_plan,
  SUM(IFNULL(Volume, 0)) AS volumes_plan,
  SUM(IFNULL(Peso, 0.0)) AS peso_plan,
  SUM(IFNULL(Km, 0.0)) AS km_plan_plan,
  SUM(
    EXTRACT(HOUR FROM `Tempo de Rota`) + EXTRACT(MINUTE FROM `Tempo de Rota`) / 60.0
    + EXTRACT(SECOND FROM `Tempo de Rota`) / 3600.0
  ) AS tempo_plan_h,
  MAX(CASE WHEN IFNULL(Pedidos,0) > 0 OR IFNULL(Volume,0) > 0 THEN 1 ELSE 0 END) AS possui_planejado
FROM `data-aileron-482822-d0.monitoramento_carga.raw_planejamento`
GROUP BY 1, 2;
