"""
Teste de paridade de Score Operacional (R11).
Valida que fn_score_operacional produz resultados consistentes
sobre base_execucao_canonica e metas_pivot_canonico (arquitetura v7).
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
    # 1. Score sobre base_execucao_canonica: range [0, 100]
    # ---------------------------------------------------------------
    (
        "base_execucao_canonica: score range 0-100",
        f"""
        WITH scored AS (
          SELECT
            `{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(
                `{FQN}.safe_div`(b.qtd_volumes, CAST(1 AS FLOAT64)), m.meta_spr_vol),
              `{FQN}.status_higher`(b.pct_entrega_efetiva, m.meta_entregas),
              IF(b.flag_rota_concluida, 'OK', 'Critico'),
              `{FQN}.status_target_band`(b.tempo_operacional_h, m.meta_orh, 1.0, 2.1),
              IF(b.ocup_peso_veiculo IS NOT NULL,
                 `{FQN}.status_higher`(b.ocup_peso_veiculo, m.meta_ocup),
                 'Informativo'),
              `{FQN}.capacity_status`(b.ocup_peso_veiculo)
            ) AS score
          FROM `{FQN}.base_execucao_canonica` b
          CROSS JOIN `{FQN}.metas_pivot_canonico` m
          WHERE b.data_referencia >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        )
        SELECT
          COUNT(*) AS total_rows,
          COUNTIF(score < 0 OR score > 100) AS divergent,
          MAX(score) AS max_score,
          MIN(score) AS min_score
        FROM scored
        WHERE score IS NOT NULL
        """,
        lambda row: row["divergent"] == 0 and row["total_rows"] > 0,
    ),
    # ---------------------------------------------------------------
    # 2. Score determinístico: mesma entrada → mesmo resultado
    # ---------------------------------------------------------------
    (
        "fn_score_operacional: determinismo (valores fixos)",
        f"""
        SELECT
          `{FQN}.fn_score_operacional`(
            `{FQN}.status_higher`(42, m.meta_spr_ped),
            `{FQN}.status_higher`(0.98, m.meta_entregas),
            `{FQN}.status_higher`(0.95, m.meta_rotas),
            `{FQN}.status_target_band`(7.0, m.meta_orh, 1.0, 2.0),
            `{FQN}.status_higher`(0.90, m.meta_ader_vol),
            `{FQN}.status_target_band`(0.85, m.meta_ocup, 0.05, 0.10)
          ) AS score_a,
          `{FQN}.fn_score_operacional`(
            `{FQN}.status_higher`(42, m.meta_spr_ped),
            `{FQN}.status_higher`(0.98, m.meta_entregas),
            `{FQN}.status_higher`(0.95, m.meta_rotas),
            `{FQN}.status_target_band`(7.0, m.meta_orh, 1.0, 2.0),
            `{FQN}.status_higher`(0.90, m.meta_ader_vol),
            `{FQN}.status_target_band`(0.85, m.meta_ocup, 0.05, 0.10)
          ) AS score_b
        FROM `{FQN}.metas_pivot_canonico` m
        """,
        lambda row: row["score_a"] == row["score_b"] and row["score_a"] is not None,
    ),
    # ---------------------------------------------------------------
    # 3. metas_pivot_canonico: 1 linha, 8 colunas nao-null
    # ---------------------------------------------------------------
    (
        "metas_pivot_canonico: 1 linha, 8 colunas nao-null",
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
        FROM `{FQN}.metas_pivot_canonico`
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
    # 4. pct_entrega_efetiva coerente com qtd_entregues/qtd_pedidos
    # ---------------------------------------------------------------
    (
        "pct_entrega_efetiva vs safe_div(qtd_entregues, qtd_pedidos)",
        f"""
        SELECT COUNTIF(
          ABS(pct_entrega_efetiva - `{FQN}.safe_div`(qtd_entregues, NULLIF(qtd_pedidos, 0))) > 0.01
        ) AS divergent,
        COUNT(*) AS total_rows
        FROM `{FQN}.base_execucao_canonica`
        WHERE pct_entrega_efetiva IS NOT NULL
          AND qtd_pedidos > 0
        """,
        lambda row: row["divergent"] == 0 and row["total_rows"] > 0,
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
    print("SCORE PARITY TEST — fn_score_operacional sobre base_execucao_canonica")
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
