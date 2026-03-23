"""
Validacao do pipeline BigQuery v7 — verifica integridade da arquitetura minimalista.

Objetos validados:
  Views: stg_monitoramento, stg_planejamento, dim_filial, metas_globais,
         pub_metas, metas_pivot_canonico, base_execucao_canonica
  UDFs:  normalize_text, safe_div, adherence_ratio, status_higher,
         status_target_band, capacity_status, status_score,
         fn_score_operacional, vehicle_type_canonical,
         vehicle_weight_capacity, motorista_key_canonical

Uso: python validate_pipeline.py
"""

import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
FQN = f"{PROJECT}.{DATASET}"

client = bigquery.Client(project=PROJECT)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _check_pass(val):
    """Default: value > 0."""
    return val > 0


def _check_zero(val):
    """Expect exactly zero violations."""
    return val == 0


def _check_eq(expected):
    """Expect an exact count."""
    return lambda val: val == expected


def _check_gte(threshold):
    """Expect value >= threshold."""
    return lambda val: val >= threshold


def _check_lte(threshold):
    """Expect value <= threshold."""
    return lambda val: val <= threshold


# ---------------------------------------------------------------------------
# Checks — tuples of (name, query, validator, severity)
#   severity: "FAIL" (blocks pipeline) or "WARN" (informational)
# ---------------------------------------------------------------------------

