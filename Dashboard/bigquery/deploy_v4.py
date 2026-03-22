"""
Deploy pipeline_v4.sql no BigQuery via API Python.
Separa cada statement (CREATE OR REPLACE) e executa sequencialmente.
Remove objetos órfãos da v3 renomeados na v4.
"""

import re
import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
SQL_FILE = __file__.replace("deploy_v4.py", "pipeline_v4.sql")

# Views v3 renomeadas/eliminadas na v4 — limpar após deploy
ORPHAN_VIEWS_V3 = [
    "mart_resumo_diario_filial",
    "mart_matriz_semanal",
    "mart_ocupacao_veiculo",
    "mart_resumo_filial",
    "mart_drill_rotas",
    "mart_alertas",
    "mart_kpi_cards",
    "mart_tendencias",
]


def split_statements(sql: str) -> list[tuple[str, str]]:
    """Separa SQL em statements individuais. Retorna [(nome, sql), ...]."""
    parts = re.split(r"(?=CREATE\s+OR\s+REPLACE)", sql, flags=re.IGNORECASE)
    results = []
    for part in parts:
        part = part.strip().rstrip(";").strip()
        if not part or not re.match(r"CREATE\s+OR\s+REPLACE", part, re.IGNORECASE):
            continue
        m = re.search(r"`[^`]+\.([^`]+)`", part)
        name = m.group(1) if m else "unknown"
        if re.search(r"CREATE\s+OR\s+REPLACE\s+FUNCTION", part, re.IGNORECASE):
            obj_type = "UDF"
        elif re.search(r"CREATE\s+OR\s+REPLACE\s+VIEW", part, re.IGNORECASE):
            obj_type = "VIEW"
        else:
            obj_type = "SQL"
        results.append((f"{obj_type}: {name}", part))
    return results


def drop_orphan_views(client: bigquery.Client):
    """Remove views v3 que foram renomeadas na v4."""
    print(f"\n--- Limpeza: removendo {len(ORPHAN_VIEWS_V3)} views órfãs v3 ---")
    for view in ORPHAN_VIEWS_V3:
        fqn = f"`{PROJECT}.{DATASET}.{view}`"
        stmt = f"DROP VIEW IF EXISTS {fqn}"
        try:
            client.query(stmt).result()
            print(f"  DROP {view} ... OK")
        except Exception as e:
            print(f"  DROP {view} ... SKIP ({e})")


def main():
    client = bigquery.Client(project=PROJECT)

    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql = f.read()

    statements = split_statements(sql)
    print(f"Pipeline v4: {len(statements)} statements para executar\n")

    ok = 0
    fail = 0
    errors = []

    for label, stmt in statements:
        print(f"  >> {label}", end=" ... ", flush=True)
        try:
            job = client.query(stmt)
            job.result()
            print("OK")
            ok += 1
        except Exception as e:
            msg = str(e).split("\n")[0][:200]
            print(f"FAIL\n     {msg}")
            errors.append((label, msg))
            fail += 1

    print(f"\n{'='*60}")
    print(f"Resultado: {ok} OK, {fail} FAIL de {len(statements)} total")

    if errors:
        print(f"\nErros ({len(errors)}):")
        for name, err in errors:
            print(f"  {name}: {err}")
        print("\n⚠ Limpeza NÃO executada (há erros). Corrija e re-execute.")
        sys.exit(1)

    print("\nPipeline v4 deployado com sucesso!")

    # Só limpa v3 se todos os v4 statements passaram
    drop_orphan_views(client)

    # Validação rápida
    print("\n--- Validação rápida ---")
    validation_sql = f"""
    SELECT
      routine_type AS tipo,
      COUNT(*) AS qtd
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.ROUTINES`
    GROUP BY 1
    UNION ALL
    SELECT 'VIEW', COUNT(*)
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.VIEWS`
    """
    try:
        rows = list(client.query(validation_sql).result())
        for r in rows:
            print(f"  {r.tipo}: {r.qtd}")
    except Exception as e:
        print(f"  Validação falhou: {e}")


if __name__ == "__main__":
    main()
