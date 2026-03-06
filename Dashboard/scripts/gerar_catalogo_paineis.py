"""
Gera um catalogo canonico de measures por painel a partir da organizacao atual.

Uso:
    Dashboard/.venv/Scripts/python.exe Dashboard/scripts/gerar_catalogo_paineis.py
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_ORG = ROOT_DIR / "docs" / "KPI_ORGANIZACAO_COMPLETA.csv"
DEFAULT_CSV = ROOT_DIR / "docs" / "CATALOGO_PAINEIS_CANONICOS.csv"
DEFAULT_MD = ROOT_DIR / "docs" / "CATALOGO_PAINEIS_CANONICOS.md"

KEEP_ACTIONS = {
    "manter_base_canonica",
    "manter_semantica_kpi",
    "manter_operacional",
    "manter_investigacao",
}
SUPPORT_ACTIONS = {
    "manter_curto_prazo_consolidar_alias",
    "legado_substituir_gradualmente",
}


@dataclass(frozen=True)
class PanelMeasure:
    panel: str
    section: str
    measure_name: str
    canonical_folder: str
    role: str
    action: str
    usage_status: str
    visual_priority: str
    visual_hint: str
    rationale: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gera catalogo canonico por painel.")
    parser.add_argument("--input", type=Path, default=DEFAULT_ORG)
    parser.add_argument("--csv-output", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--md-output", type=Path, default=DEFAULT_MD)
    return parser.parse_args()


def load_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {path}")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def derive_panel(row: dict[str, str]) -> str | None:
    module_usage = row["module_usage"]
    action = row["action"]

    if action not in KEEP_ACTIONS | SUPPORT_ACTIONS:
        return None
    if module_usage == "Nao usar em novos paineis":
        return None
    if module_usage == "Fora da navegacao principal":
        return "99 Backoffice"
    if module_usage == "Suporte; fora do foco atual":
        return "98 Secundario"
    if module_usage == "Todos os paineis":
        return "00 Shared - Tendencia"
    if module_usage == "Scoreboard; SPR; ORH; Plano vs Real":
        return "00 Shared - Metas"
    if module_usage == "Scoreboard; acompanhamento mensal":
        return "00 Shared - Mensal"
    if module_usage == "Investigacao":
        return "90 Investigacao"
    if module_usage == "Plano vs Real; Investigacao":
        return "05 Plano vs Real"
    if module_usage == "Capacidade e Mix; Filial Semanal":
        return "04 Capacidade e Mix"
    if module_usage in {"Jornada / ORH", "Jornada / ORH; Scoreboard"}:
        return "03 Eficiencia SPR e ORH"
    if module_usage == "Scoreboard; Eficiencia / SPR":
        return "02 Scoreboard SPR e Performance"
    if module_usage in {"Fluxo do Dia / Torre de Controle", "Torre de Controle; Filial Semanal"}:
        return "01 Torre de Controle"
    return "97 Revisar Modulo"


def derive_section(row: dict[str, str], panel: str) -> str:
    folder = row["canonical_folder"]
    role = row["role"]
    if panel == "00 Shared - Tendencia":
        return "Tendencia Reutilizavel"
    if panel == "00 Shared - Metas":
        return "Metas Reutilizaveis"
    if panel == "00 Shared - Mensal":
        return "Acompanhamento Mensal"
    if folder.startswith("11. Investigacao"):
        return "Tabela de Investigacao"
    if folder.startswith("10. Operacional\\01"):
        return "Alertas e Ranking"
    if folder.startswith("10. Operacional\\02"):
        return "Torre Operacional"
    if folder.startswith("10. Operacional\\03"):
        return "Tabela Semanal por Filial"
    if folder.startswith("10. Operacional\\04"):
        return "Acompanhamento Mensal"
    if folder.startswith("09. KPI Semantico"):
        return "KPI Hero"
    if folder.startswith("08. Base\\01"):
        return "Fluxo e Volume"
    if folder.startswith("08. Base\\02"):
        return "SPR e Densidade"
    if folder.startswith("08. Base\\03"):
        return "ORH e Jornada"
    if folder.startswith("08. Base\\04"):
        return "Desvio Plan vs Real"
    if folder.startswith("08. Base\\05"):
        return "Performance e Eficiencia"
    if folder.startswith("08. Base\\08"):
        return "Capacidade e Ocupacao"
    if folder.startswith("08. Base\\10"):
        return "Reconciliacao"
    if role.startswith("kpi_"):
        return "KPI Hero"
    return "Diagnostico"


def derive_usage_status(row: dict[str, str]) -> str:
    if row["action"] in KEEP_ACTIONS:
        return "usar"
    if row["action"] in SUPPORT_ACTIONS:
        return "compatibilidade"
    return "evitar"


def derive_visual_priority(row: dict[str, str], panel: str) -> str:
    folder = row["canonical_folder"]
    role = row["role"]
    if panel in {"00 Shared - Tendencia", "00 Shared - Metas"}:
        return "shared"
    if folder.startswith("09. KPI Semantico") or role.startswith("kpi_"):
        return "hero"
    if folder.startswith("10. Operacional\\01"):
        return "ranking"
    if folder.startswith("10. Operacional\\03") or folder.startswith("11. Investigacao"):
        return "table"
    if folder.startswith("10. Operacional\\04"):
        return "support"
    if folder.startswith("08. Base\\08"):
        return "diagnostico"
    if folder.startswith("08. Base\\02") or folder.startswith("08. Base\\05"):
        return "diagnostico"
    if folder.startswith("08. Base\\06"):
        return "trend"
    return "support"


def derive_visual_hint(row: dict[str, str], priority: str) -> str:
    folder = row["canonical_folder"]
    if priority == "hero":
        return "card nativo ou KPI hero"
    if priority == "trend":
        return "sparkline ou linha curta"
    if priority == "ranking":
        return "matriz curta ou ranking top/bottom"
    if priority == "table":
        return "matriz operacional"
    if "Capacidade" in folder or "Ocupacao" in row["measure_name"] or "Gap Capacidade" in row["measure_name"]:
        return "barra, bullet ou matriz de capacidade"
    if "Reconciliacao" in folder or "Plano vs Real" in folder:
        return "variance, bullet ou matriz"
    return "visual diagnostico nativo"


def derive_rationale(row: dict[str, str], panel: str) -> str:
    if panel == "98 Secundario":
        return "Medida fora do foco atual; manter apenas como suporte."
    if panel == "99 Backoffice":
        return "Medida de auditoria interna; nao entra na navegacao principal."
    if row["usage_status"] == "compatibilidade":
        return "Alias de suporte; nao usar em novos visuais enquanto existir dependencia."
    if panel == "01 Torre de Controle":
        return "Leitura imediata do dia e prioridade operacional."
    if panel == "02 Scoreboard SPR e Performance":
        return "Leitura consolidada de densidade, produtividade e status dos KPIs."
    if panel == "03 Eficiencia SPR e ORH":
        return "Explica desvios de SPR, jornada e produtividade."
    if panel == "04 Capacidade e Mix":
        return "Mostra ocupacao, gaps e balanceamento por filial e tipo."
    if panel == "05 Plano vs Real":
        return "Confronta executado, planejado e match temporal."
    if panel == "90 Investigacao":
        return "Base detalhada para drill-through e tabelao operacional."
    return "Medida compartilhada entre paineis."


def build_catalog(rows: list[dict[str, str]]) -> list[PanelMeasure]:
    catalog: list[PanelMeasure] = []
    for row in rows:
        panel = derive_panel(row)
        if panel is None:
            continue
        usage_status = derive_usage_status(row)
        priority = derive_visual_priority(row, panel)
        catalog.append(
            PanelMeasure(
                panel=panel,
                section=derive_section(row, panel),
                measure_name=row["measure_name"],
                canonical_folder=row["canonical_folder"],
                role=row["role"],
                action=row["action"],
                usage_status=usage_status,
                visual_priority=priority,
                visual_hint=derive_visual_hint(row, priority),
                rationale=derive_rationale({**row, "usage_status": usage_status}, panel),
            )
        )
    return catalog


def write_csv(path: Path, rows: list[PanelMeasure]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(PanelMeasure.__dataclass_fields__.keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def render_md(rows: list[PanelMeasure]) -> str:
    panel_counts = Counter(row.panel for row in rows)
    section_counts = Counter((row.panel, row.section) for row in rows)
    allowed_counts = Counter(row.usage_status for row in rows)
    by_panel: dict[str, list[PanelMeasure]] = defaultdict(list)
    for row in rows:
        by_panel[row.panel].append(row)

    lines: list[str] = []
    lines.append("# Catalogo Canonico de Measures por Painel")
    lines.append("")
    lines.append("Fonte: `KPI_ORGANIZACAO_COMPLETA.csv` do estado atual do PBIP.")
    lines.append("")
    lines.append("## Resumo")
    lines.append("")
    lines.append("| Indicador | Qtd |")
    lines.append("|---|---|")
    lines.append(f"| Measures catalogadas | {len(rows)} |")
    for key in ["usar", "compatibilidade", "evitar"]:
        if allowed_counts.get(key):
            lines.append(f"| {key} | {allowed_counts[key]} |")
    lines.append("")
    lines.append("## Paineis")
    lines.append("")
    lines.append("| Painel | Qtd |")
    lines.append("|---|---|")
    for panel, count in panel_counts.most_common():
        lines.append(f"| {panel} | {count} |")
    lines.append("")

    preferred_panel_order = [
        "01 Torre de Controle",
        "02 Scoreboard SPR e Performance",
        "03 Eficiencia SPR e ORH",
        "04 Capacidade e Mix",
        "05 Plano vs Real",
        "90 Investigacao",
        "00 Shared - Tendencia",
        "00 Shared - Metas",
        "00 Shared - Mensal",
        "98 Secundario",
        "99 Backoffice",
        "97 Revisar Modulo",
    ]

    for panel in preferred_panel_order:
        items = by_panel.get(panel, [])
        if not items:
            continue
        lines.append(f"## {panel}")
        lines.append("")
        lines.append("| Secao | Qtd |")
        lines.append("|---|---|")
        for (row_panel, section), count in section_counts.items():
            if row_panel == panel:
                lines.append(f"| {section} | {count} |")
        lines.append("")
        lines.append("| Measure | Secao | Folder | Status | Prioridade | Visual |")
        lines.append("|---|---|---|---|---|---|")
        for item in sorted(items, key=lambda x: (x.section, x.visual_priority, x.measure_name)):
            lines.append(
                f"| {item.measure_name} | {item.section} | {item.canonical_folder} | {item.usage_status} | {item.visual_priority} | {item.visual_hint} |"
            )
        lines.append("")

    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    rows = load_rows(args.input)
    catalog = build_catalog(rows)
    write_csv(args.csv_output, catalog)
    args.md_output.parent.mkdir(parents=True, exist_ok=True)
    args.md_output.write_text(render_md(catalog), encoding="utf-8")
    print(f"[ok] Catalogo CSV: {args.csv_output}")
    print(f"[ok] Catalogo MD: {args.md_output}")


if __name__ == "__main__":
    main()
