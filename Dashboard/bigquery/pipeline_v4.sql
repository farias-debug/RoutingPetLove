-- ============================================================================
-- PIPELINE MONITORAMENTO DE CARGAS v4 â€” BigQuery Cloud-Native
-- Projeto : data-aileron-482822-d0
-- Dataset : monitoramento_carga
-- Data    : 2026-03-19
-- ============================================================================
-- ARQUITETURA POR DOMÃNIO:
--
--   RAW        raw_monitoramento, raw_planejamento, raw_dim_filial
--
--   STAGING    stg_monitoramento (41c), stg_planejamento (12c)
--
--   DIMENSÃ•ES  dim_calendario (25c), dim_filial (~42r, 11c),
--              dim_veiculo (12r, 4c), dim_transportador (21r, 5c),
--              dim_status_operacional (5r, 5c), dim_planejamento (bridge),
--              dim_metas (9r, 5c)
--
--   FATO       fct_execucao (84c)
--              1 linha por rota â€” mÃ©tricas de rota, sem status/apresentaÃ§Ã£o
--
--   OPERAÃ‡Ã•ES  mart_ops_diario_filial, mart_ops_semanal,
--              mart_ops_resumo_filial, mart_ops_drill_rotas,
--              mart_ops_alertas, mart_ops_kpi_filial,
--              mart_ops_kpi_transportador, mart_ops_kpi_diario
--
--   PLANEJAM.  mart_plan_vs_real, mart_plan_ocupacao_veiculo
--
--   FINANCEIRO mart_fin_diario_filial
--
--   PRODUTIV.  mart_prod_filial, mart_prod_motorista
--
--   PROJEÃ‡ÃƒO   mart_proj_semanal, mart_proj_diario, mart_tend_filial
--
--   SEMÃ‚NTICO  sem_kpi_cards, sem_resumo_executivo
--
-- REGRAS CENTRAIS:
--   1. Marts filtram tipo_filial = 'Unidade' (obrigatÃ³rio)
--   2. fct_execucao mantÃ©m TUDO (filtro explÃ­cito na camada de consumo)
--   3. MÃ©tricas agregadas (SPR, score) NUNCA no fct â€” apenas em marts
--   4. OcupaÃ§Ã£o operacional usa peso real / capacidade do veÃ­culo
--   5. Valores numÃ©ricos puros nos marts; formato BR nas sem_*
--   6. Chaves: id_carga (INT64), planning_key (STRING composta)
-- ============================================================================


-- ####################################################################
-- SEÃ‡ÃƒO 1: UDFs
-- ####################################################################

-- Normaliza texto: trim, upper, remove underscores, colapsa espaÃ§os
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.normalize_text`(val STRING) AS (
  UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
    IFNULL(val, ''), r'_', ' '), r'\s*-\s*', '-'), r'\s+', ' ')))
);

-- DivisÃ£o segura (NULL se denominador zero ou null)
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.safe_div`(num FLOAT64, den FLOAT64) AS (
  IF(den IS NULL OR den = 0, NULL, num / den)
);

-- AderÃªncia: 1 = perfeito, 0 = 100% desviado, NULL se plan=0
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(real_val FLOAT64, plan_val FLOAT64) AS (
  IF(plan_val IS NULL OR plan_val = 0, NULL,
     GREATEST(0.0, 1.0 - ABS(IFNULL(real_val, 0) - plan_val) / plan_val))
);

-- Status "maior=melhor" com faixas 90%/100% da meta
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_higher`(val FLOAT64, meta FLOAT64) AS (
  CASE
    WHEN val IS NULL OR meta IS NULL OR meta <= 0 THEN 'Sem dados'
    WHEN val < meta * 0.90 THEN 'Critico'
    WHEN val < meta THEN 'Atencao'
    ELSE 'OK'
  END
);

-- Status por banda de tolerÃ¢ncia em torno de alvo
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_target_band`(val FLOAT64, target FLOAT64, att_gap FLOAT64, crit_gap FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 'Sem dados'
    WHEN ABS(val - target) > crit_gap THEN 'Critico'
    WHEN ABS(val - target) > att_gap THEN 'Atencao'
    ELSE 'OK'
  END
);

-- Status de capacidade/ocupaÃ§Ã£o
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.capacity_status`(val FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 'Sem dados'
    WHEN val > 1.05 THEN 'Saturado'
    WHEN val < 0.70 THEN 'Critico'
    WHEN val < 0.85 THEN 'Atencao'
    ELSE 'OK'
  END
);

-- Status â†’ score numÃ©rico (0-1)
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_score`(s STRING) AS (
  CASE s WHEN 'OK' THEN 1.0 WHEN 'Atencao' THEN 0.5 WHEN 'Critico' THEN 0.0
         WHEN 'Saturado' THEN 0.25 WHEN 'Informativo' THEN 1.0 ELSE 0.0 END
);

-- Status â†’ cor hexadecimal
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_color`(s STRING) AS (
  CASE s WHEN 'OK' THEN '12B76A' WHEN 'Atencao' THEN 'F79009' WHEN 'Critico' THEN 'F04438'
         WHEN 'Informativo' THEN '441A80' WHEN 'Saturado' THEN 'F04438' ELSE '6A7282' END
);

-- Canonicaliza tipo de veÃ­culo (REGEXP para acentos)
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(raw_type STRING) AS (
  CASE
    WHEN raw_type IS NULL OR TRIM(raw_type) = '' THEN 'Nao Selecionado'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'UTI|E-UTI') THEN 'Utilitario'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'VAN|EVAN') THEN 'Van'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'PAS|CARRO|EPASSEIO') THEN 'Passeio'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'MOTO') THEN 'Motocicleta'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'FIORINO') THEN 'Fiorino'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'VUC') THEN 'VUC'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'HR') THEN 'HR'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'TOCO') THEN 'Toco'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'3/4|MEDIO|MÉDIO') THEN '3/4 Medio'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'TRUCK') THEN 'Truck'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'CARRETA') THEN 'Carreta'
    WHEN REGEXP_CONTAINS(UPPER(TRIM(raw_type)), r'TIPO N') THEN 'Nao Selecionado'
    ELSE INITCAP(TRIM(raw_type))
  END
);

-- Capacidade de peso por tipo canÃ´nico (kg)
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(vtype STRING) AS (
  CASE vtype
    WHEN 'Utilitario' THEN 550.0    WHEN 'Van' THEN 900.0
    WHEN 'Passeio' THEN 350.0       WHEN 'HR' THEN 1500.0
    WHEN 'Toco' THEN 6000.0         WHEN 'VUC' THEN 3500.0
    WHEN 'Motocicleta' THEN 50.0    WHEN 'Fiorino' THEN 600.0
    WHEN '3/4 Medio' THEN 4000.0    WHEN 'Truck' THEN 10000.0
    WHEN 'Carreta' THEN 20000.0     ELSE NULL
  END
);

-- FamÃ­lia do veÃ­culo
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_family`(vtype STRING) AS (
  CASE vtype
    WHEN 'Motocicleta' THEN 'Dois Rodas'
    WHEN 'Passeio' THEN 'Leve'   WHEN 'Utilitario' THEN 'Leve'  WHEN 'Fiorino' THEN 'Leve'
    WHEN 'Van' THEN 'Medio'      WHEN 'VUC' THEN 'Medio'        WHEN 'HR' THEN 'Medio'
    WHEN '3/4 Medio' THEN 'Pesado' WHEN 'Toco' THEN 'Pesado'
    WHEN 'Truck' THEN 'Pesado'     WHEN 'Carreta' THEN 'Pesado'
    ELSE 'Outros'
  END
);

