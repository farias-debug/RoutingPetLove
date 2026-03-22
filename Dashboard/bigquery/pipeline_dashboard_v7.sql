-- ==============================================================================
-- PIPELINE DASHBOARD v7 - EXCLUSIVO PARA DASHBOARD WEB
-- Projeto: data-aileron-482822-d0
-- Dataset: monitoramento_carga
-- Data: 2026-03-22
-- ==============================================================================
--
-- PRINCÍPIO DE DESIGN:
-- - MINIMALISTA: Apenas objetos essenciais para API/Frontend
-- - DESACOPLADO: Sheets tem pipeline separado
-- - PERFORMÁTICO: Menos views = queries mais rápidas
-- - MANUTENÍVEL: Menos objetos = menos pontos de falha
--
-- ARQUITETURA:
--   RAW → STAGING → BASE_CANONICA → (API consome direto via queries.js)
--
-- Dashboard consome APENAS 3 objetos:
--   1. base_execucao_canonica (granular - todas medidas atômicas)
--   2. dim_filial (enriquecimento)
--   3. metas_globais (referências)
--
-- API faz agregação dinâmica em queries.js com filtros customizados
-- Não precisa de marts pré-agregados (cache BigQuery otimiza)
-- ==============================================================================

-- ==============================================================================
-- UDFs CORE (apenas as essenciais)
-- ==============================================================================

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.normalize_text`(val STRING) AS (
  LOWER(TRIM(REGEXP_REPLACE(NORMALIZE(IFNULL(val, ''), NFD), r'\pM', '')))
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.safe_div`(num FLOAT64, den FLOAT64) AS (
  IF(den IS NULL OR den = 0, NULL, num / den)
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(real_val FLOAT64, plan_val FLOAT64) AS (
  LEAST(1.0, `data-aileron-482822-d0.monitoramento_carga.safe_div`(real_val, plan_val))
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_higher`(val FLOAT64, meta FLOAT64) AS (
  CASE
    WHEN val IS NULL OR meta IS NULL THEN 'Informativo'
    WHEN val >= meta THEN 'OK'
    WHEN val >= meta * 0.95 THEN 'Atencao'
    ELSE 'Critico'
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_target_band`(val FLOAT64, target FLOAT64, att_gap FLOAT64, crit_gap FLOAT64) AS (
  CASE
    WHEN val IS NULL OR target IS NULL THEN 'Informativo'
    WHEN val >= target - att_gap AND val <= target + att_gap THEN 'OK'
    WHEN val >= target - crit_gap AND val <= target + crit_gap THEN 'Atencao'
    ELSE 'Critico'
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.capacity_status`(val FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 'Informativo'
    WHEN val >= 0.95 THEN 'Saturado'
    WHEN val >= 0.85 THEN 'Critico'
    WHEN val >= 0.70 THEN 'Atencao'
    ELSE 'OK'
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_score`(s STRING) AS (
  CASE s
    WHEN 'OK' THEN 1.0
    WHEN 'Atencao' THEN 0.5
    WHEN 'Critico' THEN 0.0
    ELSE NULL
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.fn_score_operacional`(
  st_spr STRING,
  st_entregas STRING,
  st_rotas STRING,
  st_orh STRING,
  st_ader STRING,
  st_ocup STRING
) AS (
  (`data-aileron-482822-d0.monitoramento_carga.status_score`(st_spr) +
   `data-aileron-482822-d0.monitoramento_carga.status_score`(st_entregas) +
   `data-aileron-482822-d0.monitoramento_carga.status_score`(st_rotas) +
   `data-aileron-482822-d0.monitoramento_carga.status_score`(st_orh) +
   `data-aileron-482822-d0.monitoramento_carga.status_score`(st_ader) +
   `data-aileron-482822-d0.monitoramento_carga.status_score`(st_ocup)) / 6.0 * 100.0
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(raw_type STRING) AS (
  CASE UPPER(TRIM(IFNULL(raw_type, '')))
    WHEN '3/4' THEN 'VUC'
    WHEN '3-4' THEN 'VUC'
    WHEN 'VAN' THEN 'VAN'
    WHEN 'TOCO' THEN 'TOCO'
    WHEN 'TRUCK' THEN 'TRUCK'
    WHEN 'CARRETA' THEN 'CARRETA'
    WHEN 'BITRUCK' THEN 'BITRUCK'
    WHEN 'MOTO' THEN 'MOTO'
    WHEN 'CARRO' THEN 'CARRO'
    ELSE 'OUTROS'
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(vtype STRING) AS (
  CASE vtype
    WHEN 'VUC' THEN 1500.0
    WHEN 'VAN' THEN 1200.0
    WHEN 'TOCO' THEN 6000.0
    WHEN 'TRUCK' THEN 10000.0
    WHEN 'CARRETA' THEN 25000.0
    WHEN 'BITRUCK' THEN 15000.0
    WHEN 'MOTO' THEN 50.0
    WHEN 'CARRO' THEN 300.0
    ELSE 1000.0
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.motorista_key_canonical`(
  cpf STRING,
  nome STRING
) AS (
  COALESCE(
    NULLIF(TRIM(cpf), ''),
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(nome)
  )
);

-- ==============================================================================
-- STAGING - Parse de tipos e normalização textual
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` AS
SELECT
  CAST(f.`Id Carga` AS INT64) AS id_carga,
  TRIM(f.status) AS status_tms,
  TRIM(f.`N_ Placa`) AS placa,
  TRIM(f.Tipo) AS tipo_veiculo_raw,
  TRIM(f.Motorista) AS motorista,
  LPAD(TRIM(CAST(f.`CPF Motorista` AS STRING)), 11, '0') AS cpf_motorista,
  TRIM(f.Transportador) AS transportador,
  TRIM(f.Rota) AS rota,
  TRIM(f.Filial) AS filial_raw,

  -- Timestamps (alguns campos já são TIMESTAMP na raw, outros são STRING)
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Data de carregamento`)) AS ts_carregamento,
  f.`Data Atribuição Motorista` AS ts_atribuicao_motorista,  -- já é TIMESTAMP
  f.`Data Inicio de Rota APP` AS ts_inicio_rota,  -- já é TIMESTAMP
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Primeira Baixa`)) AS ts_primeira_baixa,
  SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Última Baixa`)) AS ts_ultima_baixa,

  -- Quantidades (já são numéricos na raw, apenas CAST)
  SAFE_CAST(f.Quantidade AS FLOAT64) AS qtd_pedidos,
  SAFE_CAST(f.`Quantidade Volumes` AS FLOAT64) AS qtd_volumes,
  SAFE_CAST(f.Entregues AS FLOAT64) AS qtd_entregues,
  SAFE_CAST(f.Insucessos AS FLOAT64) AS qtd_insucessos,
  SAFE_CAST(f.Peso AS FLOAT64) AS peso_real_kg,
  SAFE_CAST(f.baixas AS FLOAT64) AS qtd_baixas,
  SAFE_CAST(f.Paradas AS FLOAT64) AS qtd_paradas,
  SAFE_CAST(f.Clientes AS FLOAT64) AS qtd_clientes,

  -- KM (já são FLOAT na raw)
  SAFE_CAST(f.`Km Planejado` AS FLOAT64) AS km_plan,
  SAFE_CAST(f.`Km Realizado` AS FLOAT64) AS km_real,

  -- Tempo (já é FLOAT na raw, mas pode conter HH:MM em string - verificar tipo)
  SAFE_CAST(f.`Tempo Realizado` AS FLOAT64) AS tempo_realizado_h,

  0.0 AS tempo_planejado_h,  -- Tempo planejado vem de raw_planejamento, não de raw_monitoramento

  -- Valores pagamento (já são FLOAT na raw)
  SAFE_CAST(f.`Valor Pagamento Carga` AS FLOAT64) AS valor_carga,
  SAFE_CAST(f.`Valor Pagamento Rota` AS FLOAT64) AS valor_rota,
  0.0 AS valor_parada,  -- Campo não existe na raw
  SAFE_CAST(f.`Valor Pagamento Remessas` AS FLOAT64) AS valor_remessas,
  SAFE_CAST(f.`Valor Pagamento Km` AS FLOAT64) AS valor_km,
  0.0 AS valor_ajudante,  -- Campo não existe na raw

  -- Outros
  TRIM(f.Alerta) AS alerta_tms,
  SAFE_CAST(REPLACE(REPLACE(TRIM(f.Perfomance), '%', ''), ',', '.') AS FLOAT64) / 100.0 AS performance_pct,
  TRIM(f.`Usuário Carregamento`) AS usuario_carregamento,
  TRIM(f.Ajudante) AS ajudante

