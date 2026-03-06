"""
Pipeline canonico do dashboard de transporte.

Saidas geradas:
  1. dim_tipo_veiculo.csv
  2. fato_rotas.csv
  3. fato_planejado.csv

dim_filial passa a ser lida diretamente do arquivo auxiliar Excel no modelo.
"""

from __future__ import annotations

import re
import sys
import unicodedata
from datetime import time, timedelta
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from config.constantes import (
    COLUNAS_DATA,
    COLUNAS_DURACAO,
    COLUNAS_NUMERICAS,
    COLUNAS_PERCENTUAL,
    JANELA_CAPACIDADE_DIAS,
    NOMES_COLUNAS,
    POWERBI_DATE_FORMAT,
    POWERBI_ENCODING,
    POWERBI_SEPARATOR,
    TIPOS_VEICULO,
)
from config.de_para_tipo import aplicar_de_para_tipo

DATA_DIR = ROOT_DIR / "data"
TAB_AUXILIAR_DIR = DATA_DIR / "tab_auxiliar"
POWERBI_DIR = ROOT_DIR / "output" / "powerbi"

MONITOR_CSV = DATA_DIR / "Relatorio_Monitoramento_Carga_Completo.csv"
PLANNING_XLSX = DATA_DIR / "Relorio_Planejamento_Carga_Completo.xlsx"
DIM_FILIAL_XLSX = TAB_AUXILIAR_DIR / "dim_filial.xlsx"
DIM_PLACAS_XLSX = TAB_AUXILIAR_DIR / "dim_placas_veiculos.xlsx"

FILIAIS_EXCLUIDAS = {"testes tm", "testes tms", "provet01 moema"}
META_ENTREGA_PADRAO = 0.98


def parse_num_br(valor):
    """Converte numero textual pt-BR ou en-US para float."""
    if valor is None or pd.isna(valor):
        return np.nan
    if isinstance(valor, (np.integer, int)):
        return float(valor)
    if isinstance(valor, (np.floating, float)):
        return np.nan if pd.isna(valor) else float(valor)

    s = str(valor).strip()
    if not s or s in {"-", "--", "nan", "NaN", "None", "none", "null"}:
        return np.nan

    s = s.replace("%", "").replace(" ", "")
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(".", "").replace(",", ".")

    try:
        return float(s)
    except (TypeError, ValueError):
        return np.nan


def parse_duration_to_hours(valor):
    """Converte fracao de dia, time, timedelta ou texto HH:MM em horas."""
    if valor is None or pd.isna(valor):
        return np.nan
    if isinstance(valor, timedelta):
        return round(valor.total_seconds() / 3600, 1)
    if isinstance(valor, time):
        return round(valor.hour + valor.minute / 60 + valor.second / 3600, 1)
    if isinstance(valor, (np.integer, np.floating, int, float)):
        return round(float(valor) * 24, 1)

    s = str(valor).strip()
    if not s:
        return np.nan
    if ":" in s:
        partes = s.split(":")
        try:
            h = float(partes[0]) if len(partes) > 0 else 0
            m = float(partes[1]) if len(partes) > 1 else 0
            sec = float(partes[2]) if len(partes) > 2 else 0
            return round(h + (m / 60) + (sec / 3600), 1)
        except (TypeError, ValueError):
            return np.nan

    return round(parse_num_br(s), 1)


def normalize_date_series(series: pd.Series, normalize: bool = True) -> pd.Series:
    """Converte serie para datetime com parsing resiliente."""
    dt = pd.to_datetime(series, dayfirst=True, errors="coerce", format="mixed")
    return dt.dt.normalize() if normalize else dt


def normalize_text_key(valor: object) -> str:
    """Normaliza texto para matching estavel."""
    if valor is None or pd.isna(valor):
        return ""
    s = str(valor).strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.split())


def normalize_identifier(valor: object) -> object:
    """Preserva identificadores textuais e remove .0."""
    if valor is None or pd.isna(valor):
        return np.nan
    if isinstance(valor, (np.integer, int)):
        return str(int(valor))
    if isinstance(valor, (np.floating, float)):
        if pd.isna(valor):
            return np.nan
        if float(valor).is_integer():
            return str(int(valor))
        return format(float(valor), "f").rstrip("0").rstrip(".")

    s = str(valor).strip()
    if not s or s.lower() in {"nan", "none", "null"}:
        return np.nan
    if s.endswith(".0") and s[:-2].isdigit():
        return s[:-2]
    return s


