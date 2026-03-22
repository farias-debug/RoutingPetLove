-- ============================================================================
-- PIPELINE v5 · CAMADA DE PUBLICAÇÃO PARA GOOGLE SHEETS
-- Projeto : data-aileron-482822-d0
-- Dataset : monitoramento_carga
-- Data    : 2026-03-21
-- ============================================================================
--
-- PRINCÍPIO: Estas views SÃO o output final para a operação.
--   - Nomes de coluna em PORTUGUÊS descritivo (padrão planilha original)
--   - Cada view = 1 aba exata do Google Sheets
--   - Coluna-a-coluna alinhado com o Excel de referência
--
-- CONVENÇÃO DE NOMES (BQ não aceita certos chars em alias):
--   (h) → h  |  (kg) → kg  |  % → Pct
--   (<4h) → Menos 4h   |  (>8h) → Mais 8h
--
-- ABAS (13 views):
--   1.  metas_globais               ( 4 cols)
--   2.  dim_filial_tratada          (13 cols)
--   3.  kpi_resumo_diario           (75 cols)
--   4.  kpi_filial_dia              (70 cols)
--   5.  kpi_transportador_dia       (71 cols)
--   6.  kpi_card_latest             (15 cols)
--   7.  alertas_rotas               (40 cols)
--   8.  drill_rotas                 (39 cols)
--   9.  Resumo_Filial               (34 cols)
--   10. Resumo_Ocupacao_Veic_Transp (26 cols)
--   11. VW_Base_Execucao            (54 cols)
--   12. Resumo_Semana_Filial_Diario (33 cols)
--   13. Resumo_Semana_Filial_Matriz (15 cols)
-- ============================================================================

