CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.capacity_status`(val FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 'Sem dados'
    WHEN val > 1.05 THEN 'Saturado'
    WHEN val < 0.70 THEN 'Critico'
    WHEN val < 0.85 THEN 'Atencao'
    ELSE 'OK'
  END
);
