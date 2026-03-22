CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_base_execucao` AS
WITH
-- Referência de dimensão filial
dim AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.vw_dim_filial_tratada`
  WHERE UPPER(TRIM(IFNULL(Tipo, ''))) = 'UNIDADE'
),
-- Referência de planejamento
plan AS (
  SELECT * FROM `data-aileron-482822-d0.monitoramento_carga.vw_planejamento_lookup`
),
-- Monitoramento com campos normalizados
monit_raw AS (
  SELECT
    m.*,
    CAST(`Id Carga` AS STRING) AS id_carga_str,
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(m.Filial) AS filial_key,
    -- Tipo Veiculo canonizado
    `data-aileron-482822-d0.monitoramento_carga.vehicle_type_canonical`(m.Tipo) AS tipo_veiculo_padrao,
    -- Data de carregamento: string "dd/mm/yyyy HH:MM"
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', `Data de carregamento`) AS ts_carregamento,
    -- Ultima Baixa: string "dd/mm/yyyy HH:MM" ou "Sem baixa"
    SAFE.PARSE_TIMESTAMP('%d/%m/%Y %H:%M', `Última Baixa`) AS ts_ultima_baixa,
    -- Performance: string "100.00%" → float
    SAFE_CAST(REGEXP_REPLACE(IFNULL(Perfomance, ''), r'[%\s]', '') AS FLOAT64) / 100.0 AS performance_pct,
    -- Tempo Planejado: string "HH:MM"
    `data-aileron-482822-d0.monitoramento_carga.duration_str_to_hours`(`Tempo Planejado`) AS tempo_plan_raw,
    -- Tempo Realizado: fração de dia Excel
    `data-aileron-482822-d0.monitoramento_carga.excel_fraction_to_hours`(`Tempo Realizado`) AS tempo_real_raw
  FROM `data-aileron-482822-d0.monitoramento_carga.raw_monitoramento` m
  WHERE `Id Carga` IS NOT NULL
),
-- Join com dimensão para obter filial canônica
monit_dim AS (
  SELECT
    mr.*,
    d.Filial AS filial_canonica,
    d.`Nome Filial` AS nome_filial,
    d.Tipo AS tipo_filial,
    IFNULL(d.MetaSPR, 0) AS meta_spr,
    IFNULL(d.`Capacidade Volume Dia`, 0) AS capacidade_volume_dia,
    d.Regiao
  FROM monit_raw mr
  LEFT JOIN dim d ON mr.filial_key = d.`Filial Key`
),
-- Filtro: apenas tipo UNIDADE (se achou dimensão) ou qualquer (se não achou)
monit_unidade AS (
  SELECT * FROM monit_dim
  WHERE tipo_filial IS NULL OR UPPER(TRIM(tipo_filial)) = 'UNIDADE'
),
-- Planning key e join com planejamento
monit_plan AS (
  SELECT
    mu.*,
    CONCAT(mu.id_carga_str, '|',
      `data-aileron-482822-d0.monitoramento_carga.normalize_text`(
        IFNULL(mu.filial_canonica, mu.Filial)
      )
    ) AS planning_key
  FROM monit_unidade mu
),
joined AS (
  SELECT
    mp.*,
    p.rota_planejada,
    p.data_planejada_plan,
    IFNULL(p.pedidos_plan, 0) AS pedidos_plan,
    IFNULL(p.volumes_plan, 0) AS volumes_plan,
    IFNULL(p.peso_plan, 0) AS peso_plan,
    IFNULL(p.possui_planejado, 0) AS possui_planejado,
    p.tempo_plan_h AS tempo_plan_planilha
  FROM monit_plan mp
  LEFT JOIN plan p ON mp.planning_key = p.planning_key
),
-- Data Planejada = start_of_day(carregamento - 3h)
with_dates AS (
  SELECT
    j.*,
    -- Data planejada: date part de (carregamento ou abertura) - 3h
    DATE(TIMESTAMP_SUB(
      COALESCE(j.ts_carregamento, j.dtabertura),
      INTERVAL 3 HOUR
    )) AS data_planejada,
    -- Tempo plan: preferir raw, senão do planejamento
    CASE
      WHEN j.tempo_plan_raw > 0 THEN j.tempo_plan_raw
      WHEN j.tempo_plan_planilha > 0 THEN j.tempo_plan_planilha
      ELSE 0
    END AS tempo_plan,
    -- Tempo real: preferir raw, senão calcular de inicio rota / ultima baixa
    CASE
      WHEN j.tempo_real_raw > 0 THEN j.tempo_real_raw
      WHEN j.`Data Inicio de Rota APP` IS NOT NULL
           AND j.ts_ultima_baixa IS NOT NULL
           AND j.ts_ultima_baixa >= j.`Data Inicio de Rota APP`
      THEN TIMESTAMP_DIFF(j.ts_ultima_baixa, j.`Data Inicio de Rota APP`, SECOND) / 3600.0
      ELSE 0
    END AS tempo_real
  FROM joined j
),
-- Dedup: por chave IdCarga|Filial, mantém mais recente
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY planning_key
      ORDER BY ts_carregamento DESC, dtabertura DESC
    ) AS dedup_rn
  FROM with_dates
),
-- KPIs calculados por rota
base AS (
  SELECT
    CAST(`Id Carga` AS STRING) AS IdCarga,
    data_planejada AS `Data Planejada`,
    IFNULL(filial_canonica, Filial) AS Filial,
    nome_filial AS `Nome Filial`,
    tipo_filial AS `Tipo Filial`,
    meta_spr AS `MetaSPR Filial`,
    capacidade_volume_dia AS `Capacidade Volume Dia`,
    tipo_veiculo_padrao AS `Tipo de Veiculo Padrao`,
    status AS Status,
    `N_ Placa` AS Placa,
    Motorista,
    CAST(CAST(`CPF Motorista` AS INT64) AS STRING) AS CPF,
    Rota,
    Transportador,
    IFNULL(`Valor Pagamento Carga`, 0) AS `Valor Pagamento Carga`,
    performance_pct AS `Performance (%)`,
    DATE(dtabertura) AS `Data de Abertura`,
    DATE(ts_carregamento) AS `Data de Carregamento`,
    DATE(`Data Atribuição Motorista`) AS `Data Atribuicao Motorista`,
    DATE(`Data Inicio de Rota APP`) AS `Data Inicio Rota`,
    DATE(ts_ultima_baixa) AS `Ultima Baixa`,
    CAST(Quantidade AS FLOAT64) AS `Pedidos da Rota`,
    CAST(`Quantidade Volumes` AS FLOAT64) AS `Volumes da Rota`,
    IFNULL(Peso, 0) AS `Peso Realizado (kg)`,
    IFNULL(Paradas, 0) AS Paradas,
    IFNULL(Clientes, 0) AS Clientes,
    IFNULL(CAST(Entregues AS FLOAT64), 0) AS Entregues,
    IFNULL(CAST(Insucessos AS FLOAT64), 0) AS Insucessos,
    GREATEST(IFNULL(CAST(Insucessos AS FLOAT64), 0), 0) AS `Insucessos Clean`,
    IFNULL(baixas, 0) AS Baixas,
    IFNULL(`Km Planejado`, 0) AS `KM Planejado`,
    IFNULL(`Km Realizado`, 0) AS `KM Realizado`,
    tempo_plan AS `Tempo Planejado (h)`,
    tempo_real AS `Tempo Realizado (h)`,
    pedidos_plan AS `Pedidos Planejados`,
    volumes_plan AS `Volumes Planejados`,
    peso_plan AS `Peso Planejado (kg)`,
    possui_planejado AS `Possui Planejado`,
    -- Semana
    FORMAT_DATE('%A', data_planejada) AS `Dia Semana`,
    DATE_TRUNC(data_planejada, ISOWEEK) AS `Semana Inicio`,
    EXTRACT(ISOWEEK FROM data_planejada) AS `Numero Semana`,
    CONCAT('S', LPAD(CAST(EXTRACT(ISOWEEK FROM data_planejada) AS STRING), 2, '0'),
           ' ', FORMAT_DATE('%d/%m', DATE_TRUNC(data_planejada, ISOWEEK)),
           '-', FORMAT_DATE('%d/%m', DATE_ADD(DATE_TRUNC(data_planejada, ISOWEEK), INTERVAL 6 DAY))
    ) AS `Label Semana`,
    FORMAT_DATE('%Y-%m', data_planejada) AS `Mes Ref`,
    -- SPR por rota
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(Quantidade AS FLOAT64), 1.0) AS `SPR Pedidos`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(`Quantidade Volumes` AS FLOAT64), 1.0) AS `SPR Volumes`,
    -- Deltas
    CASE WHEN possui_planejado > 0 THEN CAST(Quantidade AS FLOAT64) - pedidos_plan ELSE NULL END AS `Delta Pedidos`,
    CASE WHEN possui_planejado > 0 THEN CAST(`Quantidade Volumes` AS FLOAT64) - volumes_plan ELSE NULL END AS `Delta Volumes`,
    -- Entrega Efetiva
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(Entregues AS FLOAT64),
      CAST(Entregues AS FLOAT64) + GREATEST(CAST(IFNULL(Insucessos, 0) AS FLOAT64), 0)
    ) AS `Entrega Efetiva`,
    -- Desvio Tempo
    CASE WHEN tempo_plan > 0 THEN tempo_real - tempo_plan ELSE NULL END AS `Desvio Tempo (h)`,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      tempo_real - tempo_plan, tempo_plan) AS `Desvio Tempo (%)`,
    -- Tempo operacional KPI (preferir real > 0, senão plan)
    CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END AS `Tempo Operacional KPI (h)`,
    -- Ocupações por rota
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(Quantidade AS FLOAT64), NULLIF(pedidos_plan, 0)) AS ocup_pedidos_rota,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(CAST(`Quantidade Volumes` AS FLOAT64), NULLIF(volumes_plan, 0)) AS ocup_volumes_rota,
    `data-aileron-482822-d0.monitoramento_carga.safe_div`(Peso, NULLIF(peso_plan, 0)) AS ocup_peso_rota,
    -- Rota concluida
    CASE WHEN UPPER(TRIM(IFNULL(status, ''))) LIKE '%FINALIZADO%' THEN 1 ELSE 0 END AS `Rota Concluida`,
    -- Flags
    CASE WHEN IFNULL(possui_planejado, 0) > 0 THEN 0 ELSE 1 END AS `Flag Nao Planejada`,
    CASE WHEN tempo_plan = 0 AND tempo_real = 0 THEN 1 ELSE 0 END AS `Flag Sem Tempo`,
    CASE WHEN CASE WHEN tempo_real > 0 THEN tempo_real ELSE tempo_plan END > 8 THEN 1 ELSE 0 END AS `Flag Overtime`,
    -- Flag Entrega Critica: entrega efetiva < 0.95
    CASE WHEN `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(Entregues AS FLOAT64),
      CAST(Entregues AS FLOAT64) + GREATEST(CAST(IFNULL(Insucessos, 0) AS FLOAT64), 0)
    ) < 0.95 AND `data-aileron-482822-d0.monitoramento_carga.safe_div`(
      CAST(Entregues AS FLOAT64),
      CAST(Entregues AS FLOAT64) + GREATEST(CAST(IFNULL(Insucessos, 0) AS FLOAT64), 0)
    ) IS NOT NULL THEN 1 ELSE 0 END AS `Flag Entrega Critica`,
    -- Match temporal
    data_planejada_plan,
    Regiao
  FROM deduped
  WHERE dedup_rn = 1
),
-- Adicionar match temporal e status derivados
enriched AS (
  SELECT
    b.*,
    -- Gap dias planejado vs real
    CASE
      WHEN data_planejada_plan IS NOT NULL AND `Data Planejada` IS NOT NULL
      THEN DATE_DIFF(`Data Planejada`, data_planejada_plan, DAY)
      ELSE NULL
    END AS gap_dias_plan_real,
    -- Flag Match Critico
    CASE
      WHEN `Flag Nao Planejada` = 1 THEN 1
      WHEN data_planejada_plan IS NOT NULL AND `Data Planejada` IS NOT NULL
           AND ABS(DATE_DIFF(`Data Planejada`, data_planejada_plan, DAY)) > 1 THEN 1
      ELSE 0
    END AS `Flag Match Critico`,
    -- Match Temporal
    CASE
      WHEN `Flag Nao Planejada` = 1 THEN 'Sem Planejado'
      WHEN data_planejada_plan IS NULL THEN 'Sem Planejado'
      WHEN DATE_DIFF(`Data Planejada`, data_planejada_plan, DAY) = 0 THEN 'Mesmo Dia'
      WHEN ABS(DATE_DIFF(`Data Planejada`, data_planejada_plan, DAY)) <= 1 THEN 'D+/-1'
      ELSE 'Fora D+/-1'
    END AS `Match Temporal`,
    -- Ocupação composta (média das não-null)
    (IFNULL(ocup_pedidos_rota, 0) * IF(ocup_pedidos_rota IS NOT NULL, 1, 0)
     + IFNULL(ocup_volumes_rota, 0) * IF(ocup_volumes_rota IS NOT NULL, 1, 0)
     + IFNULL(ocup_peso_rota, 0) * IF(ocup_peso_rota IS NOT NULL, 1, 0)
    ) / NULLIF(
      IF(ocup_pedidos_rota IS NOT NULL, 1, 0)
      + IF(ocup_volumes_rota IS NOT NULL, 1, 0)
      + IF(ocup_peso_rota IS NOT NULL, 1, 0), 0
    ) AS `Ocupacao Composta Rota`,
    -- Status SPR (por rota, usando meta_spr da filial)
    CASE
      WHEN `MetaSPR Filial` IS NULL OR `MetaSPR Filial` = 0 THEN ''
      WHEN `data-aileron-482822-d0.monitoramento_carga.safe_div`(
        CAST(`Volumes da Rota` AS FLOAT64), 1.0) < `MetaSPR Filial` * 0.90 THEN 'Critico'
      WHEN `data-aileron-482822-d0.monitoramento_carga.safe_div`(
        CAST(`Volumes da Rota` AS FLOAT64), 1.0) < `MetaSPR Filial` THEN 'Atencao'
      ELSE 'OK'
    END AS `Status SPR`,
    -- Status Entrega
    CASE
      WHEN `Entrega Efetiva` IS NULL THEN ''
      WHEN `Entrega Efetiva` < 0.90 THEN 'Critico'
      WHEN `Entrega Efetiva` < 0.95 THEN 'Atencao'
      ELSE 'OK'
    END AS `Status Entrega`,
    -- Status Tempo (aderencia = tempo_real / tempo_plan)
    CASE
      WHEN `Tempo Planejado (h)` = 0 OR `Tempo Realizado (h)` = 0 THEN ''
      WHEN `data-aileron-482822-d0.monitoramento_carga.safe_div`(`Tempo Realizado (h)`, `Tempo Planejado (h)`) > 1.10 THEN 'Critico'
      WHEN `data-aileron-482822-d0.monitoramento_carga.safe_div`(`Tempo Realizado (h)`, `Tempo Planejado (h)`) > 1.00 THEN 'Atencao'
      ELSE 'OK'
    END AS `Status Tempo`
  FROM base b
),
-- Status rota e alerta final
final AS (
  SELECT
    e.*,
    -- Status Rota
    CASE
      WHEN `Flag Nao Planejada` = 1 THEN 'Nao planejada'
      WHEN `Flag Sem Tempo` = 1 THEN 'Sem tempo'
      WHEN `Flag Overtime` = 1 THEN 'Overtime'
      WHEN `Flag Entrega Critica` = 1 THEN 'Entrega critica'
      WHEN `Flag Match Critico` = 1 THEN 'Desalinhada'
      ELSE 'OK'
    END AS `Status Rota`,
    -- Status Rota Cor
    `data-aileron-482822-d0.monitoramento_carga.status_color`(
      CASE
        WHEN `Flag Nao Planejada` = 1 THEN 'Critico'
        WHEN `Flag Sem Tempo` = 1 THEN 'Atencao'
        WHEN `Flag Overtime` = 1 THEN 'Atencao'
        WHEN `Flag Entrega Critica` = 1 THEN 'Critico'
        WHEN `Flag Match Critico` = 1 THEN 'Atencao'
        ELSE 'OK'
      END
    ) AS `Status Rota Cor`,
    -- Alerta Operacional
    CASE
      WHEN IFNULL(`Possui Planejado`, 0) = 0 THEN 'Sem planejamento'
      WHEN `Status SPR` = 'Critico' THEN 'SPR abaixo faixa'
      WHEN `Status Entrega` = 'Critico' THEN 'Entrega critica'
      WHEN `Status Tempo` = 'Critico' THEN 'Tempo acima da faixa'
      WHEN `Insucessos Clean` > 0 THEN 'Com insucesso'
      ELSE 'OK'
    END AS `Alerta Operacional`,
    -- Prioridade para alertas
    CASE
      WHEN `Flag Nao Planejada` = 1 OR `Flag Entrega Critica` = 1 THEN 1
      WHEN `Flag Sem Tempo` = 1 OR `Flag Overtime` = 1 OR `Flag Match Critico` = 1 THEN 2
      ELSE 3
    END AS Prioridade
  FROM enriched e
)
SELECT * FROM final
ORDER BY `Data Planejada`, IdCarga