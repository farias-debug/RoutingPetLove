"""
Carrega os CSVs consolidados nas raw tables do BigQuery (WRITE_TRUNCATE).
Reutiliza a mesma lógica de fix_raw_export.py: normaliza CSV BR (sep=;, decimal=,, utf-8-sig)
para CSV padrão (sep=,, decimal=., utf-8) e sobe via Python API (google-cloud-bigquery)
ou bq load CLI como fallback.
As views se atualizam automaticamente após o load.

Pré-requisitos:
  - Python 3.10+ com pandas instalado
  - google-cloud-bigquery instalado (pip) OU Google Cloud SDK (bq CLI)
  - Autenticação GCP configurada (ADC, SA key, ou gcloud auth)
  - Arquivos fonte em Dashboard/data/

Uso:
  python load_raw_to_bq.py [--dry-run] [--table raw_monitoramento|raw_planejamento|raw_dim_filial|all]
"""

import argparse
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

import pandas as pd

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = Path(tempfile.gettempdir()) / "bq_load_staging"

# Tabela → (arquivo fonte, sep, encoding, decimal, rename_cols)
TABLE_MAP = {
    "raw_monitoramento": {
        "src": DATA_DIR / "Relatorio_Monitoramento_Carga_Completo.csv",
        "sep": ";",
        "encoding": "utf-8-sig",
        "decimal": ",",
        "rename": {"N° Placa": "N_ Placa"},
        "timestamp_cols": [
            "dtabertura",
            "Data Atribuição Motorista",
            "Data Inicio de Rota APP",
        ],
    },
    "raw_planejamento": {
        "src": DATA_DIR / "planejamento_2026.csv",  # extraído do Google Sheets
        "sep": ",",
        "encoding": "utf-8",
        "decimal": None,  # já normalizado pelo extrator (ponto decimal)
        "rename": {
            "Cluster": "Rota",
            "Data": "Data Planejada",
            "Lista": "Id Carga",
        },
    },
    "raw_dim_filial": {
        "src": DATA_DIR / "tab_auxiliar" / "dim_filial.xlsx",
        "sep": None,  # xlsx
        "encoding": None,
        "decimal": None,
        "rename": {},
    },
}


def load_source(cfg: dict) -> pd.DataFrame:
    src = cfg["src"]
    if src.suffix == ".xlsx":
        return pd.read_excel(src, dtype=str)
    return pd.read_csv(
        src,
        sep=cfg["sep"],
        encoding=cfg["encoding"],
        dtype=str,
        low_memory=False,
    )


def normalize_and_export(df: pd.DataFrame, table_name: str, cfg: dict) -> Path:
    """Normaliza df e exporta CSV padrão (utf-8, comma, dot decimal, timestamps ISO)."""
    if cfg.get("rename"):
        df.rename(columns=cfg["rename"], inplace=True)

    # Converter colunas de timestamp DD/MM/YYYY HH:MM[:SS] → YYYY-MM-DD HH:MM:SS
    ts_cols = cfg.get("timestamp_cols", [])
    for col in ts_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(
                df[col], format="mixed", dayfirst=True, errors="coerce"
            )
            df[col] = df[col].dt.strftime("%Y-%m-%d %H:%M:%S").replace("NaT", "")

    # Trocar virgula decimal por ponto em colunas que usam decimal BR
    if cfg.get("decimal") == ",":
        for col in df.columns:
            if col in ts_cols or col in cfg.get("rename", {}).values():
                continue
            if df[col].dtype == object:
                # Substituir apenas em valores que parecem números com vírgula
                mask = df[col].str.match(r"^-?\d+,\d+$", na=False)
                if mask.any():
                    df.loc[mask, col] = df.loc[mask, col].str.replace(
                        ",", ".", regex=False
                    )

    # Converter HH:MM → horas decimais em "Tempo Realizado" (FLOAT no BQ)
    if "Tempo Realizado" in df.columns:
        hhmm_mask = df["Tempo Realizado"].str.match(r"^\d{1,3}:\d{2}$", na=False)
        if hhmm_mask.any():
            parts = df.loc[hhmm_mask, "Tempo Realizado"].str.split(":", expand=True)
            df.loc[hhmm_mask, "Tempo Realizado"] = (
                (parts[0].astype(float) + parts[1].astype(float) / 60)
                .round(2)
                .astype(str)
            )

    out_path = OUTPUT_DIR / f"{table_name}.csv"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False, encoding="utf-8")
    return out_path


