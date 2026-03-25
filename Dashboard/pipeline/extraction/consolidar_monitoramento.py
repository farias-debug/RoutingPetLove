"""
Consolida CSVs incrementais do TMS no arquivo _Completo.csv.

Estrategia: substituicao integral por periodo.
O TMS atualiza dados retroativamente (status, km, baixas, etc.),
entao o periodo coberto pelo incremental sobrepoe completamente
o mesmo periodo na base.

Fluxo:
    1. Le o _Completo.csv existente (base historica), local ou no GCS
    2. Le todos os CSVs incrementais em data/Relatorio_Monitoramento_Carga/ ou gs://bucket/prefix/incrementais/
  3. Detecta o range de datas (dtabertura) do incremental
  4. Remove da base TODAS as linhas dentro desse range
  5. Insere o incremental completo + dedup por Id Carga (seguranca)
    6. Sobrescreve _Completo.csv local e opcionalmente publica no GCS
    7. Move incrementais processados para _processados/ local e/ou remoto

Uso:
    python consolidar_monitoramento.py [--dry-run] [--gcs-bucket BUCKET] [--gcs-prefix PREFIXO]
"""

import argparse
import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

import pandas as pd

from gcs_storage import GCSStorageManager

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


def move_local_incrementais_para_processados(arquivos: list[str]) -> list[str]:
    """Move espelhos locais dos incrementais para _processados/."""
    movidos = []
    PROCESSADOS_DIR.mkdir(parents=True, exist_ok=True)

    for nome in arquivos:
        origem = INCREMENTAL_DIR / nome
        if not origem.exists():
            continue

        destino = PROCESSADOS_DIR / nome
        shutil.move(str(origem), str(destino))
        movidos.append(nome)
        print(f"    Movido local: {nome} -> _processados/")

    return movidos


def baixar_base_consolidada_remota(gcs: GCSStorageManager | None) -> None:
    """Baixa a ultima base consolidada do bucket para o caminho local esperado."""
    if not gcs:
        return

    baixado = gcs.download_if_exists(COMPLETO_CSV, "consolidado", COMPLETO_CSV.name)
    if baixado:
        print(
            f"  Base consolidada sincronizada do GCS: {gcs.uri('consolidado', COMPLETO_CSV.name)}"
        )


def listar_incrementais_gcs(gcs: GCSStorageManager) -> tuple[list[dict], Path | None]:
    """Baixa incrementais remotos para um diretorio temporario local."""
    blobs = [
        blob
        for blob in gcs.list_blobs("incrementais")
        if blob.name.lower().endswith(".csv")
    ]
    if not blobs:
        return [], None

    temp_dir = Path(tempfile.mkdtemp(prefix="tms_incrementais_"))
    arquivos = []
    for blob in blobs:
        local_path = temp_dir / Path(blob.name).name
        gcs.download_blob(blob.name, local_path)
        arquivos.append(
            {
                "path": local_path,
                "name": local_path.name,
                "blob_name": blob.name,
            }
        )

    return arquivos, temp_dir


def sincronizar_incrementais_locais_para_gcs(
    gcs: GCSStorageManager, incrementais_locais: list[Path]
) -> None:
    """Publica incrementais locais no bucket para tornarem-se a fonte de verdade."""
    for arquivo in incrementais_locais:
        destino = gcs.upload_file(arquivo, "incrementais", arquivo.name)
        print(f"    Upload local -> GCS: {arquivo.name} ({gcs.uri(destino)})")


def coletar_incrementais(
    gcs: GCSStorageManager | None,
) -> tuple[list[dict], Path | None, str]:
    """Retorna incrementais a processar, priorizando o bucket quando configurado."""
    incrementais_locais = listar_incrementais()

    if gcs:
        incrementais_remotos, temp_dir = listar_incrementais_gcs(gcs)
        if incrementais_remotos:
            print(
                f"  Incrementais obtidos do GCS: {len(incrementais_remotos)} arquivo(s)"
            )
            return incrementais_remotos, temp_dir, "gcs"

        if incrementais_locais:
            print(
                "  Nenhum incremental remoto encontrado; publicando espelhos locais no GCS..."
            )
            sincronizar_incrementais_locais_para_gcs(gcs, incrementais_locais)
            incrementais_remotos, temp_dir = listar_incrementais_gcs(gcs)
            if incrementais_remotos:
                print(
                    f"  Incrementais sincronizados e reobtidos do GCS: {len(incrementais_remotos)} arquivo(s)"
                )
                return incrementais_remotos, temp_dir, "gcs"

    return (
        [
            {"path": caminho, "name": caminho.name, "blob_name": ""}
            for caminho in incrementais_locais
        ],
        None,
        "local",
    )


def publicar_base_no_gcs(gcs: GCSStorageManager | None, backup: Path | None) -> None:
    """Publica backup e consolidado final no bucket."""
    if not gcs:
        return

    if backup and backup.exists():
        destino_backup = gcs.upload_file(backup, "backups", backup.name)
        print(f"  Backup remoto: {gcs.uri(destino_backup)}")

    destino_consolidado = gcs.upload_file(
        COMPLETO_CSV, "consolidado", COMPLETO_CSV.name
    )
    print(f"  Consolidado remoto: {gcs.uri(destino_consolidado)}")