-- ####################################################################
-- 1. metas_globais (4 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.metas_globais` AS
SELECT
  kpi_nome  AS `KPI`,
  meta      AS `Meta`,
  sentido   AS `Sentido`,
  unidade   AS `Unidade`
FROM `data-aileron-482822-d0.monitoramento_carga.dim_metas`;

-- ####################################################################
-- 2. dim_filial_tratada (13 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_filial_tratada` AS
SELECT
  d.cd_origem                 AS `CD Origem`,
  d.tabela                    AS `Tabela`,
  d.filial_nome               AS `Filial`,
  d.codigo                    AS `Codigo`,
  d.nome_filial               AS `Nome Filial`,
  d.tipo                      AS `Tipo`,
  d.meta_spr                  AS `MetaSPR`,
  m.meta                      AS `MetaEntrega`,
  d.regiao                    AS `Regiao`,
  d.capacidade_volume_dia     AS `Capacidade Volume Dia`,
  d.filial_key                AS `Filial Key`,
  d.nome_filial_key           AS `Nome Filial Key`,
  UPPER(TRIM(CAST(d.codigo AS STRING))) AS `Codigo Key`
FROM `data-aileron-482822-d0.monitoramento_carga.dim_filial` d
CROSS JOIN (
  SELECT meta FROM `data-aileron-482822-d0.monitoramento_carga.dim_metas` WHERE kpi_id = 'entregas_efetivas'
) m;

-- ####################################################################
-- 3. kpi_resumo_diario (75 cols) — consome mart_kpi_diario
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.kpi_resumo_diario` AS
WITH
com_lag AS (
  SELECT s.*,
    LAG(s.qtd_rotas,   1) OVER (ORDER BY s.data) AS qtd_rotas_d1,
    LAG(s.qtd_pedidos, 1) OVER (ORDER BY s.data) AS qtd_pedidos_d1
  FROM `data-aileron-482822-d0.monitoramento_carga.mart_kpi_diario` s
),
filial_agg AS (
  SELECT
    mf.data,
    COUNTIF(mf.status_spr_ped = 'Critico')      AS filiais_criticas,
    COUNTIF(mf.spr_ped < mf.meta_spr_ped)       AS filiais_abaixo_meta,
    STRING_AGG(
      CASE WHEN mf.spr_ped < mf.meta_spr_ped THEN mf.filial END,
      ', ' ORDER BY mf.spr_ped ASC LIMIT 3
    ) AS top3_piores_spr
  FROM `data-aileron-482822-d0.monitoramento_carga.mart_kpi_filial_dia` mf
  GROUP BY 1
)
SELECT
  l.data                                         AS `Data`,
  l.qtd_rotas                                   AS `Qtd Rotas`,
  l.qtd_pedidos                                AS `Qtd Pedidos`,
  l.qtd_volumes                                AS `Qtd Volumes`,
  l.qtd_entregas                               AS `Qtd Entregas`,
  l.qtd_insucessos                             AS `Qtd Insucessos`,
  l.qtd_baixas                                 AS `Qtd Baixas`,
  l.qtd_clientes                               AS `Qtd Clientes`,
  l.qtd_paradas                                AS `Qtd Paradas`,
  l.qtd_veiculos                               AS `Qtd Veiculos Ativos`,
  l.qtd_motoristas                             AS `Qtd Motoristas Ativos`,
  ROUND(l.total_km, 2)                         AS `Total KM Realizado`,
  ROUND(l.total_peso_kg, 2)                    AS `Total Peso kg`,
  ROUND(l.spr_ped, 2)                          AS `SPR Ped Realizado`,
  ROUND(l.spr_vol, 2)                          AS `SPR Vol Realizado`,
  ROUND(l.pct_entregas, 4)                     AS `Pct Entregas Efetivas`,
  ROUND(l.pct_rotas_concl, 4)                  AS `Pct Rotas Concluidas`,
  ROUND(l.orh, 2)                              AS `Tempo Med Realizado h`,
  ROUND(l.pct_util_jornada, 4)                 AS `Pct Utilizacao Jornada 8h`,
  ROUND(1.0 - IFNULL(l.pct_util_jornada, 0), 4) AS `Pct Ociosidade Jornada 8h`,
  ROUND(l.orh - l.meta_orh, 2)               AS `Gap ORH vs Meta h`,
  ROUND(l.horas_ociosas_total, 2)              AS `Horas Ociosas Totais`,
  ROUND(l.pct_rotas_curtas, 4)                 AS `Pct Rotas Curtas Menos 4h`,
  ROUND(l.pct_rotas_overtime, 4)               AS `Pct Rotas Overtime Mais 8h`,
  l.qtd_nao_plan                               AS `Qtd Rotas Nao Planejadas`,
  l.qtd_sem_tempo                              AS `Qtd Rotas Sem Tempo`,
  ROUND(l.ocup_ped, 4)                         AS `Pct Ocupacao Pedidos`,
  ROUND(l.ocup_vol, 4)                         AS `Pct Ocupacao Volumes`,
  ROUND(l.ocup_composta, 4)                    AS `Pct Ocupacao Composta`,
  l.status_capacidade                          AS `Status Capacidade`,
  l.status_capacidade                          AS `Status Capacidade Visual`,
  l.cor_capacidade                             AS `Status Capacidade Cor`,
  ROUND(l.ader_ped, 4)                         AS `Pct Ader Pedidos`,
  ROUND(l.ader_vol, 4)                         AS `Pct Ader Volumes`,
  ROUND(l.ader_peso, 4)                        AS `Pct Ader Peso`,
  ROUND(l.ader_km, 4)                          AS `Pct Ader KM`,
  ROUND(l.ader_tempo, 4)                       AS `Pct Ader Tempo`,
  ROUND(l.pct_match, 4)                        AS `Pct Match Mesmo Dia`,
  ROUND(l.pct_sem_plan, 4)                     AS `Pct Sem Planejado`,
  l.meta_spr_ped                               AS `Meta SPR Pedidos`,
  l.meta_spr_vol                               AS `Meta SPR Volumes`,
  l.meta_orh                                   AS `Meta ORH Tempo h`,
  l.meta_entregas                              AS `Meta Global Pct Entregas`,
  l.meta_rotas                                 AS `Meta Global Pct Rotas Concluidas`,
  l.meta_ocup                                  AS `Meta Global Ocupacao Composta`,
  l.meta_ader_vol                              AS `Meta Aderencia Volumes`,
  ROUND(l.spr_ped - l.meta_spr_ped, 2)      AS `SPR Pedidos vs Meta`,
  ROUND(l.spr_vol - l.meta_spr_vol, 2)      AS `SPR Volumes vs Meta`,
  ROUND(l.pct_entregas - l.meta_entregas, 4) AS `Entregas Efetivas vs Meta`,
  ROUND(l.pct_rotas_concl - l.meta_rotas, 4) AS `Rotas Concluidas vs Meta`,
  ROUND(l.ocup_composta - l.meta_ocup, 4)   AS `Capacidade Utilizada vs Meta`,
  ROUND(l.ader_vol - l.meta_ader_vol, 4)    AS `Aderencia Volumes vs Meta`,
  l.status_spr_ped                             AS `SPR Pedidos Status`,
  l.status_spr_vol                             AS `SPR Volumes Status`,
  l.status_entregas                            AS `Entregas Efetivas Status`,
  l.status_rotas                               AS `Rotas Concluidas Status`,
  l.status_orh                                 AS `ORH Status`,
  l.status_ader_vol                            AS `Aderencia Volumes Status`,
  ROUND(l.score_operacional, 0)                AS `Score Operacional`,
  cal.ano                                        AS `Ano`,
  cal.mes_num                                    AS `MesNumero`,
  cal.mes_nome                                   AS `MesNome`,
  cal.mes_ref                                    AS `MesKey`,
  cal.semana_inicio                              AS `SemanaInicio`,
  cal.semana_fim                                 AS `SemanaFim`,
  cal.ano_semana                                 AS `AnoSemana`,
  cal.label_semana                               AS `SemanaLabel`,
  IFNULL(fa.filiais_criticas, 0)                 AS `Qtd Filiais Criticas SPR`,
  IFNULL(fa.filiais_abaixo_meta, 0)              AS `Qtd Filiais Abaixo Meta SPR`,
  fa.top3_piores_spr                             AS `Top 3 Piores SPR`,
  CASE
    WHEN l.score_operacional < 50 THEN 'Score operacional critico'
    WHEN l.status_spr_vol = 'Critico' THEN 'SPR abaixo da meta'
    WHEN l.status_entregas = 'Critico' THEN 'Entregas em nivel critico'
    WHEN l.status_orh = 'Critico' THEN 'Jornada fora da meta'
    WHEN l.status_capacidade IN ('Saturado','Critico') THEN 'Ocupacao fora da faixa'
    WHEN l.qtd_nao_plan > 0 THEN 'Rotas sem planejamento'
    ELSE 'OK'
  END                                            AS `Alerta Operacional`,
  l.qtd_rotas   - IFNULL(l.qtd_rotas_d1,   l.qtd_rotas)   AS `Var D-1 Rotas`,
  l.qtd_pedidos - IFNULL(l.qtd_pedidos_d1, l.qtd_pedidos)  AS `Var D-1 Pedidos`,
  ROUND(l.spr_ped - IFNULL(l.spr_ped_d1, l.spr_ped), 2)   AS `Var D-1 SPR Ped`,
  ROUND(l.orh     - IFNULL(l.orh_d1,     l.orh), 2)        AS `Var D-1 ORH`
FROM com_lag l
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON l.data = cal.data
LEFT JOIN filial_agg fa            ON l.data = fa.data
ORDER BY l.data DESC;

-- ####################################################################
-- 4. kpi_filial_dia (70 cols) — consome mart_kpi_filial_dia
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.kpi_filial_dia` AS
SELECT
  s.data                                         AS `Data`,
  s.filial                                       AS `Filial`,
  s.regiao                                       AS `Regiao`,
  s.tipo                                         AS `Tipo`,
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
  ROUND(s.pct_util_jornada, 4)                 AS `Pct Utilizacao Jornada 8h`,
  ROUND(1.0 - IFNULL(s.pct_util_jornada, 0), 4) AS `Pct Ociosidade Jornada 8h`,
  ROUND(s.orh - s.meta_orh, 2)               AS `Gap ORH vs Meta h`,
  ROUND(s.horas_ociosas_total, 2)              AS `Horas Ociosas Totais`,
  ROUND(s.pct_rotas_curtas, 4)                 AS `Pct Rotas Curtas Menos 4h`,
  ROUND(s.pct_rotas_overtime, 4)               AS `Pct Rotas Overtime Mais 8h`,
  s.qtd_nao_plan                               AS `Qtd Rotas Nao Planejadas`,
  s.qtd_sem_tempo                              AS `Qtd Rotas Sem Tempo`,
  ROUND(s.ocup_ped, 4)                         AS `Pct Ocupacao Pedidos`,
  ROUND(s.ocup_vol, 4)                         AS `Pct Ocupacao Volumes`,
  ROUND(s.ocup_composta, 4)                    AS `Pct Ocupacao Composta`,
  s.status_capacidade                          AS `Status Capacidade`,
  s.status_capacidade                          AS `Status Capacidade Visual`,
  s.cor_capacidade                             AS `Status Capacidade Cor`,
  ROUND(s.ader_ped, 4)                         AS `Pct Ader Pedidos`,
  ROUND(s.ader_vol, 4)                         AS `Pct Ader Volumes`,
  ROUND(s.ader_peso, 4)                        AS `Pct Ader Peso`,
  ROUND(s.ader_km, 4)                          AS `Pct Ader KM`,
  ROUND(s.ader_tempo, 4)                       AS `Pct Ader Tempo`,
  ROUND(s.pct_match, 4)                        AS `Pct Match Mesmo Dia`,
  ROUND(s.pct_sem_plan, 4)                     AS `Pct Sem Planejado`,
  s.meta_spr_ped                               AS `Meta SPR Pedidos`,
  s.meta_spr_vol                               AS `Meta SPR Volumes`,
  s.meta_orh                                   AS `Meta ORH Tempo h`,
  s.meta_entregas                              AS `Meta Global Pct Entregas`,
  s.meta_rotas                                 AS `Meta Global Pct Rotas Concluidas`,
  s.meta_ocup                                  AS `Meta Global Ocupacao Composta`,
  s.meta_ader_vol                              AS `Meta Aderencia Volumes`,
  ROUND(s.spr_ped - s.meta_spr_ped, 2)      AS `SPR Pedidos vs Meta`,
  ROUND(s.spr_vol - s.meta_spr_vol, 2)      AS `SPR Volumes vs Meta`,
  ROUND(s.pct_entregas - s.meta_entregas, 4) AS `Entregas Efetivas vs Meta`,
  ROUND(s.pct_rotas_concl - s.meta_rotas, 4) AS `Rotas Concluidas vs Meta`,
  ROUND(s.ocup_composta - s.meta_ocup, 4)   AS `Capacidade Utilizada vs Meta`,
  ROUND(s.ader_vol - s.meta_ader_vol, 4)    AS `Aderencia Volumes vs Meta`,
  s.status_spr_ped                             AS `SPR Pedidos Status`,
  s.status_spr_vol                             AS `SPR Volumes Status`,
  s.status_entregas                            AS `Entregas Efetivas Status`,
  s.status_rotas                               AS `Rotas Concluidas Status`,
  s.status_orh                                 AS `ORH Status`,
  s.status_ader_vol                            AS `Aderencia Volumes Status`,
  ROUND(s.score_operacional, 0)                AS `Score Operacional`,
  cal.ano                                        AS `Ano`,
  cal.mes_num                                    AS `MesNumero`,
  cal.mes_nome                                   AS `MesNome`,
  cal.mes_ref                                    AS `MesKey`,
  cal.semana_inicio                              AS `SemanaInicio`,
  cal.semana_fim                                 AS `SemanaFim`,
  cal.ano_semana                                 AS `AnoSemana`,
  cal.label_semana                               AS `SemanaLabel`
FROM `data-aileron-482822-d0.monitoramento_carga.mart_kpi_filial_dia` s
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON s.data = cal.data
ORDER BY s.data DESC, s.filial;

-- ####################################################################
-- 5. kpi_transportador_dia (71 cols) — consome mart_kpi_transportador_dia
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.kpi_transportador_dia` AS
WITH
com_share AS (
  SELECT t.*,
    CASE
      WHEN t.alerta != 'OK' THEN t.alerta
      WHEN t.status_spr_vol = 'Critico' THEN 'Critico'
      WHEN t.status_entregas = 'Critico' THEN 'Critico'
      WHEN t.qtd_nao_plan > 0 THEN 'Atencao'
      ELSE 'OK'
    END AS status_transportador
  FROM `data-aileron-482822-d0.monitoramento_carga.mart_kpi_transportador_dia` t
)
SELECT
  t.data                                         AS `Data`,
  t.transportador                                AS `Transportador`,
  t.qtd_rotas                                   AS `Qtd Rotas`,
  t.qtd_pedidos                                AS `Qtd Pedidos`,
  t.qtd_volumes                                AS `Qtd Volumes`,
  t.qtd_entregas                               AS `Qtd Entregas`,
  t.qtd_insucessos                             AS `Qtd Insucessos`,
  t.qtd_baixas                                 AS `Qtd Baixas`,
  t.qtd_clientes                               AS `Qtd Clientes`,
  t.qtd_paradas                                AS `Qtd Paradas`,
  t.qtd_veiculos                               AS `Qtd Veiculos Ativos`,
  t.qtd_motoristas                             AS `Qtd Motoristas Ativos`,
  ROUND(t.total_km, 2)                         AS `Total KM Realizado`,
  ROUND(t.total_peso_kg, 2)                    AS `Total Peso kg`,
  ROUND(t.spr_ped, 2)                          AS `SPR Ped Realizado`,
  ROUND(t.spr_vol, 2)                          AS `SPR Vol Realizado`,
  ROUND(t.pct_entregas, 4)                     AS `Pct Entregas Efetivas`,
  ROUND(t.pct_rotas_concl, 4)                  AS `Pct Rotas Concluidas`,
  ROUND(t.orh, 2)                              AS `Tempo Med Realizado h`,
  ROUND(t.pct_util_jornada, 4)                 AS `Pct Utilizacao Jornada 8h`,
  ROUND(1.0 - IFNULL(t.pct_util_jornada, 0), 4) AS `Pct Ociosidade Jornada 8h`,
  ROUND(t.orh - t.meta_orh, 2)               AS `Gap ORH vs Meta h`,
  ROUND(t.horas_ociosas_total, 2)              AS `Horas Ociosas Totais`,
  ROUND(t.pct_rotas_curtas, 4)                 AS `Pct Rotas Curtas Menos 4h`,
  ROUND(t.pct_rotas_overtime, 4)               AS `Pct Rotas Overtime Mais 8h`,
  t.qtd_nao_plan                               AS `Qtd Rotas Nao Planejadas`,
  t.qtd_sem_tempo                              AS `Qtd Rotas Sem Tempo`,
  ROUND(t.ocup_ped, 4)                         AS `Pct Ocupacao Pedidos`,
  ROUND(t.ocup_vol, 4)                         AS `Pct Ocupacao Volumes`,
  ROUND(t.ocup_composta, 4)                    AS `Pct Ocupacao Composta`,
  t.status_capacidade                          AS `Status Capacidade`,
  t.status_capacidade                          AS `Status Capacidade Visual`,
  t.cor_capacidade                             AS `Status Capacidade Cor`,
  ROUND(t.ader_ped, 4)                         AS `Pct Ader Pedidos`,
  ROUND(t.ader_vol, 4)                         AS `Pct Ader Volumes`,
  ROUND(t.ader_peso, 4)                        AS `Pct Ader Peso`,
  ROUND(t.ader_km, 4)                          AS `Pct Ader KM`,
  ROUND(t.ader_tempo, 4)                       AS `Pct Ader Tempo`,
  ROUND(t.pct_match, 4)                        AS `Pct Match Mesmo Dia`,
  ROUND(t.pct_sem_plan, 4)                     AS `Pct Sem Planejado`,
  t.meta_spr_ped                               AS `Meta SPR Pedidos`,
  t.meta_spr_vol                               AS `Meta SPR Volumes`,
  t.meta_orh                                   AS `Meta ORH Tempo h`,
  t.meta_entregas                              AS `Meta Global Pct Entregas`,
  t.meta_rotas                                 AS `Meta Global Pct Rotas Concluidas`,
  t.meta_ocup                                  AS `Meta Global Ocupacao Composta`,
  t.meta_ader_vol                              AS `Meta Aderencia Volumes`,
  ROUND(t.spr_ped - t.meta_spr_ped, 2)      AS `SPR Pedidos vs Meta`,
  ROUND(t.spr_vol - t.meta_spr_vol, 2)      AS `SPR Volumes vs Meta`,
  ROUND(t.pct_entregas - t.meta_entregas, 4) AS `Entregas Efetivas vs Meta`,
  ROUND(t.pct_rotas_concl - t.meta_rotas, 4) AS `Rotas Concluidas vs Meta`,
  ROUND(t.ocup_composta - t.meta_ocup, 4)   AS `Capacidade Utilizada vs Meta`,
  ROUND(t.ader_vol - t.meta_ader_vol, 4)    AS `Aderencia Volumes vs Meta`,
  t.status_spr_ped                             AS `SPR Pedidos Status`,
  t.status_spr_vol                             AS `SPR Volumes Status`,
  t.status_entregas                            AS `Entregas Efetivas Status`,
  t.status_rotas                               AS `Rotas Concluidas Status`,
  t.status_orh                                 AS `ORH Status`,
  t.status_ader_vol                            AS `Aderencia Volumes Status`,
  ROUND(t.score_operacional, 0)                AS `Score Operacional`,
  cal.ano                                        AS `Ano`,
  cal.mes_num                                    AS `MesNumero`,
  cal.mes_nome                                   AS `MesNome`,
  cal.mes_ref                                    AS `MesKey`,
  cal.semana_inicio                              AS `SemanaInicio`,
  cal.semana_fim                                 AS `SemanaFim`,
  cal.ano_semana                                 AS `AnoSemana`,
  cal.label_semana                               AS `SemanaLabel`,
  ROUND(t.pct_share, 4)                          AS `Pct Share Transportador`,
  t.status_transportador                         AS `Status Transportador`,
  `data-aileron-482822-d0.monitoramento_carga.status_color`(t.status_transportador) AS `Status Transportador Cor`
FROM com_share t
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON t.data = cal.data
ORDER BY t.data DESC, t.transportador;

-- ####################################################################
-- 6. kpi_card_latest (15 cols) — consome mart_kpi_diario
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.kpi_card_latest` AS
WITH
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY data DESC) AS rn,
    LAG(qtd_rotas, 1) OVER (ORDER BY data) AS qtd_rotas_lag1,
    LAG(qtd_rotas, 7) OVER (ORDER BY data) AS qtd_rotas_lag7
  FROM `data-aileron-482822-d0.monitoramento_carga.mart_kpi_diario`
),
latest AS (
  SELECT * FROM ranked WHERE rn = 1
)
SELECT
  kpi, valor, meta, delta, status, cor, trend_d1, trend_wow, database_dt,
  valor_texto, meta_texto, delta_texto, trend_d1_texto, trend_wow_texto, acao
