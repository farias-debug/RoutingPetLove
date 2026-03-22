CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.duration_str_to_hours`(val STRING) AS (
  CASE
    WHEN val IS NULL OR TRIM(val) = '' OR TRIM(val) = '0' THEN 0.0
    WHEN REGEXP_CONTAINS(val, r'^\d+:\d+') THEN
      SAFE_CAST(REGEXP_EXTRACT(val, r'^(\d+)') AS FLOAT64)
      + SAFE_CAST(REGEXP_EXTRACT(val, r':(\d+)') AS FLOAT64) / 60.0
      + COALESCE(SAFE_CAST(REGEXP_EXTRACT(val, r':\d+:(\d+)') AS FLOAT64), 0.0) / 3600.0
    ELSE 0.0
  END
);
