"""
Organiza o catalogo atual de measures do PBIP canônico.

Uso:
    Dashboard/.venv/Scripts/python.exe Dashboard/scripts/organizar_catalogo_measures.py

Entradas padrao:
    Dashboard/docs/KPI_INVENTARIO_ATUAL.csv

Saidas padrao:
    Dashboard/docs/KPI_ORGANIZACAO_COMPLETA.csv
    Dashboard/docs/KPI_ORGANIZACAO_COMPLETA.md
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INVENTORY = ROOT_DIR / "docs" / "KPI_INVENTARIO_ATUAL.csv"
DEFAULT_OUTPUT_CSV = ROOT_DIR / "docs" / "KPI_ORGANIZACAO_COMPLETA.csv"
DEFAULT_OUTPUT_MD = ROOT_DIR / "docs" / "KPI_ORGANIZACAO_COMPLETA.md"
COMPATIBILITY_ALIASES = {
    "Card SPR Pedidos Real",
    "Desvio SPR Pedidos (pts)",
    "Desvio SPR Volumes (pts)",
    "Meta Filial SPR",
    "Meta Global ORH",
}


@dataclass(frozen=True)
class OrganizedMeasure:
    measure_name: str
    current_display_folder: str
    current_root_folder: str
    current_layer: str
    domain: str
    role: str
    action: str
    canonical_folder: str
    module_usage: str
    note: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classifica e organiza o catalogo atual de measures.")
    parser.add_argument(
        "--inventory",
        type=Path,
        default=DEFAULT_INVENTORY,
        help=f"Inventario CSV de entrada (padrao: {DEFAULT_INVENTORY})",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=DEFAULT_OUTPUT_CSV,
        help=f"Saida CSV (padrao: {DEFAULT_OUTPUT_CSV})",
    )
    parser.add_argument(
        "--md-output",
        type=Path,
        default=DEFAULT_OUTPUT_MD,
        help=f"Saida Markdown (padrao: {DEFAULT_OUTPUT_MD})",
    )
    return parser.parse_args()


def load_inventory(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Inventario nao encontrado: {path}")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def folder_parts(row: dict[str, str]) -> list[str]:
    folder = row.get("display_folder", "") or row.get("current_display_folder", "")
    return [part.strip() for part in folder.split("\\") if part.strip()]


def kpi_family(name: str) -> str:
    if "SPR Ped" in name:
        return "SPR Pedidos"
    if "SPR Vol" in name:
        return "SPR Volumes"
    if "Entregas" in name:
        return "Entrega"
    if "ORH" in name:
        return "ORH"
    if "Desvio SPR" in name:
        return "Desvio SPR"
    return "KPI Geral"


def infer_domain(row: dict[str, str]) -> str:
    root = row["root_folder"]
    name = row["measure_name"]
    parts = folder_parts(row)
    subfolder = parts[1] if len(parts) > 1 else ""
    if name in COMPATIBILITY_ALIASES:
        return "Legado KPI"
    if root == "08. Base":
        mapping = {
            "01. Execucao e Volume": "Execucao e Volume",
            "02. SPR e Densidade": "SPR e Densidade",
            "03. ORH e Jornada": "ORH e Jornada",
            "04. Plano vs Real": "Plano vs Real",
            "05. Produtividade": "Produtividade",
            "06. Temporal": "Temporal",
            "07. Metas": "Metas",
            "08. Frota e Capacidade": "Frota e Capacidade",
            "09. Entrega": "Entrega",
            "10. Reconciliacao": "Reconciliacao",
        }
        return mapping.get(subfolder, "Nao Classificado")
    if root == "09. KPI Semantico":
        return kpi_family(name)
    if root == "10. Operacional":
        if name.startswith("TabSem "):
            return "Operacional Semanal"
        if name.startswith("TabMes "):
            return "Operacional Mensal"
        if subfolder == "01. Alertas e Rankings":
            return "Alertas e Rankings"
        if subfolder == "02. Torre de Controle":
            return "Torre de Controle"
        if subfolder == "03. Semanal":
            return "Operacional Semanal"
        if subfolder == "04. Mensal":
            return "Operacional Mensal"
        return "Operacional"
    if root == "11. Investigacao":
        return "Investigacao"
    if root == "90. Legado":
        if name.startswith("HTML "):
            return "Apresentacao"
        return "Legado KPI"
    if root == "91. Legado":
        return "Operacional Diario"
    if root == "99. Backoffice":
        return "Backoffice"
    if root == "01. Resumo Executivo":
        return "Execucao e Volume"
    if root == "02. SPR - Densidade":
        return "SPR e Densidade"
    if root == "03. ORH - Unidade e Cenarios":
        return "ORH e Jornada"
    if root == "04. Desvios Plan x Real":
        return "Plano vs Real"
    if root == "05. Produtividade/h":
        return "Produtividade"
    if root == "06. Eficiencia KM":
        return "Eficiencia KM"
    if root == "07. Frota e Capacidade":
        return "Frota e Capacidade"
    if root == "08. Eficacia de Entrega":
        return "Entrega"
    if root in {"09. Variacoes Temporais", "11. Variacoes Temporais"}:
        return "Temporal"
    if root == "10. Reconciliacao":
        return "Reconciliacao"
    if root == "11. Metas e Parametros":
        return "Metas"
    if root == "12. KPI Cards":
        return kpi_family(name)
    if root == "13. Rankings e Alertas KPI":
        return "Alertas e Rankings"
    if root == "14. HTML Content":
        return "Apresentacao"
    if root == "15. Torre de Controle Operacional":
        return "Torre de Controle"
    if root == "19. Tabeloes Exportacao DAX":
        if name.startswith("TblExp "):
            return "Investigacao"
        if name.startswith("TblDia "):
            return "Operacional Diario"
        if name.startswith("TabSem "):
            return "Operacional Semanal"
        if name.startswith("TabMes "):
            return "Operacional Mensal"
        return "Operacional"
    if root == "_Nao Publicavel":
        return "Backoffice"
    return "Nao Classificado"


def infer_role(row: dict[str, str]) -> str:
    name = row["measure_name"]
    root = row["root_folder"]
    if name.startswith("HTML "):
        return "visual_html"
    if name in COMPATIBILITY_ALIASES:
        return "legado_alias"
    if name.startswith("KPI "):
        for suffix in [
            " Valor",
            " Meta",
            " Delta",
            " Delta%",
            " Delta (pp)",
            " Status",
            " Status Codigo",
            " Status Texto",
            " Cor",
            " Icone",
            " Texto Card",
            " Trend D-1",
            " Trend WoW",
            " Origem Meta",
            " Acao",
        ]:
            if name.endswith(suffix):
                return f"kpi_{suffix.strip().lower().replace(' ', '_').replace('%', 'pct').replace('(', '').replace(')', '')}"
        return "kpi_semantico"
    if name.startswith("TblExp "):
        return "investigacao_linha"
    if name.startswith("TblDia "):
        return "operacional_diario"
    if name.startswith("TabSem "):
        return "operacional_semanal"
    if name.startswith("TabMes "):
        return "operacional_mensal"
    if name.startswith("Op "):
        return "torre_controle"
    if root == "13. Rankings e Alertas KPI":
        return "ranking_alerta"
    if root in {"09. Variacoes Temporais", "11. Variacoes Temporais"}:
        return "temporal"
    if root == "11. Metas e Parametros":
        return "meta"
    if root == "_Nao Publicavel":
        return "backoffice"
    if row["is_simple_alias"] == "yes":
        return "alias_semantico"
    return "base_analitica"


def infer_action(row: dict[str, str]) -> str:
    name = row["measure_name"]
    root = row["root_folder"]
    role = infer_role(row)
    if name in COMPATIBILITY_ALIASES:
        return "legado_substituir_gradualmente"
    if root in {"14. HTML Content", "90. Legado"} or name.startswith("HTML "):
        return "congelar_legado"
    if root in {"_Nao Publicavel", "99. Backoffice"}:
        return "manter_oculto"
    if root == "91. Legado" or name.startswith("TblDia "):
        return "legado_substituir_gradualmente"
    if name.startswith("TabSem "):
        return "manter_curto_prazo_consolidar_alias"
    if name.startswith("TabMes "):
        return "manter_operacional"
    if root == "11. Investigacao" or name.startswith("TblExp "):
        return "manter_investigacao"
    if name.startswith("Op ") or root in {"13. Rankings e Alertas KPI", "10. Operacional"}:
        return "manter_operacional"
    if name.startswith("KPI ") or root == "09. KPI Semantico":
        return "manter_semantica_kpi"
    if root in {
        "08. Base",
        "01. Resumo Executivo",
        "02. SPR - Densidade",
        "03. ORH - Unidade e Cenarios",
        "04. Desvios Plan x Real",
        "05. Produtividade/h",
        "06. Eficiencia KM",
        "07. Frota e Capacidade",
        "08. Eficacia de Entrega",
        "09. Variacoes Temporais",
        "10. Reconciliacao",
        "11. Metas e Parametros",
        "11. Variacoes Temporais",
    }:
        if role == "alias_semantico":
            return "manter_base_canonica"
        return "manter_base_canonica"
    return "revisar"


def canonical_folder(row: dict[str, str]) -> str:
    domain = infer_domain(row)
    name = row["measure_name"]
    current_folder = row.get("display_folder", "") or row.get("current_display_folder", "")
    if name in COMPATIBILITY_ALIASES:
        return "90. Legado\\02. Alias de Compatibilidade"
    if name.startswith("TblDia "):
        return "91. Legado\\01. Diario Alias"
    if name.startswith("TabSem "):
        return "10. Operacional\\03. Semanal Alias"
    if name.startswith("TabMes "):
        return "10. Operacional\\04. Mensal Alias"
    if row["root_folder"] in {
        "08. Base",
        "09. KPI Semantico",
        "10. Operacional",
        "11. Investigacao",
        "90. Legado",
        "91. Legado",
        "99. Backoffice",
    } and current_folder:
        return current_folder
    if name.startswith("HTML "):
        return "90. Legado\\01. HTML"
    if name.startswith("TblExp "):
        return "11. Investigacao\\01. Linha Operacional"
    if name.startswith("Op "):
        return "10. Operacional\\02. Torre de Controle"
    if row["root_folder"] == "13. Rankings e Alertas KPI":
        return "10. Operacional\\01. Alertas e Rankings"
    if row["root_folder"] == "_Nao Publicavel":
        return "99. Backoffice\\01. Nao Publicavel"
    if row["root_folder"] == "11. Metas e Parametros":
        return "08. Base\\07. Metas"
    if row["root_folder"] in {"09. Variacoes Temporais", "11. Variacoes Temporais"}:
        return "08. Base\\06. Temporal"
    if row["root_folder"] == "12. KPI Cards":
        family = kpi_family(name)
        if family == "SPR Pedidos":
            return "09. KPI Semantico\\01. SPR Pedidos"
        if family == "SPR Volumes":
            return "09. KPI Semantico\\02. SPR Volumes"
        if family == "Entrega":
            return "09. KPI Semantico\\03. Entrega"
        if family == "ORH":
            return "09. KPI Semantico\\04. ORH"
        if family == "Desvio SPR":
            return "09. KPI Semantico\\05. Desvio SPR"
        return "09. KPI Semantico\\99. Outros"
    mapping = {
        "Execucao e Volume": "08. Base\\01. Execucao e Volume",
        "SPR e Densidade": "08. Base\\02. SPR e Densidade",
        "ORH e Jornada": "08. Base\\03. ORH e Jornada",
        "Plano vs Real": "08. Base\\04. Plano vs Real",
        "Produtividade": "08. Base\\05. Produtividade",
        "Eficiencia KM": "08. Base\\05. Produtividade",
        "Frota e Capacidade": "08. Base\\08. Frota e Capacidade",
        "Entrega": "08. Base\\09. Entrega",
        "Reconciliacao": "08. Base\\10. Reconciliacao",
    }
    return mapping.get(domain, "98. Revisar\\01. Sem Classificacao")


def module_usage(row: dict[str, str]) -> str:
    domain = infer_domain(row)
    if domain == "Execucao e Volume":
        return "Fluxo do Dia / Torre de Controle"
    if domain in {"SPR e Densidade", "SPR Pedidos", "SPR Volumes", "Desvio SPR", "Produtividade", "Eficiencia KM"}:
        return "Scoreboard; Eficiencia / SPR"
    if domain == "ORH e Jornada":
        return "Jornada / ORH"
    if domain == "ORH":
        return "Jornada / ORH; Scoreboard"
    if domain == "Frota e Capacidade":
        return "Capacidade e Mix; Filial Semanal"
    if domain in {"Plano vs Real", "Reconciliacao"}:
        return "Plano vs Real; Investigacao"
    if domain == "Entrega":
        return "Suporte; fora do foco atual"
    if domain == "Temporal":
        return "Todos os paineis"
    if domain == "Metas":
        return "Scoreboard; SPR; ORH; Plano vs Real"
    if domain == "Alertas e Rankings":
        return "Torre de Controle; Filial Semanal"
    if domain == "Operacional Mensal":
        return "Scoreboard; acompanhamento mensal"
    if domain in {"Operacional Semanal", "Operacional Diario", "Operacional", "Torre de Controle"}:
        return "Torre de Controle; Filial Semanal"
    if domain == "Investigacao":
        return "Investigacao"
    if domain == "Apresentacao":
        return "Nao usar em novos paineis"
    if domain == "Legado KPI":
        return "Nao usar em novos paineis"
    if domain == "Backoffice":
        return "Fora da navegacao principal"
    return "Revisar"


def note(row: dict[str, str]) -> str:
    name = row["measure_name"]
    if name.startswith("HTML "):
        return "Apresentacao legada; nao usar como fonte de regra de negocio."
    if name in COMPATIBILITY_ALIASES:
        return "Alias de compatibilidade; manter so enquanto houver dependencia externa."
    if name.startswith("TblDia "):
        return "Ja esta em pasta marcada como legado; revisar necessidade frente a TabSem."
    if name.startswith("TabSem "):
        return "Wrapper semanal; varios sao aliases diretos e pedem consolidacao posterior."
    if name.startswith("TabMes "):
        return "Camada mensal de acompanhamento; manter fora da primeira dobra operacional."
    if name.startswith("TblExp "):
        return "Base correta para drill-through e tabelao operacional."
    if name.startswith("Op "):
        return "Camada operacional da Torre de Controle."
    if name.startswith("KPI "):
        if row["is_simple_alias"] == "yes":
            return "Alias semantico valido; manter se sustenta contrato de KPI."
        return "Parte do contrato semantico de KPI."
    if name == "Total Peso (kg)":
        return "Alias de negocio mais legivel; pode permanecer como nome canonico."
    if row["duplicate_group"]:
        return f"Formula compartilhada com o grupo {row['duplicate_group']}; revisar semantica, nao remover automaticamente."
    return ""


def organize(rows: list[dict[str, str]]) -> list[OrganizedMeasure]:
    organized = []
    for row in rows:
        organized.append(
            OrganizedMeasure(
                measure_name=row["measure_name"],
                current_display_folder=row["display_folder"],
                current_root_folder=row["root_folder"],
                current_layer=row["layer"],
                domain=infer_domain(row),
                role=infer_role(row),
                action=infer_action(row),
                canonical_folder=canonical_folder(row),
                module_usage=module_usage(row),
                note=note(row),
            )
        )
    return organized


def write_csv(path: Path, rows: list[OrganizedMeasure]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "measure_name",
                "current_display_folder",
                "current_root_folder",
                "current_layer",
                "domain",
                "role",
                "action",
                "canonical_folder",
                "module_usage",
                "note",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def render_markdown(rows: list[OrganizedMeasure]) -> str:
    action_counts = Counter(row.action for row in rows)
    domain_counts = Counter(row.domain for row in rows)
    folder_counts = Counter(row.canonical_folder for row in rows)
    by_action: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        by_action[row.action].append(row.measure_name)

    lines: list[str] = []
    lines.append("# Organizacao Completa das Measures")
    lines.append("")
    lines.append("Fonte: `_Medidas.tmdl` do PBIP canonico, via inventario atual.")
    lines.append("")
    lines.append("## Resumo")
    lines.append("")
    lines.append("| Indicador | Qtd |")
    lines.append("|---|---|")
    lines.append(f"| Measures mapeadas | {len(rows)} |")
    for action, count in action_counts.most_common():
        lines.append(f"| {action} | {count} |")
    lines.append("")

    lines.append("## Dominios")
    lines.append("")
    lines.append("| Dominio | Qtd |")
    lines.append("|---|---|")
    for domain, count in domain_counts.most_common():
        lines.append(f"| {domain} | {count} |")
    lines.append("")

    lines.append("## Estrutura Canonica Recomendada")
    lines.append("")
    lines.append("| Pasta canonica | Qtd |")
    lines.append("|---|---|")
    for folder, count in folder_counts.most_common():
        lines.append(f"| {folder} | {count} |")
    lines.append("")

    lines.append("## Grupos Criticos")
    lines.append("")
    lines.append("1. `90. Legado\\01. HTML`: congelar como legado de apresentacao.")
    lines.append("2. `90. Legado\\02. Alias de Compatibilidade` e `91. Legado\\01. Diario Alias`: manter so por compatibilidade.")
    lines.append("3. `10. Operacional\\03. Semanal Alias`: manter curto prazo, mas consolidar aliases no futuro.")
    lines.append("4. `09. KPI Semantico`: manter como camada semantica oficial.")
    lines.append("5. `08. Base\\08. Frota e Capacidade` e `10. Operacional\\02. Torre de Controle`: sao os blocos mais importantes para o foco do painel.")
    lines.append("")

    lines.append("## Acoes por Categoria")
    lines.append("")
    for action in [
        "manter_base_canonica",
        "manter_semantica_kpi",
        "manter_operacional",
        "manter_investigacao",
        "manter_oculto",
        "manter_curto_prazo_consolidar_alias",
        "legado_substituir_gradualmente",
        "congelar_legado",
        "revisar_alias",
        "revisar",
    ]:
        names = by_action.get(action, [])
        if not names:
            continue
        lines.append(f"### {action}")
        lines.append("")
        lines.append(f"- Quantidade: `{len(names)}`")
        lines.append(f"- Exemplo: `{', '.join(names[:15])}`")
        lines.append("")

    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    rows = load_inventory(args.inventory)
    organized = organize(rows)
    write_csv(args.csv_output, organized)
    args.md_output.parent.mkdir(parents=True, exist_ok=True)
    args.md_output.write_text(render_markdown(organized), encoding="utf-8")
    print(f"[ok] Organizacao CSV: {args.csv_output}")
    print(f"[ok] Organizacao MD: {args.md_output}")


if __name__ == "__main__":
    main()
