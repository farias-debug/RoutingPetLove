CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(real_val FLOAT64, plan_val FLOAT64) AS (
  IF(plan_val IS NULL OR plan_val = 0, NULL,
     GREATEST(0.0, 1.0 - ABS(IFNULL(real_val, 0) - plan_val) / plan_val))
);
