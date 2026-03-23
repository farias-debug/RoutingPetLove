CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.vehicle_weight_capacity`(vtype STRING) AS (
  -- Recebe o nome canonico (saida de vehicle_type_canonical).
  -- Apenas os tipos com capacidade de peso definida.
  -- Outros tipos retornam NULL e ficam excluídos do cálculo de ocupação peso.
  CASE vtype
    WHEN 'Van'        THEN 900.0
    WHEN 'Utilitario' THEN 550.0
    WHEN 'Passeio'    THEN 350.0
    ELSE NULL
  END
);
