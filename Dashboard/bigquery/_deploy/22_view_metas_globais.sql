CREATE OR REPLACE VIEW `data-aileron-482822-d0.monitoramento_carga.vw_metas_globais` AS
SELECT * FROM UNNEST([
  STRUCT('SPR Ped Realizado'    AS KPI, 42.0  AS Meta, 'Maior=Melhor' AS Sentido, 'ped/rota' AS Unidade),
  STRUCT('SPR Ped Planejado',          52.0,           'Maior=Melhor',            'ped/rota'),
  STRUCT('SPR Vol Realizado',          67.0,           'Maior=Melhor',            'vol/rota'),
  STRUCT('SPR Vol Planejado',          73.0,           'Maior=Melhor',            'vol/rota'),
  STRUCT('Desvio SPR Ped',            -3.0,           'Menor=Melhor',            'pts'),
  STRUCT('Desvio SPR Vol',            -3.0,           'Menor=Melhor',            'pts'),
  STRUCT('ORH Tempo Rota',             7.0,           'Alvo=Melhor',             'horas'),
  STRUCT('% Entregas Efetivas',        0.98,          'Maior=Melhor',            '%'),
  STRUCT('% Rotas Concluidas',         0.95,          'Maior=Melhor',            '%'),
  STRUCT('Ocupacao Composta',          0.85,          'Maior=Melhor',            '%'),
  STRUCT('Aderencia Volumes',          0.90,          'Maior=Melhor',            '%')
]);