def normalize_integer_key_series(series: pd.Series) -> pd.Series:
    """Normaliza chaves numericas para Int64 nullable."""
    return pd.to_numeric(series, errors="coerce").astype("Int64")


def normalize_plate(valor: object) -> str:
    """Normaliza placa para join estavel."""
    if valor is None or pd.isna(valor):
        return ""
    s = re.sub(r"[^A-Za-z0-9]", "", str(valor).strip().upper())
    return s


def format_date_for_csv(series: pd.Series) -> pd.Series:
    dt = normalize_date_series(series, normalize=True)
    return dt.dt.strftime(POWERBI_DATE_FORMAT).where(dt.notna(), np.nan)


def format_datetime_for_csv(series: pd.Series) -> pd.Series:
    dt = normalize_date_series(series, normalize=False)
    return dt.dt.strftime("%Y-%m-%d %H:%M").where(dt.notna(), np.nan)


def positive_percentile(series: pd.Series, percentile: float = 0.75) -> float:
    serie = pd.to_numeric(series, errors="coerce")
    serie = serie[serie > 0]
    if serie.empty:
        return np.nan
    return float(serie.quantile(percentile))


def positive_mean(series: pd.Series) -> float:
    serie = pd.to_numeric(series, errors="coerce")
    serie = serie[serie > 0]
    if serie.empty:
        return np.nan
    return float(serie.mean())


@lru_cache(maxsize=1)
def load_dim_filial_aux() -> pd.DataFrame:
    """Carrega a dimensao auxiliar de filiais."""
    df = pd.read_excel(DIM_FILIAL_XLSX, sheet_name="dim_filial")
    df = df.rename(columns={"Nome Filial": "NomeResumido"})
    df["Filial"] = df["Filial"].astype(str).str.strip()
    df = df.loc[
        ~df["Filial"].map(lambda valor: normalize_text_key(valor) in FILIAIS_EXCLUIDAS)
    ].copy()
    df["Codigo"] = df["Codigo"].apply(normalize_identifier)
    df["MetaSPR"] = df["MetaSPR"].apply(parse_num_br)
    df["Regiao"] = df["Regiao"].fillna("N/A").astype(str).str.strip()
    df["Tipo"] = df["Tipo"].fillna("Nao Classificado").astype(str).str.strip()
    df["NomeResumido"] = df["NomeResumido"].fillna(df["Filial"]).astype(str).str.strip()
    df["MetaEntrega"] = META_ENTREGA_PADRAO
    return df[
        [
            "Filial",
            "Codigo",
            "NomeResumido",
            "Tipo",
            "MetaSPR",
            "Regiao",
            "MetaEntrega",
        ]
    ].copy()


@lru_cache(maxsize=1)
def load_dim_placas_aux() -> pd.DataFrame:
    """Carrega auxiliar de placas como fonte principal do tipo/frota."""
    df = pd.read_excel(DIM_PLACAS_XLSX, sheet_name="dim_veiculos")
    df["Placa"] = df["Placa"].map(normalize_plate)
    df = df.loc[df["Placa"] != ""].copy()
    df = df.rename(
        columns={
            "Tipo de Veiculo Padrao": "TipoVeiculoPadraoAux",
            "Tipo Contratado": "TipoFrotaAux",
        }
    )
    df["TipoVeiculoPadraoAux"] = (
        df["TipoVeiculoPadraoAux"].fillna("").astype(str).str.strip()
    )
    df["TipoFrotaAux"] = df["TipoFrotaAux"].fillna("").astype(str).str.strip()
    df = df.drop_duplicates(subset=["Placa"], keep="first")
    return df[["Placa", "TipoVeiculoPadraoAux", "TipoFrotaAux"]].copy()


@lru_cache(maxsize=1)
def build_filial_lookup() -> dict[str, str]:
    """Mapa de filial normalizada para filial canonica."""
    dim_filial = load_dim_filial_aux()
    return {
        normalize_text_key(filial): filial
        for filial in dim_filial["Filial"].dropna().astype(str).str.strip()
        if filial
    }


