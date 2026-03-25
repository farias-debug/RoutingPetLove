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
    WHEN 'VAN-COM-8H-DED' THEN 'Van'
    WHEN 'VAN-ELE-8H-DED' THEN 'Van'
    WHEN 'VAN-COM-8H-AGR' THEN 'Van'
    WHEN 'VAN-COM-12H-AGR' THEN 'Van'
    WHEN 'VAN-ELE-12H-DED' THEN 'Van'
    WHEN 'VAN-ELE-8H-AGR' THEN 'Van'
    WHEN 'EVAN PROPRIA' THEN 'Van'
    WHEN 'VAN' THEN 'Van'
    WHEN 'UTI-COM-8H-DED' THEN 'Utilitario'
    WHEN 'UTI-ELE-8H-DED' THEN 'Utilitario'
    WHEN 'UTI-COM-8H-AGR' THEN 'Utilitario'
    WHEN 'UTILITARIOS' THEN 'Utilitario'
    WHEN 'UTILITÁRIOS' THEN 'Utilitario'
    WHEN 'E-UTILITARIO LAST MILE' THEN 'Utilitario'
    WHEN 'PAS-COM-8H-AGR' THEN 'Passeio'
    WHEN 'VEICULO DE PASSEIO' THEN 'Passeio'
    WHEN 'VEÍCULO DE PASSEIO' THEN 'Passeio'
    WHEN 'EPASSEIO PROPRIO' THEN 'Passeio'
    WHEN 'CARRO' THEN 'Passeio'
    WHEN 'MOTOCICLETA' THEN 'Motocicleta'
    WHEN 'MOTO' THEN 'Motocicleta'
    WHEN 'VUC-COM-8H-AGR' THEN 'VUC'
    WHEN 'VUC-ELE-8H-AGR' THEN 'VUC'
    WHEN 'VUC' THEN 'VUC'
    WHEN '3/4' THEN '3/4'
    WHEN '3-4' THEN '3/4'
    WHEN '3/4/MEDIO' THEN '3/4'
    WHEN '3/4/MÉDIO' THEN '3/4'
    WHEN 'TOCO' THEN 'Toco'
    WHEN 'TRUCK' THEN 'Truck'
    WHEN 'CARRETA' THEN 'Carreta'
    WHEN 'CARRETA*' THEN 'Carreta'
    WHEN 'BITRUCK' THEN 'Bitruck'
    WHEN 'FIORINO' THEN 'Fiorino'
    WHEN 'HR' THEN 'HR'
    WHEN 'TIPO NAO SELECIONADO' THEN 'Nao selecionado'
    WHEN 'TIPO NÃO SELECIONADO' THEN 'Nao selecionado'
    WHEN '' THEN 'Nao selecionado'
    ELSE 'Outros'
  END
);

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(vtype STRING) AS (
  -- Capacidade de carga útil (kg) por tipo de veículo.
  -- Valores ajustados: dados reais indicam peso médio 3.400-4.200 kg/rota,
  -- consistente com VUC/3-4 Ton (não Fiorino/Passeio tradicionais).
  -- TODO: validar com a equipe de frota os valores exatos de cada tipo.
  CASE vtype
    WHEN 'Van'        THEN 5500.0
    WHEN 'Utilitario' THEN 4500.0
    WHEN 'Passeio'    THEN 4000.0
    ELSE NULL
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

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.filial_code_canonical`(val STRING) AS (
  -- Extrai o código numérico embutido na sigla da filial.
  -- Exemplos: "PetLog01 São Paulo" → "01"  |  "Petlog08 Goiânia" → "08"
  -- Formato esperado: {letras}{NN} {nome cidade} — dígitos DEPOIS de letras, antes do espaço.
  LPAD(COALESCE(REGEXP_EXTRACT(UPPER(TRIM(IFNULL(val, ''))), r'[A-Z]+(\d+)'), '00'), 2, '0')
);

-- ==============================================================================
-- STAGING - Parse de tipos e normalização textual
-- ==============================================================================

CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.stg_monitoramento` AS
WITH parsed AS (
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
  -- Data de carregamento pode vir como dd/mm/YYYY HH:MM ou dd/mm/YYYY HH:MM:SS
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M:%S', TRIM(f.`Data de carregamento`)),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Data de carregamento`))
  ) AS ts_carregamento,
  f.dtabertura,  -- TIMESTAMP nativo da raw, usado como fallback para data_referencia
  f.`Data Atribuição Motorista` AS ts_atribuicao_motorista,  -- já é TIMESTAMP
  f.`Data Inicio de Rota APP` AS ts_inicio_rota,  -- já é TIMESTAMP
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', TRIM(f.`Primeira Baixa`)),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M:%S', TRIM(f.`Primeira Baixa`)),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Primeira Baixa`))
  ) AS ts_primeira_baixa,
  COALESCE(
    SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', TRIM(f.`Última Baixa`)),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M:%S', TRIM(f.`Última Baixa`)),
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', TRIM(f.`Última Baixa`))
  ) AS ts_ultima_baixa,

  -- Quantidades (já são numéricos na raw, apenas CAST)
  SAFE_CAST(f.Quantidade AS FLOAT64) AS qtd_pedidos,
  SAFE_CAST(f.`Quantidade Volumes` AS FLOAT64) AS qtd_volumes,
  SAFE_CAST(f.Entregues AS FLOAT64) AS qtd_entregues,
  GREATEST(SAFE_CAST(f.Insucessos AS FLOAT64), 0) AS qtd_insucessos,
  SAFE_CAST(f.Peso AS FLOAT64) AS peso_real_kg,  -- CSV já armazena em kg
  SAFE_CAST(f.baixas AS FLOAT64) AS qtd_baixas,
  SAFE_CAST(f.Paradas AS FLOAT64) AS qtd_paradas,
  SAFE_CAST(f.Clientes AS FLOAT64) AS qtd_clientes,

  -- KM (já são FLOAT na raw)
  SAFE_CAST(f.`Km Planejado` AS FLOAT64) AS km_plan,
  SAFE_CAST(f.`Km Realizado` AS FLOAT64) AS km_real,

  -- Tempo realizado: a raw atual entrega fração de dia Excel; valores maiores já estão em horas.
  CASE
    WHEN SAFE_CAST(f.`Tempo Realizado` AS FLOAT64) > 0
         AND SAFE_CAST(f.`Tempo Realizado` AS FLOAT64) <= 1.5
      THEN SAFE_CAST(f.`Tempo Realizado` AS FLOAT64) * 24.0
    WHEN SAFE_CAST(f.`Tempo Realizado` AS FLOAT64) > 1.5
      THEN SAFE_CAST(f.`Tempo Realizado` AS FLOAT64)
    ELSE 0.0
  END AS tempo_realizado_h,

  0.0 AS tempo_planejado_h,  -- Tempo planejado vem de raw_planejamento, não de raw_monitoramento

  -- Valores pagamento (CSV já armazena em reais)
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
  TRIM(f.Ajudante) AS ajudante,

  -- Dedup: prioriza registro mais recente por id_carga
  ROW_NUMBER() OVER (
    PARTITION BY CAST(f.`Id Carga` AS INT64)
    ORDER BY f.dtabertura DESC
  ) AS rn

FROM `data-aileron-482822-d0.monitoramento_carga.raw_monitoramento` f
)
SELECT * EXCEPT(rn)
FROM parsed
WHERE rn = 1;

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
  `data-aileron-482822-d0.monitoramento_carga.filial_code_canonical`(d.Filial) AS filial_codigo,
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
UNION ALL SELECT 'spr_pedidos', 'SPR Pedidos', 42.0, 'higher_better', 'pedidos/rota'
UNION ALL SELECT 'entregas_efetivas', 'Entregas Efetivas', 0.98, 'higher_better', 'percentual'
UNION ALL SELECT 'rotas_concluidas', 'Rotas Concluídas', 0.95, 'higher_better', 'percentual'
UNION ALL SELECT 'orh', 'ORH Tempo', 7.0, 'target_band', 'horas'
UNION ALL SELECT 'aderencia_volumes', 'Aderência Volumes', 0.90, 'higher_better', 'percentual'
UNION ALL SELECT 'ocupacao_composta', 'Ocupação Composta', 0.85, 'target_band', 'percentual';

-- ==============================================================================
-- ALIAS E VIEWS DERIVADAS DE METAS (para compatibilidade com API)
-- ==============================================================================

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
    COALESCE(DATE(m.ts_carregamento), DATE(m.dtabertura)) AS data_referencia,
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

    -- Nomes canônicos para exibição (capitalização correta)
    INITCAP(LOWER(TRIM(m.motorista))) AS motorista_display,
    INITCAP(LOWER(TRIM(m.transportador))) AS transportador_display,

    -- Flags operacionais
    (`data-aileron-482822-d0.monitoramento_carga.normalize_text`(m.status_tms)
      IN ('concluido', 'concluida', 'finalizado', 'finalizada', 'entregue', 'entregues')
    ) AS flag_rota_concluida,
    (
      CASE
        WHEN m.ts_primeira_baixa IS NOT NULL
             AND m.ts_ultima_baixa IS NOT NULL
             AND m.ts_ultima_baixa > m.ts_primeira_baixa
          THEN TIMESTAMP_DIFF(m.ts_ultima_baixa, m.ts_primeira_baixa, MINUTE) / 60.0
        ELSE COALESCE(m.tempo_realizado_h, 0)
      END
    ) > 8.0 AS flag_overtime,

    -- Tempo operacional (primeira a última baixa)
    CASE
      WHEN m.ts_primeira_baixa IS NOT NULL
           AND m.ts_ultima_baixa IS NOT NULL
           AND m.ts_ultima_baixa > m.ts_primeira_baixa
        THEN TIMESTAMP_DIFF(m.ts_ultima_baixa, m.ts_primeira_baixa, MINUTE) / 60.0
      ELSE COALESCE(m.tempo_realizado_h, 0)
    END AS tempo_operacional_h,

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
    f.filial_codigo,
    -- Formato canônico: "09-Jundiai" (código + cidade, sem prefixo genérico)
    COALESCE(
      CONCAT(f.filial_codigo, '-', TRIM(REGEXP_REPLACE(f.filial_nome, r'^(?i)[A-Za-z]+\d+\s*', ''))),
      e.filial_raw
    ) AS filial
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

    -- Flag: Rota sem planejamento (id_carga não encontrado em stg_planejamento)
    (NOT cp.possui_planejamento) AS flag_nao_planejada,

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
SELECT
  -- Remove colunas sempre-zero que poluem o schema
  * EXCEPT(tempo_planejado_h, valor_parada, valor_ajudante),

  -- ── KPIs row-level: entrega ───────────────────────────────────────────────
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    qtd_entregues, qtd_entregues + qtd_insucessos
  ) AS pct_entrega_efetiva,

  -- ── KPIs row-level: aderências (requerem planejamento) ───────────────────
  `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(
    qtd_volumes, NULLIF(volumes_plan, 0)
  ) AS aderencia_volumes,
  `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(
    qtd_pedidos, NULLIF(pedidos_plan, 0)
  ) AS aderencia_pedidos,
  `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(
    peso_real_kg, NULLIF(peso_plan_kg, 0)
  ) AS aderencia_peso,
  `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(
    km_real, NULLIF(km_plan_plan, 0)
  ) AS aderencia_km,
  `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(
    tempo_operacional_h, NULLIF(tempo_plan_h, 0)
  ) AS aderencia_tempo,

  -- ── KPIs row-level: capacidade e velocidade ───────────────────────────────
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    peso_real_kg, NULLIF(capacidade_peso_kg, 0)
  ) AS ocup_peso_veiculo,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    qtd_entregues, NULLIF(tempo_operacional_h, 0)
  ) AS dpph,

  -- ── KPIs row-level: custo unitário ────────────────────────────────────────
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    valor_total, NULLIF(qtd_pedidos, 0)
  ) AS custo_por_pedido,
  `data-aileron-482822-d0.monitoramento_carga.safe_div`(
    valor_total, NULLIF(qtd_volumes, 0)
  ) AS custo_por_volume,

  -- ── Temporal ──────────────────────────────────────────────────────────────
  FORMAT_DATE('%G-W%V', data_referencia) AS semana_referencia

FROM com_flags_adicionais;

-- ==============================================================================
-- FIM - API consome direto base_execucao_canonica via queries.js
-- ==============================================================================