FROM `data-aileron-482822-d0.monitoramento_carga.raw_monitoramento` f;

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.stg_planejamento` AS
WITH dedup AS (
  SELECT
    p.`Id Carga` AS id_carga,  -- já é INTEGER
    TRIM(p.Filial) AS filial_raw,
    TRIM(p.Rota) AS rota_planejada,
    p.`Data Planejada` AS data_planejada,  -- já é DATE
    SAFE_CAST(p.Pedidos AS FLOAT64) AS pedidos_plan,  -- já é INTEGER
    SAFE_CAST(p.Volume AS FLOAT64) AS volumes_plan,  -- já é INTEGER
    SAFE_CAST(p.Peso AS FLOAT64) AS peso_plan_kg,  -- já é FLOAT
    SAFE_CAST(p.Km AS FLOAT64) AS km_plan,  -- já é FLOAT
    -- Tempo de Rota é TIME, converter para horas decimais
    TIME_DIFF(p.`Tempo de Rota`, TIME(0, 0, 0), MINUTE) / 60.0 AS tempo_plan_h,
    ROW_NUMBER() OVER (
      PARTITION BY p.`Id Carga`, TRIM(p.Filial)
      ORDER BY p.`Data Planejada` DESC
    ) AS rn
  FROM `data-aileron-482822-d0.monitoramento_carga.raw_planejamento` p
)
SELECT * EXCEPT(rn)
FROM dedup
WHERE rn = 1;

-- ==============================================================================
-- DIMENSÕES - Apenas as essenciais
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.dim_filial` AS
SELECT
  d.`CD Origem` AS cd_origem,
  d.Tabela AS tabela,
  d.Filial AS filial_nome,
  d.Codigo AS codigo,
  d.`Nome Filial` AS nome_filial,
  d.Tipo AS tipo,
  d.MetaSPR AS meta_spr,
  d.Regiao AS regiao,
  d.`Capacidade Volume Dia` AS capacidade_volume_dia,
  `data-aileron-482822-d0.monitoramento_carga.normalize_text`(d.Filial) AS filial_key,
  `data-aileron-482822-d0.monitoramento_carga.normalize_text`(d.`Nome Filial`) AS nome_filial_key,
  (d.MetaSPR IS NOT NULL AND d.`Capacidade Volume Dia` IS NOT NULL) AS filial_completa,
  CASE
    WHEN d.MetaSPR IS NULL AND d.`Capacidade Volume Dia` IS NULL THEN 'META_E_CAP_FALTANTES'
    WHEN d.MetaSPR IS NULL THEN 'META_FALTANTE'
    WHEN d.`Capacidade Volume Dia` IS NULL THEN 'CAP_FALTANTE'
    ELSE 'COMPLETA'
  END AS status_completude
