"""
Deploy pipeline_v5_publicacao.sql no BigQuery via API Python.
Cria 13 views da camada de publicação (output final para Google Sheets).
A camada analítica v4 permanece intacta.
"""

import re
import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
SQL_FILE = __file__.replace("deploy_v5_publicacao.py", "pipeline_v5_publicacao.sql")

EXPECTED_VIEWS = 13


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
        results.append((f"VIEW: {name}", part))
    return results


def main():
    client = bigquery.Client(project=PROJECT)

    with open(SQL_FILE, "r", encoding="utf-8") as f:
        sql = f.read()

    statements = split_statements(sql)
    print(f"Pipeline v5 publicação: {len(statements)} views para criar\n")

    if len(statements) != EXPECTED_VIEWS:
        print(f"⚠ Esperado {EXPECTED_VIEWS}, encontrado {len(statements)} statements")

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
        sys.exit(1)

    print("\nCamada de publicação v5 deployada com sucesso!")

    # Validação: count columns per view
    print("\n--- Validação de colunas ---")
    validation_sql = f"""
    SELECT table_name, COUNT(*) AS cols
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
    WHERE table_name IN (
      'metas_globais', 'dim_filial_tratada', 'kpi_card_latest',
      'kpi_resumo_diario', 'kpi_filial_dia', 'kpi_transportador_dia',
      'alertas_rotas', 'drill_rotas', 'Resumo_Filial',
      'Resumo_Ocupacao_Veic_Transp', 'VW_Base_Execucao',
      'Resumo_Semana_Filial_Diario', 'Resumo_Semana_Filial_Matriz'
    )
    GROUP BY 1
    ORDER BY 1
    """
    try:
        rows = list(client.query(validation_sql).result())
        total_views = len(rows)
        print(f"  Views publicação encontradas: {total_views}/{EXPECTED_VIEWS}")
        for r in rows:
            print(f"  {r.table_name:40s} {r.cols:3d} colunas")
        if total_views < EXPECTED_VIEWS:
            print(f"\n⚠ Faltam {EXPECTED_VIEWS - total_views} views!")
    except Exception as e:
        print(f"  Validação falhou: {e}")

    # Contagem total de objetos
    print("\n--- Inventário completo do dataset ---")
    inv_sql = f"""
    SELECT 'VIEWS' AS tipo, COUNT(*) AS qtd
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.VIEWS`
    UNION ALL
    SELECT 'UDFs', COUNT(*)
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.ROUTINES`
    UNION ALL
    SELECT 'BASE TABLES', COUNT(*)
    FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.TABLES`
    WHERE table_type = 'BASE TABLE'
    """
    try:
        for r in client.query(inv_sql).result():
            print(f"  {r.tipo:15s} {r.qtd}")
    except Exception as e:
        print(f"  Inventário falhou: {e}")


if __name__ == "__main__":
    main()
