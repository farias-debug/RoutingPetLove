"""
Sincroniza todas as 13 views de publicação do BigQuery → Google Sheets.

Uso:
  python sync_bq_to_sheets.py <SPREADSHEET_ID> [--view NOME_VIEW]

Exemplos:
  python sync_bq_to_sheets.py 1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4
  python sync_bq_to_sheets.py 1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4 --view metas_globais
"""

import sys
import time
import argparse
from datetime import date, datetime
from google.cloud import bigquery
from google.auth import default
import gspread

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"

VIEWS = [
    "metas_globais",
    "dim_filial_tratada",
    "kpi_card_latest",
    "kpi_resumo_diario",
    "kpi_filial_dia",
    "kpi_transportador_dia",
    "alertas_rotas",
    "drill_rotas",
    "Resumo_Filial",
    "Resumo_Ocupacao_Veic_Transp",
    "VW_Base_Execucao",
    "Resumo_Semana_Filial_Diario",
    "Resumo_Semana_Filial_Matriz",
]

BATCH_SIZE = 5000  # linhas por batch no Sheets API


def get_clients():
    creds, _ = default(
        scopes=[
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/bigquery",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
    )
    bq = bigquery.Client(project=PROJECT, credentials=creds)
    gc = gspread.authorize(creds)
    return bq, gc


def query_view(bq, view_name):
    fqn = f"`{PROJECT}.{DATASET}.{view_name}`"
    sql = f"SELECT * FROM {fqn}"
    result = bq.query(sql).result()
    schema = [f.name for f in result.schema]
    types = [f.field_type for f in result.schema]
    rows = []
    for r in result:
        row = []
        for val, ftype in zip(r.values(), types):
            row.append(convert_value(val, ftype))
        rows.append(row)
    return schema, rows


def convert_value(val, ftype):
    if val is None:
        return ""
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    if isinstance(val, bool):
        return val
    if ftype in ("INTEGER", "INT64"):
        return int(val)
    if ftype in ("FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"):
        return float(val)
    return str(val)


def write_to_sheet(gc, spreadsheet_id, sheet_name, headers, rows):
    sh = gc.open_by_key(spreadsheet_id)

    try:
        ws = sh.worksheet(sheet_name)
        ws.clear()
        needed_rows = len(rows) + 1
        needed_cols = len(headers)
        if ws.row_count < needed_rows or ws.col_count < needed_cols:
            ws.resize(
                rows=max(needed_rows, ws.row_count), cols=max(needed_cols, ws.col_count)
            )
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(
            title=sheet_name,
            rows=max(len(rows) + 1, 100),
            cols=len(headers),
        )

    # Header
    ws.update(range_name="A1", values=[headers])

    # Data em batches
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        start_row = 2 + i
        ws.update(range_name=f"A{start_row}", values=batch)

    # Formatar header
    ws.format(
        "1",
        {
            "textFormat": {"bold": True},
            "backgroundColor": {"red": 0.95, "green": 0.96, "blue": 0.97},
        },
    )
    ws.freeze(rows=1)

    return len(rows)


def sync_one(bq, gc, spreadsheet_id, view_name):
    t0 = time.time()
    headers, rows = query_view(bq, view_name)
    t_bq = time.time() - t0

    t1 = time.time()
    count = write_to_sheet(gc, spreadsheet_id, view_name, headers, rows)
    t_sh = time.time() - t1

    return count, len(headers), t_bq, t_sh


def main():
    parser = argparse.ArgumentParser(description="Sync BQ views → Google Sheets")
    parser.add_argument("spreadsheet_id", help="ID da planilha Google Sheets")
    parser.add_argument("--view", help="Sincronizar apenas esta view", default=None)
    args = parser.parse_args()

    views = [args.view] if args.view else VIEWS

    print(f"=== BQ → Sheets Sync ===")
    print(f"Planilha: {args.spreadsheet_id}")
    print(f"Views: {len(views)}")
    print()

    bq, gc = get_clients()

    results = []
    total_start = time.time()

    for i, view in enumerate(views, 1):
        tag = f"[{i}/{len(views)}]"
        print(f"{tag} {view}...", end=" ", flush=True)
        try:
            count, cols, t_bq, t_sh = sync_one(bq, gc, args.spreadsheet_id, view)
            print(
                f"OK — {count} linhas, {cols} cols (BQ {t_bq:.1f}s + Sheets {t_sh:.1f}s)"
            )
            results.append((view, count, cols, True, ""))
        except Exception as e:
            print(f"ERRO — {e}")
            results.append((view, 0, 0, False, str(e)))

    elapsed = time.time() - total_start
    ok = sum(1 for r in results if r[3])
    fail = sum(1 for r in results if not r[3])

    print()
    print(f"=== Resultado: {ok} OK, {fail} FAIL de {len(views)} ({elapsed:.0f}s) ===")
    if fail:
        print("\nFalhas:")
        for v, _, _, success, err in results:
            if not success:
                print(f"  {v}: {err}")


if __name__ == "__main__":
    main()