FROM latest l
CROSS JOIN UNNEST([
  STRUCT(
    'SPR Volumes' AS kpi,
    ROUND(l.spr_vol, 2) AS valor,
    l.meta_spr_vol AS meta,
    ROUND(l.spr_vol - l.meta_spr_vol, 2) AS delta,
    l.status_spr_vol AS status,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_spr_vol) AS cor,
    ROUND(l.spr_vol - IFNULL(l.spr_vol_d1, l.spr_vol), 2) AS trend_d1,
    ROUND(l.spr_vol - IFNULL(l.spr_vol_d7, l.spr_vol), 2) AS trend_wow,
    l.data AS database_dt,
    CONCAT(FORMAT('%.1f', l.spr_vol), ' vol/rota') AS valor_texto,
    CONCAT(FORMAT('%.0f', l.meta_spr_vol), ' vol/rota') AS meta_texto,
    CONCAT(FORMAT('%+.1f', l.spr_vol - l.meta_spr_vol), ' vol/rota') AS delta_texto,
    CONCAT(FORMAT('%+.1f', l.spr_vol - IFNULL(l.spr_vol_d1, l.spr_vol))) AS trend_d1_texto,
    CONCAT(FORMAT('%+.1f', l.spr_vol - IFNULL(l.spr_vol_d7, l.spr_vol))) AS trend_wow_texto,
    CASE WHEN l.spr_vol < l.meta_spr_vol THEN 'Aumentar volumetria por rota' ELSE 'Manter desempenho' END AS acao
  ),
  STRUCT('SPR Pedidos', ROUND(l.spr_ped, 2), l.meta_spr_ped,
    ROUND(l.spr_ped - l.meta_spr_ped, 2),
    l.status_spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_spr_ped),
    ROUND(l.spr_ped - IFNULL(l.spr_ped_d1, l.spr_ped), 2),
    ROUND(l.spr_ped - IFNULL(l.spr_ped_d7, l.spr_ped), 2),
    l.data,
    CONCAT(FORMAT('%.1f', l.spr_ped), ' ped/rota'),
    CONCAT(FORMAT('%.0f', l.meta_spr_ped), ' ped/rota'),
    CONCAT(FORMAT('%+.1f', l.spr_ped - l.meta_spr_ped), ' ped/rota'),
    FORMAT('%+.1f', l.spr_ped - IFNULL(l.spr_ped_d1, l.spr_ped)),
    FORMAT('%+.1f', l.spr_ped - IFNULL(l.spr_ped_d7, l.spr_ped)),
    CASE WHEN l.spr_ped < l.meta_spr_ped THEN 'Aumentar pedidos por rota' ELSE 'Manter desempenho' END),
  STRUCT('Entregas Efetivas', ROUND(l.pct_entregas, 4), l.meta_entregas,
    ROUND(l.pct_entregas - l.meta_entregas, 4),
    l.status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_entregas),
    ROUND(l.pct_entregas - IFNULL(l.pct_entregas_d1, l.pct_entregas), 4),
    ROUND(l.pct_entregas - IFNULL(l.pct_entregas_d7, l.pct_entregas), 4),
    l.data,
    CONCAT(FORMAT('%.1f', l.pct_entregas * 100), '%'),
    CONCAT(FORMAT('%.0f', l.meta_entregas * 100), '%'),
    CONCAT(FORMAT('%+.2f', (l.pct_entregas - l.meta_entregas) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.pct_entregas - IFNULL(l.pct_entregas_d1, l.pct_entregas)) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.pct_entregas - IFNULL(l.pct_entregas_d7, l.pct_entregas)) * 100), ' pp'),
    CASE WHEN l.pct_entregas < l.meta_entregas THEN 'Investigar causas de insucesso' ELSE 'Manter desempenho' END),
  STRUCT('ORH', ROUND(l.orh, 2), l.meta_orh,
    ROUND(l.orh - l.meta_orh, 2),
    l.status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_orh),
    ROUND(l.orh - IFNULL(l.orh_d1, l.orh), 2),
    ROUND(l.orh - IFNULL(l.orh_d7, l.orh), 2),
    l.data,
    CONCAT(FORMAT('%.1f', l.orh), 'h'),
    CONCAT(FORMAT('%.0f', l.meta_orh), 'h'),
    CONCAT(FORMAT('%+.1f', l.orh - l.meta_orh), 'h'),
    CONCAT(FORMAT('%+.1f', l.orh - IFNULL(l.orh_d1, l.orh)), 'h'),
    CONCAT(FORMAT('%+.1f', l.orh - IFNULL(l.orh_d7, l.orh)), 'h'),
    CASE WHEN ABS(l.orh - l.meta_orh) > 2.1 THEN 'Avaliar tempo de jornada' ELSE 'Manter desempenho' END),
  STRUCT('Rotas Concluidas', ROUND(l.pct_rotas_concl, 4), l.meta_rotas,
    ROUND(l.pct_rotas_concl - l.meta_rotas, 4),
    l.status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_rotas),
    ROUND(l.pct_rotas_concl - IFNULL(l.pct_rotas_concl_d1, l.pct_rotas_concl), 4),
    ROUND(l.pct_rotas_concl - IFNULL(l.pct_rotas_concl_d7, l.pct_rotas_concl), 4),
    l.data,
    CONCAT(FORMAT('%.1f', l.pct_rotas_concl * 100), '%'),
    CONCAT(FORMAT('%.0f', l.meta_rotas * 100), '%'),
    CONCAT(FORMAT('%+.2f', (l.pct_rotas_concl - l.meta_rotas) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.pct_rotas_concl - IFNULL(l.pct_rotas_concl_d1, l.pct_rotas_concl)) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.pct_rotas_concl - IFNULL(l.pct_rotas_concl_d7, l.pct_rotas_concl)) * 100), ' pp'),
    CASE WHEN l.pct_rotas_concl < l.meta_rotas THEN 'Monitorar finalizacao de rotas' ELSE 'Manter desempenho' END),
  STRUCT('Ocupacao Composta', ROUND(l.ocup_composta, 4), l.meta_ocup,
    ROUND(l.ocup_composta - l.meta_ocup, 4),
    l.status_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_capacidade),
    ROUND(l.ocup_composta - IFNULL(l.ocup_composta_d1, l.ocup_composta), 4),
    ROUND(l.ocup_composta - IFNULL(l.ocup_composta_d7, l.ocup_composta), 4),
    l.data,
    CONCAT(FORMAT('%.1f', l.ocup_composta * 100), '%'),
    CONCAT(FORMAT('%.0f', l.meta_ocup * 100), '%'),
    CONCAT(FORMAT('%+.2f', (l.ocup_composta - l.meta_ocup) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.ocup_composta - IFNULL(l.ocup_composta_d1, l.ocup_composta)) * 100), ' pp'),
    CONCAT(FORMAT('%+.2f', (l.ocup_composta - IFNULL(l.ocup_composta_d7, l.ocup_composta)) * 100), ' pp'),
    CASE WHEN l.status_capacidade IN ('Critico','Saturado') THEN 'Revisar planejamento de capacidade' ELSE 'Manter desempenho' END),
  STRUCT('Score Diario', ROUND(l.score_operacional, 0), 100.0,
    ROUND(l.score_operacional - 100.0, 0),
    CASE WHEN l.score_operacional >= 75 THEN 'OK' WHEN l.score_operacional >= 50 THEN 'Atencao' ELSE 'Critico' END,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(CASE WHEN l.score_operacional >= 75 THEN 'OK' WHEN l.score_operacional >= 50 THEN 'Atencao' ELSE 'Critico' END),
    ROUND(l.score_operacional - IFNULL(l.score_d1, l.score_operacional), 0),
    ROUND(l.score_operacional - IFNULL(l.score_d7, l.score_operacional), 0),
    l.data,
    CONCAT(CAST(CAST(ROUND(l.score_operacional, 0) AS INT64) AS STRING), ' pts'),
    '100 pts',
    CONCAT(FORMAT('%+.0f', l.score_operacional - 100.0), ' pts'),
    FORMAT('%+.0f', l.score_operacional - IFNULL(l.score_d1, l.score_operacional)),
    FORMAT('%+.0f', l.score_operacional - IFNULL(l.score_d7, l.score_operacional)),
    CASE WHEN l.score_operacional < 50 THEN 'Atencao global - revisar KPIs' ELSE 'Manter desempenho' END),
  STRUCT('DPPH', ROUND(l.dpph, 2), l.meta_dpph,
    ROUND(l.dpph - l.meta_dpph, 2),
    l.status_dpph,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(l.status_dpph),
    ROUND(l.dpph - IFNULL(l.dpph_d1, l.dpph), 2),
    ROUND(l.dpph - IFNULL(l.dpph_d7, l.dpph), 2),
    l.data,
    CONCAT(FORMAT('%.1f', l.dpph), ' ent/h'),
    CONCAT(FORMAT('%.0f', l.meta_dpph), ' ent/h'),
    CONCAT(FORMAT('%+.1f', l.dpph - l.meta_dpph), ' ent/h'),
    FORMAT('%+.1f', l.dpph - IFNULL(l.dpph_d1, l.dpph)),
    FORMAT('%+.1f', l.dpph - IFNULL(l.dpph_d7, l.dpph)),
    CASE WHEN l.dpph < l.meta_dpph THEN 'Aumentar produtividade por hora' ELSE 'Manter desempenho' END),
  STRUCT('Total Rotas', CAST(l.qtd_rotas AS FLOAT64), CAST(NULL AS FLOAT64),
    CAST(NULL AS FLOAT64),
    'Informativo',
    `data-aileron-482822-d0.monitoramento_carga.status_color`('Informativo'),
    CAST(l.qtd_rotas - IFNULL(l.qtd_rotas_lag1, l.qtd_rotas) AS FLOAT64),
    CAST(l.qtd_rotas - IFNULL(l.qtd_rotas_lag7, l.qtd_rotas) AS FLOAT64),
    l.data,
    CAST(l.qtd_rotas AS STRING),
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    CAST(NULL AS STRING),
    'Volume operacional do dia')
]);