FROM `data-aileron-482822-d0.monitoramento_carga.raw_dim_filial` d;

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.metas_globais` AS
SELECT
  'spr_volumes' AS kpi_id,
  'SPR Volumes' AS kpi_nome,
  67.0 AS meta,
  'higher_better' AS sentido,
  'volumes/rota' AS unidade
UNION ALL SELECT 'spr_pedidos', 'SPR Pedidos', 55.0, 'higher_better', 'pedidos/rota'
UNION ALL SELECT 'entregas_efetivas', 'Entregas Efetivas', 0.98, 'higher_better', 'percentual'
UNION ALL SELECT 'rotas_concluidas', 'Rotas Concluídas', 0.95, 'higher_better', 'percentual'
UNION ALL SELECT 'orh', 'ORH Tempo', 6.0, 'target_band', 'horas'
UNION ALL SELECT 'aderencia_volumes', 'Aderência Volumes', 0.95, 'higher_better', 'percentual'
UNION ALL SELECT 'ocupacao_composta', 'Ocupação Composta', 0.70, 'target_band', 'percentual';

-- ==============================================================================
-- ALIAS E VIEWS DERIVADAS DE METAS (para compatibilidade com API)
-- ==============================================================================

-- pub_metas: Alias para metas_globais com nomes de coluna legados
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.pub_metas` AS
SELECT
  kpi_id AS KPI,
  kpi_nome AS Nome,
  meta AS Meta,
  sentido AS Sentido,
  unidade AS Unidade
FROM `data-aileron-482822-d0.monitoramento_carga.metas_globais`;

