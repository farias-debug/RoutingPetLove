"""
Teste de paridade de Score Operacional (R11).
Compara o score calculado por fn_score_operacional em diferentes camadas
(marts v4, views v6, server.js) para garantir que todos convergem.
Uso: python score_parity_test.py
"""

import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
FQN = f"{PROJECT}.{DATASET}"

client = bigquery.Client(project=PROJECT)

TOLERANCE = 0.5  # tolerancia maxima de divergencia no score (pontos)

PARITY_CHECKS = [
    # ---------------------------------------------------------------
    # 1. Score mart_kpi_diario vs recalculo direto via fn_score_operacional
    # ---------------------------------------------------------------
    (
        "mart_kpi_diario: score vs recalculo",
        f"""
        WITH src AS (
          SELECT data, score_operacional,
            ROUND(`{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(spr_vol, meta_spr_vol),
              `{FQN}.status_higher`(pct_entregas, meta_entregas),
              `{FQN}.status_higher`(pct_rotas_concl, meta_rotas),
              `{FQN}.status_target_band`(orh, meta_orh, 1.0, 2.1),
              `{FQN}.status_higher`(ader_vol, meta_ader_vol),
              `{FQN}.capacity_status`(ocup_composta)
            ), 1) AS score_recalc
          FROM `{FQN}.mart_kpi_diario`
          WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        )
        SELECT
          COUNT(*) AS total_rows,
          COUNTIF(ABS(score_operacional - score_recalc) > {TOLERANCE}) AS divergent,
          MAX(ABS(score_operacional - score_recalc)) AS max_delta
        FROM src
        """,
        lambda row: row["divergent"] == 0,
    ),
    # ---------------------------------------------------------------
    # 2. Score mart_kpi_filial_dia vs recalculo
    # ---------------------------------------------------------------
    (
        "mart_kpi_filial_dia: score vs recalculo",
        f"""
        WITH src AS (
          SELECT data, filial, score_operacional,
            ROUND(`{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(spr_vol, meta_spr_vol),
              `{FQN}.status_higher`(pct_entregas, meta_entregas),
              `{FQN}.status_higher`(pct_rotas_concl, meta_rotas),
              `{FQN}.status_target_band`(orh, meta_orh, 1.0, 2.1),
              `{FQN}.status_higher`(ader_vol, meta_ader_vol),
              `{FQN}.capacity_status`(ocup_composta)
            ), 1) AS score_recalc
          FROM `{FQN}.mart_kpi_filial_dia`
          WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        )
        SELECT
          COUNT(*) AS total_rows,
          COUNTIF(ABS(score_operacional - score_recalc) > {TOLERANCE}) AS divergent,
          MAX(ABS(score_operacional - score_recalc)) AS max_delta
        FROM src
        """,
        lambda row: row["divergent"] == 0,
    ),
    # ---------------------------------------------------------------
    # 3. Score mart_kpi_transportador_dia vs recalculo
    # ---------------------------------------------------------------
    (
        "mart_kpi_transportador_dia: score vs recalculo",
        f"""
        WITH src AS (
          SELECT data, transportador, score_operacional,
            ROUND(`{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(spr_vol, meta_spr_vol),
              `{FQN}.status_higher`(pct_entregas, meta_entregas),
              `{FQN}.status_higher`(pct_rotas_concl, meta_rotas),
              `{FQN}.status_target_band`(orh, meta_orh, 1.0, 2.1),
              `{FQN}.status_higher`(ader_vol, meta_ader_vol),
              `{FQN}.capacity_status`(ocup_composta)
            ), 1) AS score_recalc
          FROM `{FQN}.mart_kpi_transportador_dia`
          WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        )
        SELECT
          COUNT(*) AS total_rows,
          COUNTIF(ABS(score_operacional - score_recalc) > {TOLERANCE}) AS divergent,
          MAX(ABS(score_operacional - score_recalc)) AS max_delta
        FROM src
        """,
        lambda row: row["divergent"] == 0,
    ),
    # ---------------------------------------------------------------
    # 4. Score mart_kpi_motorista_dia vs recalculo
    # ---------------------------------------------------------------
    (
        "mart_kpi_motorista_dia: score vs recalculo",
        f"""
        WITH src AS (
          SELECT data, motorista, score_operacional,
            ROUND(`{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(spr_vol, meta_spr_vol),
              `{FQN}.status_higher`(pct_entregas, meta_entregas),
              `{FQN}.status_higher`(pct_rotas_concl, meta_rotas),
              `{FQN}.status_target_band`(orh, meta_orh, 1.0, 2.1),
              `{FQN}.status_higher`(ader_vol, meta_ader_vol),
              `{FQN}.capacity_status`(ocup_composta)
            ), 1) AS score_recalc
          FROM `{FQN}.mart_kpi_motorista_dia`
          WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        )
        SELECT
          COUNT(*) AS total_rows,
          COUNTIF(ABS(score_operacional - score_recalc) > {TOLERANCE}) AS divergent,
          MAX(ABS(score_operacional - score_recalc)) AS max_delta
        FROM src
        """,
        lambda row: row["divergent"] == 0,
    ),
    # ---------------------------------------------------------------
    # 5. Score range: todos os scores devem estar entre 0 e 100
    # ---------------------------------------------------------------
    (
        "score range 0-100 em todos os marts",
        f"""
        SELECT
          COUNTIF(score_operacional < 0 OR score_operacional > 100) AS out_of_range
        FROM (
          SELECT score_operacional FROM `{FQN}.mart_kpi_diario`
          UNION ALL
          SELECT score_operacional FROM `{FQN}.mart_kpi_filial_dia`
          UNION ALL
          SELECT score_operacional FROM `{FQN}.mart_kpi_transportador_dia`
          UNION ALL
          SELECT score_operacional FROM `{FQN}.mart_kpi_motorista_dia`
        )
        """,
        lambda row: row["out_of_range"] == 0,
    ),
    # ---------------------------------------------------------------
    # 6. metas_pivot: view retorna exatamente 1 linha com 8 colunas nao-null
    # ---------------------------------------------------------------
    (
        "metas_pivot: 1 linha, 8 colunas nao-null",
        f"""
        SELECT
          COUNT(*) AS n_rows,
          COUNTIF(meta_spr_ped IS NULL) AS null_spr_ped,
          COUNTIF(meta_spr_vol IS NULL) AS null_spr_vol,
          COUNTIF(meta_orh IS NULL) AS null_orh,
          COUNTIF(meta_entregas IS NULL) AS null_entregas,
          COUNTIF(meta_rotas IS NULL) AS null_rotas,
          COUNTIF(meta_ocup IS NULL) AS null_ocup,
          COUNTIF(meta_ader_vol IS NULL) AS null_ader_vol,
          COUNTIF(meta_dpph IS NULL) AS null_dpph
        FROM `{FQN}.metas_pivot`
        """,
        lambda row: (
            row["n_rows"] == 1
            and row["null_spr_ped"] == 0
            and row["null_spr_vol"] == 0
            and row["null_orh"] == 0
            and row["null_entregas"] == 0
            and row["null_rotas"] == 0
            and row["null_ocup"] == 0
            and row["null_ader_vol"] == 0
            and row["null_dpph"] == 0
        ),
    ),
    # ---------------------------------------------------------------
    # 7. api_filial_performance v6: score deve usar 6 KPIs (range-check)
    # ---------------------------------------------------------------
    (
        "api_filial_performance: score range 0-100",
        f"""
        SELECT
          COUNT(*) AS total,
          COUNTIF(score_operacional < 0 OR score_operacional > 100) AS out_of_range,
          COUNTIF(score_operacional IS NULL) AS null_scores
        FROM `{FQN}.api_filial_performance`
        """,
        lambda row: row["out_of_range"] == 0 and row["total"] > 0,
    ),
]


