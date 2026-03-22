CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_score`(s STRING) AS (
  CASE s
    WHEN 'OK' THEN 1.0
    WHEN 'Atencao' THEN 0.5
    WHEN 'Critico' THEN 0.0
    WHEN 'Saturado' THEN 0.25
    WHEN 'Informativo' THEN 1.0
    ELSE 0.0
  END
);
