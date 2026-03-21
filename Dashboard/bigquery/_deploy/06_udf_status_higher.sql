CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_higher`(val FLOAT64, meta FLOAT64) AS (
  CASE
    WHEN val IS NULL OR meta IS NULL OR meta <= 0 THEN 'Sem dados'
    WHEN val < meta * 0.90 THEN 'Critico'
    WHEN val < meta THEN 'Atencao'
    ELSE 'OK'
  END
);
