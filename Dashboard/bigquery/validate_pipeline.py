"""
Validação do pipeline BigQuery — verifica integridade entre camadas.
Executa queries de contagem e range-check para cada camada.
Uso: python validate_pipeline.py
"""

import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
FQN = f"{PROJECT}.{DATASET}"

client = bigquery.Client(project=PROJECT)

CHECKS = [
    # (nome, query, validação esperada)
    (
        "fct_execucao rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.fct_execucao`",
        lambda r: r > 0,
    ),
    (
        "mart_kpi_diario rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.mart_kpi_diario`",
        lambda r: r > 0,
    ),
    (
        "mart_kpi_filial_dia rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.mart_kpi_filial_dia`",
        lambda r: r > 0,
    ),
    (
        "mart_kpi_transportador_dia rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.mart_kpi_transportador_dia`",
        lambda r: r > 0,
    ),
    (
        "kpi_resumo_diario rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.kpi_resumo_diario`",
        lambda r: r > 0,
    ),
    (
        "kpi_filial_dia rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.kpi_filial_dia`",
        lambda r: r > 0,
    ),
    (
        "kpi_transportador_dia rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.kpi_transportador_dia`",
        lambda r: r > 0,
    ),
    # Freshness: data mais recente <= 3 dias atrás
    (
        "fct_execucao freshness",
        f"SELECT DATE_DIFF(CURRENT_DATE(), MAX(data_planejada), DAY) AS n FROM `{FQN}.fct_execucao`",
        lambda r: r <= 3,
    ),
    # KPI ranges
    (
        "pct_entregas [0,1]",
        f"SELECT COUNTIF(pct_entregas < 0 OR pct_entregas > 1) AS n FROM `{FQN}.mart_kpi_diario`",
        lambda r: r == 0,
    ),
    (
        "score [0,100]",
        f"SELECT COUNTIF(score_operacional < 0 OR score_operacional > 100) AS n FROM `{FQN}.mart_kpi_diario`",
        lambda r: r == 0,
    ),
    (
        "spr_ped > 0",
        f"SELECT COUNTIF(spr_ped <= 0) AS n FROM `{FQN}.mart_kpi_diario`",
        lambda r: r == 0,
    ),
    (
        "orh > 0",
        f"SELECT COUNTIF(orh <= 0) AS n FROM `{FQN}.mart_kpi_diario`",
        lambda r: r == 0,
    ),
    # DPPH uses entregas (not pedidos) — sanity: dpph should be close to entregas/tempo
    (
        "dpph formula sanity",
        f"""SELECT COUNTIF(ABS(dpph - SAFE_DIVIDE(qtd_entregas, NULLIF(tempo_oper_total,0))) > 0.01) AS n
         FROM `{FQN}.mart_kpi_diario`
         WHERE dpph IS NOT NULL""",
        lambda r: r == 0,
    ),
    # v5 kpi_resumo_diario == mart_kpi_diario row count
    (
        "v5 vs mart row parity",
        f"""SELECT ABS(
           (SELECT COUNT(*) FROM `{FQN}.kpi_resumo_diario`) -
           (SELECT COUNT(*) FROM `{FQN}.mart_kpi_diario`)
         ) AS n""",
        lambda r: r == 0,
    ),
    # API views accessible
    (
        "api_motoristas_jornada rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.api_motoristas_jornada`",
        lambda r: r > 0,
    ),
    (
        "api_resumo_executivo_semanal rows",
        f"SELECT COUNT(*) AS n FROM `{FQN}.api_resumo_executivo_semanal`",
        lambda r: r > 0,
    ),
]


def run():
    passed = 0
    failed = 0
    errors = []

    for name, query, check in CHECKS:
        try:
            result = list(client.query(query).result())
            val = result[0].n
            ok = check(val)
            status = "PASS" if ok else "FAIL"
            if not ok:
                failed += 1
                errors.append(f"  {name}: got {val}")
            else:
                passed += 1
            print(f"  [{status}] {name} = {val}")
        except Exception as e:
            failed += 1
            errors.append(f"  {name}: ERROR {e}")
            print(f"  [ERROR] {name}: {e}")

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(CHECKS)}")
    if errors:
        print("\nFailures:")
        for e in errors:
            print(e)
        sys.exit(1)
    else:
        print("All checks passed!")


if __name__ == "__main__":
    run()