-- [NOVO v4] Tempo ocioso de jornada (8h padrÃ£o)
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.fn_tempo_ocioso_jornada`(
  tempo_real FLOAT64
) AS (
  CASE WHEN tempo_real IS NULL OR tempo_real <= 0 THEN NULL
       ELSE GREATEST(0.0, 8.0 - tempo_real)
  END
);

-- [NOVO v4] Score operacional centralizado
CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
  s_spr STRING, s_entregas STRING, s_rotas STRING, s_orh STRING, s_ader STRING, s_ocup STRING
) AS (
  (`data-aileron-482822-d0.monitoramento_carga.status_score`(s_spr)
   + `data-aileron-482822-d0.monitoramento_carga.status_score`(s_entregas)
   + `data-aileron-482822-d0.monitoramento_carga.status_score`(s_rotas)
   + `data-aileron-482822-d0.monitoramento_carga.status_score`(s_orh)
   + `data-aileron-482822-d0.monitoramento_carga.status_score`(s_ader)
   + `data-aileron-482822-d0.monitoramento_carga.status_score`(s_ocup)
  ) / 6.0 * 100.0
);


-- ####################################################################
-- SEÃ‡ÃƒO 2: STAGING
-- ####################################################################

-- stg_monitoramento: normaliza raw_monitoramento (41 cols â€” sem km_retorno)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` AS
SELECT
  CAST(`Id Carga` AS INT64)                                                     AS id_carga,
  `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial)           AS filial_key,
  Filial                                                                        AS filial_raw,
  status                                                                        AS status_tms,
  `N_ Placa`                                                                    AS placa,
  `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(Tipo)     AS tipo_veiculo,
  Tipo                                                                          AS tipo_veiculo_raw,
  Motorista                                                                     AS motorista,
  LPAD(CAST(CAST(`CPF Motorista` AS INT64) AS STRING), 11, '0')                 AS cpf_motorista,
  Transportador                                                                 AS transportador,
  Rota                                                                          AS rota,
  `Usuário Carregamento`                                                        AS usuario_carregamento,
  Ajudante                                                                      AS ajudante,
  dtabertura                                                                    AS ts_abertura,
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', `Data de carregamento`)                AS ts_carregamento,
  `Data Atribuição Motorista`                                                   AS ts_atribuicao_motorista,
  `Data Inicio de Rota APP`                                                     AS ts_inicio_rota,
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', `Primeira Baixa`)                      AS ts_primeira_baixa,
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', `Última Baixa`)                        AS ts_ultima_baixa,
  IFNULL(SAFE_CAST(Quantidade AS FLOAT64), 0)                                   AS qtd_pedidos,
  IFNULL(SAFE_CAST(`Quantidade Volumes` AS FLOAT64), 0)                         AS qtd_volumes,
  IFNULL(Peso, 0)                                                               AS peso_kg,
  IFNULL(Paradas, 0)                                                            AS paradas,
  IFNULL(Clientes, 0)                                                           AS clientes,
  IFNULL(SAFE_CAST(Entregues AS FLOAT64), 0)                                    AS entregues,
  GREATEST(IFNULL(SAFE_CAST(Insucessos AS FLOAT64), 0), 0)                      AS insucessos,
  IFNULL(baixas, 0)                                                             AS baixas,
  IFNULL(`Km Planejado`, 0)                                                     AS km_planejado,
  IFNULL(`Km Realizado`, 0)                                                     AS km_realizado,
  CASE
    WHEN `Tempo Planejado` IS NULL OR TRIM(`Tempo Planejado`) IN ('', '0') THEN 0.0
    WHEN REGEXP_CONTAINS(`Tempo Planejado`, r'^\d+:\d+') THEN
      SAFE_CAST(REGEXP_EXTRACT(`Tempo Planejado`, r'^(\d+)') AS FLOAT64)
      + SAFE_CAST(REGEXP_EXTRACT(`Tempo Planejado`, r':(\d+)') AS FLOAT64) / 60.0
    ELSE 0.0
  END                                                                           AS tempo_planejado_h,
  CASE
    WHEN `Tempo Realizado` IS NULL THEN 0.0
    WHEN `Tempo Realizado` > 0 AND `Tempo Realizado` < 1.0 THEN `Tempo Realizado` * 24.0
    ELSE `Tempo Realizado`
  END                                                                           AS tempo_realizado_h,
  SAFE_CAST(REGEXP_REPLACE(IFNULL(Perfomance, ''), r'[%\s]', '') AS FLOAT64) / 100.0 AS performance_pct,
  IFNULL(`Valor Pagamento Carga`, 0)                                            AS valor_carga,
  IFNULL(`Valor Pagamento Rota`, 0)                                             AS valor_rota,
  IFNULL(SAFE_CAST(`Valor Pagamento Parada` AS FLOAT64), 0)                     AS valor_parada,
  IFNULL(`Valor Pagamento Remessas`, 0)                                         AS valor_remessas,
  IFNULL(`Valor Pagamento Km`, 0)                                               AS valor_km,
  IFNULL(SAFE_CAST(`Valor Pagamento Ajudante` AS FLOAT64), 0)                   AS valor_ajudante,
  IFNULL(`Valor Pagamento Carga`, 0)
    + IFNULL(`Valor Pagamento Rota`, 0)
    + IFNULL(SAFE_CAST(`Valor Pagamento Parada` AS FLOAT64), 0)
    + IFNULL(`Valor Pagamento Remessas`, 0)
    + IFNULL(`Valor Pagamento Km`, 0)
    + IFNULL(SAFE_CAST(`Valor Pagamento Ajudante` AS FLOAT64), 0)              AS valor_total,
  Alerta                                                                        AS alerta_tms,
  referencia                                                                    AS referencia
FROM `data-aileron-482822-d0.monitoramento_carga.raw_monitoramento`
WHERE `Id Carga` IS NOT NULL;


-- stg_planejamento: normaliza raw_planejamento
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.stg_planejamento` AS
SELECT
  CAST(`Id Carga` AS INT64)                                                     AS id_carga,
  `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial)           AS filial_key,
  Filial                                                                        AS filial_raw,
  Rota                                                                          AS rota_planejada,
  `Data Planejada`                                                              AS data_planejada,
  IFNULL(Pedidos, 0)                                                            AS pedidos_plan,
  IFNULL(Volume, 0)                                                             AS volumes_plan,
  IFNULL(Peso, 0.0)                                                             AS peso_plan_kg,
  IFNULL(Km, 0.0)                                                               AS km_plan,
  EXTRACT(HOUR FROM `Tempo de Rota`)
    + EXTRACT(MINUTE FROM `Tempo de Rota`) / 60.0
    + EXTRACT(SECOND FROM `Tempo de Rota`) / 3600.0                             AS tempo_plan_h,
  CASE WHEN IFNULL(Pedidos,0) > 0 OR IFNULL(Volume,0) > 0 THEN TRUE ELSE FALSE END AS possui_planejamento_valido,
  CONCAT(CAST(`Id Carga` AS STRING), '|',
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial))        AS planning_key
FROM `data-aileron-482822-d0.monitoramento_carga.raw_planejamento`
WHERE `Id Carga` IS NOT NULL;


