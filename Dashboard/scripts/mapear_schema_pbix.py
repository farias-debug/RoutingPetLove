from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MODEL_DEF = ROOT / "Painel Monitoramento - Petlove.SemanticModel" / "definition"
REPORT_DEF = ROOT / "Painel Monitoramento - Petlove.Report" / "definition"
PBI_OUTPUT = ROOT / "output" / "powerbi"
DOCS_DIR = ROOT / "docs"


@dataclass
class ColumnInfo:
    name: str
    data_type: str | None
    source_column: str | None
    summarize_by: str | None
    line: int


@dataclass
class MeasureInfo:
    name: str
    display_folder: str | None
    format_string: str | None
    line: int


@dataclass
class PartitionInfo:
    name: str
    kind: str
    files: list[str]
    locales: list[str]
    source_preview: str | None
    line: int


@dataclass
class TableInfo:
    name: str
    columns: list[ColumnInfo]
    measures: list[MeasureInfo]
    partitions: list[PartitionInfo]


@dataclass
class RelationshipInfo:
    name: str
    from_column: str | None
    to_column: str | None
    line: int


def parse_table_file(path: Path) -> TableInfo:
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    columns: list[ColumnInfo] = []
    measures: list[MeasureInfo] = []
    partitions: list[PartitionInfo] = []

    current_col: ColumnInfo | None = None
    current_meas: MeasureInfo | None = None
    current_part: dict | None = None

    for i, line in enumerate(lines):
        line_no = i + 1

        m_col = re.match(r"\s*column\s+(.+)$", line)
        if m_col:
            current_col = ColumnInfo(
                name=m_col.group(1).strip().strip("'"),
                data_type=None,
                source_column=None,
                summarize_by=None,
                line=line_no,
            )
            columns.append(current_col)
            current_meas = None
            current_part = None
            continue

        m_meas = re.match(r"\s*measure\s+(.+?)\s*=", line)
        if m_meas:
            current_meas = MeasureInfo(
                name=m_meas.group(1).strip().strip("'"),
                display_folder=None,
                format_string=None,
                line=line_no,
            )
            measures.append(current_meas)
            current_col = None
            current_part = None
            continue

        m_part = re.match(r"\s*partition\s+(.+?)\s*=\s*(\w+)", line)
        if m_part:
            current_part = {
                "name": m_part.group(1).strip().strip("'"),
                "kind": m_part.group(2),
                "line": line_no,
                "source_lines": [],
            }
            current_col = None
            current_meas = None
            continue

        if current_col:
            m_dt = re.match(r"\s*dataType:\s*(.+)$", line)
            if m_dt:
                current_col.data_type = m_dt.group(1).strip()
            m_src = re.match(r"\s*sourceColumn:\s*(.+)$", line)
            if m_src:
                current_col.source_column = m_src.group(1).strip().strip("'")
            m_sum = re.match(r"\s*summarizeBy:\s*(.+)$", line)
            if m_sum:
                current_col.summarize_by = m_sum.group(1).strip()

        if current_meas:
            m_folder = re.match(r"\s*displayFolder:\s*(.+)$", line)
            if m_folder:
                current_meas.display_folder = m_folder.group(1).strip()
            m_fmt = re.match(r"\s*formatString:\s*(.+)$", line)
            if m_fmt:
                current_meas.format_string = m_fmt.group(1).strip()

        if current_part is not None:
            current_part["source_lines"].append(line)

    # finalize partitions with parsed file paths/locales
    for part in re.finditer(r"\s*partition\s+(.+?)\s*=\s*(\w+)", "\n".join(lines)):
        pass

    # second pass for partitions to capture full blocks reliably
    joined = "\n".join(lines)
    part_blocks = re.finditer(
        r"^\s*partition\s+(.+?)\s*=\s*(\w+)(.*?)(?=^\s*partition\s+|\Z)",
        joined,
        flags=re.M | re.S,
    )
    for block in part_blocks:
        name = block.group(1).strip().strip("'")
        kind = block.group(2).strip()
        body = block.group(3)
        files = re.findall(r'File\.Contents\("([^"]+)"\)', body)
        locales = re.findall(
            r'Table\.TransformColumnTypes\([^)]*?,\s*"([^"]+)"\)', body, flags=re.S
        )
        source_preview = None
        src_match = re.search(r"source\s*=\s*(.+)", body, flags=re.S)
        if src_match:
            preview = src_match.group(1).strip().splitlines()
            if preview:
                source_preview = preview[0].strip()
        # find line by direct scan
        part_line = 1
        for idx, ln in enumerate(lines):
            if re.match(rf"\s*partition\s+{re.escape(name)}\s*=", ln):
                part_line = idx + 1
                break
        partitions.append(
            PartitionInfo(
                name=name,
                kind=kind,
                files=files,
                locales=locales,
                source_preview=source_preview,
                line=part_line,
            )
        )

    return TableInfo(name=path.stem, columns=columns, measures=measures, partitions=partitions)


