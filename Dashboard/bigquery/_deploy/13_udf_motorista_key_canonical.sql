-- ==============================================================================
-- UDF: motorista_key_canonical
-- Descrição: Canoniza chave de motorista usando CPF quando disponível,
--            fallback para nome normalizado
-- Versão: 1.0
-- Data: 2026-03-22
-- ==============================================================================

CREATE OR REPLACE FUNCTION `data-aileron-482822-d0.monitoramento_carga.motorista_key_canonical`(
  cpf STRING,
  nome STRING
) AS (
  COALESCE(
    NULLIF(TRIM(cpf), ''),
    `data-aileron-482822-d0.monitoramento_carga.normalize_text`(nome)
  )
);

-- ==============================================================================
-- Uso:
--   SELECT motorista_key_canonical(cpf_motorista, motorista) AS motorista_key
--   FROM base_execucao_canonica
--
-- Regra:
--   1. Se cpf_motorista válido (não NULL, não vazio) → usa CPF
--   2. Caso contrário → usa normalize_text(motorista)
--
-- Localização canônica:
--   base_execucao_canonica.motorista_key_canonico
--   Todos marts por motorista devem usar esta coluna
-- ==============================================================================
