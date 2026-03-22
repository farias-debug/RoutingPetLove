"""
Deploy do pipeline Dashboard v7 - auto-suficiente e alinhado com API.

Cria:
- 11 UDFs (normalize_text, safe_div, adherence_ratio, status_higher,
  status_target_band, capacity_status, status_score, fn_score_operacional,
  vehicle_type_canonical, vehicle_weight_capacity, motorista_key_canonical)
- 5 views core (stg_monitoramento, stg_planejamento, dim_filial, metas_globais,
  base_execucao_canonica)
- 2 views derivadas (pub_metas, metas_pivot_canonico)

Uso:
  python deploy_v7_dashboard.py
"""

import re
import sys
import time
from pathlib import Path

from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
SQL_FILE = Path(__file__).parent / "pipeline_dashboard_v7.sql"

EXPECTED_OBJECTS = [
    # UDFs
    "normalize_text",
    "safe_div",
    "adherence_ratio",
    "status_higher",
    "status_target_band",
    "capacity_status",
    "status_score",
    "fn_score_operacional",
    "vehicle_type_canonical",
    "vehicle_weight_capacity",
    "motorista_key_canonical",
    # Views core
    "stg_monitoramento",
    "stg_planejamento",
    "dim_filial",
    "metas_globais",
    "base_execucao_canonica",
    # Views derivadas
    "pub_metas",
    "metas_pivot_canonico",
]


def parse_statements(sql_text: str) -> list[str]:
    """Split SQL em statements individuais por CREATE OR REPLACE."""
    parts = re.split(r"(?=CREATE\s+OR\s+REPLACE)", sql_text, flags=re.IGNORECASE)
    return [
        p.strip().rstrip(";")
        for p in parts
        if p.strip() and re.match(r"^CREATE\s+OR\s+REPLACE", p.strip(), re.IGNORECASE)
    ]


def main():
    client = bigquery.Client(project=PROJECT)
    sql = SQL_FILE.read_text(encoding="utf-8")
    statements = parse_statements(sql)

    print(f"=== Deploy Pipeline Dashboard v7 ===")
    print(f"Arquivo: {SQL_FILE.name}")
    print(f"Statements encontrados: {len(statements)}")
    print()

    ok, fail = 0, 0
    for i, stmt in enumerate(statements, 1):
        # Extrair nome do objeto (UDF ou VIEW)
        match_view = re.search(r"VIEW\s+`[^`]+\.([^`]+)`", stmt, re.IGNORECASE)
        match_func = re.search(r"FUNCTION\s+`[^`]+\.([^`]+)`", stmt, re.IGNORECASE)
        name = (match_view or match_func).group(1) if (match_view or match_func) else f"statement_{i}"

        print(f"[{i}/{len(statements)}] {name}...", end=" ", flush=True)
        t0 = time.time()
        try:
            job = client.query(stmt)
            job.result()
            elapsed = time.time() - t0
            print(f"OK ({elapsed:.1f}s)")
            ok += 1
        except Exception as e:
            elapsed = time.time() - t0
            print(f"FAIL ({elapsed:.1f}s)")
            print(f"  Erro: {e}")
            fail += 1

    print(f"\nResultado: {ok} OK, {fail} FAIL")

    # Validação
    if fail == 0:
        print("\nValidando objetos criados...")

        # Verificar VIEWS
        query_views = f"""
        SELECT table_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.VIEWS`
        WHERE table_name IN UNNEST(@expected_views)
        ORDER BY table_name
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ArrayQueryParameter("expected_views", "STRING", [
                    "stg_monitoramento", "stg_planejamento", "dim_filial",
                    "metas_globais", "base_execucao_canonica", "pub_metas",
                    "metas_pivot_canonico"
                ])
            ]
        )
        rows_views = list(client.query(query_views, job_config=job_config).result())
        created_views = [r.table_name for r in rows_views]

        # Verificar UDFs
        query_funcs = f"""
        SELECT routine_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.ROUTINES`
        WHERE routine_type = 'FUNCTION'
        ORDER BY routine_name
        """
        rows_funcs = list(client.query(query_funcs).result())
        created_funcs = [r.routine_name for r in rows_funcs]

        created_all = created_views + created_funcs

        print(f"  Objetos criados: {len(created_all)}")
        for obj in sorted(created_all):
            status = "✓" if obj in EXPECTED_OBJECTS else "?"
            obj_type = "UDF" if obj in created_funcs else "VIEW"
            print(f"    {status} [{obj_type}] {obj}")

        missing = set(EXPECTED_OBJECTS) - set(created_all)
        if missing:
            print(f"\n  ATENÇÃO: Objetos esperados não encontrados: {missing}")
        else:
            print("\n  ✅ Todos os objetos esperados estão presentes!")

        # Teste rápido de query
        print("\nTestando query básica...")
        test_query = f"""
        SELECT COUNT(*) AS rows
        FROM `{PROJECT}.{DATASET}.base_execucao_canonica`
        """
        try:
            result = list(client.query(test_query).result())[0]
            print(f"  ✓ base_execucao_canonica: {result.rows} linhas")
        except Exception as e:
            print(f"  ✗ Erro ao query base_execucao_canonica: {e}")

        test_metas = f"""
        SELECT COUNT(*) AS rows
        FROM `{PROJECT}.{DATASET}.pub_metas`
        """
        try:
            result = list(client.query(test_metas).result())[0]
            print(f"  ✓ pub_metas: {result.rows} linhas (esperado: 7)")
        except Exception as e:
            print(f"  ✗ Erro ao query pub_metas: {e}")

        test_pivot = f"""
        SELECT meta_spr_vol, meta_entregas, meta_orh
        FROM `{PROJECT}.{DATASET}.metas_pivot_canonico`
        """
        try:
            result = list(client.query(test_pivot).result())[0]
            print(f"  ✓ metas_pivot_canonico: meta_spr_vol={result.meta_spr_vol}, meta_entregas={result.meta_entregas}, meta_orh={result.meta_orh}")
        except Exception as e:
            print(f"  ✗ Erro ao query metas_pivot_canonico: {e}")

    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