@lru_cache(maxsize=1)
def build_inactive_filial_keys() -> set[str]:
    """Conjunto de filiais explicitamente removidas."""
    return set(FILIAIS_EXCLUIDAS)


def canonicalizar_filial(series: pd.Series, contexto: str) -> pd.Series:
    """Canoniza filial com base na dimensao auxiliar."""
    lookup = build_filial_lookup()
    inactive_keys = build_inactive_filial_keys()

    def _canon(valor):
        if valor is None or pd.isna(valor):
            return np.nan
        bruto = str(valor).strip()
        if not bruto:
            return np.nan
        return lookup.get(normalize_text_key(bruto), bruto)

    canon = series.apply(_canon)
    desconhecidas = sorted(
        {
            str(valor).strip()
            for valor in canon.dropna().unique()
            if normalize_text_key(valor) not in lookup
            and normalize_text_key(valor) not in inactive_keys
        }
    )
    if desconhecidas:
        amostra = desconhecidas[:5]
        sufixo = " ..." if len(desconhecidas) > 5 else ""
        print(
            f"  AVISO: {len(desconhecidas)} filial(is) fora do cadastro em {contexto}: {amostra}{sufixo}"
        )
    return canon


def remover_filiais_inativas(df: pd.DataFrame, contexto: str) -> pd.DataFrame:
    """Remove filiais explicitamente excluidas."""
    if "Filial" not in df.columns:
        return df

    inactive_keys = build_inactive_filial_keys()
    mask = df["Filial"].map(
        lambda valor: normalize_text_key(valor) in inactive_keys if not pd.isna(valor) else False
    )
    removidas = int(mask.sum())
    if removidas:
        print(f"  Removendo {removidas:,} linha(s) de filial(is) excluida(s) em {contexto}")
        return df.loc[~mask].copy()
    return df


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
                print(f"  CSV carregado: encoding={encoding}, sep='{sep}'")
                return df
        except Exception:
            continue
    raise ValueError(f"Nao foi possivel carregar {caminho}")