def parse_relationships(path: Path) -> list[RelationshipInfo]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    rels: list[RelationshipInfo] = []
    current: RelationshipInfo | None = None
    for i, line in enumerate(lines):
        m_rel = re.match(r"\s*relationship\s+(.+)$", line)
        if m_rel:
            if current:
                rels.append(current)
            current = RelationshipInfo(
                name=m_rel.group(1).strip().strip("'"),
                from_column=None,
                to_column=None,
                line=i + 1,
            )
            continue
        if current:
            m_from = re.match(r"\s*fromColumn:\s*(.+)$", line)
            if m_from:
                current.from_column = m_from.group(1).strip().strip("'")
            m_to = re.match(r"\s*toColumn:\s*(.+)$", line)
            if m_to:
                current.to_column = m_to.group(1).strip().strip("'")
    if current:
        rels.append(current)
    return rels


def parse_model_table_refs(path: Path) -> list[str]:
    if not path.exists():
        return []
    refs = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"\s*ref\s+table\s+(.+)$", line)
        if m:
            refs.append(m.group(1).strip().strip("'"))
    return refs


def parse_report_pages(report_def: Path) -> dict:
    pages_meta = report_def / "pages" / "pages.json"
    if not pages_meta.exists():
        return {"page_count": 0, "active_page": None, "pages": [], "total_visuals": 0}
    meta = json.loads(pages_meta.read_text(encoding="utf-8"))
    page_ids = meta.get("pageOrder", [])
    pages = []
    total_visuals = 0
    for pid in page_ids:
        page_dir = report_def / "pages" / pid
        page_file = page_dir / "page.json"
        visuals_dir = page_dir / "visuals"
        page_name = None
        if page_file.exists():
            page_name = json.loads(page_file.read_text(encoding="utf-8")).get("displayName")
        visual_count = (
            len([x for x in visuals_dir.iterdir() if x.is_dir()]) if visuals_dir.exists() else 0
        )
        total_visuals += visual_count
        pages.append({"id": pid, "name": page_name, "visual_count": visual_count})
    return {
        "page_count": len(page_ids),
        "active_page": meta.get("activePageName"),
        "pages": pages,
        "total_visuals": total_visuals,
    }


def tabular_profile(path: Path) -> dict:
    if not path.exists():
        return {"exists": False}
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path, sep=";", encoding="utf-8-sig", low_memory=False)
    elif path.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path)
    else:
        return {"exists": True}
    return {"exists": True, "rows": int(len(df)), "columns": int(len(df.columns))}