def run_check(name, query, validator):
    try:
        rows = list(client.query(query).result())
        if not rows:
            return name, "FAIL", "Query retornou 0 linhas"
        row = dict(rows[0])
        ok = validator(row)
        detail = " | ".join(f"{k}={v}" for k, v in row.items())
        return name, "PASS" if ok else "FAIL", detail
    except Exception as exc:
        return name, "ERROR", str(exc)


def main():
    print("=" * 70)
    print("SCORE PARITY TEST — fn_score_operacional unificado")
    print("=" * 70)
    total = len(PARITY_CHECKS)
    passed = 0
    failed = 0
    errors = 0

    for name, query, validator in PARITY_CHECKS:
        label, status, detail = run_check(name, query, validator)
        icon = {"PASS": "OK", "FAIL": "FAIL", "ERROR": "ERR"}.get(status, "??")
        print(f"  [{icon:4s}] {label}")
        if status != "PASS":
            print(f"         -> {detail}")
        if status == "PASS":
            passed += 1
        elif status == "FAIL":
            failed += 1
        else:
            errors += 1

    print("-" * 70)
    print(f"Total: {total} | PASS: {passed} | FAIL: {failed} | ERROR: {errors}")
    print("=" * 70)
    sys.exit(0 if failed == 0 and errors == 0 else 1)


if __name__ == "__main__":
    main()