def normalizar_monitor() -> pd.DataFrame:
    """Carrega e normaliza monitoramento TMS."""
    print("[1/3] Normalizando Monitoramento (TMS)...")

    df = carregar_csv_flexivel(MONITOR_CSV)
    print(f"  {len(df):,} linhas brutas")

    df = df.rename(columns=NOMES_COLUNAS)

    if "IdCarga" in df.columns:
        df["IdCarga"] = normalize_integer_key_series(df["IdCarga"])

    for col in COLUNAS_DATA:
        if col in df.columns:
            df[col] = normalize_date_series(df[col], normalize=False)

    if "Data Referencia" in df.columns and "Data de Abertura" in df.columns:
        mask_vazia = df["Data Referencia"].isna()
        df.loc[mask_vazia, "Data Referencia"] = df.loc[mask_vazia, "Data de Abertura"]
    elif "Data Referencia" not in df.columns and "Data de Abertura" in df.columns:
        df["Data Referencia"] = df["Data de Abertura"]

    if "Data Referencia" in df.columns:
        df["Data Referencia"] = normalize_date_series(df["Data Referencia"], normalize=True)

    if "Filial" in df.columns:
        df["Filial"] = canonicalizar_filial(df["Filial"], "monitoramento")
        df = remover_filiais_inativas(df, "monitoramento")

    if "CPF" in df.columns:
        df["CPF"] = df["CPF"].apply(normalize_identifier)

    if "Placa" in df.columns:
        df["Placa"] = df["Placa"].map(normalize_plate).replace("", np.nan)

    for col in COLUNAS_NUMERICAS:
        if col in df.columns:
            df[col] = df[col].apply(parse_num_br)

    for col in COLUNAS_PERCENTUAL:
        if col in df.columns:
            df[col] = df[col].apply(parse_num_br).div(100)

    for col in COLUNAS_DURACAO:
        if col in df.columns:
            df[col] = df[col].apply(parse_duration_to_hours)

    fallback = pd.DataFrame(
        [aplicar_de_para_tipo(valor) for valor in df.get("Tipo", pd.Series(dtype=object))]
    )
    if not fallback.empty:
        fallback.index = df.index
    else:
        fallback = pd.DataFrame(
            index=df.index,
            data={
                "Tipo de Veiculo Padrao": "Tipo não selecionado",
                "Tipo Frota": "Tipo não selecionado",
            },
        )

    placas_aux = load_dim_placas_aux()
    if "Placa" in df.columns:
        df = df.merge(placas_aux, on="Placa", how="left")
        matches = int(df["TipoVeiculoPadraoAux"].fillna("").ne("").sum())
        total_placas = int(df["Placa"].notna().sum())
        cobertura = (matches / total_placas * 100) if total_placas else 0
        print(f"  Match dim_placas: {matches:,}/{total_placas:,} ({cobertura:.1f}%)")
    else:
        df["TipoVeiculoPadraoAux"] = ""
        df["TipoFrotaAux"] = ""

    df["Tipo de Veiculo Padrao"] = df["TipoVeiculoPadraoAux"].where(
        df["TipoVeiculoPadraoAux"].fillna("").ne(""),
        fallback["Tipo de Veiculo Padrao"],
    )
    df["Tipo Frota"] = df["TipoFrotaAux"].where(
        df["TipoFrotaAux"].fillna("").ne(""),
        fallback["Tipo Frota"],
    )
    df["Tipo de Veiculo Padrao"] = (
        df["Tipo de Veiculo Padrao"].fillna("Tipo não selecionado").astype(str).str.strip()
    )
    df["Tipo Frota"] = df["Tipo Frota"].fillna("Tipo não selecionado").astype(str).str.strip()
    df = df.drop(columns=["TipoVeiculoPadraoAux", "TipoFrotaAux"], errors="ignore")

    if "Ajudante" in df.columns:
        df["Ajudante"] = (
            df["Ajudante"].astype(str).str.strip().str.lower().eq("sim")
        ).astype("Int64")

    if "Insucessos" in df.columns:
        df["Insucessos"] = df["Insucessos"].clip(lower=0)

    if {"Baixas", "Entregues", "Insucessos"}.issubset(df.columns):
        baixas_calc = df["Entregues"].fillna(0) + df["Insucessos"].fillna(0)
        df["Baixas"] = df["Baixas"].fillna(0).clip(lower=baixas_calc)

    print(f"  {len(df):,} linhas normalizadas")
    return df


def normalizar_planejado() -> pd.DataFrame:
    """Carrega e normaliza o planejamento Excel."""
    print("[2/3] Normalizando Planejamento (Excel)...")

    df = pd.read_excel(PLANNING_XLSX)
    print(f"  {len(df):,} linhas brutas")

    cols = list(df.columns)
    pedidos_count = sum(1 for c in cols if str(c).startswith("Pedidos"))
    if pedidos_count >= 2 and "Id Carga" not in cols:
        rename_map = {
            "Pedidos": "IdCarga",
            "Pedidos.1": "Pedidos Planejados",
            "Filial": "Filial",
            "Rota": "Rota Planejada",
            "rota": "Rota Planejada",
            "Data Planejada": "Data Planejada",
            "Volume": "Volumes Planejados",
            "Volumes": "Volumes Planejados",
            "Km": "KM Planejado Plan",
            "Tempo de Rota": "Tempo Planejado Plan (h)",
            "Tempo de Rota (h)": "Tempo Planejado Plan (h)",
            "Peso": "Peso Planejado (kg)",
            "Peso (kg)": "Peso Planejado (kg)",
        }
    else:
        rename_map = {
            "Id Carga": "IdCarga",
            "Filial": "Filial",
            "Rota": "Rota Planejada",
            "rota": "Rota Planejada",
            "Data Planejada": "Data Planejada",
            "Pedidos": "Pedidos Planejados",
            "Volumes": "Volumes Planejados",
            "Volume": "Volumes Planejados",
            "Km": "KM Planejado Plan",
            "Tempo de Rota": "Tempo Planejado Plan (h)",
            "Tempo de Rota (h)": "Tempo Planejado Plan (h)",
            "Peso": "Peso Planejado (kg)",
            "Peso (kg)": "Peso Planejado (kg)",
        }
    df = df.rename(columns=rename_map)

    if "IdCarga" in df.columns:
        df["IdCarga"] = normalize_integer_key_series(df["IdCarga"])

    if "Data Planejada" in df.columns:
        df["Data Planejada"] = normalize_date_series(df["Data Planejada"], normalize=True)

    if "Filial" in df.columns:
        df["Filial"] = canonicalizar_filial(df["Filial"], "planejamento")
        df = remover_filiais_inativas(df, "planejamento")

    for col in [
        "Pedidos Planejados",
        "Volumes Planejados",
        "KM Planejado Plan",
        "Peso Planejado (kg)",
    ]:
        if col in df.columns:
            df[col] = df[col].apply(parse_num_br)

    if "Tempo Planejado Plan (h)" in df.columns:
        df["Tempo Planejado Plan (h)"] = df["Tempo Planejado Plan (h)"].apply(
            parse_duration_to_hours
        )

    print(f"  {len(df):,} linhas normalizadas")
    return df


