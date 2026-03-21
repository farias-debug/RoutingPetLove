-- =============================================================================
-- Pipeline v6 — API Views para Frontend React
-- Projeto: data-aileron-482822-d0 | Dataset: monitoramento_carga
-- Data: 2026-03-20
-- Propósito: Views otimizadas para consumo via API REST pelo dashboard React.
--            NÃO substitui v5 (publicação Sheets). Convive com ela.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. api_motoristas_jornada
--    Agregação por (data, filial, transportador, motorista) para a página
--    Motoristas e Jornada do React.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_motoristas_jornada` AS
WITH metas AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`
)
SELECT
  f.data_planejada                           AS data,
  f.filial                                   AS filial,
  f.transportador                            AS transportador,
  f.motorista                                AS motorista,
  -- placa mais frequente do motorista naquele dia
  ARRAY_AGG(f.placa ORDER BY f.placa LIMIT 1) [SAFE_OFFSET(0)] AS placa,
  COUNT(*)                                   AS qtd_rotas,
  ROUND(AVG(f.tempo_operacional_h), 2)       AS horas_jornada,
  MAX(f.flag_overtime)                        AS flag_overtime,
  SUM(f.entregues)                           AS entregas,
  SUM(f.insucessos)                          AS insucessos,
  SUM(f.qtd_pedidos)                         AS pedidos,
  SUM(f.qtd_volumes)                         AS volumes,
  ROUND(AVG(`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(
      CAST(f.qtd_volumes AS FLOAT64), m.meta_spr_vol),
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(
      f.pct_entrega_efetiva, m.meta_entregas),
    CASE WHEN f.flag_rota_concluida THEN 'OK' ELSE 'Critico' END,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(
      f.tempo_operacional_h, m.meta_orh, 1.0, 2.1),
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(
      f.aderencia_volumes, m.meta_ader_vol),
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(
      `data-aileron-482822-d0.monitoramento_carga.fn_ocup_composta`(
        f.ocup_pedidos, f.ocup_volumes, f.ocup_peso))
  )), 1)                                      AS score_operacional
FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
CROSS JOIN metas m
WHERE f.tipo_filial = 'Unidade'
  AND f.motorista IS NOT NULL
  AND f.motorista != ''
GROUP BY f.data_planejada, f.filial, f.transportador, f.motorista;


-- ---------------------------------------------------------------------------
-- 2. api_resumo_executivo_semanal
--    Agregação semanal do kpi_resumo_diario para gráficos de tendência.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_resumo_executivo_semanal` AS
SELECT
  k.AnoSemana                                 AS ano_semana,
  k.SemanaLabel                                AS semana_label,
  MIN(k.Data)                                  AS semana_inicio,
  MAX(k.Data)                                  AS semana_fim,
  SUM(k.`Qtd Rotas`)                          AS rotas,
  SUM(k.`Qtd Pedidos`)                         AS pedidos,
  SUM(k.`Qtd Volumes`)                         AS volumes,
  SUM(k.`Qtd Entregas`)                        AS entregas,
  SUM(k.`Qtd Insucessos`)                      AS insucessos,
  ROUND(SAFE_DIVIDE(SUM(k.`Qtd Entregas`),
    NULLIF(SUM(k.`Qtd Entregas`) + SUM(k.`Qtd Insucessos`), 0)), 4)
                                                AS pct_entregas_efetivas,
  ROUND(SAFE_DIVIDE(SUM(k.`Qtd Pedidos`), NULLIF(SUM(k.`Qtd Rotas`), 0)), 2)
                                                AS spr_pedidos,
  ROUND(SAFE_DIVIDE(SUM(k.`Qtd Volumes`), NULLIF(SUM(k.`Qtd Rotas`), 0)), 2)
                                                AS spr_volumes,
  ROUND(AVG(k.`Score Operacional`), 1)          AS score_operacional
FROM `data-aileron-482822-d0.monitoramento_carga.kpi_resumo_diario` k
GROUP BY k.AnoSemana, k.SemanaLabel
ORDER BY MIN(k.Data) DESC;


-- ---------------------------------------------------------------------------
-- 3. api_filial_performance
--    Resumo de performance por filial para barras/rankings.
--    Baseado em Resumo_Filial com score unificado via fn_score_operacional (6 KPIs).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_filial_performance` AS
WITH metas AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`
)
SELECT
  r.Filial                                     AS filial,
  r.`Nome Filial`                              AS nome_filial,
  r.`Tipo Filial`                              AS tipo_filial,
  r.`Meta SPR`                                 AS meta_spr,
  r.`Dias Cobertos`                            AS dias_cobertos,
  r.`Total Cargas`                             AS rotas,
  r.`Placas Distintas`                         AS placas_distintas,
  r.`Pedidos Real`                             AS pedidos_real,
  r.`Pedidos Plan`                             AS pedidos_plan,
  r.`Volumes Real`                             AS volumes_real,
  r.`Volumes Plan`                             AS volumes_plan,
  r.`Peso Real kg`                             AS peso_real,
  r.`Peso Plan kg`                             AS peso_plan,
  r.Entregues                                  AS entregues,
  r.Insucessos                                 AS insucessos,
  r.`Entrega Efetiva`                          AS entregas_efetivas,
  r.`SPR Vol Real`                             AS spr_volumes_real,
  r.`SPR Ped Real`                             AS spr_pedidos_real,
  r.`SPR vs Meta`                              AS spr_vs_meta,
  r.`Tempo Real h`                             AS tempo_real,
  r.`Tempo Plan h`                             AS tempo_plan,
  r.`Desvio H`                                 AS desvio_tempo_h,
  r.`Desvio Pct`                               AS desvio_tempo_pct,
  r.`KM Real`                                  AS km_real,
  r.`KM Plan`                                  AS km_plan,
  r.`Progresso Pct`                            AS progresso_pct,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(r.`SPR Vol Real`, m.meta_spr_vol),
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(r.`Entrega Efetiva`, m.meta_entregas),
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(r.`Progresso Pct`, m.meta_rotas),
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(
      SAFE_DIVIDE(r.`Tempo Real h`, NULLIF(r.`Total Cargas`, 0)), m.meta_orh, 1.0, 2.1),
    IF(r.`Volumes Plan` > 0,
       `data-aileron-482822-d0.monitoramento_carga.status_higher`(
         SAFE_DIVIDE(r.`Volumes Real`, NULLIF(r.`Volumes Plan`, 0)), m.meta_ader_vol),
       'Informativo'),
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(
      SAFE_DIVIDE(r.`Volumes Real`, NULLIF(r.`Volumes Plan`, 0)))
  ), 1) AS score_operacional
