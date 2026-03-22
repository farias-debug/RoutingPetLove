"""
Deploy das API views (v6) para consumo do frontend React.
Convive com v4 (analítica) e v5 (publicação Sheets).

Uso:
  python deploy_v6_api.py
"""

import re
import sys
import time
from pathlib import Path

from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
SQL_FILE = Path(__file__).parent / "pipeline_v6_api.sql"

EXPECTED_VIEWS = [
    "api_motoristas_jornada",
    "api_resumo_executivo_semanal",
    "api_filial_performance",
    "api_transportadores_resumo",
    "api_ocupacao_tipo_veiculo",
    "api_alertas_contagem",
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

    print(f"=== Deploy v6 API Views ===")
    print(f"Arquivo: {SQL_FILE.name}")
    print(f"Statements encontrados: {len(statements)}")
    print()

    ok, fail = 0, 0
    for i, stmt in enumerate(statements, 1):
        # Extrair nome da view
        match = re.search(r"VIEW\s+`[^`]+\.([^`]+)`", stmt, re.IGNORECASE)
        name = match.group(1) if match else f"statement_{i}"

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
        print("\nValidando views criadas...")
        query = f"""
        SELECT table_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.VIEWS`
        WHERE table_name LIKE 'api_%'
        ORDER BY table_name
        """
        rows = list(client.query(query).result())
        created = [r.table_name for r in rows]
        print(f"  Views api_* no dataset: {len(created)}")
        for v in created:
            status = "✓" if v in EXPECTED_VIEWS else "?"
            print(f"    {status} {v}")

        missing = set(EXPECTED_VIEWS) - set(created)
        if missing:
            print(f"\n  ATENÇÃO: Views esperadas não encontradas: {missing}")
        else:
            print("\n  Todas as views esperadas estão presentes.")

    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
