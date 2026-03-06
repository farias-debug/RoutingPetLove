"""
Gera um manifesto de construcao visual do relatorio canônico.

Uso:
    Dashboard/.venv/Scripts/python.exe Dashboard/scripts/gerar_manifesto_construcao_relatorio.py
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT_DIR / "docs" / "MANIFESTO_CONSTRUCAO_RELATORIO.csv"
DEFAULT_MD = ROOT_DIR / "docs" / "MANIFESTO_CONSTRUCAO_RELATORIO.md"
DEFAULT_JSON = ROOT_DIR / "manifests" / "report_manifest_canonico.json"


@dataclass(frozen=True)
class VisualSlot:
    page_code: str
    page_name: str
    section: str
    slot_id: str
    grid_col_start: int
    grid_col_span: int
    y: int
    height: int
    visual_type: str
    title: str
    measure_primary: str
    measures_support: str
    usage_rule: str
    notes: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gera manifesto de construcao do relatorio.")
    parser.add_argument("--csv-output", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--md-output", type=Path, default=DEFAULT_MD)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON)
    return parser.parse_args()


def build_slots() -> list[VisualSlot]:
    slots: list[VisualSlot] = []

    def add(page_code: str, page_name: str, section: str, slot_id: str, start: int, span: int, y: int, h: int,
            visual_type: str, title: str, primary: str, support: str = "", notes: str = "") -> None:
        slots.append(
            VisualSlot(
                page_code=page_code,
                page_name=page_name,
                section=section,
                slot_id=slot_id,
                grid_col_start=start,
                grid_col_span=span,
                y=y,
                height=h,
                visual_type=visual_type,
                title=title,
                measure_primary=primary,
                measures_support=support,
                usage_rule="usar apenas measures com status 'usar' do catalogo; evitar 90/91",
                notes=notes,
            )
        )

    # 01 Torre de Controle
    add("01", "Torre de Controle", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros Operacionais", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "Faixa unica de filtros no topo.")
    add("01", "Torre de Controle", "Hero", "hero_rotas", 1, 2, 88, 110, "card", "Rotas", "Total Rotas", "Var D-1 Rotas; Var WoW Rotas", "Card principal do volume do dia.")
    add("01", "Torre de Controle", "Hero", "hero_pedidos", 3, 2, 88, 110, "card", "Pedidos", "Total Pedidos", "Op Media Diaria Pedidos", "")
    add("01", "Torre de Controle", "Hero", "hero_volumes", 5, 2, 88, 110, "card", "Volumes", "Total Volumes", "Op Media Diaria Volumes", "")
    add("01", "Torre de Controle", "Hero", "hero_veiculos", 7, 2, 88, 110, "card", "Veiculos", "Veiculos Ativos", "Op Rotas Carregadas; Op Rotas Finalizadas", "")
    add("01", "Torre de Controle", "Hero", "hero_alerta", 9, 4, 88, 110, "card-alert", "Alerta Prioritario", "Op Alerta Prioritario", "Alerta Operacional; Alerta Nivel; Alerta Cor", "Microcopy de acao obrigatoria.")
    add("01", "Torre de Controle", "Progresso", "progress_rotas", 1, 4, 222, 120, "bullet", "Progresso Rotas", "Op Progresso Rotas (%)", "Op Rotas Planejadas; Op Rotas Realizadas", "")
    add("01", "Torre de Controle", "Progresso", "progress_pedidos", 5, 4, 222, 120, "bullet", "Progresso Pedidos", "Op Progresso Pedidos (%)", "Op Pedidos Planejados; Op Pedidos Realizados", "")
    add("01", "Torre de Controle", "Ranking", "ranking_filiais", 9, 4, 222, 220, "matrix", "Filiais Prioritarias", "Op Rank Score Filial", "Pior Filial SPR Semana; Pior Filial ORH Semana; Pior Filial Entregas Semana", "Ordenar por score e severidade.")
    add("01", "Torre de Controle", "Tabela", "weekly_matrix", 1, 8, 366, 300, "matrix", "Tabela Semanal por Filial", "Total Rotas", "Total Pedidos; Total Volumes; SPR Ped Realizado; Pedidos/h Realizado; Op Rank Score Filial", "Linhas por filial; colunas de status com formatacao condicional.")

    # 02 Scoreboard
    add("02", "Scoreboard SPR e Performance", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros Operacionais", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "")
    add("02", "Scoreboard SPR e Performance", "Hero", "hero_spr_ped", 1, 3, 88, 116, "kpi-card", "SPR Pedidos", "KPI SPR Ped Valor", "KPI SPR Ped Meta; KPI SPR Ped Delta%; KPI SPR Ped Status Texto", "")
    add("02", "Scoreboard SPR e Performance", "Hero", "hero_spr_vol", 4, 3, 88, 116, "kpi-card", "SPR Volumes", "KPI SPR Vol Valor", "KPI SPR Vol Meta; KPI SPR Vol Delta%; KPI SPR Vol Status Texto", "")
    add("02", "Scoreboard SPR e Performance", "Hero", "hero_desvio_spr", 7, 3, 88, 116, "kpi-card", "Desvio SPR", "KPI Desvio SPR Valor", "KPI Desvio SPR Meta; KPI Desvio SPR Delta; KPI Desvio SPR Status Texto", "")
    add("02", "Scoreboard SPR e Performance", "Hero", "hero_orh", 10, 3, 88, 116, "kpi-card", "ORH", "KPI ORH Valor", "KPI ORH Meta; KPI ORH Delta; KPI ORH Status Texto", "")
    add("02", "Scoreboard SPR e Performance", "Diagnostico", "bar_produtividade", 1, 6, 228, 190, "clustered-bar", "Produtividade por Filial", "Pedidos/h Realizado", "Volumes/h Realizado; Peso/h Realizado (kg/h)", "")
    add("02", "Scoreboard SPR e Performance", "Diagnostico", "bar_eficiencia_km", 7, 6, 228, 190, "clustered-bar", "Eficiencia KM", "Pedidos/KM Realizado", "Volumes/KM Realizado; Eficiencia KM (%)", "")
    add("02", "Scoreboard SPR e Performance", "Tabela", "scoreboard_matrix", 1, 12, 442, 224, "matrix", "Scoreboard por Filial", "SPR Ped Realizado", "SPR Vol Realizado; Pedidos/h Realizado; Volumes/h Realizado; KPI SPR Ped Status Texto; KPI ORH Status Texto", "Matriz enxuta com semaforo.")

    # 03 Eficiencia SPR e ORH
    add("03", "Eficiencia SPR e ORH", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros Operacionais", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "")
    add("03", "Eficiencia SPR e ORH", "Hero", "hero_gap_spr", 1, 3, 88, 116, "card", "Gap SPR", "Gap SPR vs Meta (pts)", "Desvio SPR Ped Plan vs Real (pts)", "")
    add("03", "Eficiencia SPR e ORH", "Hero", "hero_tempo_real", 4, 3, 88, 116, "card", "Tempo Medio", "Tempo Medio Realizado (h)", "Meta ORH Tempo (h); Gap ORH vs Meta (h)", "")
    add("03", "Eficiencia SPR e ORH", "Hero", "hero_utilizacao", 7, 3, 88, 116, "card", "Utilizacao Jornada", "Utilizacao Jornada 8h (%)", "Ociosidade Jornada 8h (%)", "")
    add("03", "Eficiencia SPR e ORH", "Hero", "hero_orh_status", 10, 3, 88, 116, "kpi-card", "Status ORH", "KPI ORH Valor", "KPI ORH Status Texto; KPI ORH Acao", "")
    add("03", "Eficiencia SPR e ORH", "Diagnostico", "driver_spr", 1, 6, 228, 190, "variance-bar", "Drivers de SPR", "SPR Ped Realizado", "SPR Ped Planejado; Desvio SPR Ped Plan vs Real (pts)", "")
    add("03", "Eficiencia SPR e ORH", "Diagnostico", "driver_orh", 7, 6, 228, 190, "column", "Jornada e Overtime", "% Rotas Overtime (>8h)", "% Rotas Curtas (<4h); Potencial Consolidacao (rotas)", "")
    add("03", "Eficiencia SPR e ORH", "Tabela", "efficiency_matrix", 1, 12, 442, 224, "matrix", "Matriz de Eficiencia por Filial", "SPR Ped Realizado", "Tempo Medio Realizado (h); Utilizacao Jornada 8h (%); Pedidos/h Realizado; Desvio Pedidos/KM", "")

    # 04 Capacidade e Mix
    add("04", "Capacidade e Mix", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros Operacionais", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "")
    add("04", "Capacidade e Mix", "Hero", "hero_ocupacao_composta", 1, 3, 88, 116, "card", "Ocupacao Composta", "Ocupacao Composta (%)", "Status Capacidade Texto; Acao Capacidade", "")
    add("04", "Capacidade e Mix", "Hero", "hero_ocupacao_filial", 4, 3, 88, 116, "card", "Ocupacao Filial", "Ocupacao Filial Composta (%)", "Status Capacidade Filial Texto; Acao Capacidade Filial", "")
    add("04", "Capacidade e Mix", "Hero", "hero_gap_semana", 7, 3, 88, 116, "card", "Gap Volumes Semana", "Gap Capacidade Volumes Semana", "Gap Capacidade Pedidos Semana; Gap Capacidade Veiculos Semana", "")
    add("04", "Capacidade e Mix", "Hero", "hero_tipo_critico", 10, 3, 88, 116, "card-alert", "Tipo Critico", "Tipo Veiculo Critico Ocupacao", "Status Capacidade Cor", "Card de excecao por mix.")
    add("04", "Capacidade e Mix", "Diagnostico", "bar_tipo_ocupacao", 1, 6, 228, 190, "clustered-bar", "Ocupacao por Tipo", "Ocupacao Volumes Tipo (%)", "Ocupacao Pedidos Tipo (%)", "Eixo por dim_tipo_veiculo.")
    add("04", "Capacidade e Mix", "Diagnostico", "bar_filial_ocupacao", 7, 6, 228, 190, "clustered-bar", "Ocupacao por Filial", "Ocupacao Filial Composta (%)", "Ocupacao Filial Volumes (%); Ocupacao Filial Pedidos (%)", "")
    add("04", "Capacidade e Mix", "Tabela", "capacity_matrix", 1, 12, 442, 224, "matrix", "Capacidade Semanal por Filial", "Ocupacao Filial Composta (%)", "Gap Capacidade Volumes Semana; Gap Capacidade Pedidos Semana; Status Capacidade Filial Texto; Acao Capacidade Filial", "")

    # 05 Plano vs Real
    add("05", "Plano vs Real", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros Operacionais", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "")
    add("05", "Plano vs Real", "Hero", "hero_aderencia_ped", 1, 3, 88, 116, "card", "Aderencia Pedidos", "Aderencia Pedidos (%)", "Desvio Absoluto Pedidos", "")
    add("05", "Plano vs Real", "Hero", "hero_aderencia_vol", 4, 3, 88, 116, "card", "Aderencia Volumes", "Aderencia Volumes (%)", "Desvio Absoluto Volumes", "")
    add("05", "Plano vs Real", "Hero", "hero_aderencia_km", 7, 3, 88, 116, "card", "Aderencia KM", "Aderencia KM (%)", "Desvio Absoluto KM", "")
    add("05", "Plano vs Real", "Hero", "hero_match", 10, 3, 88, 116, "card", "Match Mesmo Dia", "% Match Mesmo Dia", "% Match D+/-1; % Match Fora Janela", "")
    add("05", "Plano vs Real", "Diagnostico", "variance_aderencia", 1, 6, 228, 190, "variance-bar", "Gaps por Eixo", "Desvio Absoluto Pedidos", "Desvio Absoluto Volumes; Desvio Absoluto KM; Desvio Absoluto Tempo", "")
    add("05", "Plano vs Real", "Diagnostico", "reconciliacao_status", 7, 6, 228, 190, "clustered-bar", "Cobertura e Match", "Cobertura Rotas (%)", "% Match Mesmo Dia; % Sem Planejado", "")
    add("05", "Plano vs Real", "Tabela", "planreal_matrix", 1, 12, 442, 224, "matrix", "Plano vs Real por Filial", "Aderencia Pedidos (%)", "Aderencia Volumes (%); Aderencia KM (%); Cobertura Rotas (%); % Match Mesmo Dia", "")

    # 90 Investigacao
    add("90", "Investigacao", "Filtros", "filters_bar", 1, 12, 0, 64, "slicer-row", "Filtros de Drill", "dim_calendario[Data]", "dim_filial[Filial]; dim_tipo_veiculo[TipoVeiculo]", "Ativar drill por rota/carga quando existir.")
    add("90", "Investigacao", "Tabela", "investigation_table", 1, 12, 88, 578, "matrix", "Linhas Operacionais", "TblExp Delta Pedidos Plan x Real", "TblExp Delta Volumes Plan x Real; TblExp Delta KM Plan x Real; TblExp SPR Delta Ped Linha; TblExp SPR Delta Vol Linha", "Linhas por rota e filial.")

    return slots


def write_csv(path: Path, rows: list[VisualSlot]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(VisualSlot.__dataclass_fields__.keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def write_json(path: Path, rows: list[VisualSlot]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pages: dict[tuple[str, str], list[dict[str, object]]] = {}
    for row in rows:
        slot = {
            "section": row.section,
            "slot_id": row.slot_id,
            "grid_col_start": row.grid_col_start,
            "grid_col_span": row.grid_col_span,
            "y": row.y,
            "height": row.height,
            "visual_type": row.visual_type,
            "title": row.title,
            "measure_primary": row.measure_primary,
            "measures_support": [item.strip() for item in row.measures_support.split(";") if item.strip()],
            "usage_rule": row.usage_rule,
            "notes": row.notes,
        }
        pages.setdefault((row.page_code, row.page_name), []).append(slot)

    payload = {
        "manifest_name": "report_manifest_canonico",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "report_entrypoint": "Dashboard/Painel Monitoramento - Petlove.pbip",
        "theme_path": "Dashboard/theme/monitoramento_operacional_base.json",
        "grid": {
            "width": 1280,
            "height": 720,
            "columns": 12,
            "spacing": [8, 16, 24],
        },
        "rules": {
            "use_only": [
                "manter_base_canonica",
                "manter_semantica_kpi",
                "manter_operacional",
                "manter_investigacao",
            ],
            "avoid_folders": [
                "90. Legado\\01. HTML",
                "90. Legado\\02. Alias de Compatibilidade",
                "91. Legado\\01. Diario Alias",
                "99. Backoffice\\01. Nao Publicavel",
            ],
            "preferred_visual_order": ["nativo", "svg_dax", "deneb"],
        },
        "build_order": [
            "01 Torre de Controle",
            "04 Capacidade e Mix",
            "02 Scoreboard SPR e Performance",
            "05 Plano vs Real",
            "03 Eficiencia SPR e ORH",
            "90 Investigacao",
        ],
        "pages": [
            {
                "page_code": code,
                "page_name": name,
                "slots": slots,
            }
            for (code, name), slots in sorted(pages.items())
        ],
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


def render_md(rows: list[VisualSlot]) -> str:
    lines: list[str] = []
    lines.append("# Manifesto de Construcao do Relatorio")
    lines.append("")
    lines.append("Grid de referencia: `1280x720`, 12 colunas, espacamentos `8/16/24`.")
    lines.append("")

    pages: dict[tuple[str, str], list[VisualSlot]] = {}
    for row in rows:
        pages.setdefault((row.page_code, row.page_name), []).append(row)

    for (code, name), items in sorted(pages.items()):
        lines.append(f"## {code} {name}")
        lines.append("")
        lines.append("| Slot | Secao | Grid | Y | H | Visual | Titulo | Medida principal | Apoio |")
        lines.append("|---|---|---|---|---|---|---|---|---|")
        for item in items:
            grid = f"{item.grid_col_start}-{item.grid_col_start + item.grid_col_span - 1}"
            lines.append(
                f"| {item.slot_id} | {item.section} | {grid} | {item.y} | {item.height} | {item.visual_type} | {item.title} | {item.measure_primary} | {item.measures_support} |"
            )
        lines.append("")

    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    rows = build_slots()
    write_csv(args.csv_output, rows)
    write_json(args.json_output, rows)
    args.md_output.parent.mkdir(parents=True, exist_ok=True)
    args.md_output.write_text(render_md(rows), encoding="utf-8")
    print(f"[ok] Manifesto CSV: {args.csv_output}")
    print(f"[ok] Manifesto MD: {args.md_output}")
    print(f"[ok] Manifesto JSON: {args.json_output}")


if __name__ == "__main__":
    main()
