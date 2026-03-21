"""
Consolida CSVs incrementais do TMS no arquivo _Completo.csv.

Estrategia: substituicao integral por periodo.
O TMS atualiza dados retroativamente (status, km, baixas, etc.),
entao o periodo coberto pelo incremental sobrepoe completamente
o mesmo periodo na base.

Fluxo:
  1. Le o _Completo.csv existente (base historica)
  2. Le todos os CSVs incrementais em data/Relatorio_Monitoramento_Carga/
  3. Detecta o range de datas (dtabertura) do incremental
  4. Remove da base TODAS as linhas dentro desse range
  5. Insere o incremental completo + dedup por Id Carga (seguranca)
  6. Sobrescreve _Completo.csv
  7. Move incrementais processados para _processados/

Uso:
  python consolidar_monitoramento.py [--dry-run]
"""

import shutil
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# ROOT_DIR aponta para Dashboard/ (1 nível acima: extraction -> Dashboard)
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

COMPLETO_CSV = DATA_DIR / "Relatorio_Monitoramento_Carga_Completo.csv"
INCREMENTAL_DIR = DATA_DIR / "Relatorio_Monitoramento_Carga"
PROCESSADOS_DIR = INCREMENTAL_DIR / "_processados"

CHAVE_DEDUP = "Id Carga"
COL_DATA_PERIODO = "dtabertura"
ENCODING = "utf-8-sig"
SEPARATOR = ";"


def carregar_csv_flexivel(caminho: Path) -> pd.DataFrame:
    """Carrega CSV tentando multiplos encodings e separadores."""
    tentativas = [
        ("utf-8-sig", ";"),
        ("utf-8", ";"),
        ("latin1", ";"),
        ("utf-8-sig", ","),
        ("utf-8", ","),
        ("latin1", ","),
    ]
    for encoding, sep in tentativas:
        try:
            df = pd.read_csv(caminho, sep=sep, encoding=encoding, low_memory=False)
            if len(df.columns) > 1:
                return df
        except Exception:
            continue
    raise ValueError(f"Nao foi possivel carregar {caminho}")


def listar_incrementais() -> list[Path]:
    """Lista CSVs incrementais (exclui _processados)."""
    if not INCREMENTAL_DIR.exists():
        return []
    return sorted(
        f
        for f in INCREMENTAL_DIR.glob("*.csv")
        if f.is_file() and "_processados" not in str(f)
    )


def _parse_date_col(series: pd.Series) -> pd.Series:
    """Parse coluna de data (dtabertura) com formatos pt-BR e ISO."""
    return pd.to_datetime(series, dayfirst=True, errors="coerce", format="mixed")