-- ####################################################################
-- SEÃ‡ÃƒO 3: DIMENSÃ•ES
-- ####################################################################

-- dim_calendario: calendÃ¡rio brasileiro (25 cols â€” +semana_do_mes)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_calendario` AS
WITH date_spine AS (
  SELECT dt FROM UNNEST(
    GENERATE_DATE_ARRAY('2025-01-01', '2027-12-31', INTERVAL 1 DAY)
  ) AS dt
)
SELECT
  dt                                                              AS data,
  EXTRACT(YEAR FROM dt)                                           AS ano,
  EXTRACT(QUARTER FROM dt)                                        AS trimestre,
  CASE WHEN EXTRACT(QUARTER FROM dt) <= 2 THEN 1 ELSE 2 END      AS semestre,
  EXTRACT(MONTH FROM dt)                                          AS mes_num,
  CASE EXTRACT(MONTH FROM dt)
    WHEN 1  THEN 'Janeiro'    WHEN 2  THEN 'Fevereiro'  WHEN 3  THEN 'Marco'
    WHEN 4  THEN 'Abril'      WHEN 5  THEN 'Maio'       WHEN 6  THEN 'Junho'
    WHEN 7  THEN 'Julho'      WHEN 8  THEN 'Agosto'     WHEN 9  THEN 'Setembro'
    WHEN 10 THEN 'Outubro'    WHEN 11 THEN 'Novembro'   WHEN 12 THEN 'Dezembro'
  END                                                             AS mes_nome,
  SUBSTR(CASE EXTRACT(MONTH FROM dt)
    WHEN 1  THEN 'Jan' WHEN 2  THEN 'Fev' WHEN 3  THEN 'Mar'
    WHEN 4  THEN 'Abr' WHEN 5  THEN 'Mai' WHEN 6  THEN 'Jun'
    WHEN 7  THEN 'Jul' WHEN 8  THEN 'Ago' WHEN 9  THEN 'Set'
    WHEN 10 THEN 'Out' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dez'
  END, 1, 3)                                                      AS mes_abrev,
  EXTRACT(ISOWEEK FROM dt)                                        AS semana_ano,
  DATE_TRUNC(dt, ISOWEEK)                                         AS semana_inicio,
  DATE_ADD(DATE_TRUNC(dt, ISOWEEK), INTERVAL 6 DAY)              AS semana_fim,
  EXTRACT(DAY FROM dt)                                            AS dia_mes,
  EXTRACT(DAYOFWEEK FROM dt)                                      AS dia_semana_num,
  CASE EXTRACT(DAYOFWEEK FROM dt)
    WHEN 1 THEN 'Domingo'  WHEN 2 THEN 'Segunda' WHEN 3 THEN 'Terca'
    WHEN 4 THEN 'Quarta'   WHEN 5 THEN 'Quinta'  WHEN 6 THEN 'Sexta'
    WHEN 7 THEN 'Sabado'
  END                                                             AS dia_semana_nome,
  CASE EXTRACT(DAYOFWEEK FROM dt)
    WHEN 1 THEN 'Dom' WHEN 2 THEN 'Seg' WHEN 3 THEN 'Ter'
    WHEN 4 THEN 'Qua' WHEN 5 THEN 'Qui' WHEN 6 THEN 'Sex'
    WHEN 7 THEN 'Sab'
  END                                                             AS dia_semana_abrev,
  EXTRACT(DAYOFWEEK FROM dt) NOT IN (1, 7)                        AS flag_dia_util,
  EXTRACT(DAYOFWEEK FROM dt) IN (1, 7)                            AS flag_fim_semana,
  -- [NOVO v4] Semana do mÃªs (1-5)
  CAST(CEIL(EXTRACT(DAY FROM dt) / 7.0) AS INT64)                AS semana_do_mes,
  FORMAT_DATE('%Y-%m', dt)                                        AS mes_ref,
  CONCAT(CAST(EXTRACT(YEAR FROM dt) AS STRING), '-S',
    LPAD(CAST(EXTRACT(ISOWEEK FROM dt) AS STRING), 2, '0'))       AS ano_semana,
  CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM dt) AS STRING), 2, '0'),
    ' ', FORMAT_DATE('%d/%m', DATE_TRUNC(dt, ISOWEEK)),
    '-', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(dt, ISOWEEK), INTERVAL 6 DAY))
  )                                                               AS label_semana,
  FORMAT_DATE('%m/%Y', dt)                                        AS mes_ano,
  CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM dt) AS STRING), 2, '0'),
    '/', LPAD(CAST(EXTRACT(MONTH FROM dt) AS STRING), 2, '0'))    AS semana_mes,
  FORMAT_DATE('%m-%d', dt) IN (
    '01-01','04-21','05-01','09-07','10-12','11-02','11-15','12-25'
  )                                                               AS flag_feriado_fixo,
  EXTRACT(YEAR FROM dt) * 10000 + EXTRACT(MONTH FROM dt) * 100 + EXTRACT(DAY FROM dt) AS sort_data,
  EXTRACT(YEAR FROM dt) * 100 + EXTRACT(ISOWEEK FROM dt)         AS sort_semana
FROM date_spine;


-- dim_filial: CORRIGIDO v4 â€” mapeia TODAS as filiais (8 faltantes como Nao-Unidade)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_filial` AS
WITH src_raw AS (
  SELECT
    `CD Origem`                                                                 AS cd_origem,
    Tabela                                                                      AS tabela,
    Filial                                                                      AS filial_nome,
    SAFE_CAST(Codigo AS INT64)                                                  AS codigo,
    `Nome Filial`                                                               AS nome_filial,
    Tipo                                                                        AS tipo,
    SAFE_CAST(MetaSPR AS FLOAT64)                                               AS meta_spr,
    Regiao                                                                      AS regiao,
    SAFE_CAST(`Capacidade Volume Dia` AS FLOAT64)                               AS capacidade_volume_dia,
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial)         AS filial_key,
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(`Nome Filial`)  AS nome_filial_key,
    ROW_NUMBER() OVER (
      PARTITION BY `data-aileron-482822-d0.monitoramento_carga.normalize_text`(Filial)
      ORDER BY Codigo
    ) AS rn
  FROM `data-aileron-482822-d0.monitoramento_carga.raw_dim_filial`
),
mapeadas AS (
  SELECT * EXCEPT(rn) FROM src_raw WHERE rn = 1
),
-- Filiais encontradas na execuÃ§Ã£o mas ausentes na tabela cadastral
faltantes AS (
  SELECT DISTINCT
    s.filial_key,
    s.filial_raw AS filial_nome
  FROM `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` s
  LEFT JOIN mapeadas m ON s.filial_key = m.filial_key
  WHERE m.filial_key IS NULL
)
SELECT * FROM mapeadas
UNION ALL
SELECT
  NULL AS cd_origem,
  NULL AS tabela,
  f.filial_nome,
  NULL AS codigo,
  f.filial_nome AS nome_filial,
  'Nao-Unidade' AS tipo,
  NULL AS meta_spr,
  'Nao Mapeada' AS regiao,
  NULL AS capacidade_volume_dia,
  f.filial_key,
  f.filial_key AS nome_filial_key
FROM faltantes f;