def mesclar(monitor: pd.DataFrame, planejado: pd.DataFrame) -> pd.DataFrame:
    """Left join monitoramento + planejamento por IdCarga e Filial."""
    print("[3/3] Mesclando Monitoramento + Planejamento...")

    colunas_plan = [
        "IdCarga",
        "Filial",
        "Data Planejada",
        "Rota Planejada",
        "Pedidos Planejados",
        "Volumes Planejados",
        "KM Planejado Plan",
        "Tempo Planejado Plan (h)",
        "Peso Planejado (kg)",
    ]
    colunas_plan = [c for c in colunas_plan if c in planejado.columns]
    chaves_merge = [
        c for c in ["IdCarga", "Filial"] if c in monitor.columns and c in planejado.columns
    ]

    df = monitor.merge(
        planejado[colunas_plan],
        on=chaves_merge,
        how="left",
        suffixes=("", "_Plan"),
    )

    df["Possui Planejado"] = df["Pedidos Planejados"].notna().astype("Int64")
    df["Rota Concluida"] = (
        (df["Status"] == "Finalizado") & (df["Baixas"].fillna(0) > 0)
    ).astype("Int64")

    if "Data Planejada" in df.columns and "Data Referencia" in df.columns:
        df["Data Referencia"] = normalize_date_series(df["Data Referencia"], normalize=True)
        df["Data Planejada"] = normalize_date_series(df["Data Planejada"], normalize=True)
        delta = (df["Data Referencia"] - df["Data Planejada"]).dt.days
        df["Gap Dias Plan vs Real"] = delta.astype("Int64")
        df["Match Temporal"] = np.where(
            df["Data Planejada"].isna(),
            "Sem Planejado",
            np.where(
                delta == 0,
                "Mesmo Dia",
                np.where(delta.abs() == 1, "D±1", "Fora D±1"),
            ),
        )

    if "Primeira Baixa" in df.columns and "Ultima Baixa" in df.columns:
        ciclo = (df["Ultima Baixa"] - df["Primeira Baixa"]).dt.total_seconds() / 3600
        df["Tempo Ciclo Entrega (h)"] = ciclo.clip(lower=0).round(1)

    print(f"  {len(df):,} linhas mescladas")
    print(
        f"  {int(df['Possui Planejado'].fillna(0).sum()):,} com planejado ({df['Possui Planejado'].fillna(0).mean()*100:.1f}%)"
    )
    if "Match Temporal" in df.columns:
        print(f"  Match temporal: {df['Match Temporal'].value_counts(dropna=False).to_dict()}")
    return df


def build_dim_filial() -> pd.DataFrame:
    """Expose da dimensao auxiliar de filiais para reuso no pipeline."""
    return load_dim_filial_aux().copy()


