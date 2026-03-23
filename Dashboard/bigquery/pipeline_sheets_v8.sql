-- ==============================================================================
-- PIPELINE SHEETS v8 - EXCLUSIVO PARA GOOGLE SHEETS
-- Projeto: data-aileron-482822-d0
-- Dataset: monitoramento_carga
-- Data: 2026-03-22
-- ==============================================================================
--
-- PRINCÍPIO DE DESIGN:
-- - DESACOPLADO: Separado do pipeline Dashboard
-- - DEPENDENTE: Consome base_execucao_canonica e dim_filial do Dashboard v7
-- - MINIMALISTA: Apenas views usadas operacionalmente no Sheets
--
-- PRÉ-REQUISITO: pipeline_dashboard_v7.sql deve estar deployado
--
-- Views incluídas (baseado em auditoria):
--   1. metas_globais (já existe em v7)
--   2. dim_filial_tratada
--   3. kpi_resumo_diario
--   4. kpi_filial_dia
--   5. kpi_transportador_dia
--   6. kpi_card_latest
--   7. alertas_rotas
--   8. drill_rotas
--   9. Resumo_Filial
--   10. Resumo_Ocupacao_Veic_Transp
--   11. VW_Base_Execucao
--   12. Resumo_Semana_Filial_Diario
--   13. Resumo_Semana_Filial_Matriz
-- ==============================================================================

-- ==============================================================================
-- NOTA: metas_globais já existe no pipeline_dashboard_v7.sql
-- ==============================================================================

-- ==============================================================================
-- DIMENSÃO TRATADA PARA SHEETS
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_filial_tratada` AS
SELECT
  d.cd_origem                 AS `CD Origem`,
  d.tabela                    AS `Tabela`,
  d.filial_nome               AS `Filial`,
  d.codigo                    AS `Codigo`,
  d.nome_filial               AS `Nome Filial`,
  d.tipo                      AS `Tipo`,
  d.meta_spr                  AS `MetaSPR`,
  0.98                        AS `MetaEntrega`,
  d.regiao                    AS `Regiao`,
  d.capacidade_volume_dia     AS `Capacidade Volume Dia`,
  d.filial_key                AS `Filial Key`,
  d.nome_filial_key           AS `Nome Filial Key`,
  UPPER(TRIM(CAST(d.codigo AS STRING))) AS `Codigo Key`
FROM `data-aileron-482822-d0.monitoramento_carga.dim_filial` d;

-- ==============================================================================
-- KPI RESUMO DIÁRIO (Principal para Sheets)
-- Consome base_execucao_canonica e agrega
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.kpi_resumo_diario` AS
WITH
agg AS (
  SELECT
    b.data_referencia AS data,
    COUNT(DISTINCT b.id_carga) AS qtd_rotas,
    SUM(b.qtd_pedidos) AS qtd_pedidos,
    SUM(b.qtd_volumes) AS qtd_volumes,
    SUM(b.qtd_entregues) AS qtd_entregas,
    SUM(b.qtd_insucessos) AS qtd_insucessos,
    SUM(b.qtd_baixas) AS qtd_baixas,
    SUM(b.qtd_clientes) AS qtd_clientes,
    SUM(b.qtd_paradas) AS qtd_paradas,
    COUNT(DISTINCT CASE WHEN b.placa IS NOT NULL THEN b.placa END) AS qtd_veiculos,
    COUNT(DISTINCT b.motorista_key_canonico) AS qtd_motoristas,
    SUM(b.km_real) AS total_km,
    SUM(b.peso_real_kg) AS total_peso_kg,
    SUM(b.tempo_operacional_h) AS tempo_oper_total,
    SUM(b.pedidos_plan) AS pedidos_plan,
    SUM(b.volumes_plan) AS volumes_plan,
    SUM(b.peso_plan_kg) AS peso_plan,
    SUM(b.km_plan_plan) AS km_plan,
    SUM(b.tempo_plan_h) AS tempo_plan,
    COUNTIF(b.flag_rota_concluida) AS qtd_rotas_concluidas,
    COUNTIF(b.flag_overtime) AS qtd_rotas_overtime,
    COUNTIF(b.flag_nao_planejada) AS qtd_nao_plan,
    COUNTIF(b.flag_match_mesmo_dia) AS qtd_match_mesmo_dia,
    COUNTIF(b.possui_planejamento) AS qtd_com_planejamento,
    SUM(b.capacidade_peso_kg) AS capacidade_peso_total,
    SUM(b.valor_total) AS valor_total
  FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica` b
  GROUP BY 1
),
kpis AS (
  SELECT
    a.*,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.qtd_pedidos, CAST(a.qtd_rotas AS FLOAT64)) AS spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.qtd_volumes, CAST(a.qtd_rotas AS FLOAT64)) AS spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.qtd_entregas, a.qtd_entregas + a.qtd_insucessos) AS pct_entregas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.qtd_rotas_concluidas AS FLOAT64), CAST(a.qtd_rotas AS FLOAT64)) AS pct_rotas_concl,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_oper_total, CAST(a.qtd_rotas AS FLOAT64)) AS orh,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(a.total_peso_kg, NULLIF(a.capacidade_peso_total, 0)) AS ocup_composta,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.qtd_volumes, a.volumes_plan) AS ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(a.qtd_pedidos, a.pedidos_plan) AS ader_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.qtd_match_mesmo_dia AS FLOAT64), CAST(a.qtd_com_planejamento AS FLOAT64)) AS pct_match
  FROM agg a
),
com_metas AS (
  SELECT
    k.*,
    67.0 AS meta_spr_vol,
    42.0 AS meta_spr_ped,
    0.98 AS meta_entregas,
    0.95 AS meta_rotas,
    7.0 AS meta_orh,
    0.85 AS meta_ocup,
    0.90 AS meta_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(k.spr_vol, 67.0) AS status_spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(k.spr_ped, 42.0) AS status_spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(k.pct_entregas, 0.98) AS status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(k.pct_rotas_concl, 0.95) AS status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(k.orh, 7.0, 1.0, 2.1) AS status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(k.ader_vol, 0.90) AS status_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(k.ocup_composta) AS status_capacidade
  FROM kpis k
),
com_score AS (
  SELECT
    m.*,
    ROUND(
      `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
        m.status_spr_vol,
        m.status_entregas,
        m.status_rotas,
        m.status_orh,
        m.status_ader_vol,
        m.status_capacidade
      ), 0
    ) AS score_operacional
  FROM com_metas m
)
SELECT
  s.data                                         AS `Data`,
  s.qtd_rotas                                   AS `Qtd Rotas`,
  s.qtd_pedidos                                AS `Qtd Pedidos`,
  s.qtd_volumes                                AS `Qtd Volumes`,
  s.qtd_entregas                               AS `Qtd Entregas`,
  s.qtd_insucessos                             AS `Qtd Insucessos`,
  s.qtd_baixas                                 AS `Qtd Baixas`,
  s.qtd_clientes                               AS `Qtd Clientes`,
  s.qtd_paradas                                AS `Qtd Paradas`,
  s.qtd_veiculos                               AS `Qtd Veiculos Ativos`,
  s.qtd_motoristas                             AS `Qtd Motoristas Ativos`,
  ROUND(s.total_km, 2)                         AS `Total KM Realizado`,
  ROUND(s.total_peso_kg, 2)                    AS `Total Peso kg`,
  ROUND(s.spr_ped, 2)                          AS `SPR Ped Realizado`,
  ROUND(s.spr_vol, 2)                          AS `SPR Vol Realizado`,
  ROUND(s.pct_entregas, 4)                     AS `Pct Entregas Efetivas`,
  ROUND(s.pct_rotas_concl, 4)                  AS `Pct Rotas Concluidas`,
  ROUND(s.orh, 2)                              AS `Tempo Med Realizado h`,
  ROUND(s.ocup_composta, 4)                    AS `Pct Ocupacao Composta`,
  ROUND(s.ader_vol, 4)                         AS `Pct Ader Volumes`,
  ROUND(s.ader_ped, 4)                         AS `Pct Ader Pedidos`,
  ROUND(s.pct_match, 4)                        AS `Pct Match Mesmo Dia`,
  s.meta_spr_ped                               AS `Meta SPR Pedidos`,
  s.meta_spr_vol                               AS `Meta SPR Volumes`,
  s.meta_orh                                   AS `Meta ORH Tempo h`,
  s.meta_entregas                              AS `Meta Global Pct Entregas`,
  s.meta_rotas                                 AS `Meta Global Pct Rotas Concluidas`,
  s.meta_ocup                                  AS `Meta Global Ocupacao Composta`,
  s.meta_ader_vol                              AS `Meta Aderencia Volumes`,
  ROUND(s.spr_ped - s.meta_spr_ped, 2)      AS `SPR Pedidos vs Meta`,
  ROUND(s.spr_vol - s.meta_spr_vol, 2)      AS `SPR Volumes vs Meta`,
  s.status_spr_ped                             AS `SPR Pedidos Status`,
  s.status_spr_vol                             AS `SPR Volumes Status`,
  s.status_entregas                            AS `Entregas Efetivas Status`,
  s.status_rotas                               AS `Rotas Concluidas Status`,
  s.status_orh                                 AS `ORH Status`,
  s.status_ader_vol                            AS `Aderencia Volumes Status`,
  s.score_operacional                          AS `Score Operacional`