-- dim_veiculo: tipos canÃ´nicos
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_veiculo` AS
SELECT * FROM UNNEST([
  STRUCT('Motocicleta'    AS tipo_veiculo, 'Dois Rodas' AS familia, 50.0    AS capacidade_peso_kg, 1 AS ordem),
  STRUCT('Passeio',                        'Leve',                  350.0,                          2),
  STRUCT('Utilitario',                     'Leve',                  550.0,                          3),
  STRUCT('Fiorino',                        'Leve',                  600.0,                          4),
  STRUCT('Van',                            'Medio',                 900.0,                          5),
  STRUCT('VUC',                            'Medio',                 3500.0,                         6),
  STRUCT('HR',                             'Medio',                 1500.0,                         7),
  STRUCT('3/4 Medio',                      'Pesado',                4000.0,                         8),
  STRUCT('Toco',                           'Pesado',                6000.0,                         9),
  STRUCT('Truck',                          'Pesado',                10000.0,                        10),
  STRUCT('Carreta',                        'Pesado',                20000.0,                        11),
  STRUCT('Nao Selecionado',                'Outros',                0.0,                            99)
]);


-- dim_transportador: deduplicados da execuÃ§Ã£o
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_status_operacional` AS
SELECT * FROM UNNEST([
  STRUCT('Finalizado'  AS status_tms, 'Concluido'   AS fase, TRUE  AS flag_concluido, TRUE  AS flag_elegivel_kpi, 1 AS ordem),
  STRUCT('Parcial',                   'Em Execucao',         FALSE,                   TRUE,                       2),
  STRUCT('Em Rota',                   'Em Execucao',         FALSE,                   FALSE,                      3),
  STRUCT('Rota aceita',               'Pendente',            FALSE,                   FALSE,                      4),
  STRUCT('Roteirizado',               'Pendente',            FALSE,                   FALSE,                      5)
]);


-- dim_planejamento: bridge staging-fato
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_planejamento` AS
SELECT
  planning_key,
  MIN(rota_planejada)             AS rota_planejada,
  MIN(data_planejada)             AS data_planejada_plan,
  SUM(pedidos_plan)               AS pedidos_plan,
  SUM(volumes_plan)               AS volumes_plan,
  SUM(peso_plan_kg)               AS peso_plan_kg,
  SUM(km_plan)                    AS km_plan,
  SUM(tempo_plan_h)               AS tempo_plan_h,
  MAX(possui_planejamento_valido) AS possui_planejamento
FROM `data-aileron-482822-d0.monitoramento_carga.stg_planejamento`
GROUP BY 1;


-- dim_metas: metas globais v4 (9 KPIs â€” +custo_por_carga, +dpph)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_metas` AS
SELECT * FROM UNNEST([
  STRUCT('spr_pedidos'       AS kpi_id, 'SPR Pedidos'       AS kpi_nome, 42.0  AS meta, 'Maior=Melhor' AS sentido, 'ped/rota' AS unidade),
  STRUCT('spr_volumes',                 'SPR Volumes',              67.0,       'Maior=Melhor',          'vol/rota'),
  STRUCT('orh',                         'ORH Tempo Rota',           7.0,        'Alvo=Melhor',           'horas'),
  STRUCT('entregas_efetivas',           'Entregas Efetivas',        0.98,       'Maior=Melhor',          '%'),
  STRUCT('rotas_concluidas',            'Rotas Concluidas',         0.95,       'Maior=Melhor',          '%'),
  STRUCT('ocupacao_composta',           'Ocupacao Composta',        0.85,       'Maior=Melhor',          '%'),
  STRUCT('aderencia_volumes',           'Aderencia Volumes',        0.90,       'Maior=Melhor',          '%'),
  STRUCT('custo_por_carga',             'Custo Medio Carga',      500.0,        'Menor=Melhor',          'R$/carga'),
  STRUCT('dpph',                        'DPPH',                     6.0,        'Maior=Melhor',          'ent/h')
]);


-- metas_pivot: dimensao de metas pivotada em linha unica (fonte unica para todos os marts)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.metas_pivot` AS
SELECT
  MAX(CASE WHEN kpi_id = 'spr_pedidos'       THEN meta END) AS meta_spr_ped,
  MAX(CASE WHEN kpi_id = 'spr_volumes'       THEN meta END) AS meta_spr_vol,
  MAX(CASE WHEN kpi_id = 'orh'               THEN meta END) AS meta_orh,
  MAX(CASE WHEN kpi_id = 'entregas_efetivas' THEN meta END) AS meta_entregas,
  MAX(CASE WHEN kpi_id = 'rotas_concluidas'  THEN meta END) AS meta_rotas,
  MAX(CASE WHEN kpi_id = 'ocupacao_composta' THEN meta END) AS meta_ocup,
  MAX(CASE WHEN kpi_id = 'aderencia_volumes' THEN meta END) AS meta_ader_vol,
  MAX(CASE WHEN kpi_id = 'dpph'              THEN meta END) AS meta_dpph
FROM `data-aileron-482822-d0.monitoramento_carga.dim_metas`;


-- ####################################################################
-- SEÃ‡ÃƒO 4: TABELA FATO (84 colunas)
-- ####################################################################

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.fct_execucao` AS
WITH
-- Join staging com dimensÃ£o filial (agora mapeia TODAS as filiais)
com_filial AS (
  SELECT
    s.*,
    CONCAT(CAST(s.id_carga AS STRING), '|',
      `data-aileron-482822-d0.monitoramento_carga.normalize_text`(
        COALESCE(d.filial_nome, s.filial_raw)
      )
    ) AS planning_key,
    COALESCE(d.filial_nome, s.filial_raw)     AS filial,
    d.tipo                                    AS tipo_filial,
    d.regiao
  FROM `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` s
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` d
    ON s.filial_key = d.filial_key
),

-- Join com planejamento
com_plan AS (
  SELECT
    f.*,
    IFNULL(p.pedidos_plan, 0)            AS pedidos_plan,
    IFNULL(p.volumes_plan, 0)            AS volumes_plan,
    IFNULL(p.peso_plan_kg, 0)            AS peso_plan_kg,
    p.km_plan,
    IFNULL(p.possui_planejamento, FALSE) AS possui_planejamento,
    p.data_planejada_plan,
    DATE(TIMESTAMP_SUB(COALESCE(f.ts_carregamento, f.ts_abertura), INTERVAL 3 HOUR)) AS data_planejada,
    CASE
      WHEN f.tempo_planejado_h > 0 THEN f.tempo_planejado_h
      WHEN p.tempo_plan_h > 0 THEN p.tempo_plan_h
      ELSE 0
    END AS tempo_plan,
    CASE
      WHEN f.tempo_realizado_h > 0 THEN f.tempo_realizado_h
      WHEN f.ts_inicio_rota IS NOT NULL AND f.ts_ultima_baixa IS NOT NULL
           AND f.ts_ultima_baixa >= f.ts_inicio_rota
      THEN TIMESTAMP_DIFF(f.ts_ultima_baixa, f.ts_inicio_rota, SECOND) / 3600.0
      ELSE 0
    END AS tempo_real
  FROM com_filial f
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_planejamento` p
    ON f.planning_key = p.planning_key
),

-- DeduplicaÃ§Ã£o
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY planning_key ORDER BY ts_carregamento DESC, ts_abertura DESC
    ) AS rn
  FROM com_plan
),

