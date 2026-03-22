CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_alertas_rotas` AS
SELECT
  dr.*,
  b.Prioridade
FROM `data-aileron-482822-d0.monitoramento_carga.vw_drill_rotas` dr
JOIN `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao` b
  ON dr.Data = b.`Data Planejada`
  AND dr.Filial = b.Filial
  AND dr.Rota = b.Rota
  AND CAST(dr.`Pedidos da Rota` AS STRING) = CAST(b.`Pedidos da Rota` AS STRING)
WHERE (
  IFNULL(dr.`Flag Nao Planejada`, 0)
  + IFNULL(dr.`Flag Sem Tempo`, 0)
  + IFNULL(dr.`Flag Overtime`, 0)
  + IFNULL(dr.`Flag Match Critico`, 0)
  + IFNULL(dr.`Flag Entrega Critica`, 0)
) > 0
ORDER BY b.Prioridade, dr.Data DESC, dr.Filial