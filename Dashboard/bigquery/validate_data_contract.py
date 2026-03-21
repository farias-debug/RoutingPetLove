"""
Validacao de Data Contracts das views v6 API (R10).
Garante que cada view expoe as colunas esperadas, com tipos e ranges corretos.
Uso: python validate_data_contract.py
"""

import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
FQN = f"{PROJECT}.{DATASET}"

client = bigquery.Client(project=PROJECT)

# ---------------------------------------------------------------
# Contratos: view -> (colunas obrigatorias, query de validacao, validator)
# ---------------------------------------------------------------
CONTRACTS = [
    # --- metas_pivot ---
    (
        "metas_pivot: schema 8 colunas",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'metas_pivot'
        ORDER BY ordinal_position
        """,
        lambda rows: {r["column_name"] for r in rows}
        == {
            "meta_spr_ped",
            "meta_spr_vol",
            "meta_orh",
            "meta_entregas",
            "meta_rotas",
            "meta_ocup",
            "meta_ader_vol",
            "meta_dpph",
        },
    ),
    # --- api_filial_performance ---
    (
        "api_filial_performance: colunas obrigatorias",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'api_filial_performance'
        """,
        lambda rows: {
            "filial",
            "score_operacional",
        }.issubset({r["column_name"] for r in rows}),
    ),
    (
        "api_filial_performance: score NOT NULL e range 0-100",
        f"""
        SELECT
          COUNTIF(score_operacional IS NULL) AS n_null,
          COUNTIF(score_operacional < 0 OR score_operacional > 100) AS oor,
          COUNT(*) AS total
        FROM `{FQN}.api_filial_performance`
        """,
        lambda rows: rows[0]["n_null"] == 0
        and rows[0]["oor"] == 0
        and rows[0]["total"] > 0,
    ),
    # --- api_motoristas_jornada ---
    (
        "api_motoristas_jornada: colunas obrigatorias",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'api_motoristas_jornada'
        """,
        lambda rows: {
            "motorista",
            "data",
        }.issubset({r["column_name"] for r in rows}),
    ),
    # --- api_resumo_executivo_semanal ---
    (
        "api_resumo_executivo_semanal: colunas obrigatorias",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'api_resumo_executivo_semanal'
        """,
        lambda rows: {
            "semana_inicio",
            "semana_fim",
            "score_operacional",
        }.issubset({r["column_name"] for r in rows}),
    ),
    (
        "api_resumo_executivo_semanal: score range 0-100",
        f"""
        SELECT
          COUNTIF(score_operacional < 0 OR score_operacional > 100) AS oor,
          COUNT(*) AS total
        FROM `{FQN}.api_resumo_executivo_semanal`
        """,
        lambda rows: rows[0]["oor"] == 0 and rows[0]["total"] > 0,
    ),
    # --- api_transportadores_resumo ---
    (
        "api_transportadores_resumo: colunas obrigatorias",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'api_transportadores_resumo'
        """,
        lambda rows: {
            "transportador",
        }.issubset({r["column_name"] for r in rows}),
    ),
    # --- api_ocupacao_tipo_veiculo ---
    (
        "api_ocupacao_tipo_veiculo: colunas obrigatorias",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'api_ocupacao_tipo_veiculo'
        """,
        lambda rows: {
            "tipo_veiculo",
        }.issubset({r["column_name"] for r in rows}),
    ),
    # --- api_alertas_contagem ---
    (
        "api_alertas_contagem: existe e tem dados",
        f"""
        SELECT COUNT(*) AS total
        FROM `{FQN}.api_alertas_contagem`
        """,
        lambda rows: rows[0]["total"] > 0,
    ),
]


def run_contract(name, query, validator):
    try:
        rows = [dict(r) for r in client.query(query).result()]
        ok = validator(rows)
        return name, "PASS" if ok else "FAIL", f"{len(rows)} rows"
    except Exception as exc:
        return name, "ERROR", str(exc)


def main():
    print("=" * 70)
    print("DATA CONTRACT VALIDATION — views v6 API")
    print("=" * 70)
    total = len(CONTRACTS)
    passed = 0
    failed = 0
    errors = 0

    for name, query, validator in CONTRACTS:
        label, status, detail = run_contract(name, query, validator)
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