def build_snapshot() -> dict:
    tables = [parse_table_file(p) for p in sorted((MODEL_DEF / "tables").glob("*.tmdl"))]
    relationships = parse_relationships(MODEL_DEF / "relationships.tmdl")
    refs = parse_model_table_refs(MODEL_DEF / "model.tmdl")
    report = parse_report_pages(REPORT_DEF)

    measure_folder_counts: Counter = Counter()
    for t in tables:
        for m in t.measures:
            measure_folder_counts[m.display_folder or "(sem pasta)"] += 1

    issues = []
    table_map = {t.name: t for t in tables}
    if "fato_rotas" in table_map:
        fr = table_map["fato_rotas"]
        metric_cols = {
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
            "Possui Planejado",
            "Rota Concluida",
            "Ajudante",
            "Performance (%)",
            "Tempo Ciclo Entrega (h)",
            "Gap Dias Plan vs Real",
        }
        typed_as_string = [
            c.name for c in fr.columns if c.name in metric_cols and (c.data_type or "").lower() == "string"
        ]
        if typed_as_string:
            issues.append(
                {
                    "severity": "high",
                    "title": "Colunas métricas/flags em texto no fato_rotas",
                    "detail": f"{len(typed_as_string)} colunas críticas estão com dataType string.",
                    "columns": typed_as_string,
                }
            )
        if fr.partitions and fr.partitions[0].files and fr.partitions[0].files[0].startswith("C:\\"):
            issues.append(
                {
                    "severity": "medium",
                    "title": "Caminho absoluto no source do fato_rotas",
                    "detail": fr.partitions[0].files[0],
                }
            )
        has_typed_step = any(p.locales for p in fr.partitions)
        if not has_typed_step:
            issues.append(
                {
                    "severity": "medium",
                    "title": "fato_rotas sem Table.TransformColumnTypes no M",
                    "detail": "Partição importa CSV sem tipagem explícita.",
                }
            )

    for rel in relationships:
        if rel.name.startswith("AutoDetected_"):
            issues.append(
                {
                    "severity": "low",
                    "title": "Relationship com nome automático",
                    "detail": rel.name,
                }
            )

    if "dim_calendario" in table_map:
        cal = table_map["dim_calendario"]
        if cal.partitions and cal.partitions[0].source_preview:
            pass
        # quick static check for fixed year window in calculated table
        cal_file = (MODEL_DEF / "tables" / "dim_calendario.tmdl").read_text(
            encoding="utf-8", errors="ignore"
        )
        if "DATE(2026, 1, 1)" in cal_file and "DATE(2026, 12, 31)" in cal_file:
            issues.append(
                {
                    "severity": "medium",
                    "title": "Calendário fixo em 2026",
                    "detail": "dim_calendario usa janela estática 2026-01-01 a 2026-12-31.",
                }
            )

    csv_profiles = {
        "fato_rotas.csv": tabular_profile(PBI_OUTPUT / "fato_rotas.csv"),
        "fato_planejado.csv": tabular_profile(PBI_OUTPUT / "fato_planejado.csv"),
        "dim_filial.xlsx": tabular_profile(ROOT / "data" / "tab_auxiliar" / "dim_filial.xlsx"),
        "dim_tipo_veiculo.csv": tabular_profile(PBI_OUTPUT / "dim_tipo_veiculo.csv"),
    }

    snapshot = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model_definition_path": str(MODEL_DEF),
        "report_definition_path": str(REPORT_DEF),
        "tables": [asdict(t) for t in tables],
        "relationships": [asdict(r) for r in relationships],
        "model_table_refs": refs,
        "report": report,
        "measure_folder_counts": dict(sorted(measure_folder_counts.items())),
        "csv_profiles": csv_profiles,
        "counts": {
            "tables_total": len(tables),
            "columns_total": sum(len(t.columns) for t in tables),
            "measures_total": sum(len(t.measures) for t in tables),
            "relationships_total": len(relationships),
            "measure_folders_total": len(measure_folder_counts),
        },
        "issues": issues,
    }
    return snapshot


def md_table(headers: list[str], rows: list[list[str]]) -> str:
    out = []
    out.append("| " + " | ".join(headers) + " |")
    out.append("|" + "|".join(["---"] * len(headers)) + "|")
    for row in rows:
        safe = [str(x).replace("\n", " ").replace("|", "\\|") for x in row]
        out.append("| " + " | ".join(safe) + " |")
    return "\n".join(out)