def arquivar_incrementais_remotos(
    gcs: GCSStorageManager | None, incrementais: list[dict]
) -> list[str]:
    """Move blobs processados de incrementais/ para processados/."""
    if not gcs:
        return []

    movidos = []
    for item in incrementais:
        blob_name = item.get("blob_name")
        if not blob_name:
            continue

        destino = gcs.build_path("processados", item["name"])
        gcs.move_blob(blob_name, destino)
        movidos.append(item["name"])
        print(
            f"    Movido remoto: {item['name']} -> {gcs.uri('processados', item['name'])}"
        )

    return movidos


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


def consolidar(
    dry_run: bool = False,
    gcs: GCSStorageManager | None = None,
) -> dict:
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
        "origem_incrementais": "local",
    }

    temp_dir = None
    backup = None

    try:
        baixar_base_consolidada_remota(gcs)

        # 1 — Carregar base existente
        if COMPLETO_CSV.exists():
            df_base = carregar_csv_flexivel(COMPLETO_CSV)
            stats["linhas_antes"] = len(df_base)
            print(f"  Base existente: {len(df_base):,} linhas")
        else:
            df_base = pd.DataFrame()
            print("  Base existente: vazia (arquivo sera criado)")

        # 2 — Listar e carregar incrementais
        incrementais, temp_dir, origem = coletar_incrementais(gcs)
        stats["origem_incrementais"] = origem
        if not incrementais:
            print("  Nenhum CSV incremental encontrado. Nada a fazer.")
            stats["linhas_depois"] = stats["linhas_antes"]
            return stats

        stats["arquivos_incrementais"] = len(incrementais)
        print(f"  Incrementais encontrados: {len(incrementais)} arquivo(s) [{origem}]")

        frames = []
        for item in incrementais:
            try:
                df_inc = carregar_csv_flexivel(item["path"])
                frames.append(df_inc)
                print(f"    {item['name']}: {len(df_inc):,} linhas")
            except Exception as e:
                print(f"    ERRO ao ler {item['name']}: {e}")

        if not frames:
            print("  Nenhum incremental valido carregado.")
            stats["linhas_depois"] = stats["linhas_antes"]
            return stats

        df_novos = pd.concat(frames, ignore_index=True)

        # Dedup dentro dos proprios incrementais (mantem ultimo por Id Carga)
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
        print(
            f"  Periodo incremental: {stats['periodo_inicio']} a {stats['periodo_fim']}"
        )

        # 4 — Substituicao integral por periodo
        if not df_base.empty:
            dt_base = _parse_date_col(df_base[COL_DATA_PERIODO])
            mask_fora_periodo = (dt_base < dt_min) | (dt_base > dt_max) | dt_base.isna()
            linhas_antes_corte = len(df_base)
            df_base = df_base[mask_fora_periodo]
            stats["linhas_removidas_periodo"] = linhas_antes_corte - len(df_base)

            print(
                f"  Removidas do periodo: {stats['linhas_removidas_periodo']:,} linhas"
            )
            print(f"  Base fora do periodo: {len(df_base):,} linhas")

            df_final = pd.concat([df_base, df_novos], ignore_index=True)
        else:
            df_final = df_novos

        # Dedup final de seguranca (por Id Carga)
        df_final = df_final.drop_duplicates(subset=[CHAVE_DEDUP], keep="last")
        stats["linhas_depois"] = len(df_final)

        print(f"  Resultado: {stats['linhas_depois']:,} linhas")

        if dry_run:
            print("  [DRY-RUN] Nenhuma alteracao gravada.")
            return stats

        # 5 — Backup e gravar
        backup = COMPLETO_CSV.with_suffix(f".bak_{datetime.now():%Y%m%d_%H%M%S}.csv")
        if COMPLETO_CSV.exists():
            shutil.copy2(COMPLETO_CSV, backup)
            print(f"  Backup: {backup.name}")

        df_final.to_csv(COMPLETO_CSV, sep=SEPARATOR, encoding=ENCODING, index=False)
        print(f"  Gravado: {COMPLETO_CSV.name}")

        publicar_base_no_gcs(gcs, backup)
        arquivos_movidos = arquivar_incrementais_remotos(gcs, incrementais)
        arquivos_movidos.extend(
            nome
            for nome in move_local_incrementais_para_processados(
                [item["name"] for item in incrementais]
            )
            if nome not in arquivos_movidos
        )
        stats["arquivos_movidos"] = arquivos_movidos

        return stats
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--gcs-bucket", default=os.getenv("TMS_GCS_BUCKET", ""))
    parser.add_argument(
        "--gcs-prefix",
        default=os.getenv("TMS_GCS_PREFIX", "tms-monitoramento"),
    )
    return parser.parse_args()


def main():
    args = parse_args()
    gcs = GCSStorageManager.from_env(args.gcs_bucket, args.gcs_prefix)

    print()
    print("=" * 55)
    print("  CONSOLIDACAO — Monitoramento de Carga (TMS)")
    print(f"  {datetime.now():%Y-%m-%d %H:%M:%S}")
    print("=" * 55)
    print()

    if gcs:
        print(f"  Persistencia intermediaria: {gcs.uri()}")
        print()

    stats = consolidar(dry_run=args.dry_run, gcs=gcs)

    print()
    print("--- Resumo ---")
    print(f"  Antes:           {stats['linhas_antes']:,}")
    print(f"  Origem:          {stats['origem_incrementais']}")
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
