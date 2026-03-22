CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.normalize_text`(val STRING) AS (
  UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
    IFNULL(val, ''), r'_', ' '), r'\s*-\s*', '-'), r'\s+',' ')))
);
