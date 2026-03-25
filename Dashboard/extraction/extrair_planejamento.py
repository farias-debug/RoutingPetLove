"""
Extrai base de planejamento de rotas do Google Sheets.

Planilha:
  https://docs.google.com/spreadsheets/d/1zANDyZMZIdVp22C-RgPw3yu4L97rEJ5XYZnTj0TZDBw
  Aba GID: 63799993

Filtro: apenas linhas com Data no ano 2026.

Saída: {output_dir}/planejamento_2026.csv
Colunas: Filial, Cluster, Data, Lista, Pedidos, Volume, Km, Tempo de Rota, Peso

Pré-requisitos no GCP:
  - Google Sheets API ativada:
      gcloud services enable sheets.googleapis.com --project=data-aileron-482822-d0
  - Planilha compartilhada (Leitor) com a SA:
      pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com
"""

import csv
import sys
from datetime import date, timedelta
from pathlib import Path

import google.auth
from googleapiclient.discovery import build

SPREADSHEET_ID = "1zANDyZMZIdVp22C-RgPw3yu4L97rEJ5XYZnTj0TZDBw"
SHEET_GID = 63799993

# Colunas exatamente como aparecem na planilha (header row)
TARGET_COLS = [
    "Filial",
    "Cluster",
    "Data",
    "Lista",
    "Pedidos",
    "Volume",
    "Km",
    "Tempo de Rota",
    "Peso",
]

OUTPUT_FILENAME = "planejamento_2026.csv"

# Epoch do Excel/Sheets: 30/12/1899
_EXCEL_EPOCH = date(1899, 12, 30)


def _serial_to_iso(serial) -> str | None:
    """Converte serial numérico do Sheets (dias desde 30/12/1899) para 'YYYY-MM-DD'."""
    try:
        return (_EXCEL_EPOCH + timedelta(days=int(serial))).isoformat()
    except (ValueError, TypeError):
        return None


def _fraction_to_time(frac) -> str | None:
    """Converte fração decimal de dia (0..1) para 'HH:MM:SS'. Ex: 0.1632 → '03:55:00'."""
    try:
        total_sec = round(float(frac) * 86400)
        h, rem = divmod(total_sec, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    except (ValueError, TypeError):
        return None


def _get_sheet_name(service) -> str:
    """Resolve o nome da aba a partir do GID."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    for sheet in meta.get("sheets", []):
        props = sheet.get("properties", {})
        if props.get("sheetId") == SHEET_GID:
            return props["title"]
    raise ValueError(
        f"Aba com GID={SHEET_GID} não encontrada na planilha.\n"
        f"Abas disponíveis: {[s['properties']['title'] for s in meta.get('sheets', [])]}"
    )


def extract(output_dir: str = "/app/data") -> str:
    print("[PLANEJAMENTO] Autenticando Google Sheets API...")
    creds, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)

    sheet_name = _get_sheet_name(service)
    print(f"[PLANEJAMENTO] Aba: '{sheet_name}'")

    # UNFORMATTED_VALUE: números como float/int, datas como serial, horas como fração de dia
    result = (
        service.spreadsheets()
        .values()
        .get(
            spreadsheetId=SPREADSHEET_ID,
            range=f"'{sheet_name}'!A:M",
            valueRenderOption="UNFORMATTED_VALUE",
            dateTimeRenderOption="SERIAL_NUMBER",
        )
        .execute()
    )

    values = result.get("values", [])
    if not values:
        raise ValueError("Planilha retornou dados vazios")

    # Detectar linha de header: primeira das 5 primeiras que contém "Filial"
    header_idx = None
    for i, row in enumerate(values[:5]):
        if "Filial" in row:
            header_idx = i
            break
    if header_idx is None:
        raise ValueError(
            f"Coluna 'Filial' não encontrada nas 5 primeiras linhas.\n"
            f"Conteúdo recebido: {values[:3]}"
        )

    headers = [str(h).strip() for h in values[header_idx]]
    print(f"[PLANEJAMENTO] Header (linha {header_idx + 1}): {headers}")

    try:
        col_idx = {col: headers.index(col) for col in TARGET_COLS}
    except ValueError as e:
        missing = [c for c in TARGET_COLS if c not in headers]
        raise ValueError(
            f"Colunas não encontradas: {missing}\n"
            f"Headers disponíveis: {headers}"
        ) from e

    data_idx = col_idx["Data"]
    time_idx = col_idx["Tempo de Rota"]

    rows_2026, skipped = [], 0
    for row in values[header_idx + 1 :]:
        if len(row) <= data_idx:
            continue

        iso_date = _serial_to_iso(row[data_idx])
        if not iso_date or not iso_date.startswith("2026-"):
            skipped += 1
            continue

        row_out = []
        for col in TARGET_COLS:
            idx = col_idx[col]
            val = row[idx] if idx < len(row) else ""

            if col == "Data":
                val = iso_date
            elif col == "Tempo de Rota":
                val = _fraction_to_time(val) or ""
            elif isinstance(val, float):
                # Remove ".0" desnecessário para valores inteiros (Pedidos, Volume, etc.)
                val = int(val) if val == int(val) else round(val, 4)

            row_out.append("" if val == "" else str(val))

        rows_2026.append(row_out)

    print(
        f"[PLANEJAMENTO] {len(rows_2026):,} linhas (2026) | {skipped:,} ignoradas (outros anos)"
    )

    output_path = Path(output_dir) / OUTPUT_FILENAME
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(TARGET_COLS)
        writer.writerows(rows_2026)

    size_kb = output_path.stat().st_size / 1024
    print(f"[PLANEJAMENTO] Salvo: {output_path} ({size_kb:.1f} KB)")
    return str(output_path)


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "/app/data"
    extract(out_dir)
    sys.exit(0)
