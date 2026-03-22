CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_target_band`(val FLOAT64, target FLOAT64, att_gap FLOAT64, crit_gap FLOAT64) AS (
  CASE
    WHEN val IS NULL THEN 'Sem dados'
    WHEN ABS(val - target) > crit_gap THEN 'Critico'
    WHEN ABS(val - target) > att_gap THEN 'Atencao'
    ELSE 'OK'
  END
);