-- Join com status
com_status_dim AS (
  SELECT
    d.*,
    IFNULL(st.fase, 'Desconhecido')      AS fase_operacional,
    IFNULL(st.flag_concluido, FALSE)      AS flag_concluido,
    IFNULL(st.flag_elegivel_kpi, FALSE)   AS flag_elegivel_kpi
  FROM deduped d
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_status_operacional` st
    ON UPPER(TRIM(d.status_tms)) = UPPER(TRIM(st.status_tms))
  WHERE d.rn = 1
),

-- MÃ©tricas por rota
calculado AS (
  SELECT
    -- === CHAVES (4) ===
    id_carga,
    planning_key,
    data_planejada,
    -- === DIMENSÃ•ES (7) ===
    filial,
    tipo_filial,
    regiao,
    tipo_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.vehicle_family`(tipo_veiculo) AS familia_veiculo,
    status_tms                                                     AS status,
    fase_operacional,
    -- === ENTIDADES (7) ===
    placa,
    motorista,
    cpf_motorista,
    rota,
    transportador,
    usuario_carregamento,
    ajudante,
    -- === FLAGS INTERNOS (2) ===
    flag_concluido,
    flag_elegivel_kpi,
    -- === DATAS (5) ===
    DATE(ts_abertura)                                              AS dt_abertura,
    DATE(ts_carregamento)                                          AS dt_carregamento,
    DATE(ts_atribuicao_motorista)                                  AS dt_atribuicao_motorista,
    DATE(ts_inicio_rota)                                           AS dt_inicio_rota,
    DATE(ts_ultima_baixa)                                          AS dt_ultima_baixa,
    -- === MEDIDAS BRUTAS (13) ===
    performance_pct,
    qtd_pedidos,
    qtd_volumes,
    peso_kg,
    paradas,
    clientes,
    entregues,
    insucessos,
    baixas,
    km_planejado,
    km_realizado,
    tempo_plan,
    tempo_real,
    -- === PLANEJAMENTO BRIDGE (4) ===
    pedidos_plan,
    volumes_plan,
    peso_plan_kg,
    data_planejada_plan,
    possui_planejamento,
    -- === FINANCEIRO (7) ===
    valor_carga,
    valor_rota,
    valor_parada,
    valor_remessas,
    valor_km,
    valor_ajudante,
    valor_total,
    -- === MÃ‰TRICAS CALCULADAS POR ROTA (19) ===
    CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END   AS tempo_operacional_h,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      entregues, entregues + insucessos)                           AS pct_entrega_efetiva,
    CASE WHEN possui_planejamento THEN qtd_pedidos - pedidos_plan ELSE NULL END AS delta_pedidos,
    CASE WHEN possui_planejamento THEN qtd_volumes - volumes_plan ELSE NULL END AS delta_volumes,
    CASE WHEN possui_planejamento THEN peso_kg - peso_plan_kg ELSE NULL END     AS delta_peso_kg,
    CASE WHEN tempo_plan > 0 THEN tempo_real - tempo_plan ELSE NULL END         AS desvio_tempo_h,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      tempo_real - tempo_plan, tempo_plan)                         AS desvio_tempo_pct,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      km_realizado - km_planejado, NULLIF(km_planejado, 0))        AS desvio_km_pct,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(qtd_pedidos, pedidos_plan) AS aderencia_pedidos,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(qtd_volumes, volumes_plan) AS aderencia_volumes,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(peso_kg, peso_plan_kg)     AS aderencia_peso,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(km_realizado, km_planejado) AS aderencia_km,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(tempo_real, tempo_plan)     AS aderencia_tempo,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(qtd_pedidos, NULLIF(pedidos_plan, 0)) AS ocup_pedidos,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(qtd_volumes, NULLIF(volumes_plan, 0)) AS ocup_volumes,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(peso_kg,     NULLIF(peso_plan_kg, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      peso_kg,
      NULLIF(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(tipo_veiculo), 0)
    ) AS ocup_peso_veiculo,
    -- Custos unitÃ¡rios (4)
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(valor_total, NULLIF(qtd_pedidos, 0))    AS custo_por_pedido,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(valor_total, NULLIF(qtd_volumes, 0))    AS custo_por_volume,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(valor_total, NULLIF(peso_kg, 0))        AS custo_por_kg,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(valor_total, NULLIF(km_realizado, 0))   AS custo_por_km,
    -- === PRODUTIVIDADE (3 â€” novos v4) ===
    `data-aileron-482822-d0.monitoramento_carga.fn_tempo_ocioso_jornada`(
      CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END) AS tempo_ocioso_jornada_h,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END, 8.0) AS pct_util_jornada,
    -- === FLAGS OPERACIONAIS (12) ===
    IFNULL(flag_concluido, FALSE)                                  AS flag_rota_concluida,
    NOT IFNULL(possui_planejamento, FALSE)                         AS flag_nao_planejada,
    (tempo_plan = 0 AND tempo_real = 0)                            AS flag_sem_tempo,
    (CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END > 8) AS flag_overtime,
    (`data-aileron-482822-d0.monitoramento_carga.safe_div`(
      entregues, entregues + insucessos) < 0.95
      AND `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      entregues, entregues + insucessos) IS NOT NULL)              AS flag_entrega_critica,
    (insucessos > 0)                                               AS flag_insucesso,
    UPPER(TRIM(IFNULL(status_tms, ''))) LIKE '%ROTA%'             AS flag_em_rota,
    UPPER(TRIM(IFNULL(status_tms, ''))) LIKE '%PARCIAL%'          AS flag_parcial,
    UPPER(TRIM(IFNULL(status_tms, ''))) LIKE '%ROTEIRIZ%'         AS flag_roteirizada,
    (IFNULL(SAFE_CAST(id_carga AS STRING), '') != ''
     AND data_planejada IS NOT NULL
     AND qtd_pedidos >= 0 AND qtd_volumes >= 0)                    AS flag_registro_valido,
    -- Rota subutilizada (tempo_real < 4h â€” novo v4)
    (CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END > 0
     AND CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END < 4.0) AS flag_rota_subutilizada,
    -- Match temporal
    CASE
      WHEN NOT IFNULL(possui_planejamento, FALSE) OR data_planejada_plan IS NULL THEN 'Sem Planejado'
      WHEN DATE_DIFF(data_planejada, data_planejada_plan, DAY) = 0 THEN 'Mesmo Dia'
      WHEN ABS(DATE_DIFF(data_planejada, data_planejada_plan, DAY)) <= 1 THEN 'D+/-1'
      ELSE 'Fora D+/-1'
    END AS match_temporal,
    (NOT IFNULL(possui_planejamento, FALSE)
     OR (data_planejada_plan IS NOT NULL
         AND ABS(DATE_DIFF(data_planejada, data_planejada_plan, DAY)) > 1)
    ) AS flag_match_critico
  FROM com_status_dim
)
SELECT * FROM calculado;


-- ####################################################################
-- SEÃ‡ÃƒO 5: MARTS â€” DOMÃNIO OPERAÃ‡Ã•ES
-- ####################################################################

-- mart_ops_diario_filial: resumo operacional diÃ¡rio por filial (Unidade)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.mart_ops_diario_filial` AS
WITH agg AS (
  SELECT
    f.data_planejada                    AS data,
    f.filial,
    f.tipo_filial,
    f.regiao,
    COUNT(DISTINCT f.id_carga)          AS total_rotas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS placas_distintas,
    SUM(f.qtd_pedidos)                  AS pedidos_real,
    SUM(f.qtd_volumes)                  AS volumes_real,
    SUM(f.peso_kg)                      AS peso_real_kg,
    SUM(f.pedidos_plan)                 AS pedidos_plan,
    SUM(f.volumes_plan)                 AS volumes_plan,
    SUM(f.peso_plan_kg)                 AS peso_plan_kg,
    SUM(f.entregues)                    AS entregues,
    SUM(f.insucessos)                   AS insucessos,
    SUM(f.baixas)                       AS baixas,
    SUM(f.tempo_plan)                   AS tempo_plan_h,
    SUM(f.tempo_real)                   AS tempo_real_h,
    SUM(f.tempo_operacional_h)          AS tempo_oper_h,
    SUM(f.valor_total)                  AS valor_total,
    COUNTIF(f.flag_rota_concluida)      AS rotas_concluidas,
    COUNTIF(f.flag_em_rota)             AS rotas_em_rota,
    COUNTIF(f.flag_parcial)             AS rotas_parciais,
    COUNTIF(f.flag_roteirizada)         AS rotas_roteirizadas,
    COUNTIF(f.flag_nao_planejada)       AS rotas_sem_plan,
    COUNTIF(f.flag_insucesso)           AS rotas_com_insucesso,
    COUNTIF(f.flag_overtime)            AS rotas_overtime,
    COUNTIF(f.flag_rota_subutilizada)   AS rotas_subutilizadas,
    SUM(f.km_planejado)                 AS km_planejado,
    SUM(f.km_realizado)                 AS km_realizado,
    SUM(f.peso_plan_kg)                 AS peso_plan_kg_total,
    COUNT(DISTINCT CASE WHEN f.motorista IS NOT NULL AND f.motorista != '' THEN UPPER(TRIM(f.motorista)) END) AS qtd_motoristas
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1,2,3,4
)
SELECT
  a.*,
  -- KPIs calculados
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.volumes_real, CAST(a.total_rotas AS FLOAT64))                AS spr_vol,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.pedidos_real, CAST(a.total_rotas AS FLOAT64))                AS spr_ped,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.entregues, a.entregues + a.insucessos)                       AS pct_entrega_efetiva,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.tempo_oper_h, CAST(a.total_rotas AS FLOAT64))                AS orh,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    CAST(a.rotas_concluidas AS FLOAT64), CAST(a.total_rotas AS FLOAT64)) AS pct_progresso,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.entregues, NULLIF(a.tempo_oper_h, 0))                        AS dpph,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.valor_total, CAST(a.total_rotas AS FLOAT64))                 AS custo_medio_rota,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    a.tempo_real_h - a.tempo_plan_h, NULLIF(a.tempo_plan_h, 0))   AS desvio_tempo_pct
FROM agg a
ORDER BY a.data DESC, a.filial;


