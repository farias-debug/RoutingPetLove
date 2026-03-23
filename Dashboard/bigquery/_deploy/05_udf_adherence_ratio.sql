CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.adherence_ratio`(real_val FLOAT64, plan_val FLOAT64) AS (
  LEAST(1.0, `data-aileron-482822-d0.monitoramento_carga.safe_div`(real_val, plan_val))
);