def consolidar(dry_run: bool = False) -> dict:
    """Executa a consolidacao por substituicao integral de periodo."""
    stats = {
        "linhas_antes": 0,
        "arquivos_incrementais": 0,
        "linhas_incrementais": 0,
        "periodo_inicio": None,
        "periodo_fim": None,
        "linhas_removidas_periodo": 0,
        "linhas_depois": 0,
        "arquivos_movidos": [],
    }

    # 1 — Carregar base existente
    if COMPLETO_CSV.exists():
        df_base = carregar_csv_flexivel(COMPLETO_CSV)
        stats["linhas_antes"] = len(df_base)
        print(f"  Base existente: {len(df_base):,} linhas")
    else:
        df_base = pd.DataFrame()
        print("  Base existente: vazia (arquivo sera criado)")

    # 2 — Listar e carregar incrementais
    incrementais = listar_incrementais()
    if not incrementais:
        print("  Nenhum CSV incremental encontrado. Nada a fazer.")
        stats["linhas_depois"] = stats["linhas_antes"]
        return stats

    stats["arquivos_incrementais"] = len(incrementais)
    print(f"  Incrementais encontrados: {len(incrementais)} arquivo(s)")

    frames = []
    for arq in incrementais:
        try:
            df_inc = carregar_csv_flexivel(arq)
            frames.append(df_inc)
            print(f"    {arq.name}: {len(df_inc):,} linhas")
        except Exception as e:
            print(f"    ERRO ao ler {arq.name}: {e}")

    if not frames:
        print("  Nenhum incremental valido carregado.")
        stats["linhas_depois"] = stats["linhas_antes"]
        return stats

    df_novos = pd.concat(frames, ignore_index=True)

    # Dedup dentro dos proprios incrementais (mantém último por Id Carga)
    df_novos = df_novos.drop_duplicates(subset=[CHAVE_DEDUP], keep="last")
    stats["linhas_incrementais"] = len(df_novos)
    print(f"  Linhas incrementais (pos-dedup interna): {len(df_novos):,}")

    # 3 — Detectar range de datas do incremental (dtabertura)
    dt_inc = _parse_date_col(df_novos[COL_DATA_PERIODO])
    dt_min = dt_inc.min()
    dt_max = dt_inc.max()

    if pd.isna(dt_min) or pd.isna(dt_max):
        print(f"  ERRO: nao foi possivel detectar periodo via '{COL_DATA_PERIODO}'")
        stats["linhas_depois"] = stats["linhas_antes"]
        return stats

    # Normalizar para dia (sem hora) para garantir substituicao completa
    dt_min = dt_min.normalize()
    dt_max = dt_max.normalize() + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)

    stats["periodo_inicio"] = dt_min.strftime("%Y-%m-%d")
    stats["periodo_fim"] = dt_max.strftime("%Y-%m-%d")
    print(f"  Periodo incremental: {stats['periodo_inicio']} a {stats['periodo_fim']}")

    # 4 — Substituicao integral por periodo
    if not df_base.empty:
        dt_base = _parse_date_col(df_base[COL_DATA_PERIODO])
        mask_fora_periodo = (dt_base < dt_min) | (dt_base > dt_max) | dt_base.isna()
        linhas_antes_corte = len(df_base)
        df_base = df_base[mask_fora_periodo]
        stats["linhas_removidas_periodo"] = linhas_antes_corte - len(df_base)

        print(f"  Removidas do periodo: {stats['linhas_removidas_periodo']:,} linhas")
        print(f"  Base fora do periodo: {len(df_base):,} linhas")

        df_final = pd.concat([df_base, df_novos], ignore_index=True)
    else:
        df_final = df_novos

    # Dedup final de segurança (por Id Carga)
    df_final = df_final.drop_duplicates(subset=[CHAVE_DEDUP], keep="last")
    stats["linhas_depois"] = len(df_final)

    print(f"  Resultado: {stats['linhas_depois']:,} linhas")

    if dry_run:
        print("  [DRY-RUN] Nenhuma alteracao gravada.")
        return stats

    # 4 — Backup e gravar
    backup = COMPLETO_CSV.with_suffix(f".bak_{datetime.now():%Y%m%d_%H%M%S}.csv")
    if COMPLETO_CSV.exists():
        shutil.copy2(COMPLETO_CSV, backup)
        print(f"  Backup: {backup.name}")

    df_final.to_csv(COMPLETO_CSV, sep=SEPARATOR, encoding=ENCODING, index=False)
    print(f"  Gravado: {COMPLETO_CSV.name}")

    # 5 — Mover incrementais para _processados
    PROCESSADOS_DIR.mkdir(parents=True, exist_ok=True)
    for arq in incrementais:
        destino = PROCESSADOS_DIR / arq.name
        shutil.move(str(arq), str(destino))
        stats["arquivos_movidos"].append(arq.name)
        print(f"    Movido: {arq.name} -> _processados/")

    return stats


def main():
    dry_run = "--dry-run" in sys.argv

    print()
    print("=" * 55)
    print("  CONSOLIDACAO — Monitoramento de Carga (TMS)")
    print(f"  {datetime.now():%Y-%m-%d %H:%M:%S}")
    print("=" * 55)
    print()

    stats = consolidar(dry_run=dry_run)

    print()
    print("--- Resumo ---")
    print(f"  Antes:           {stats['linhas_antes']:,}")
    print(
        f"  Incrementais:    {stats['arquivos_incrementais']} arquivo(s), "
        f"{stats['linhas_incrementais']:,} linhas"
    )
    print(f"  Periodo:         {stats['periodo_inicio']} a {stats['periodo_fim']}")
    print(
        f"  Removidas:       {stats['linhas_removidas_periodo']:,} (periodo sobreposto)"
    )
    print(f"  Depois:          {stats['linhas_depois']:,}")
    if stats["arquivos_movidos"]:
        print(f"  Movidos:         {len(stats['arquivos_movidos'])} arquivo(s)")
    print()


if __name__ == "__main__":
    main()