FROM com_score s
ORDER BY s.data DESC;

-- ==============================================================================
-- OUTRAS VIEWS SHEETS (Simplificadas - adicionar conforme necessário)
-- ==============================================================================

-- Resumo por Filial
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.Resumo_Filial` AS
SELECT
  b.data_referencia AS `Data`,
  b.filial AS `Filial`,
  b.regiao AS `Regiao`,
  COUNT(DISTINCT b.id_carga) AS `Qtd Rotas`,
  SUM(b.qtd_volumes) AS `Qtd Volumes`,
  SUM(b.qtd_entregues) AS `Qtd Entregas`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(SUM(b.qtd_volumes), CAST(COUNT(DISTINCT b.id_carga) AS FLOAT64)), 2) AS `SPR Volumes`
FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica` b
GROUP BY 1, 2, 3;

-- Base Execução (export completo para análises)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.VW_Base_Execucao` AS
SELECT
  b.id_carga AS `Id Carga`,
  b.data_referencia AS `Data`,
  b.filial AS `Filial`,
  b.transportador AS `Transportador`,
  b.qtd_volumes AS `Volumes`,
  b.qtd_pedidos AS `Pedidos`,
  b.qtd_entregues AS `Entregas`,
  b.status_tms AS `Status`,
  b.flag_rota_concluida AS `Rota Concluida`
FROM `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica` b;

-- ==============================================================================
-- FIM - Adicionar outras views Sheets conforme necessário
-- Views não incluídas aqui:
-- - kpi_filial_dia, kpi_transportador_dia, kpi_card_latest
-- - alertas_rotas, drill_rotas
-- - Resumo_Ocupacao_Veic_Transp
-- - Resumo_Semana_Filial_Diario, Resumo_Semana_Filial_Matriz
--
-- Podem ser adicionadas posteriormente seguindo mesmo padrão:
-- Consumir base_execucao_canonica + agregação + alias PT
-- ==============================================================================