FROM `data-aileron-482822-d0.monitoramento_carga.Resumo_Filial` r
CROSS JOIN metas m
WHERE r.`Tipo Filial` = 'Unidade';


-- ---------------------------------------------------------------------------
-- 4. api_transportadores_resumo
--    Agregação por transportador para ranking, share, custos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_transportadores_resumo` AS
WITH performance AS (
  SELECT
    k.Transportador AS transportador,
    SUM(k.`Qtd Rotas`) AS rotas,
    SUM(k.`Qtd Pedidos`) AS pedidos,
    SUM(k.`Qtd Volumes`) AS volumes,
    ROUND(AVG(k.`Pct Entregas Efetivas`), 4) AS entregas_efetivas,
    ROUND(AVG(k.`Score Operacional`), 1) AS score_operacional,
    ROUND(AVG(k.`SPR Ped Realizado`), 2) AS spr_pedidos,
    ROUND(AVG(k.`SPR Vol Realizado`), 2) AS spr_volumes,
    ROUND(AVG(k.`Pct Share Transportador`), 4) AS share
  FROM `data-aileron-482822-d0.monitoramento_carga.kpi_transportador_dia` k
  GROUP BY k.Transportador
),
custos AS (
  SELECT
    o.Transportador AS transportador,
    SUM(o.`Valor Pagamento Carga Total`) AS valor_total,
    ROUND(SAFE_DIVIDE(SUM(o.`Valor Pagamento Carga Total`), NULLIF(SUM(o.Rotas), 0)), 2) AS custo_medio_carga,
    ROUND(SAFE_DIVIDE(SUM(o.`Valor Pagamento Carga Total`), NULLIF(SUM(o.Volumes), 0)), 2) AS custo_medio_volume,
    ROUND(SAFE_DIVIDE(SUM(o.`Valor Pagamento Carga Total`), NULLIF(SUM(o.Pedidos), 0)), 2) AS custo_medio_pedido
  FROM `data-aileron-482822-d0.monitoramento_carga.Resumo_Ocupacao_Veic_Transp` o
  GROUP BY o.Transportador
)
SELECT
  p.transportador,
  p.rotas,
  p.share,
  COALESCE(c.custo_medio_carga, 0) AS custo_medio_carga,
  COALESCE(c.custo_medio_volume, 0) AS custo_medio_volume,
  COALESCE(c.custo_medio_pedido, 0) AS custo_medio_pedido,
  p.entregas_efetivas,
  p.score_operacional,
  p.spr_pedidos,
  p.spr_volumes,
  p.pedidos,
  p.volumes,
  COALESCE(c.valor_total, 0) AS valor_total
FROM performance p
LEFT JOIN custos c
  ON c.transportador = p.transportador
ORDER BY p.rotas DESC;


-- ---------------------------------------------------------------------------
-- 5. api_ocupacao_tipo_veiculo
--    Agregação por tipo de veículo para gráfico de ocupação.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_ocupacao_tipo_veiculo` AS
SELECT
  o.`Tipo de Veiculo`                           AS tipo_veiculo,
  SUM(o.Rotas)                                  AS rotas,
  SUM(o.`Placas Distintas`)                     AS placas_distintas,
  ROUND(AVG(o.`Media Pedidos por Rota`), 2)     AS media_pedidos_rota,
  ROUND(AVG(o.`Media Volumes por Rota`), 2)     AS media_volumes_rota,
  ROUND(AVG(o.`Media Peso por Rota kg`), 2)     AS media_peso_rota,
  SUM(o.`Peso Total kg`)                        AS peso_total_kg,
  SUM(o.`Capacidade Peso Total kg`)             AS capacidade_peso_total_kg,
  ROUND(SAFE_DIVIDE(SUM(o.`Peso Total kg`), NULLIF(SUM(o.`Capacidade Peso Total kg`), 0)), 4)
                                                 AS ocupacao_peso,
  ROUND(AVG(o.`SPR por Veiculo`), 2)            AS spr_por_veiculo,
  ROUND(AVG(o.ORH), 2)                          AS orh,
  ROUND(SAFE_DIVIDE(SUM(o.`Valor Pagamento Carga Total`), NULLIF(SUM(o.Volumes), 0)), 2)
                                                 AS custo_medio_volume
FROM `data-aileron-482822-d0.monitoramento_carga.Resumo_Ocupacao_Veic_Transp` o
GROUP BY o.`Tipo de Veiculo`
ORDER BY SUM(o.Rotas) DESC;


-- ---------------------------------------------------------------------------
-- 6. api_alertas_contagem
--    Contagem de alertas por tipo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.api_alertas_contagem` AS
SELECT
  COUNTIF(a.`Flag Nao Planejada`)              AS nao_planejada,
  COUNTIF(a.`Flag Sem Tempo`)                  AS sem_tempo,
  COUNTIF(a.`Flag Overtime`)                   AS overtime,
  COUNTIF(a.`Flag Entrega Critica`)            AS entrega_critica,
  COUNTIF(a.`Flag Match Critico`)              AS match_critico,
  COUNT(*)                                      AS total
FROM `data-aileron-482822-d0.monitoramento_carga.alertas_rotas` a;