def build_dim_tipo_veiculo(base: pd.DataFrame) -> pd.DataFrame:
    """Gera dimensao de tipos com referencia de capacidade por janela movel."""
    dim_filial = build_dim_filial()
    filiais_unidade = set(dim_filial.loc[dim_filial["Tipo"] == "Unidade", "Filial"])
    base_ref = base.loc[base["Filial"].isin(filiais_unidade)].copy()

    if "Data Referencia" in base_ref.columns:
        base_ref["Data Referencia"] = normalize_date_series(base_ref["Data Referencia"], normalize=True)
        data_fim = base_ref["Data Referencia"].max()
    else:
        data_fim = pd.NaT

    if pd.notna(data_fim):
        data_inicio = data_fim - pd.Timedelta(days=JANELA_CAPACIDADE_DIAS - 1)
        base_ref = base_ref.loc[
            base_ref["Data Referencia"].between(data_inicio, data_fim, inclusive="both")
        ].copy()
    else:
        data_inicio = pd.NaT

    agg_rows = []
    for tipo_veiculo, grupo in base_ref.groupby("Tipo de Veiculo Padrao", dropna=False):
        agg_rows.append(
            {
                "TipoVeiculo": tipo_veiculo,
                "RotasAmostra": int(len(grupo)),
                "CapP75PedidosRef": positive_percentile(grupo["Pedidos da Rota"]),
                "CapP75VolumesRef": positive_percentile(grupo["Volumes da Rota"]),
                "CapP75PesoKgRef": positive_percentile(grupo["Peso (kg)"]),
                "CapMediaPedidosRef": positive_mean(grupo["Pedidos da Rota"]),
                "CapMediaVolumesRef": positive_mean(grupo["Volumes da Rota"]),
                "CapMediaPesoKgRef": positive_mean(grupo["Peso (kg)"]),
            }
        )
    agg = pd.DataFrame(agg_rows)
    if agg.empty:
        agg = pd.DataFrame(
            columns=[
                "TipoVeiculo",
                "RotasAmostra",
                "CapP75PedidosRef",
                "CapP75VolumesRef",
                "CapP75PesoKgRef",
                "CapMediaPedidosRef",
                "CapMediaVolumesRef",
                "CapMediaPesoKgRef",
            ]
        )
    agg["TipoVeiculo"] = agg["TipoVeiculo"].fillna("Tipo não selecionado")

    dim_tipo = pd.DataFrame(TIPOS_VEICULO)
    tipos_presentes = [
        tipo
        for tipo in agg["TipoVeiculo"].dropna().astype(str).unique().tolist()
        if tipo not in set(dim_tipo["TipoVeiculo"])
    ]
    if tipos_presentes:
        ordem_inicial = int(dim_tipo["Ordem"].max()) + 1
        extras = pd.DataFrame(
            [
                {"TipoVeiculo": tipo, "Categoria": "Outros", "Ordem": ordem_inicial + idx}
                for idx, tipo in enumerate(sorted(tipos_presentes))
            ]
        )
        dim_tipo = pd.concat([dim_tipo, extras], ignore_index=True)

    dim_tipo = dim_tipo.merge(agg, on="TipoVeiculo", how="left")
    dim_tipo["JanelaReferenciaDias"] = JANELA_CAPACIDADE_DIAS
    dim_tipo["DataInicioReferencia"] = (
        data_inicio.strftime(POWERBI_DATE_FORMAT) if pd.notna(data_inicio) else np.nan
    )
    dim_tipo["DataFimReferencia"] = (
        data_fim.strftime(POWERBI_DATE_FORMAT) if pd.notna(data_fim) else np.nan
    )
    dim_tipo["RotasAmostra"] = (
        pd.to_numeric(dim_tipo["RotasAmostra"], errors="coerce").fillna(0).astype("Int64")
    )

    colunas_decimais = [
        "CapP75PedidosRef",
        "CapP75VolumesRef",
        "CapP75PesoKgRef",
        "CapMediaPedidosRef",
        "CapMediaVolumesRef",
        "CapMediaPesoKgRef",
    ]
    for col in colunas_decimais:
        dim_tipo[col] = pd.to_numeric(dim_tipo[col], errors="coerce").round(2)

    return dim_tipo[
        [
            "TipoVeiculo",
            "Categoria",
            "Ordem",
            "JanelaReferenciaDias",
            "DataInicioReferencia",
            "DataFimReferencia",
            "RotasAmostra",
            "CapP75PedidosRef",
            "CapP75VolumesRef",
            "CapP75PesoKgRef",
            "CapMediaPedidosRef",
            "CapMediaVolumesRef",
            "CapMediaPesoKgRef",
        ]
    ].sort_values("Ordem", ignore_index=True)