def write_docs(snapshot: dict) -> tuple[Path, Path, Path]:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    schema_json = DOCS_DIR / "SCHEMA_MODELO_ATUAL.json"
    schema_md = DOCS_DIR / "SCHEMA_MODELO_ATUAL.md"
    diag_md = DOCS_DIR / "DIAGNOSTICO_MODELO_ATUAL.md"

    schema_json.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Schema Completo do Modelo Power BI (Atual)")
    lines.append("")
    lines.append(f"- Gerado em: `{snapshot['generated_at']}`")
    lines.append(f"- SemanticModel: `{snapshot['model_definition_path']}`")
    lines.append(f"- Report: `{snapshot['report_definition_path']}`")
    lines.append("")
    lines.append("## Resumo")
    lines.append("")
    c = snapshot["counts"]
    rows = [[k, v] for k, v in c.items()]
    lines.append(md_table(["Metrica", "Valor"], rows))
    lines.append("")

    lines.append("## Tabelas e Colunas")
    lines.append("")
    for t in snapshot["tables"]:
        lines.append(f"### `{t['name']}`")
        lines.append("")
        lines.append(f"- Colunas: `{len(t['columns'])}`")
        lines.append(f"- Measures: `{len(t['measures'])}`")
        lines.append(f"- Partitions: `{len(t['partitions'])}`")
        lines.append("")
        col_rows = [
            [
                col["name"],
                col["data_type"] or "unknown",
                col["summarize_by"] or "",
                col["source_column"] or "",
            ]
            for col in t["columns"]
        ]
        if col_rows:
            lines.append(md_table(["Coluna", "DataType", "SummarizeBy", "SourceColumn"], col_rows))
            lines.append("")
        if t["partitions"]:
            part_rows = []
            for p in t["partitions"]:
                part_rows.append(
                    [
                        p["name"],
                        p["kind"],
                        ", ".join(p["files"]) if p["files"] else "",
                        ", ".join(p["locales"]) if p["locales"] else "",
                    ]
                )
            lines.append(md_table(["Partition", "Kind", "Files", "Locales"], part_rows))
            lines.append("")

    lines.append("## Relacionamentos")
    lines.append("")
    rel_rows = [
        [r["name"], r["from_column"] or "", r["to_column"] or ""]
        for r in snapshot["relationships"]
    ]
    lines.append(md_table(["Nome", "From", "To"], rel_rows))
    lines.append("")

    lines.append("## Measures por Pasta")
    lines.append("")
    folder_rows = [
        [folder, count] for folder, count in snapshot["measure_folder_counts"].items()
    ]
    lines.append(md_table(["DisplayFolder", "Qtd Measures"], folder_rows))
    lines.append("")

    lines.append("## Catalogo Completo de Measures")
    lines.append("")
    all_measures = []
    for t in snapshot["tables"]:
        for m in t["measures"]:
            all_measures.append([t["name"], m["name"], m["display_folder"] or "", m["format_string"] or ""])
    all_measures.sort(key=lambda x: (x[2], x[1]))
    lines.append(md_table(["Tabela", "Measure", "DisplayFolder", "FormatString"], all_measures))
    lines.append("")

    lines.append("## Report (Paginas e Visuais)")
    lines.append("")
    report = snapshot["report"]
    lines.append(f"- Paginas: `{report['page_count']}`")
    lines.append(f"- Visuais totais: `{report['total_visuals']}`")
    lines.append(f"- Pagina ativa: `{report['active_page']}`")
    lines.append("")
    page_rows = [[p["id"], p["name"] or "", p["visual_count"]] for p in report["pages"]]
    lines.append(md_table(["PageId", "Nome", "Qtd Visuais"], page_rows))
    lines.append("")

    lines.append("## CSV Profiles")
    lines.append("")
    csv_rows = []
    for name, profile in snapshot["csv_profiles"].items():
        csv_rows.append([name, profile.get("exists"), profile.get("rows", ""), profile.get("columns", "")])
    lines.append(md_table(["Arquivo", "Existe", "Rows", "Columns"], csv_rows))
    lines.append("")

    schema_md.write_text("\n".join(lines), encoding="utf-8")

    d = []
    d.append("# Diagnostico do Modelo Power BI (Rodada 1)")
    d.append("")
    d.append(f"- Data de referencia: `{snapshot['generated_at']}`")
    d.append("")
    d.append("## Achados")
    d.append("")
    if snapshot["issues"]:
        issue_rows = []
        for it in snapshot["issues"]:
            issue_rows.append([it.get("severity"), it.get("title"), it.get("detail")])
        d.append(md_table(["Severidade", "Titulo", "Detalhe"], issue_rows))
    else:
        d.append("Nenhum problema detectado por regra automatica.")
    d.append("")
    d.append("## Melhorias Recomendadas")
    d.append("")
    titles = {it.get("title", "") for it in snapshot.get("issues", [])}
    recs = []
    if "fato_rotas sem Table.TransformColumnTypes no M" in titles:
        recs.append(
            "Tipar `fato_rotas` no Power Query (Table.TransformColumnTypes) com locale consistente."
        )
    if "Colunas métricas/flags em texto no fato_rotas" in titles:
        recs.append(
            "Converter colunas metricas de `fato_rotas` para tipo numerico no semantic model."
        )
    if "Calendário fixo em 2026" in titles:
        recs.append(
            "Revisar calendario fixo de 2026 para janela dinamica baseada nos fatos."
        )
    if any("Caminho absoluto" in t for t in titles):
        recs.append("Evitar caminhos absolutos em particoes para melhorar portabilidade.")
    if any("automático" in t for t in titles):
        recs.append(
            "Renomear relacionamentos auto-gerados para nomes semanticos estaveis."
        )
    if not recs:
        recs.append("Sem recomendacoes criticas nesta rodada.")

    for idx, rec in enumerate(recs, start=1):
        d.append(f"{idx}. {rec}")
    d.append("")
    d.append("## Organizacao Canonica Validada")
    d.append("")
    d.append("- `Painel Monitoramento - Petlove.pbix`")
    d.append("- `Painel Monitoramento - Petlove.pbip`")
    d.append("- `Painel Monitoramento - Petlove.Report/`")
    d.append("- `Painel Monitoramento - Petlove.SemanticModel/`")
    d.append("")

    diag_md.write_text("\n".join(d), encoding="utf-8")
    return schema_json, schema_md, diag_md


def main() -> None:
    snapshot = build_snapshot()
    schema_json, schema_md, diag_md = write_docs(snapshot)
    print(f"Snapshot JSON: {schema_json}")
    print(f"Schema MD: {schema_md}")
    print(f"Diagnostico MD: {diag_md}")
    print(f"Counts: {snapshot['counts']}")
    print(f"Issues: {len(snapshot['issues'])}")


if __name__ == "__main__":
    main()