def validate_dataframe(df: pd.DataFrame, table_name: str) -> list[str]:
    """Valida schema básico do DataFrame antes de subir ao BQ."""
    issues = []
    if df.empty:
        issues.append(f"DataFrame vazio para {table_name}")
        return issues
    dupes = df.duplicated().sum()
    if dupes > 0:
        issues.append(f"{dupes} linhas duplicadas encontradas (serão removidas)")
    null_cols = [c for c in df.columns if df[c].isna().all()]
    if null_cols:
        issues.append(f"Colunas 100% NULL: {null_cols}")
    return issues


def _bq_load_python_api(csv_path: Path, table_name: str) -> bool:
    """Carga via google-cloud-bigquery Python API (preferida em containers)."""
    from google.cloud import bigquery

    client = bigquery.Client(project=PROJECT)
    table_ref = f"{PROJECT}.{DATASET}.{table_name}"

    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        autodetect=False,
    )

    print(f"  bq load (Python API) → {table_ref}...")
    with open(csv_path, "rb") as f:
        job = client.load_table_from_file(f, table_ref, job_config=job_config)

    job.result(timeout=300)

    table = client.get_table(table_ref)
    print(f"  OK ({table.num_rows:,} rows loaded)")
    return True


def _bq_load_cli(csv_path: Path, table_name: str) -> bool:
    """Carga via bq CLI (fallback para dev local)."""
    import subprocess

    bq_cmd = shutil.which("bq") or shutil.which("bq.cmd")
    if not bq_cmd:
        local_app = os.environ.get("LOCALAPPDATA", "")
        if local_app:
            candidate = (
                Path(local_app)
                / "Google"
                / "Cloud SDK"
                / "google-cloud-sdk"
                / "bin"
                / "bq.cmd"
            )
            if candidate.exists():
                bq_cmd = str(candidate)
    if not bq_cmd:
        for p in ["/usr/bin/bq", "/usr/local/bin/bq"]:
            if Path(p).exists():
                bq_cmd = p
                break
    if not bq_cmd:
        raise FileNotFoundError("bq CLI não encontrado e google-cloud-bigquery falhou.")

    table_ref = f"{PROJECT}:{DATASET}.{table_name}"
    cmd = [
        bq_cmd,
        "load",
        "--replace",
        "--skip_leading_rows=1",
        "--source_format=CSV",
        f"--project_id={PROJECT}",
        table_ref,
        str(csv_path),
    ]

    print(f"  bq load (CLI) → {table_ref}...")
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    output = (proc.stdout + proc.stderr).strip()
    if proc.returncode == 0:
        print(f"  OK ({output.splitlines()[-1] if output else 'done'})")
        return True
    else:
        print(f"  FAIL (rc={proc.returncode})")
        print(f"  {output[:500]}")
        return False


def bq_load(csv_path: Path, table_name: str, dry_run: bool) -> bool:
    """Carrega CSV no BigQuery. Tenta Python API primeiro, fallback para bq CLI."""
    table_ref = f"{PROJECT}.{DATASET}.{table_name}"

    if dry_run:
        print(f"  [DRY-RUN] bq load → {table_ref}")
        return True

    try:
        return _bq_load_python_api(csv_path, table_name)
    except Exception as e:
        print(f"  Python API falhou ({e.__class__.__name__}: {e}), tentando bq CLI...")
        return _bq_load_cli(csv_path, table_name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--table", default="raw_monitoramento", choices=list(TABLE_MAP.keys()) + ["all"]
    )
    args = parser.parse_args()

    tables = list(TABLE_MAP.keys()) if args.table == "all" else [args.table]

    print(f"=== Load raw tables → BigQuery ===\n")
    ok, fail = 0, 0

    for tname in tables:
        cfg = TABLE_MAP[tname]
        src = cfg["src"]

        if not src.exists():
            print(f"[{tname}] SKIP — arquivo não encontrado: {src.name}")
            fail += 1
            continue

        print(f"[{tname}] Lendo {src.name}...")
        df = load_source(cfg)
        print(f"  {len(df):,} linhas × {len(df.columns)} colunas")

        # Validação de schema
        issues = validate_dataframe(df, tname)
        for issue in issues:
            print(f"  ⚠ {issue}")

        # Remover duplicatas
        before = len(df)
        df = df.drop_duplicates()
        removed = before - len(df)
        if removed > 0:
            print(f"  Removidas {removed} linhas duplicadas")

        csv_path = normalize_and_export(df, tname, cfg)
        print(
            f"  CSV normalizado: {csv_path.name} ({csv_path.stat().st_size / 1024 / 1024:.1f} MB)"
        )

        t0 = time.time()
        if bq_load(csv_path, tname, args.dry_run):
            print(f"  Tempo: {time.time() - t0:.1f}s\n")
            ok += 1
        else:
            fail += 1

    print(f"Resultado: {ok} OK, {fail} FAIL")
    if ok > 0 and not args.dry_run:
        print("Views se atualizarão automaticamente.")


if __name__ == "__main__":
    main()