COLUNAS_FATO = [
    "IdCarga",
    "Data Referencia",
    "Data Planejada",
    "Filial",
    "Tipo de Veiculo Padrao",
    "Status",
    "Placa",
    "Motorista",
    "CPF",
    "Rota",
    "Rota Planejada",
    "Transportador",
    "Tipo Frota",
    "Ajudante",
    "Performance (%)",
    "Usuario Carregamento",
    "Data de Abertura",
    "Data de Carregamento",
    "Data Atribuicao Motorista",
    "Data Inicio Rota",
    "Primeira Baixa",
    "Ultima Baixa",
    "Pedidos da Rota",
    "Volumes da Rota",
    "Peso (kg)",
    "Paradas",
    "Clientes",
    "Entregues",
    "Insucessos",
    "Baixas",
    "KM Planejado",
    "KM Realizado",
    "Tempo Planejado (h)",
    "Tempo Realizado (h)",
    "Valor Pagamento Carga",
    "Valor Pagamento Rota",
    "Valor Pagamento Remessas",
    "Valor Pagamento Km",
    "Pedidos Planejados",
    "Volumes Planejados",
    "KM Planejado Plan",
    "Tempo Planejado Plan (h)",
    "Peso Planejado (kg)",
    "Tempo Ciclo Entrega (h)",
    "Gap Dias Plan vs Real",
    "Match Temporal",
    "Possui Planejado",
    "Rota Concluida",
]

COLUNAS_FATO_INTEIRAS = [
    "IdCarga",
    "Pedidos da Rota",
    "Volumes da Rota",
    "Paradas",
    "Clientes",
    "Entregues",
    "Insucessos",
    "Baixas",
    "Pedidos Planejados",
    "Volumes Planejados",
    "Gap Dias Plan vs Real",
    "Possui Planejado",
    "Rota Concluida",
    "Ajudante",
]

COLUNAS_FATO_DECIMAIS = {
    "Peso (kg)": 2,
    "KM Planejado": 2,
    "KM Realizado": 2,
    "Tempo Planejado (h)": 1,
    "Tempo Realizado (h)": 1,
    "Valor Pagamento Carga": 2,
    "Valor Pagamento Rota": 2,
    "Valor Pagamento Remessas": 2,
    "Valor Pagamento Km": 2,
    "KM Planejado Plan": 2,
    "Tempo Planejado Plan (h)": 1,
    "Peso Planejado (kg)": 2,
    "Performance (%)": 4,
    "Tempo Ciclo Entrega (h)": 1,
}


def build_fato_rotas(base: pd.DataFrame) -> pd.DataFrame:
    """Seleciona e tipa colunas finais do fato_rotas."""
    fato = base.copy()

    for col in ["Data Referencia", "Data Planejada"]:
        if col in fato.columns:
            fato[col] = format_date_for_csv(fato[col])

    for col in [
        "Data de Abertura",
        "Data de Carregamento",
        "Data Atribuicao Motorista",
        "Data Inicio Rota",
        "Primeira Baixa",
        "Ultima Baixa",
    ]:
        if col in fato.columns:
            fato[col] = format_datetime_for_csv(fato[col])

    for col in COLUNAS_FATO:
        if col not in fato.columns:
            fato[col] = np.nan

    for col in COLUNAS_FATO_INTEIRAS:
        if col in fato.columns:
            fato[col] = pd.to_numeric(fato[col], errors="coerce").round().astype("Int64")

    for col, casas in COLUNAS_FATO_DECIMAIS.items():
        if col in fato.columns:
            fato[col] = pd.to_numeric(fato[col], errors="coerce").round(casas)

    return fato[COLUNAS_FATO].copy()


COLUNAS_FATO_PLANEJADO = [
    "IdCarga",
    "Data Planejada",
    "Filial",
    "Rota Planejada",
    "Pedidos Planejados",
    "Volumes Planejados",
    "KM Planejado Plan",
    "Tempo Planejado Plan (h)",
    "Peso Planejado (kg)",
    "Executado",
]

COLUNAS_FATO_PLANEJADO_INTEIRAS = [
    "IdCarga",
    "Pedidos Planejados",
    "Volumes Planejados",
    "Executado",
]

