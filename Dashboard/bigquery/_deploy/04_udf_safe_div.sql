CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.safe_div`(num FLOAT64, den FLOAT64) AS (
  IF(den IS NULL OR den = 0, NULL, num / den)
);