-- ####################################################################
-- 7. alertas_rotas (40 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.alertas_rotas` AS
SELECT
  f.data_planejada                    AS `Data`,
  cal.ano_semana                      AS `AnoSemana`,
  cal.mes_ref                         AS `MesKey`,
  f.filial                            AS `Filial`,
  f.regiao                            AS `Regiao`,
  f.tipo_filial                       AS `Tipo`,
  f.transportador                     AS `Transportador`,
  f.rota                              AS `Rota`,
  dp.rota_planejada                   AS `Rota Planejada`,
  f.placa                             AS `Placa`,
  f.motorista                         AS `Motorista`,
  f.tipo_veiculo                      AS `Tipo de Veiculo Padrao`,
  f.status                            AS `Status`,
  CASE
    WHEN f.flag_entrega_critica          THEN 'Critico'
    WHEN f.flag_overtime OR f.flag_nao_planejada OR f.flag_match_critico THEN 'Atencao'
    WHEN f.flag_rota_concluida           THEN 'OK'
    ELSE 'Pendente'
  END                                 AS `Status Rota`,
  `data-aileron-482822-d0.monitoramento_carga.status_color`(
    CASE
      WHEN f.flag_entrega_critica          THEN 'Critico'
      WHEN f.flag_overtime OR f.flag_nao_planejada OR f.flag_match_critico THEN 'Atencao'
      WHEN f.flag_rota_concluida           THEN 'OK'
      ELSE 'Informativo'
    END
  )                                   AS `Status Rota Cor`,
  f.qtd_pedidos                       AS `Pedidos da Rota`,
  f.qtd_volumes                       AS `Volumes da Rota`,
  ROUND(f.peso_kg, 2)                AS `Peso kg`,
  f.pedidos_plan                      AS `Pedidos Planejados`,
  f.volumes_plan                      AS `Volumes Planejados`,
  ROUND(f.peso_plan_kg, 2)            AS `Peso Planejado kg`,
  f.paradas                           AS `Paradas`,
  f.clientes                          AS `Clientes`,
  f.entregues                         AS `Entregues`,
  f.insucessos                        AS `Insucessos`,
  f.baixas                            AS `Baixas`,
  ROUND(f.km_planejado, 2)           AS `KM Planejado`,
  ROUND(f.km_realizado, 2)           AS `KM Realizado`,
  ROUND(f.tempo_plan, 2)             AS `Tempo Planejado h`,
  ROUND(f.tempo_real, 2)             AS `Tempo Realizado h`,
  ROUND(f.pct_entrega_efetiva, 4)    AS `Entrega Efetiva Rota`,
  ROUND(f.ocup_pedidos, 4)           AS `Ocupacao Pedidos Rota`,
  ROUND(f.ocup_volumes, 4)           AS `Ocupacao Volumes Rota`,
  ROUND(f.ocup_peso_veiculo, 4)      AS `Ocupacao Composta Rota`,
  f.flag_nao_planejada                AS `Flag Nao Planejada`,
  f.flag_sem_tempo                    AS `Flag Sem Tempo`,
  f.flag_overtime                     AS `Flag Overtime`,
  f.flag_match_critico                AS `Flag Match Critico`,
  f.flag_entrega_critica              AS `Flag Entrega Critica`,
  f.match_temporal                    AS `Match Temporal`,
  CASE WHEN IFNULL(f.possui_planejamento, FALSE) THEN 'Sim' ELSE 'Nao' END AS `Possui Planejado`,
  CASE WHEN f.flag_rota_concluida THEN 'Sim' ELSE 'Nao' END                AS `Rota Concluida`,
  CASE
    WHEN f.flag_entrega_critica THEN 'Alta'
    WHEN f.flag_overtime OR f.flag_nao_planejada THEN 'Media'
    WHEN f.flag_sem_tempo OR f.flag_match_critico OR f.flag_insucesso THEN 'Baixa'
    ELSE 'Normal'
  END                                 AS `Prioridade`
FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_planejamento` dp ON f.planning_key = dp.planning_key
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal   ON f.data_planejada = cal.data
WHERE f.tipo_filial = 'Unidade'
  AND (f.flag_entrega_critica
    OR f.flag_overtime
    OR f.flag_nao_planejada
    OR f.flag_sem_tempo
    OR f.flag_match_critico
    OR f.flag_insucesso)
ORDER BY
  CASE
    WHEN f.flag_entrega_critica THEN 1
    WHEN f.flag_overtime OR f.flag_nao_planejada THEN 2
    ELSE 3
  END,
  f.data_planejada DESC, f.filial;

-- ####################################################################
-- 8. drill_rotas (39 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.drill_rotas` AS
SELECT
  f.data_planejada                    AS `Data`,
  cal.ano_semana                      AS `AnoSemana`,
  cal.mes_ref                         AS `MesKey`,
  f.filial                            AS `Filial`,
  f.regiao                            AS `Regiao`,
  f.tipo_filial                       AS `Tipo`,
  f.transportador                     AS `Transportador`,
  f.rota                              AS `Rota`,
  dp.rota_planejada                   AS `Rota Planejada`,
  f.placa                             AS `Placa`,
  f.motorista                         AS `Motorista`,
  f.tipo_veiculo                      AS `Tipo de Veiculo Padrao`,
  f.status                            AS `Status`,
  CASE
    WHEN f.flag_entrega_critica          THEN 'Critico'
    WHEN f.flag_overtime OR f.flag_nao_planejada OR f.flag_match_critico THEN 'Atencao'
    WHEN f.flag_rota_concluida           THEN 'OK'
    ELSE 'Pendente'
  END                                 AS `Status Rota`,
  `data-aileron-482822-d0.monitoramento_carga.status_color`(
    CASE
      WHEN f.flag_entrega_critica          THEN 'Critico'
      WHEN f.flag_overtime OR f.flag_nao_planejada OR f.flag_match_critico THEN 'Atencao'
      WHEN f.flag_rota_concluida           THEN 'OK'
      ELSE 'Informativo'
    END
  )                                   AS `Status Rota Cor`,
  f.qtd_pedidos                       AS `Pedidos da Rota`,
  f.qtd_volumes                       AS `Volumes da Rota`,
  ROUND(f.peso_kg, 2)                AS `Peso kg`,
  f.pedidos_plan                      AS `Pedidos Planejados`,
  f.volumes_plan                      AS `Volumes Planejados`,
  ROUND(f.peso_plan_kg, 2)            AS `Peso Planejado kg`,
  f.paradas                           AS `Paradas`,
  f.clientes                          AS `Clientes`,
  f.entregues                         AS `Entregues`,
  f.insucessos                        AS `Insucessos`,
  f.baixas                            AS `Baixas`,
  ROUND(f.km_planejado, 2)           AS `KM Planejado`,
  ROUND(f.km_realizado, 2)           AS `KM Realizado`,
  ROUND(f.tempo_plan, 2)             AS `Tempo Planejado h`,
  ROUND(f.tempo_real, 2)             AS `Tempo Realizado h`,
  ROUND(f.pct_entrega_efetiva, 4)    AS `Entrega Efetiva Rota`,
  ROUND(f.ocup_pedidos, 4)           AS `Ocupacao Pedidos Rota`,
  ROUND(f.ocup_volumes, 4)           AS `Ocupacao Volumes Rota`,
  ROUND(f.ocup_peso_veiculo, 4)      AS `Ocupacao Composta Rota`,
  f.flag_nao_planejada                AS `Flag Nao Planejada`,
  f.flag_sem_tempo                    AS `Flag Sem Tempo`,
  f.flag_overtime                     AS `Flag Overtime`,
  f.flag_match_critico                AS `Flag Match Critico`,
  f.flag_entrega_critica              AS `Flag Entrega Critica`,
  f.match_temporal                    AS `Match Temporal`,
  CASE WHEN IFNULL(f.possui_planejamento, FALSE) THEN 'Sim' ELSE 'Nao' END AS `Possui Planejado`,
  CASE WHEN f.flag_rota_concluida THEN 'Sim' ELSE 'Nao' END                AS `Rota Concluida`
FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_planejamento` dp ON f.planning_key = dp.planning_key
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal   ON f.data_planejada = cal.data
WHERE f.tipo_filial = 'Unidade'
ORDER BY f.data_planejada DESC, f.filial, f.rota;

-- ####################################################################
-- 9. Resumo_Filial (34 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.Resumo_Filial` AS
WITH agg AS (
  SELECT
    f.filial,
    COUNT(DISTINCT f.data_planejada)     AS dias_cobertos,
    COUNT(DISTINCT f.id_carga)           AS total_cargas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS placas_distintas,
    SUM(f.qtd_pedidos)                   AS pedidos_real,
    SUM(f.qtd_volumes)                   AS volumes_real,
    SUM(f.peso_kg)                       AS peso_real_kg,
    SUM(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(f.tipo_veiculo)) AS capacidade_peso_total_kg,
    SUM(f.entregues)                     AS entregues,
    SUM(f.insucessos)                    AS insucessos,
    SUM(f.pedidos_plan)                  AS pedidos_plan,
    SUM(f.volumes_plan)                  AS volumes_plan,
    SUM(f.peso_plan_kg)                  AS peso_plan_kg,
    SUM(f.tempo_plan)                    AS tempo_plan_h,
    SUM(f.tempo_real)                    AS tempo_real_h,
    SUM(f.tempo_operacional_h)           AS tempo_oper_h,
    SUM(f.km_planejado)                  AS km_plan,
    SUM(f.km_realizado)                  AS km_real,
    COUNTIF(f.flag_rota_concluida)       AS finalizadas,
    COUNTIF(f.flag_em_rota)              AS em_rota,
    COUNTIF(f.flag_parcial)              AS parciais,
    COUNTIF(f.flag_roteirizada)          AS roteirizadas
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1
)
SELECT
  a.filial                                        AS `Filial`,
  df.nome_filial                                  AS `Nome Filial`,
  df.tipo                                         AS `Tipo Filial`,
  df.meta_spr                                     AS `Meta SPR`,
  a.dias_cobertos                                 AS `Dias Cobertos`,
  a.total_cargas                                  AS `Total Cargas`,
  a.placas_distintas                              AS `Placas Distintas`,
  a.pedidos_real                                  AS `Pedidos Real`,
  a.volumes_real                                  AS `Volumes Real`,
  ROUND(a.peso_real_kg, 2)                        AS `Peso Real kg`,
  ROUND(a.capacidade_peso_total_kg, 2)            AS `Capacidade Peso Total kg`,
  a.entregues                                     AS `Entregues`,
  a.insucessos                                    AS `Insucessos`,
  a.pedidos_plan                                  AS `Pedidos Plan`,
  a.volumes_plan                                  AS `Volumes Plan`,
  ROUND(a.peso_plan_kg, 2)                        AS `Peso Plan kg`,
  a.pedidos_real - a.pedidos_plan                 AS `Delta Pedidos`,
  a.volumes_real - a.volumes_plan                 AS `Delta Volumes`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.volumes_real, CAST(a.total_cargas AS FLOAT64)), 2) AS `SPR Vol Real`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.pedidos_real, CAST(a.total_cargas AS FLOAT64)), 2) AS `SPR Ped Real`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.volumes_plan AS FLOAT64), CAST(a.total_cargas AS FLOAT64)), 2) AS `SPR Vol Plan`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.pedidos_plan AS FLOAT64), CAST(a.total_cargas AS FLOAT64)), 2) AS `SPR Ped Plan`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.volumes_real, CAST(a.total_cargas AS FLOAT64))
    - COALESCE(df.meta_spr, 0), 2)                AS `SPR vs Meta`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.entregues, a.entregues + a.insucessos), 4) AS `Entrega Efetiva`,
  ROUND(a.tempo_real_h, 2)                         AS `Tempo Real h`,
  ROUND(a.tempo_plan_h, 2)                         AS `Tempo Plan h`,
  ROUND(a.tempo_real_h - a.tempo_plan_h, 2)        AS `Desvio H`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(a.tempo_real_h - a.tempo_plan_h, NULLIF(a.tempo_plan_h, 0)), 4) AS `Desvio Pct`,
  ROUND(a.km_real, 2)                              AS `KM Real`,
  ROUND(a.km_plan, 2)                              AS `KM Plan`,
  a.finalizadas                                    AS `Finalizadas`,
  a.em_rota                                        AS `Em Rota`,
  a.parciais                                       AS `Parciais`,
  a.roteirizadas                                   AS `Roteirizadas`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(a.finalizadas AS FLOAT64), CAST(a.total_cargas AS FLOAT64)), 4) AS `Progresso Pct`
FROM agg a
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` df ON a.filial = df.filial_nome
ORDER BY a.filial;

-- ####################################################################
-- 10. Resumo_Ocupacao_Veic_Transp (26 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.Resumo_Ocupacao_Veic_Transp` AS
WITH agg AS (
  SELECT
    f.data_planejada                      AS data,
    f.tipo_veiculo,
    f.transportador,
    COUNT(DISTINCT f.id_carga)            AS rotas,
    COUNT(f.placa)                        AS qtd_placas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != ''
      THEN UPPER(f.placa) END)            AS placas_distintas,
    SUM(f.peso_kg)                        AS peso_total_kg,
    SUM(f.qtd_volumes)                    AS volumes,
    SUM(f.qtd_pedidos)                    AS pedidos,
    SUM(f.entregues)                      AS entregas,
    SUM(f.paradas)                        AS paradas,
    SUM(f.tempo_operacional_h)            AS tempo_oper_h,
    SUM(f.valor_total)                    AS valor_total
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1, 2, 3
)
SELECT
  a.data                                           AS `Data`,
  cal.dia_semana_nome                              AS `Dia Semana`,
  cal.semana_inicio                                AS `Semana Inicio`,
  cal.label_semana                                 AS `Label Semana`,
  cal.mes_ref                                      AS `Mes Ref`,
  a.tipo_veiculo                                   AS `Tipo de Veiculo`,
  a.transportador                                  AS `Transportador`,
  a.rotas                                          AS `Rotas`,
  a.qtd_placas                                     AS `Quantidade Placas`,
  a.placas_distintas                               AS `Placas Distintas`,
  ROUND(a.peso_total_kg, 2)                        AS `Peso Total kg`,
  dv.capacidade_peso_kg                            AS `Capacidade Peso Unit kg`,
  ROUND(dv.capacidade_peso_kg * a.rotas, 2)        AS `Capacidade Peso Total kg`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.peso_total_kg, dv.capacidade_peso_kg * a.rotas), 4) AS `Ocupacao Peso`,
  a.volumes                                         AS `Volumes`,
  a.pedidos                                         AS `Pedidos`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.volumes, CAST(a.rotas AS FLOAT64)), 2)        AS `Media Volumes por Rota`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.pedidos, CAST(a.rotas AS FLOAT64)), 2)        AS `Media Pedidos por Rota`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.peso_total_kg, CAST(a.rotas AS FLOAT64)), 2)  AS `Media Peso por Rota kg`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.volumes, CAST(a.placas_distintas AS FLOAT64)), 2) AS `SPR por Veiculo`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.tempo_oper_h, CAST(a.rotas AS FLOAT64)), 2)   AS `ORH`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.entregas, NULLIF(a.paradas, 0)), 2)            AS `Drop Size`,
  ROUND(a.valor_total, 2)                            AS `Valor Pagamento Carga Total`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.valor_total, CAST(a.rotas AS FLOAT64)), 2)     AS `Custo Medio por Carga`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.valor_total, NULLIF(a.volumes, 0)), 2)          AS `Custo Medio por Volume`,
  ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.valor_total, NULLIF(a.pedidos, 0)), 2)          AS `Custo Medio por Pedido`
FROM agg a
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_veiculo` dv    ON a.tipo_veiculo = dv.tipo_veiculo
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON a.data = cal.data
ORDER BY a.data DESC, a.tipo_veiculo, a.transportador;

-- ####################################################################
-- 11. VW_Base_Execucao (54 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.VW_Base_Execucao` AS
SELECT
  f.id_carga                              AS `IdCarga`,
  f.data_planejada                        AS `Data Planejada`,
  f.filial                                AS `Filial`,
  df.nome_filial                          AS `Nome Filial`,
  f.tipo_filial                           AS `Tipo Filial`,
  df.meta_spr                             AS `MetaSPR Filial`,
  df.capacidade_volume_dia                AS `Capacidade Volume Dia`,
  f.tipo_veiculo                          AS `Tipo de Veiculo Padrao`,
  f.status                                AS `Status`,
  f.placa                                 AS `Placa`,
  f.motorista                             AS `Motorista`,
  f.cpf_motorista                         AS `CPF`,
  f.rota                                  AS `Rota`,
  f.transportador                         AS `Transportador`,
  ROUND(f.valor_total, 2)                AS `Valor Pagamento Carga`,
  ROUND(f.performance_pct, 2)            AS `Performance Pct`,
  f.dt_abertura                           AS `Data de Abertura`,
  f.dt_carregamento                       AS `Data de Carregamento`,
  f.dt_atribuicao_motorista               AS `Data Atribuicao Motorista`,
  f.dt_inicio_rota                        AS `Data Inicio Rota`,
  f.dt_ultima_baixa                       AS `Ultima Baixa`,
  f.qtd_pedidos                           AS `Pedidos da Rota`,
  f.qtd_volumes                           AS `Volumes da Rota`,
  ROUND(f.peso_kg, 2)                    AS `Peso Realizado kg`,
  f.paradas                               AS `Paradas`,
  f.clientes                              AS `Clientes`,
  f.entregues                             AS `Entregues`,
  f.insucessos                            AS `Insucessos`,
  f.insucessos                            AS `Insucessos Clean`,
  f.baixas                                AS `Baixas`,
  ROUND(f.km_planejado, 2)               AS `KM Planejado`,
  ROUND(f.km_realizado, 2)               AS `KM Realizado`,
  ROUND(f.tempo_plan, 2)                 AS `Tempo Planejado h`,
  ROUND(f.tempo_real, 2)                 AS `Tempo Realizado h`,
  f.pedidos_plan                          AS `Pedidos Planejados`,
  f.volumes_plan                          AS `Volumes Planejados`,
  ROUND(f.peso_plan_kg, 2)               AS `Peso Planejado kg`,
  CASE WHEN IFNULL(f.possui_planejamento, FALSE) THEN 'Sim' ELSE 'Nao' END
    AS `Possui Planejado`,
  CASE WHEN f.flag_rota_concluida THEN 'Sim' ELSE 'Nao' END
    AS `Rota Concluida`,
  cal.dia_semana_nome                     AS `Dia Semana`,
  cal.semana_inicio                       AS `Semana Inicio`,
  cal.semana_ano                          AS `Numero Semana`,
  cal.label_semana                        AS `Label Semana`,
  cal.mes_ref                             AS `Mes Ref`,
  CAST(f.qtd_pedidos AS FLOAT64)          AS `SPR Pedidos`,
  CAST(f.qtd_volumes AS FLOAT64)          AS `SPR Volumes`,
  f.delta_pedidos                         AS `Delta Pedidos`,
  f.delta_volumes                         AS `Delta Volumes`,
  ROUND(f.pct_entrega_efetiva, 4)        AS `Entrega Efetiva`,
  ROUND(f.desvio_tempo_h, 2)             AS `Desvio Tempo h`,
  ROUND(f.desvio_tempo_pct, 4)           AS `Desvio Tempo`,
  `data-aileron-482822-d0.monitoramento_carga.status_higher`(CAST(f.qtd_volumes AS FLOAT64), COALESCE(df.meta_spr, 67.0)) AS `Status SPR`,
  CASE
    WHEN f.pct_entrega_efetiva IS NULL THEN NULL
    WHEN f.pct_entrega_efetiva >= 0.98 THEN 'OK'
    WHEN f.pct_entrega_efetiva >= 0.90 THEN 'Atencao'
    ELSE 'Critico'
  END                                     AS `Status Entrega`,
  CASE
    WHEN f.desvio_tempo_pct IS NULL THEN NULL
    WHEN ABS(f.desvio_tempo_pct) <= 0.15 THEN 'OK'
    WHEN ABS(f.desvio_tempo_pct) <= 0.30 THEN 'Atencao'
    ELSE 'Critico'
  END                                     AS `Status Tempo`,
  CASE
    WHEN NOT IFNULL(f.possui_planejamento, FALSE) THEN 'Sem planejamento'
    WHEN f.pct_entrega_efetiva IS NOT NULL AND f.pct_entrega_efetiva < 0.95 THEN 'Entrega critica'
    WHEN f.tempo_operacional_h > 8 THEN 'Overtime'
    WHEN f.insucessos > 0 THEN 'Com insucesso'
    ELSE NULL
  END                                     AS `Alerta Operacional`
FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` df   ON f.filial = df.filial_nome
LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON f.data_planejada = cal.data
ORDER BY f.data_planejada DESC, f.filial, f.rota;

-- ####################################################################
-- 12. Resumo_Semana_Filial_Diario (33 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.Resumo_Semana_Filial_Diario` AS
WITH base AS (
  SELECT
    d.data,
    d.filial,
    d.tipo_filial,
    d.regiao,
    df.nome_filial,
    df.meta_spr,
    df.capacidade_volume_dia,
    cal.semana_inicio,
    cal.label_semana,
    cal.dia_semana_nome,
    MOD(cal.dia_semana_num + 5, 7) + 1   AS dia_ordem,
    d.total_rotas,
    d.placas_distintas,
    d.peso_real_kg,
    d.peso_plan_kg,
    d.volumes_plan,
    d.volumes_real,
    d.tempo_plan_h,
    d.tempo_real_h,
    d.tempo_oper_h,
    d.rotas_concluidas,
    d.rotas_em_rota,
    d.rotas_parciais,
    d.rotas_roteirizadas,
    d.spr_vol,
    d.spr_ped,
    d.pct_entrega_efetiva,
    d.orh,
    d.dpph,
    d.pct_progresso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      d.volumes_plan, CAST(d.total_rotas AS FLOAT64)) AS spr_vol_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      d.tempo_plan_h, CAST(d.total_rotas AS FLOAT64)) AS orh_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(d.pedidos_plan AS FLOAT64), NULLIF(d.tempo_plan_h, 0)) AS dpph_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(d.volumes_real AS FLOAT64), df.capacidade_volume_dia) AS ader_cap_vol_dia
  FROM `data-aileron-482822-d0.monitoramento_carga.mart_ops_diario_filial` d
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` df ON d.filial = df.filial_nome
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON d.data = cal.data
),
com_lag AS (
  SELECT b.*,
    b.volumes_real - IFNULL(
      LAG(b.volumes_real, 1) OVER (PARTITION BY b.filial ORDER BY b.data),
      b.volumes_real) AS var_volumes_d1,
    b.spr_vol - IFNULL(
      LAG(b.spr_vol, 1) OVER (PARTITION BY b.filial ORDER BY b.data),
      b.spr_vol) AS var_spr_d1
  FROM base b
)
SELECT
  l.semana_inicio                         AS `Semana Inicio`,
  l.label_semana                          AS `Label Semana`,
  l.data                                  AS `Data`,
  l.dia_semana_nome                       AS `Dia Semana`,
  l.dia_ordem                             AS `Dia Ordem`,
  l.filial                                AS `Filial`,
  l.nome_filial                           AS `Nome Filial`,
  l.tipo_filial                           AS `Tipo Filial`,
  l.meta_spr                              AS `MetaSPR Filial`,
  l.total_rotas                           AS `Total Cargas por Rotas`,
  l.placas_distintas                      AS `Total Placas Distintas`,
  ROUND(l.peso_real_kg, 2)               AS `Total Peso Realizado kg`,
  ROUND(l.peso_plan_kg, 2)               AS `Total Peso Pedidos kg`,
  l.volumes_plan                          AS `Volumes Planejados`,
  l.volumes_real                          AS `Volumes Realizados`,
  l.var_volumes_d1                        AS `Variacao Volumes vs D-1`,
  ROUND(l.spr_vol_plan, 2)              AS `SPR Volumes Planejado`,
  ROUND(l.spr_vol, 2)                   AS `SPR Volumes Realizado`,
  ROUND(l.spr_vol - COALESCE(l.meta_spr, 0), 2)
    AS `SPR vs Meta`,
  ROUND(l.var_spr_d1, 2)                AS `Variacao SPR vs D-1`,
  ROUND(l.tempo_plan_h, 2)              AS `Tempo Planejado h`,
  ROUND(l.tempo_real_h, 2)              AS `Tempo Realizado h`,
  ROUND(l.orh_plan, 2)                  AS `ORH Tempo Planejado`,
  ROUND(l.orh, 2)                       AS `ORH Tempo Realizado`,
  ROUND(l.dpph_plan, 2)                 AS `DPPH Planejado`,
  ROUND(l.dpph, 2)                      AS `DPPH Realizado`,
  l.capacidade_volume_dia                 AS `Capacidade Volume Dia`,
  ROUND(l.ader_cap_vol_dia, 4)          AS `Aderencia Cap Vol Dia`,
  l.rotas_concluidas                      AS `Rotas Finalizadas`,
  l.rotas_em_rota                         AS `Rotas Em Rota`,
  l.rotas_parciais                        AS `Rotas Parciais`,
  l.rotas_roteirizadas                    AS `Rotas Roteirizadas`,
  ROUND(l.pct_progresso, 4)             AS `Progresso Execucao`
FROM com_lag l
ORDER BY l.data DESC, l.filial;

-- ####################################################################
-- 13. Resumo_Semana_Filial_Matriz (15 cols)
-- ####################################################################
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.Resumo_Semana_Filial_Matriz` AS
WITH
daily AS (
  SELECT
    f.data_planejada                      AS data,
    f.filial,
    f.tipo_filial,
    f.regiao,
    cal.semana_inicio,
    cal.label_semana,
    cal.dia_semana_abrev,
    COUNT(DISTINCT f.id_carga)            AS total_rotas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != ''
      THEN UPPER(f.placa) END)            AS placas_distintas,
    SUM(f.peso_kg)                        AS peso_real_kg,
    SUM(f.peso_plan_kg)                   AS peso_plan_kg,
    SUM(f.qtd_volumes)                    AS volumes_real,
    SUM(f.volumes_plan)                   AS volumes_plan,
    SUM(f.qtd_pedidos)                    AS pedidos_real,
    SUM(f.pedidos_plan)                   AS pedidos_plan,
    SUM(f.tempo_plan)                     AS tempo_plan_h,
    SUM(f.tempo_real)                     AS tempo_real_h,
    SUM(f.tempo_operacional_h)            AS tempo_oper_h,
    SUM(f.entregues)                      AS entregas,
    SUM(f.insucessos)                     AS insucessos,
    COUNTIF(f.flag_rota_concluida)        AS rotas_concluidas,
    COUNTIF(f.flag_em_rota)               AS rotas_em_rota,
    COUNTIF(f.flag_parcial)               AS rotas_parciais,
    COUNTIF(f.flag_roteirizada)           AS rotas_roteirizadas
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_calendario` cal ON f.data_planejada = cal.data
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1,2,3,4,5,6,7
),
weekly AS (
  SELECT
    d.semana_inicio, d.label_semana, d.filial, d.tipo_filial,
    SUM(d.total_rotas)      AS w_rotas,   SUM(d.placas_distintas) AS w_placas,
    SUM(d.peso_real_kg)     AS w_peso_real, SUM(d.peso_plan_kg)   AS w_peso_plan,
    SUM(d.volumes_real)     AS w_vol_real,  SUM(d.volumes_plan)    AS w_vol_plan,
    SUM(d.pedidos_real)     AS w_ped_real,  SUM(d.pedidos_plan)    AS w_ped_plan,
    SUM(d.tempo_plan_h)     AS w_tp,       SUM(d.tempo_real_h)    AS w_tr,
    SUM(d.tempo_oper_h)     AS w_to,       SUM(d.entregas)        AS w_entregas,
    SUM(d.insucessos)       AS w_insuc,    SUM(d.rotas_concluidas) AS w_rc,
    SUM(d.rotas_em_rota)    AS w_rer,      SUM(d.rotas_parciais)  AS w_rpar,
    SUM(d.rotas_roteirizadas) AS w_rrot
  FROM daily d
  GROUP BY 1,2,3,4
),
enriched AS (
  SELECT d.*, df.nome_filial, df.meta_spr, df.capacidade_volume_dia
  FROM daily d
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` df ON d.filial = df.filial_nome
),
medidas AS (
  SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Operacao' AS grupo, 'Total Cargas/Rotas' AS medida,
    CAST(total_rotas AS FLOAT64) AS valor FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Operacao', 'Total Peso Realizado kg',
    ROUND(peso_real_kg, 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Operacao', 'Total Peso Pedidos kg',
    ROUND(peso_plan_kg, 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Operacao', 'Total Placas Distintas',
    CAST(placas_distintas AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Execucao', 'Rotas Finalizadas',
    CAST(rotas_concluidas AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Execucao', 'Rotas Em Rota',
    CAST(rotas_em_rota AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Execucao', 'Rotas Parciais',
    CAST(rotas_parciais AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Execucao', 'Rotas Roteirizadas',
    CAST(rotas_roteirizadas AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Execucao', 'Progresso Execucao',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(rotas_concluidas AS FLOAT64), CAST(total_rotas AS FLOAT64)), 4) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Volume', 'Volumes Planejados',
    CAST(volumes_plan AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Volume', 'Volumes Realizados',
    CAST(volumes_real AS FLOAT64) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Volume', 'Aderencia Cap Vol Dia',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(volumes_real AS FLOAT64), capacidade_volume_dia), 4) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'SPR', 'SPR Volumes Planejado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(volumes_plan AS FLOAT64), CAST(total_rotas AS FLOAT64)), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'SPR', 'SPR Volumes Realizado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(volumes_real AS FLOAT64), CAST(total_rotas AS FLOAT64)), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'SPR', 'SPR vs Meta',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(volumes_real AS FLOAT64), CAST(total_rotas AS FLOAT64))
      - COALESCE(meta_spr, 0), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Tempo', 'Tempo Planejado h',
    ROUND(tempo_plan_h, 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Tempo', 'Tempo Realizado h',
    ROUND(tempo_real_h, 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Tempo', 'ORH Tempo Planejado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(tempo_plan_h, CAST(total_rotas AS FLOAT64)), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Tempo', 'ORH Tempo Realizado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(tempo_oper_h, CAST(total_rotas AS FLOAT64)), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Produtividade', 'DPPH Planejado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(pedidos_plan AS FLOAT64), NULLIF(tempo_plan_h, 0)), 2) FROM enriched
  UNION ALL SELECT semana_inicio, label_semana, filial, nome_filial, tipo_filial,
    dia_semana_abrev, 'Produtividade', 'DPPH Realizado',
    ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(entregas AS FLOAT64), NULLIF(tempo_oper_h, 0)), 2) FROM enriched
),
semana_total AS (
  SELECT
    w.semana_inicio, w.label_semana, w.filial, df.nome_filial, w.tipo_filial,
    m.medida, m.grupo,
    CASE m.medida
      WHEN 'Total Cargas/Rotas'        THEN CAST(w.w_rotas AS FLOAT64)
      WHEN 'Total Peso Realizado kg'   THEN ROUND(w.w_peso_real, 2)
      WHEN 'Total Peso Pedidos kg'     THEN ROUND(w.w_peso_plan, 2)
      WHEN 'Total Placas Distintas'    THEN CAST(w.w_placas AS FLOAT64)
      WHEN 'Rotas Finalizadas'         THEN CAST(w.w_rc AS FLOAT64)
      WHEN 'Rotas Em Rota'             THEN CAST(w.w_rer AS FLOAT64)
      WHEN 'Rotas Parciais'            THEN CAST(w.w_rpar AS FLOAT64)
      WHEN 'Rotas Roteirizadas'        THEN CAST(w.w_rrot AS FLOAT64)
      WHEN 'Progresso Execucao'        THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_rc AS FLOAT64), CAST(w.w_rotas AS FLOAT64)), 4)
      WHEN 'Volumes Planejados'        THEN CAST(w.w_vol_plan AS FLOAT64)
      WHEN 'Volumes Realizados'        THEN CAST(w.w_vol_real AS FLOAT64)
      WHEN 'Aderencia Cap Vol Dia'     THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_vol_real AS FLOAT64), df.capacidade_volume_dia * 7), 4)
      WHEN 'SPR Volumes Planejado'     THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_vol_plan AS FLOAT64), CAST(w.w_rotas AS FLOAT64)), 2)
      WHEN 'SPR Volumes Realizado'     THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_vol_real AS FLOAT64), CAST(w.w_rotas AS FLOAT64)), 2)
      WHEN 'SPR vs Meta'               THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_vol_real AS FLOAT64), CAST(w.w_rotas AS FLOAT64))
                                          - COALESCE(df.meta_spr, 0), 2)
      WHEN 'Tempo Planejado h'         THEN ROUND(w.w_tp, 2)
      WHEN 'Tempo Realizado h'         THEN ROUND(w.w_tr, 2)
      WHEN 'ORH Tempo Planejado'       THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          w.w_tp, CAST(w.w_rotas AS FLOAT64)), 2)
      WHEN 'ORH Tempo Realizado'       THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          w.w_to, CAST(w.w_rotas AS FLOAT64)), 2)
      WHEN 'DPPH Planejado'            THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_ped_plan AS FLOAT64), NULLIF(w.w_tp, 0)), 2)
      WHEN 'DPPH Realizado'            THEN ROUND(`data-aileron-482822-d0.monitoramento_carga.safe_div`(
                                          CAST(w.w_entregas AS FLOAT64), NULLIF(w.w_to, 0)), 2)
      ELSE NULL
    END AS total_semana
  FROM weekly w
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` df ON w.filial = df.filial_nome
  CROSS JOIN (SELECT DISTINCT grupo, medida FROM medidas) m
),
pivoted AS (
  SELECT
    semana_inicio, label_semana, filial, nome_filial, tipo_filial, grupo, medida,
    MAX(CASE WHEN dia_semana_abrev = 'Seg' THEN valor END) AS Seg,
    MAX(CASE WHEN dia_semana_abrev = 'Ter' THEN valor END) AS Ter,
    MAX(CASE WHEN dia_semana_abrev = 'Qua' THEN valor END) AS Qua,
    MAX(CASE WHEN dia_semana_abrev = 'Qui' THEN valor END) AS Qui,
    MAX(CASE WHEN dia_semana_abrev = 'Sex' THEN valor END) AS Sex,
    MAX(CASE WHEN dia_semana_abrev = 'Sab' THEN valor END) AS Sab,
    MAX(CASE WHEN dia_semana_abrev = 'Dom' THEN valor END) AS Dom
  FROM medidas
  GROUP BY 1,2,3,4,5,6,7
)
SELECT
  p.semana_inicio   AS `Semana Inicio`,
  p.label_semana    AS `Label Semana`,
  p.filial          AS `Filial`,
  p.nome_filial     AS `Nome Filial`,
  p.tipo_filial     AS `Tipo Filial`,
  p.grupo           AS `Grupo`,
  p.medida          AS `Medida`,
  p.Seg, p.Ter, p.Qua, p.Qui, p.Sex, p.Sab, p.Dom,
  st.total_semana   AS `Total Semana`
FROM pivoted p
LEFT JOIN semana_total st
  ON p.semana_inicio = st.semana_inicio
  AND p.filial = st.filial
  AND p.medida = st.medida
ORDER BY p.semana_inicio DESC, p.filial, p.grupo, p.medida;