COLUNAS_FATO_PLANEJADO_DECIMAIS = {
    "KM Planejado Plan": 2,
    "Tempo Planejado Plan (h)": 1,
    "Peso Planejado (kg)": 2,
}


def build_fato_planejado(planejado: pd.DataFrame, ids_executados: set[int]) -> pd.DataFrame:
    """Gera fato_planejado com flag de execucao."""
    fato = planejado.copy()
    fato["Executado"] = fato["IdCarga"].isin(ids_executados).astype("Int64")

    if "Data Planejada" in fato.columns:
        fato["Data Planejada"] = format_date_for_csv(fato["Data Planejada"])

    for col in COLUNAS_FATO_PLANEJADO:
        if col not in fato.columns:
            fato[col] = np.nan

    for col in COLUNAS_FATO_PLANEJADO_INTEIRAS:
        if col in fato.columns:
            fato[col] = pd.to_numeric(fato[col], errors="coerce").round().astype("Int64")

    for col, casas in COLUNAS_FATO_PLANEJADO_DECIMAIS.items():
        if col in fato.columns:
            fato[col] = pd.to_numeric(fato[col], errors="coerce").round(casas)

    return fato[COLUNAS_FATO_PLANEJADO].copy()


def exportar_csv(df: pd.DataFrame, nome: str) -> None:
    """Salva DataFrame como CSV para Power BI."""
    caminho = POWERBI_DIR / nome
    df.to_csv(
        caminho,
        sep=POWERBI_SEPARATOR,
        index=False,
        encoding=POWERBI_ENCODING,
        decimal=",",
    )
    print(f"  {nome} - {len(df):,} linhas")


def main():
    print("=" * 60)
    print("  TRANSFORM - DASHBOARD TRANSPORTE LAST MILE")
    print("=" * 60)
    print()

    for arquivo in [MONITOR_CSV, PLANNING_XLSX, DIM_FILIAL_XLSX, DIM_PLACAS_XLSX]:
        if not arquivo.exists():
            print(f"  ERRO: {arquivo} nao encontrado")
            sys.exit(1)

    POWERBI_DIR.mkdir(parents=True, exist_ok=True)

    monitor = normalizar_monitor()
    planejado = normalizar_planejado()
    base = mesclar(monitor, planejado)

    print()
    print("Gerando dimensoes...")
    dim_tipo = build_dim_tipo_veiculo(base)
    exportar_csv(dim_tipo, "dim_tipo_veiculo.csv")

    dim_filial_csv = POWERBI_DIR / "dim_filial.csv"
    if dim_filial_csv.exists():
        dim_filial_csv.unlink()
        print("  dim_filial.csv removido - origem agora e dim_filial.xlsx")

    print()
    print("Gerando fato_rotas...")
    fato = build_fato_rotas(base)
    exportar_csv(fato, "fato_rotas.csv")

    print()
    print("Gerando fato_planejado...")
    ids_executados = {
        int(valor)
        for valor in pd.to_numeric(monitor["IdCarga"], errors="coerce").dropna().tolist()
    }
    fato_plan = build_fato_planejado(planejado, ids_executados)
    exportar_csv(fato_plan, "fato_planejado.csv")
    executados = int(pd.to_numeric(fato_plan["Executado"], errors="coerce").fillna(0).sum())
    nao_executados = len(fato_plan) - executados
    print(f"  Executados: {executados:,} | Nao executados: {nao_executados:,}")

    print()
    print("=" * 60)
    print("  CONCLUIDO")
    print("=" * 60)
    print()
    print(f"  Saida: {POWERBI_DIR}")
    print("  Arquivos: dim_tipo_veiculo.csv, fato_rotas.csv, fato_planejado.csv")
    print(f"  Separador: '{POWERBI_SEPARATOR}' | Encoding: {POWERBI_ENCODING}")
    print(f"  fato_rotas:      {len(fato):>6,} linhas ({len(COLUNAS_FATO)} colunas)")
    print(
        f"  fato_planejado:  {len(fato_plan):>6,} linhas ({len(COLUNAS_FATO_PLANEJADO)} colunas)"
    )


if __name__ == "__main__":
    main()