-- metas_pivot_canonico: View pivotada para scoring/comparação em queries
-- IMPORTANTE: Esta view retorna UMA ÚNICA ROW com todas as metas em colunas
CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.metas_pivot_canonico` AS
SELECT
  MAX(CASE WHEN kpi_id = 'spr_pedidos' THEN meta END) AS meta_spr_ped,
  MAX(CASE WHEN kpi_id = 'spr_volumes' THEN meta END) AS meta_spr_vol,
  MAX(CASE WHEN kpi_id = 'entregas_efetivas' THEN meta END) AS meta_entregas,
  MAX(CASE WHEN kpi_id = 'rotas_concluidas' THEN meta END) AS meta_rotas,
  MAX(CASE WHEN kpi_id = 'orh' THEN meta END) AS meta_orh,
  MAX(CASE WHEN kpi_id = 'aderencia_volumes' THEN meta END) AS meta_ader_vol,
  MAX(CASE WHEN kpi_id = 'ocupacao_composta' THEN meta END) AS meta_ocup,
  -- DPPH meta calculada (volumes/pedidos meta / tempo ORH meta)
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    MAX(CASE WHEN kpi_id = 'spr_volumes' THEN meta END),
    MAX(CASE WHEN kpi_id = 'orh' THEN meta END)
  ) AS meta_dpph
FROM `data-aileron-482822-d0.monitoramento_carga.metas_globais`;

-- ==============================================================================
-- BASE CANÔNICA - Única fonte atômica para a API
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.base_execucao_canonica` AS
WITH
exec_base AS (
  SELECT
    m.*,
    DATE(m.ts_carregamento) AS data_referencia,
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(m.filial_raw) AS filial_key,
    `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(m.tipo_veiculo_raw) AS tipo_veiculo,
    `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(
      `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(m.tipo_veiculo_raw)
    ) AS capacidade_peso_kg,
    `data-aileron-482822-d0.monitoramento_carga.motorista_key_canonical`(m.cpf_motorista, m.motorista) AS motorista_key_canonico,
    COALESCE(
      NULLIF(`data-aileron-482822-d0.monitoramento_carga.normalize_text`(m.transportador), ''),
      'SEM_TRANSPORTADOR'
    ) AS transportador_key_canonico,

    -- Flags operacionais
    (LOWER(m.status_tms) IN ('concluido', 'concluída', 'finalizado', 'finalizada')) AS flag_rota_concluida,
    (m.tempo_realizado_h > 8.0) AS flag_overtime,
    (m.ts_carregamento IS NULL OR DATE(m.ts_carregamento) != DATE(m.ts_primeira_baixa)) AS flag_nao_planejada,

    -- Tempo operacional (primeira a última baixa)
    IFNULL(
      TIMESTAMP_DIFF(m.ts_ultima_baixa, m.ts_primeira_baixa, MINUTE) / 60.0,
      m.tempo_realizado_h
    ) AS tempo_operacional_h,

    -- Valor total
    COALESCE(m.valor_carga, 0) +
    COALESCE(m.valor_rota, 0) +
    COALESCE(m.valor_parada, 0) +
    COALESCE(m.valor_remessas, 0) +
    COALESCE(m.valor_km, 0) +
    COALESCE(m.valor_ajudante, 0) AS valor_total
  FROM `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` m
),
com_filial AS (
  SELECT
    e.*,
    f.tipo AS tipo_filial,
    f.regiao,
    f.meta_spr AS meta_spr_filial,
    f.capacidade_volume_dia,
    COALESCE(f.filial_nome, e.filial_raw) AS filial
  FROM exec_base e
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.dim_filial` f
    ON e.filial_key = f.filial_key
),
com_planejamento AS (
  SELECT
    e.*,
    p.data_planejada,
    p.pedidos_plan,
    p.volumes_plan,
    p.peso_plan_kg,
    p.km_plan AS km_plan_plan,
    p.tempo_plan_h,
    (p.id_carga IS NOT NULL) AS possui_planejamento,
    (e.data_referencia = p.data_planejada) AS flag_match_mesmo_dia
  FROM com_filial e
  LEFT JOIN `data-aileron-482822-d0.monitoramento_carga.stg_planejamento` p
    ON e.id_carga = p.id_carga AND e.filial_key = `data-aileron-482822-d0.monitoramento_carga.normalize_text`(p.filial_raw)
),
com_flags_adicionais AS (
  SELECT
    cp.*,

    -- Flag: Rota sem tempo planejado ou realizado
    (COALESCE(cp.tempo_plan_h, 0) = 0 AND COALESCE(cp.tempo_operacional_h, 0) = 0) AS flag_sem_tempo,

    -- Flag: Entrega crítica (efetividade < 95% e não-nula)
    (`data-aileron-482822-d0.monitoramento_carga.safe_div`(cp.qtd_entregues, cp.qtd_entregues + cp.qtd_insucessos) < 0.95
      AND `data-aileron-482822-d0.monitoramento_carga.safe_div`(cp.qtd_entregues, cp.qtd_entregues + cp.qtd_insucessos) IS NOT NULL
    ) AS flag_entrega_critica,

    -- Flag: Match crítico (diferença > 1 dia entre planejado e realizado)
    (ABS(DATE_DIFF(COALESCE(cp.data_planejada, cp.data_referencia), cp.data_referencia, DAY)) > 1
    ) AS flag_match_critico

  FROM com_planejamento cp
)
SELECT * FROM com_flags_adicionais;

-- ==============================================================================
-- FIM - API consome direto base_execucao_canonica via queries.js
-- ==============================================================================
