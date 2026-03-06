"""
Auditoria do catalogo atual de measures a partir do TMDL canonico.

Uso:
    Dashboard/.venv/Scripts/python.exe Dashboard/scripts/auditar_kpis.py

Entrada padrao:
    Dashboard/Painel Monitoramento - Petlove.SemanticModel/definition/tables/_Medidas.tmdl

Saida padrao:
    Dashboard/docs/KPI_AUDITORIA_ATUAL.md
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MEASURES_TMDL = (
    ROOT_DIR
    / "Painel Monitoramento - Petlove.SemanticModel"
    / "definition"
    / "tables"
    / "_Medidas.tmdl"
)
DEFAULT_TABLES_DIR = (
    ROOT_DIR / "Painel Monitoramento - Petlove.SemanticModel" / "definition" / "tables"
)
DEFAULT_OUTPUT = ROOT_DIR / "docs" / "KPI_AUDITORIA_ATUAL.md"
DEFAULT_CSV_OUTPUT = ROOT_DIR / "docs" / "KPI_INVENTARIO_ATUAL.csv"


@dataclass(frozen=True)
class MeasureInfo:
    name: str
    display_folder: str
    expression: str


@dataclass(frozen=True)
class TableTypeStats:
    table: str
    total_columns: int
    string_columns: int
    numeric_columns: int
    datetime_columns: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audita o catalogo atual de KPIs pelo TMDL.")
    parser.add_argument(
        "--measures",
        type=Path,
        default=DEFAULT_MEASURES_TMDL,
        help=f"Caminho do _Medidas.tmdl (padrao: {DEFAULT_MEASURES_TMDL})",
    )
    parser.add_argument(
        "--tables-dir",
        type=Path,
        default=DEFAULT_TABLES_DIR,
        help=f"Diretorio das tabelas TMDL (padrao: {DEFAULT_TABLES_DIR})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Caminho do relatorio Markdown (padrao: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=DEFAULT_CSV_OUTPUT,
        help=f"Caminho do inventario CSV (padrao: {DEFAULT_CSV_OUTPUT})",
    )
    parser.add_argument(
        "--top-folders",
        type=int,
        default=15,
        help="Quantidade de pastas mais pesadas no ranking.",
    )
    return parser.parse_args()


def load_text(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {path}")
    return path.read_text(encoding="utf-8", errors="ignore").splitlines()


def parse_measures(path: Path) -> list[MeasureInfo]:
    lines = load_text(path)
    measures: list[MeasureInfo] = []
    i = 0
    while i < len(lines):
        match = re.match(r"\s*measure '([^']+)'\s*=\s*(.*)", lines[i])
        if not match:
            i += 1
            continue

        name = match.group(1)
        expression_lines = [match.group(2).strip()]

        j = i + 1
        while j < len(lines) and not re.match(
            r"\s*(formatString:|displayFolder:|lineageTag:|annotation )", lines[j]
        ):
            expression_lines.append(lines[j].strip())
            j += 1

        display_folder = ""
        k = j
        while k < len(lines):
            if re.match(r"\s*measure '([^']+)'\s*=", lines[k]):
                break
            folder_match = re.match(r"\s*displayFolder:\s*(.*)", lines[k])
            if folder_match:
                display_folder = folder_match.group(1).strip()
                break
            k += 1

        expression = re.sub(r"\s+", " ", " ".join(x for x in expression_lines if x)).strip()
        measures.append(
            MeasureInfo(name=name, display_folder=display_folder, expression=expression)
        )
        i = j

    return measures


def parse_table_type_stats(tables_dir: Path, table_name: str) -> TableTypeStats | None:
    path = tables_dir / f"{table_name}.tmdl"
    if not path.exists():
        return None

    lines = load_text(path)
    total = 0
    string_columns = 0
    numeric_columns = 0
    datetime_columns = 0

    i = 0
    while i < len(lines):
        if not re.match(r"\s*column ", lines[i]):
            i += 1
            continue

        total += 1
        data_type = ""
        j = i + 1
        while j < len(lines):
            if re.match(r"\s*(column |partition )", lines[j]):
                break
            match = re.match(r"\s*dataType:\s*(.*)", lines[j])
            if match:
                data_type = match.group(1).strip()
                break
            j += 1

        if data_type == "string":
            string_columns += 1
        elif data_type in {"int64", "double", "decimal"}:
            numeric_columns += 1
        elif data_type in {"dateTime", "date"}:
            datetime_columns += 1

        i = j

    return TableTypeStats(
        table=table_name,
        total_columns=total,
        string_columns=string_columns,
        numeric_columns=numeric_columns,
        datetime_columns=datetime_columns,
    )


def prefix_counts(measures: list[MeasureInfo]) -> Counter:
    counter = Counter()
    for measure in measures:
        for prefix in ["KPI ", "HTML ", "TabSem ", "TabMes ", "TblDia ", "TblExp ", "Op "]:
            if measure.name.startswith(prefix):
                counter[prefix.strip()] += 1
    return counter


def layer_counts(measures: list[MeasureInfo]) -> Counter:
    counter = Counter()
    for measure in measures:
        counter[classify_layer(measure)] += 1
    return counter


def classify_layer(measure: MeasureInfo) -> str:
    root = measure.display_folder.split("\\")[0] if measure.display_folder else "(sem pasta)"
    if root in {"14. HTML Content"} or measure.name.startswith("HTML "):
        return "Apresentacao"
    if root == "90. Legado":
        return "Apresentacao" if measure.name.startswith("HTML ") else "Compatibilidade"
    if root == "91. Legado":
        return "Compatibilidade"
    if root in {"12. KPI Cards", "09. KPI Semantico"} or measure.name.startswith("KPI "):
        return "Semantica KPI"
    if root == "11. Investigacao":
        return "Investigacao"
    if root == "99. Backoffice":
        return "Backoffice"
    if root in {
        "13. Rankings e Alertas KPI",
        "15. Torre de Controle Operacional",
        "19. Tabeloes Exportacao DAX",
        "10. Operacional",
        "11. Investigacao",
    } or measure.name.startswith(("TabSem ", "TabMes ", "TblDia ", "TblExp ", "Op ")):
        return "Operacional"
    return "Base e Analitica"


def simple_aliases(measures: list[MeasureInfo]) -> list[MeasureInfo]:
    return [m for m in measures if re.fullmatch(r"\[[^\]]+\]", m.expression)]


def exact_formula_duplicates(measures: list[MeasureInfo]) -> list[list[str]]:
    groups: dict[str, list[str]] = defaultdict(list)
    for measure in measures:
        groups[measure.expression].append(measure.name)
    duplicates = [sorted(names) for names in groups.values() if len(names) > 1]
    duplicates.sort(key=lambda names: (-len(names), names))
    return duplicates


def weekly_daily_overlap(measures: list[MeasureInfo]) -> tuple[int, int, int, list[str]]:
    weekly = {
        measure.name.replace("TabSem ", "").strip()
        for measure in measures
        if measure.name.startswith("TabSem ")
    }
    daily = {
        measure.name.replace("TblDia ", "").strip()
        for measure in measures
        if measure.name.startswith("TblDia ")
    }
    overlap = sorted(weekly & daily)
    return len(weekly), len(daily), len(overlap), overlap


def folder_counts(measures: list[MeasureInfo]) -> Counter:
    return Counter(measure.display_folder for measure in measures)


def root_folder_counts(measures: list[MeasureInfo]) -> Counter:
    return Counter(
        measure.display_folder.split("\\")[0] if measure.display_folder else "(sem pasta)"
        for measure in measures
    )


def render_markdown(
    measures_path: Path,
    measures: list[MeasureInfo],
    table_stats: list[TableTypeStats],
    top_folders: list[tuple[str, int]],
    root_folders: list[tuple[str, int]],
    prefixes: Counter,
    layers: Counter,
    alias_list: list[MeasureInfo],
    duplicate_groups: list[list[str]],
    weekly_count: int,
    daily_count: int,
    overlap_count: int,
    overlap_sample: list[str],
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines: list[str] = []

    lines.append("# Auditoria Atual de Measures")
    lines.append("")
    lines.append(f"- Gerado em: `{now}`")
    lines.append(f"- Fonte canonica: `{measures_path}`")
    lines.append("")

    lines.append("## Resumo Executivo")
    lines.append("")
    lines.append("| Indicador | Valor |")
    lines.append("|---|---|")
    lines.append(f"| Measures totais | {len(measures)} |")
    lines.append(f"| Display folders unicos | {len({m.display_folder for m in measures})} |")
    lines.append(f"| Aliases simples | {len(alias_list)} |")
    lines.append(f"| Grupos com formula identica | {len(duplicate_groups)} |")
    lines.append(f"| Overlap TabSem x TblDia | {overlap_count} |")
    lines.append("")

    lines.append("## Camadas Logicas")
    lines.append("")
    lines.append("| Camada | Qtd |")
    lines.append("|---|---|")
    for layer in [
        "Base e Analitica",
        "Semantica KPI",
        "Operacional",
        "Investigacao",
        "Compatibilidade",
        "Apresentacao",
        "Backoffice",
    ]:
        lines.append(f"| {layer} | {layers.get(layer, 0)} |")
    lines.append("")

    lines.append("## Familias por Prefixo")
    lines.append("")
    lines.append("| Prefixo | Qtd |")
    lines.append("|---|---|")
    for key in ["KPI", "HTML", "Op", "TblExp", "TblDia", "TabSem", "TabMes"]:
        lines.append(f"| {key} | {prefixes.get(key, 0)} |")
    lines.append("")

    lines.append("## Pastas Raiz Mais Pesadas")
    lines.append("")
    lines.append("| Pasta raiz | Qtd |")
    lines.append("|---|---|")
    for folder, count in root_folders:
        lines.append(f"| {folder} | {count} |")
    lines.append("")

    lines.append("## Display Folders Mais Pesadas")
    lines.append("")
    lines.append("| DisplayFolder | Qtd |")
    lines.append("|---|---|")
    for folder, count in top_folders:
        lines.append(f"| {folder} | {count} |")
    lines.append("")

    lines.append("## Tipagem das Tabelas Principais")
    lines.append("")
    lines.append("| Tabela | Colunas | String | Numerica | DateTime |")
    lines.append("|---|---|---|---|---|")
    for item in table_stats:
        lines.append(
            f"| {item.table} | {item.total_columns} | {item.string_columns} | {item.numeric_columns} | {item.datetime_columns} |"
        )
    lines.append("")

    lines.append("## Redundancias Objetivas")
    lines.append("")
    lines.append(f"- `TabSem`: `{weekly_count}` medidas")
    lines.append(f"- `TblDia`: `{daily_count}` medidas")
    lines.append(f"- Intersecao nominal: `{overlap_count}`")
    lines.append(f"- Exemplo de overlap: `{', '.join(overlap_sample[:20])}`")
    lines.append(f"- Aliases simples: `{len(alias_list)}`")
    lines.append(
        f"- Exemplos de alias simples: `{', '.join(m.name for m in alias_list[:20])}`"
    )
    lines.append("")

    lines.append("## Formulas Iguais em Measures Diferentes")
    lines.append("")
    if duplicate_groups:
        for group in duplicate_groups[:10]:
            lines.append(f"- `{', '.join(group)}`")
    else:
        lines.append("- Nenhum grupo com formula identica encontrado.")
    lines.append("")

    lines.append("## Diagnostico")
    lines.append("")
    lines.append("1. O catalogo agora esta reorganizado por camadas canonicas dentro da mesma tabela `_Medidas`.")
    lines.append("2. `08. Base`, `09. KPI Semantico`, `10. Operacional` e `11. Investigacao` passaram a separar melhor negocio, contrato de KPI e consumo operacional.")
    lines.append("3. `90. Legado` e `91. Legado` isolam apresentacao antiga e tabelas diarias legadas para evitar expansao acidental.")
    lines.append("4. A duplicidade `TabSem` x `TblDia` continua estrutural e precisa ser consolidada antes de qualquer nova expansao.")
    lines.append("5. O inventario abaixo agora reflete o estado real do TMDL apos a reorganizacao de display folders.")
    lines.append("")

    lines.append("## Regras de Congelamento Recomendadas")
    lines.append("")
    lines.append("1. Nao criar novas measures fora de uma arquitetura canonica revisada.")
    lines.append("2. Congelar `90. Legado` e `91. Legado` como zonas de compatibilidade, sem novos usos.")
    lines.append("3. Consolidar `TabSem`, `TabMes` e `TblDia` antes de abrir novas familias de KPI.")
    lines.append("4. Reduzir aliases simples sempre que a medida nao acrescentar semantica real.")
    lines.append("5. Manter como canonico: `08. Base` -> `09. KPI Semantico` -> `10. Operacional` -> `11. Investigacao`.")
    lines.append("")

    return "\n".join(lines) + "\n"


def write_inventory_csv(
    path: Path,
    measures: list[MeasureInfo],
    duplicate_groups: list[list[str]],
) -> None:
    duplicate_map: dict[str, str] = {}
    for idx, group in enumerate(duplicate_groups, start=1):
        group_id = f"DUP-{idx:02d}"
        for measure_name in group:
            duplicate_map[measure_name] = group_id

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "measure_name",
                "display_folder",
                "root_folder",
                "layer",
                "prefix_family",
                "is_simple_alias",
                "duplicate_group",
                "expression",
            ],
        )
        writer.writeheader()
        for measure in measures:
            prefix_family = next(
                (
                    prefix.strip()
                    for prefix in ["KPI ", "HTML ", "TabSem ", "TabMes ", "TblDia ", "TblExp ", "Op "]
                    if measure.name.startswith(prefix)
                ),
                "",
            )
            writer.writerow(
                {
                    "measure_name": measure.name,
                    "display_folder": measure.display_folder,
                    "root_folder": measure.display_folder.split("\\")[0]
                    if measure.display_folder
                    else "",
                    "layer": classify_layer(measure),
                    "prefix_family": prefix_family,
                    "is_simple_alias": "yes"
                    if re.fullmatch(r"\[[^\]]+\]", measure.expression)
                    else "no",
                    "duplicate_group": duplicate_map.get(measure.name, ""),
                    "expression": measure.expression,
                }
            )


def main() -> None:
    args = parse_args()
    measures = parse_measures(args.measures)
    if not measures:
        raise RuntimeError(f"Nenhuma measure encontrada em: {args.measures}")

    prefixes = prefix_counts(measures)
    layers = layer_counts(measures)
    aliases = simple_aliases(measures)
    duplicates = exact_formula_duplicates(measures)
    weekly_count, daily_count, overlap_count, overlap_sample = weekly_daily_overlap(
        measures
    )

    tables = []
    for table_name in ["fato_rotas", "fato_planejado", "dim_filial", "dim_tipo_veiculo"]:
        stats = parse_table_type_stats(args.tables_dir, table_name)
        if stats:
            tables.append(stats)

    markdown = render_markdown(
        measures_path=args.measures,
        measures=measures,
        table_stats=tables,
        top_folders=folder_counts(measures).most_common(args.top_folders),
        root_folders=root_folder_counts(measures).most_common(10),
        prefixes=prefixes,
        layers=layers,
        alias_list=aliases,
        duplicate_groups=duplicates,
        weekly_count=weekly_count,
        daily_count=daily_count,
        overlap_count=overlap_count,
        overlap_sample=overlap_sample,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(markdown, encoding="utf-8")
    write_inventory_csv(args.csv_output, measures, duplicates)
    print(f"[ok] Auditoria gerada em: {args.output}")


if __name__ == "__main__":
    main()
