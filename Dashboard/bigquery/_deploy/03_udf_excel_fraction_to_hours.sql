CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.excel_fraction_to_hours`(val FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 0.0
    WHEN val > 0 AND val < 1.0 THEN val * 24.0
    ELSE val
  END
);