-- ####################################################################
-- SEÇÃO 6: MARTS KPI — CONSOLIDAÇÕES PARA CAMADAS SUPERIORES
-- ####################################################################

-- mart_kpi_diario: KPIs globais por dia (Unidade) — fonte única para kpi_resumo_diario
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.mart_kpi_diario` AS
WITH
metas AS (SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`),
base AS (
  SELECT
    f.data_planejada AS data,
    COUNT(DISTINCT f.id_carga)          AS qtd_rotas,
    SUM(f.qtd_pedidos)                  AS qtd_pedidos,
    SUM(f.qtd_volumes)                  AS qtd_volumes,
    SUM(f.entregues)                    AS qtd_entregas,
    SUM(f.insucessos)                   AS qtd_insucessos,
    SUM(f.baixas)                       AS qtd_baixas,
    SUM(f.clientes)                     AS qtd_clientes,
    SUM(f.paradas)                      AS qtd_paradas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS qtd_veiculos,
    COUNT(DISTINCT CASE WHEN f.motorista IS NOT NULL AND f.motorista != '' THEN UPPER(TRIM(f.motorista)) END) AS qtd_motoristas,
    SUM(f.km_realizado)                 AS total_km,
    SUM(f.peso_kg)                      AS total_peso_kg,
    SUM(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(f.tipo_veiculo)) AS capacidade_peso_total,
    SUM(f.tempo_operacional_h)          AS tempo_oper_total,
    SUM(f.tempo_ocioso_jornada_h)       AS horas_ociosas_total,
    SUM(f.tempo_plan)                   AS tempo_plan_total,
    SUM(f.pedidos_plan)                 AS pedidos_plan,
    SUM(f.volumes_plan)                 AS volumes_plan,
    SUM(f.peso_plan_kg)                 AS peso_plan,
    SUM(f.km_planejado)                 AS km_plan,
    COUNTIF(f.flag_rota_concluida)      AS rotas_concluidas,
    COUNTIF(f.flag_nao_planejada)       AS qtd_nao_plan,
    COUNTIF(f.flag_sem_tempo)           AS qtd_sem_tempo,
    COUNTIF(f.flag_rota_subutilizada)   AS rotas_curtas,
    COUNTIF(f.flag_overtime)            AS rotas_overtime,
    COUNTIF(f.match_temporal = 'Mesmo Dia')     AS match_mesmo_dia,
    COUNTIF(f.match_temporal != 'Sem Planejado' AND f.match_temporal IS NOT NULL) AS rotas_com_plan
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1
),
kpis AS (
  SELECT b.*, m.*,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, CAST(b.qtd_rotas AS FLOAT64)) AS spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, CAST(b.qtd_rotas AS FLOAT64)) AS spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, b.qtd_entregas + b.qtd_insucessos) AS pct_entregas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_concl,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64)) AS orh,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64) * 8.0) AS pct_util_jornada,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, NULLIF(b.tempo_oper_total, 0)) AS dpph,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, NULLIF(b.pedidos_plan, 0)) AS ocup_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, NULLIF(b.volumes_plan, 0)) AS ocup_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.peso_plan, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_pedidos, b.pedidos_plan) AS ader_ped,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_volumes, b.volumes_plan) AS ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_peso_kg, b.peso_plan)  AS ader_peso,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_km, b.km_plan)         AS ader_km,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.tempo_oper_total, b.tempo_plan_total) AS ader_tempo,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.match_mesmo_dia AS FLOAT64), CAST(NULLIF(b.rotas_com_plan, 0) AS FLOAT64)) AS pct_match,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.qtd_nao_plan AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_sem_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_curtas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_curtas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_overtime AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_overtime
  FROM base b
  CROSS JOIN metas m
),
com_status AS (
  SELECT c.*,
    c.ocup_peso_veiculo AS ocup_composta,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) AS status_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(`data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)) AS cor_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_ped, c.meta_spr_ped) AS status_spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) AS status_spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) AS status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas) AS status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) AS status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol) AS status_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.dpph, c.meta_dpph) AS status_dpph,
    `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas),
      `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol),
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)
    ) AS score_operacional,
    CASE
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) = 'Critico' THEN 'SPR abaixo da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) = 'Critico' THEN 'Entregas em nivel critico'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) = 'Critico' THEN 'Jornada fora da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) IN ('Saturado','Critico') THEN 'Ocupacao fora da faixa'
      WHEN c.qtd_nao_plan > 0 THEN 'Rotas sem planejamento'
      ELSE 'OK'
    END AS alerta
  FROM kpis c
),
com_lag AS (
  SELECT cs.*,
    -- LAG D-1
    LAG(cs.spr_ped, 1) OVER (ORDER BY cs.data) AS spr_ped_d1,
    LAG(cs.spr_vol, 1) OVER (ORDER BY cs.data) AS spr_vol_d1,
    LAG(cs.pct_entregas, 1) OVER (ORDER BY cs.data) AS pct_entregas_d1,
    LAG(cs.pct_rotas_concl, 1) OVER (ORDER BY cs.data) AS pct_rotas_concl_d1,
    LAG(cs.orh, 1) OVER (ORDER BY cs.data) AS orh_d1,
    LAG(cs.dpph, 1) OVER (ORDER BY cs.data) AS dpph_d1,
    LAG(cs.ocup_composta, 1) OVER (ORDER BY cs.data) AS ocup_composta_d1,
    LAG(cs.score_operacional, 1) OVER (ORDER BY cs.data) AS score_d1,
    -- LAG D-7 (WoW)
    LAG(cs.spr_ped, 7) OVER (ORDER BY cs.data) AS spr_ped_d7,
    LAG(cs.spr_vol, 7) OVER (ORDER BY cs.data) AS spr_vol_d7,
    LAG(cs.pct_entregas, 7) OVER (ORDER BY cs.data) AS pct_entregas_d7,
    LAG(cs.pct_rotas_concl, 7) OVER (ORDER BY cs.data) AS pct_rotas_concl_d7,
    LAG(cs.orh, 7) OVER (ORDER BY cs.data) AS orh_d7,
    LAG(cs.dpph, 7) OVER (ORDER BY cs.data) AS dpph_d7,
    LAG(cs.ocup_composta, 7) OVER (ORDER BY cs.data) AS ocup_composta_d7,
    LAG(cs.score_operacional, 7) OVER (ORDER BY cs.data) AS score_d7
  FROM com_status cs
)
SELECT * FROM com_lag
ORDER BY data DESC;


-- mart_kpi_filial_dia: KPIs por filial por dia (Unidade)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.mart_kpi_filial_dia` AS
WITH
metas AS (SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`),
base AS (
  SELECT
    f.data_planejada AS data,
    f.filial, f.regiao, f.tipo_filial AS tipo,
    COUNT(DISTINCT f.id_carga)          AS qtd_rotas,
    SUM(f.qtd_pedidos)                  AS qtd_pedidos,
    SUM(f.qtd_volumes)                  AS qtd_volumes,
    SUM(f.entregues)                    AS qtd_entregas,
    SUM(f.insucessos)                   AS qtd_insucessos,
    SUM(f.baixas)                       AS qtd_baixas,
    SUM(f.clientes)                     AS qtd_clientes,
    SUM(f.paradas)                      AS qtd_paradas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS qtd_veiculos,
    COUNT(DISTINCT CASE WHEN f.motorista IS NOT NULL AND f.motorista != '' THEN UPPER(TRIM(f.motorista)) END) AS qtd_motoristas,
    SUM(f.km_realizado)                 AS total_km,
    SUM(f.peso_kg)                      AS total_peso_kg,
    SUM(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(f.tipo_veiculo)) AS capacidade_peso_total,
    SUM(f.tempo_operacional_h)          AS tempo_oper_total,
    SUM(f.tempo_ocioso_jornada_h)       AS horas_ociosas_total,
    SUM(f.tempo_plan)                   AS tempo_plan_total,
    SUM(f.pedidos_plan)                 AS pedidos_plan,
    SUM(f.volumes_plan)                 AS volumes_plan,
    SUM(f.peso_plan_kg)                 AS peso_plan,
    SUM(f.km_planejado)                 AS km_plan,
    COUNTIF(f.flag_rota_concluida)      AS rotas_concluidas,
    COUNTIF(f.flag_nao_planejada)       AS qtd_nao_plan,
    COUNTIF(f.flag_sem_tempo)           AS qtd_sem_tempo,
    COUNTIF(f.flag_rota_subutilizada)   AS rotas_curtas,
    COUNTIF(f.flag_overtime)            AS rotas_overtime,
    COUNTIF(f.match_temporal = 'Mesmo Dia')     AS match_mesmo_dia,
    COUNTIF(f.match_temporal != 'Sem Planejado' AND f.match_temporal IS NOT NULL) AS rotas_com_plan
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1,2,3,4
),
kpis AS (
  SELECT b.*, m.*,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, CAST(b.qtd_rotas AS FLOAT64)) AS spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, CAST(b.qtd_rotas AS FLOAT64)) AS spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, b.qtd_entregas + b.qtd_insucessos) AS pct_entregas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_concl,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64)) AS orh,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64) * 8.0) AS pct_util_jornada,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, NULLIF(b.tempo_oper_total, 0)) AS dpph,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, NULLIF(b.pedidos_plan, 0)) AS ocup_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, NULLIF(b.volumes_plan, 0)) AS ocup_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.peso_plan, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_pedidos, b.pedidos_plan) AS ader_ped,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_volumes, b.volumes_plan) AS ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_peso_kg, b.peso_plan)  AS ader_peso,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_km, b.km_plan)         AS ader_km,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.tempo_oper_total, b.tempo_plan_total) AS ader_tempo,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.match_mesmo_dia AS FLOAT64), CAST(NULLIF(b.rotas_com_plan, 0) AS FLOAT64)) AS pct_match,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.qtd_nao_plan AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_sem_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_curtas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_curtas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_overtime AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_overtime
  FROM base b
  CROSS JOIN metas m
),
com_status AS (
  SELECT c.*,
    c.ocup_peso_veiculo AS ocup_composta,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) AS status_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(`data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)) AS cor_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_ped, c.meta_spr_ped) AS status_spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) AS status_spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) AS status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas) AS status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) AS status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol) AS status_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.dpph, c.meta_dpph) AS status_dpph,
    `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas),
      `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol),
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)
    ) AS score_operacional,
    CASE
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) = 'Critico' THEN 'SPR abaixo da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) = 'Critico' THEN 'Entregas em nivel critico'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) = 'Critico' THEN 'Jornada fora da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) IN ('Saturado','Critico') THEN 'Ocupacao fora da faixa'
      WHEN c.qtd_nao_plan > 0 THEN 'Rotas sem planejamento'
      ELSE 'OK'
    END AS alerta
  FROM kpis c
)
SELECT * FROM com_status
ORDER BY data DESC, filial;


