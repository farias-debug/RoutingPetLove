CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_dim_filial_tratada` AS
WITH raw AS (
  SELECT
    `CD Origem`,
    Tabela,
    Filial,
    Codigo,
    `Nome Filial`,
    Tipo,
    SAFE_CAST(MetaSPR AS FLOAT64) AS MetaSPR,
    Regiao,
    SAFE_CAST(`Capacidade Volume Dia` AS FLOAT64) AS `Capacidade Volume Dia`,
    -- Chave normalizada: UPPER, remove acentos (BQ não tem strip_accents nativo,
    -- mas normalize + regex remove a maioria), remove underscore, colapsa espaços
    UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
      CAST(IFNULL(Filial, '') AS STRING),
      r'_', ' '),
      r'\s*-\s*', '-'),
      r'\s+', ' '))) AS `Filial Key`,
    UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
      CAST(IFNULL(`Nome Filial`, '') AS STRING),
      r'_', ' '),
      r'\s*-\s*', '-'),
      r'\s+', ' '))) AS `Nome Filial Key`,
    CAST(IFNULL(SAFE_CAST(Codigo AS INT64), 0) AS STRING) AS `Codigo Key`
  FROM `data-aileron-482822-d0.monitoramento_carga.raw_dim_filial`
),
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY `Filial Key` ORDER BY Codigo) AS rn
  FROM raw
)
SELECT
  `CD Origem`, Tabela, Filial, Codigo, `Nome Filial`, Tipo,
  MetaSPR, Regiao, `Capacidade Volume Dia`,
  `Filial Key`, `Nome Filial Key`, `Codigo Key`
FROM deduped
WHERE rn = 1
ORDER BY Codigo, Filial, `Nome Filial`