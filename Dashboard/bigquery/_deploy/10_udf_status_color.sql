CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.status_color`(s STRING) AS (
  CASE s
    WHEN 'OK' THEN '12B76A'
    WHEN 'Atencao' THEN 'F79009'
    WHEN 'Critico' THEN 'F04438'
    WHEN 'Informativo' THEN '441A80'
    WHEN 'Sem dados' THEN '6A7282'
    WHEN 'Saturado' THEN 'F04438'
    ELSE '6A7282'
  END
);