-- mart_kpi_transportador_dia: KPIs por transportador por dia (Unidade)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.mart_kpi_transportador_dia` AS
WITH
metas AS (SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`),
base AS (
  SELECT
    f.data_planejada AS data,
    f.transportador,
    COUNT(DISTINCT f.id_carga)          AS qtd_rotas,
    SUM(f.qtd_pedidos)                  AS qtd_pedidos,
    SUM(f.qtd_volumes)                  AS qtd_volumes,
    SUM(f.entregues)                    AS qtd_entregas,
    SUM(f.insucessos)                   AS qtd_insucessos,
    SUM(f.baixas)                       AS qtd_baixas,
    SUM(f.clientes)                     AS qtd_clientes,
    SUM(f.paradas)                      AS qtd_paradas,
    COUNT(DISTINCT CASE WHEN f.placa IS NOT NULL AND f.placa != '' THEN UPPER(f.placa) END) AS qtd_veiculos,
    COUNT(DISTINCT CASE WHEN f.motorista IS NOT NULL AND f.motorista != '' THEN UPPER(TRIM(f.motorista)) END) AS qtd_motoristas,
    SUM(f.km_realizado)                 AS total_km,
    SUM(f.peso_kg)                      AS total_peso_kg,
    SUM(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(f.tipo_veiculo)) AS capacidade_peso_total,
    SUM(f.tempo_operacional_h)          AS tempo_oper_total,
    SUM(f.tempo_ocioso_jornada_h)       AS horas_ociosas_total,
    SUM(f.tempo_plan)                   AS tempo_plan_total,
    SUM(f.pedidos_plan)                 AS pedidos_plan,
    SUM(f.volumes_plan)                 AS volumes_plan,
    SUM(f.peso_plan_kg)                 AS peso_plan,
    SUM(f.km_planejado)                 AS km_plan,
    COUNTIF(f.flag_rota_concluida)      AS rotas_concluidas,
    COUNTIF(f.flag_nao_planejada)       AS qtd_nao_plan,
    COUNTIF(f.flag_sem_tempo)           AS qtd_sem_tempo,
    COUNTIF(f.flag_rota_subutilizada)   AS rotas_curtas,
    COUNTIF(f.flag_overtime)            AS rotas_overtime,
    COUNTIF(f.match_temporal = 'Mesmo Dia')     AS match_mesmo_dia,
    COUNTIF(f.match_temporal != 'Sem Planejado' AND f.match_temporal IS NOT NULL) AS rotas_com_plan
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
  GROUP BY 1,2
),
kpis AS (
  SELECT b.*, m.*,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, CAST(b.qtd_rotas AS FLOAT64)) AS spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, CAST(b.qtd_rotas AS FLOAT64)) AS spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, b.qtd_entregas + b.qtd_insucessos) AS pct_entregas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_concl,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64)) AS orh,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64) * 8.0) AS pct_util_jornada,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, NULLIF(b.tempo_oper_total, 0)) AS dpph,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, NULLIF(b.pedidos_plan, 0)) AS ocup_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, NULLIF(b.volumes_plan, 0)) AS ocup_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.peso_plan, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_pedidos, b.pedidos_plan) AS ader_ped,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_volumes, b.volumes_plan) AS ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_peso_kg, b.peso_plan)  AS ader_peso,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.total_km, b.km_plan)         AS ader_km,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.tempo_oper_total, b.tempo_plan_total) AS ader_tempo,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.match_mesmo_dia AS FLOAT64), CAST(NULLIF(b.rotas_com_plan, 0) AS FLOAT64)) AS pct_match,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.qtd_nao_plan AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_sem_plan,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_curtas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_curtas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_overtime AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_overtime
  FROM base b
  CROSS JOIN metas m
),
com_status AS (
  SELECT c.*,
    c.ocup_peso_veiculo AS ocup_composta,
    `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) AS status_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_color`(`data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)) AS cor_capacidade,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_ped, c.meta_spr_ped) AS status_spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) AS status_spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) AS status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas) AS status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) AS status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol) AS status_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.dpph, c.meta_dpph) AS status_dpph,
    `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas),
      `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol),
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)
    ) AS score_operacional,
    CASE
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) = 'Critico' THEN 'SPR abaixo da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) = 'Critico' THEN 'Entregas em nivel critico'
      WHEN `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) = 'Critico' THEN 'Jornada fora da meta'
      WHEN `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo) IN ('Saturado','Critico') THEN 'Ocupacao fora da faixa'
      WHEN c.qtd_nao_plan > 0 THEN 'Rotas sem planejamento'
      ELSE 'OK'
    END AS alerta,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(c.qtd_rotas AS FLOAT64),
      SUM(c.qtd_rotas) OVER (PARTITION BY c.data)) AS pct_share
  FROM kpis c
)
SELECT * FROM com_status
ORDER BY data DESC, transportador;


-- mart_kpi_motorista_dia: KPIs por motorista por dia (Unidade)
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.mart_kpi_motorista_dia` AS
WITH
metas AS (SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.metas_pivot`),
base AS (
  SELECT
    f.data_planejada AS data,
    f.filial,
    f.motorista,
    f.cpf_motorista,
    f.transportador,
    COUNT(DISTINCT f.id_carga)          AS qtd_rotas,
    SUM(f.qtd_pedidos)                  AS qtd_pedidos,
    SUM(f.qtd_volumes)                  AS qtd_volumes,
    SUM(f.entregues)                    AS qtd_entregas,
    SUM(f.insucessos)                   AS qtd_insucessos,
    SUM(f.km_realizado)                 AS total_km,
    SUM(f.peso_kg)                      AS total_peso_kg,
    SUM(`data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(f.tipo_veiculo)) AS capacidade_peso_total,
    SUM(f.tempo_operacional_h)          AS tempo_oper_total,
    SUM(f.tempo_ocioso_jornada_h)       AS horas_ociosas_total,
    SUM(f.tempo_plan)                   AS tempo_plan_total,
    SUM(f.pedidos_plan)                 AS pedidos_plan,
    SUM(f.volumes_plan)                 AS volumes_plan,
    SUM(f.peso_plan_kg)                 AS peso_plan,
    COUNTIF(f.flag_rota_concluida)      AS rotas_concluidas,
    COUNTIF(f.flag_overtime)            AS rotas_overtime
  FROM `data-aileron-482822-d0.monitoramento_carga.fct_execucao` f
  WHERE f.tipo_filial = 'Unidade'
    AND f.motorista IS NOT NULL AND TRIM(f.motorista) != ''
  GROUP BY 1,2,3,4,5
),
kpis AS (
  SELECT b.*, m.*,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, CAST(b.qtd_rotas AS FLOAT64)) AS spr_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, CAST(b.qtd_rotas AS FLOAT64)) AS spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, b.qtd_entregas + b.qtd_insucessos) AS pct_entregas,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(b.rotas_concluidas AS FLOAT64), CAST(b.qtd_rotas AS FLOAT64)) AS pct_rotas_concl,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.tempo_oper_total, CAST(b.qtd_rotas AS FLOAT64)) AS orh,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_entregas, NULLIF(b.tempo_oper_total, 0)) AS dpph,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_pedidos, NULLIF(b.pedidos_plan, 0)) AS ocup_ped,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.qtd_volumes, NULLIF(b.volumes_plan, 0)) AS ocup_vol,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.peso_plan, 0)) AS ocup_peso,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(b.total_peso_kg, NULLIF(b.capacidade_peso_total, 0)) AS ocup_peso_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(b.qtd_volumes, b.volumes_plan) AS ader_vol,
    b.tempo_oper_total AS horas_jornada,
    (b.rotas_overtime > 0) AS flag_overtime
  FROM base b
  CROSS JOIN metas m
),
com_status AS (
  SELECT c.*,
    c.ocup_peso_veiculo AS ocup_composta,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol) AS status_spr_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas) AS status_entregas,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas) AS status_rotas,
    `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1) AS status_orh,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol) AS status_ader_vol,
    `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.dpph, c.meta_dpph) AS status_dpph,
    `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.spr_vol, c.meta_spr_vol),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_entregas, c.meta_entregas),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.pct_rotas_concl, c.meta_rotas),
      `data-aileron-482822-d0.monitoramento_carga.status_target_band`(c.orh, c.meta_orh, 1.0, 2.1),
      `data-aileron-482822-d0.monitoramento_carga.status_higher`(c.ader_vol, c.meta_ader_vol),
      `data-aileron-482822-d0.monitoramento_carga.capacity_status`(c.ocup_peso_veiculo)
    ) AS score_operacional
  FROM kpis c
)
SELECT * FROM com_status
ORDER BY data DESC, filial, motorista;