CHECKS = [
    # ------------------------------------------------------------------
    # 1. base_execucao_canonica exists and has > 0 rows
    # ------------------------------------------------------------------
    (
        "base_execucao_canonica rows > 0",
        f"SELECT COUNT(*) AS n FROM `{FQN}.base_execucao_canonica`",
        _check_pass,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 2. Freshness: data_referencia within 3 days of today
    # ------------------------------------------------------------------
    (
        "base_execucao_canonica freshness (max data_referencia <= 3d)",
        f"""SELECT DATE_DIFF(CURRENT_DATE(), MAX(data_referencia), DAY) AS n
            FROM `{FQN}.base_execucao_canonica`""",
        _check_lte(3),
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 3. stg_monitoramento row count matches base_execucao_canonica
    #    (base is built via LEFT JOINs from stg_monitoramento, count must match)
    # ------------------------------------------------------------------
    (
        "stg_monitoramento vs base_execucao_canonica row parity",
        f"""SELECT ABS(
              (SELECT COUNT(*) FROM `{FQN}.stg_monitoramento`) -
              (SELECT COUNT(*) FROM `{FQN}.base_execucao_canonica`)
            ) AS n""",
        _check_zero,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 4. metas_globais has exactly 7 rows
    # ------------------------------------------------------------------
    (
        "metas_globais row count = 7",
        f"SELECT COUNT(*) AS n FROM `{FQN}.metas_globais`",
        _check_eq(7),
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 5. metas_pivot_canonico has exactly 1 row
    # ------------------------------------------------------------------
    (
        "metas_pivot_canonico row count = 1",
        f"SELECT COUNT(*) AS n FROM `{FQN}.metas_pivot_canonico`",
        _check_eq(1),
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 6. Score operacional range [0, 100]
    #    fn_score_operacional returns NULL when any input is NULL;
    #    we only check non-NULL results here.
    # ------------------------------------------------------------------
    (
        "score operacional [0, 100] (sampled via UDF)",
        f"""WITH scored AS (
              SELECT `{FQN}.fn_score_operacional`(
                `{FQN}.status_higher`(42, m.meta_spr_ped),
                `{FQN}.status_higher`(0.98, m.meta_entregas),
                `{FQN}.status_higher`(0.95, m.meta_rotas),
                `{FQN}.status_target_band`(7.0, m.meta_orh, 1.0, 2.0),
                `{FQN}.status_higher`(0.90, m.meta_ader_vol),
                `{FQN}.status_target_band`(0.85, m.meta_ocup, 0.05, 0.10)
              ) AS score
              FROM `{FQN}.metas_pivot_canonico` m
            )
            SELECT COUNTIF(score < 0 OR score > 100) AS n
            FROM scored
            WHERE score IS NOT NULL""",
        _check_zero,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 7. pct_entrega_efetiva range [0, 1]
    # ------------------------------------------------------------------
    (
        "pct_entrega_efetiva [0, 1]",
        f"""SELECT COUNTIF(pct_entrega_efetiva < 0 OR pct_entrega_efetiva > 1) AS n
            FROM `{FQN}.base_execucao_canonica`
            WHERE pct_entrega_efetiva IS NOT NULL""",
        _check_zero,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 8a. KPI sanity — SPR > 0  (volumes per route, global aggregate)
    # ------------------------------------------------------------------
    (
        "KPI sanity: SPR volumes > 0",
        f"""SELECT CAST(
              `{FQN}.safe_div`(SUM(qtd_volumes), CAST(COUNT(*) AS FLOAT64))
            AS FLOAT64) AS n
            FROM `{FQN}.base_execucao_canonica`""",
        _check_pass,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 8b. KPI sanity — ORH > 0  (avg tempo_operacional_h for completed routes)
    # ------------------------------------------------------------------
    (
        "KPI sanity: ORH > 0",
        f"""SELECT AVG(tempo_operacional_h) AS n
            FROM `{FQN}.base_execucao_canonica`
            WHERE flag_rota_concluida = TRUE
              AND tempo_operacional_h > 0""",
        _check_pass,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 8c. KPI sanity — DPPH formula consistency
    #     dpph = safe_div(qtd_entregues, tempo_operacional_h)
    # ------------------------------------------------------------------
    (
        "KPI sanity: DPPH formula check",
        f"""SELECT COUNTIF(
              ABS(dpph - `{FQN}.safe_div`(qtd_entregues, NULLIF(tempo_operacional_h, 0))) > 0.01
            ) AS n
            FROM `{FQN}.base_execucao_canonica`
            WHERE dpph IS NOT NULL""",
        _check_zero,
        "FAIL",
    ),
    # ------------------------------------------------------------------
    # 9. dim_filial completude > 70% for tipo 'Unidade'
    # ------------------------------------------------------------------
    (
        "dim_filial completude >= 70% (tipo Unidade)",
        f"""SELECT
              ROUND(
                COUNTIF(meta_spr IS NOT NULL AND capacidade_volume_dia IS NOT NULL)
                * 100.0 / COUNT(*), 1
              ) AS n
            FROM `{FQN}.dim_filial`
            WHERE tipo = 'Unidade'""",
        _check_gte(70.0),
        "WARN",
    ),
    # ------------------------------------------------------------------
    # 10. Dedup check — no duplicate id_carga in base_execucao_canonica
    # ------------------------------------------------------------------
    (
        "base_execucao_canonica dedup (no duplicate id_carga)",
        f"""SELECT COUNT(*) AS n
            FROM (
              SELECT id_carga
              FROM `{FQN}.base_execucao_canonica`
              GROUP BY id_carga
              HAVING COUNT(*) > 1
            )""",
        _check_zero,
        "FAIL",
    ),
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


def run():
    passed = 0
    failed = 0
    warned = 0
    errors = []

    for name, query, check, severity in CHECKS:
        try:
            result = list(client.query(query).result())
            val = result[0].n
            ok = check(val)

            if ok:
                passed += 1
                print(f"  [PASS] {name} = {val}")
            elif severity == "WARN":
                warned += 1
                errors.append(f"  {name}: got {val} (WARN)")
                print(f"  [WARN] {name} = {val}")
            else:
                failed += 1
                errors.append(f"  {name}: got {val}")
                print(f"  [FAIL] {name} = {val}")

        except Exception as e:
            failed += 1
            errors.append(f"  {name}: ERROR {e}")
            print(f"  [ERROR] {name}: {e}")

    total = len(CHECKS)
    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {warned} warned, {failed} failed out of {total}")

    if errors:
        print("\nIssues:")
        for e in errors:
            print(e)

    if failed > 0:
        sys.exit(1)
    else:
        print("All critical checks passed!")


if __name__ == "__main__":
    run()
