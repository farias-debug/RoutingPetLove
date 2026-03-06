"""
Aplica a organizacao canonica de display folders no _Medidas.tmdl.

Uso:
    Dashboard/.venv/Scripts/python.exe Dashboard/scripts/aplicar_organizacao_measures.py

Entradas padrao:
    Dashboard/Painel Monitoramento - Petlove.SemanticModel/definition/tables/_Medidas.tmdl
    Dashboard/docs/KPI_ORGANIZACAO_COMPLETA.csv
"""

from __future__ import annotations

import argparse
import csv
import re
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TMDL = (
    ROOT_DIR
    / "Painel Monitoramento - Petlove.SemanticModel"
    / "definition"
    / "tables"
    / "_Medidas.tmdl"
)
DEFAULT_MAPPING = ROOT_DIR / "docs" / "KPI_ORGANIZACAO_COMPLETA.csv"

MEASURE_START_RE = re.compile(r"^\s*measure '([^']+)' =")
DISPLAY_FOLDER_RE = re.compile(r"^(\s*displayFolder:\s*)(.+?)(\s*)$")
LINEAGE_TAG_RE = re.compile(r"^\s*lineageTag:")


@dataclass(frozen=True)
class ApplyStats:
    total_measures: int
    mapped_measures: int
    updated_measures: int
    inserted_display_folder: int
    unchanged_measures: int
    missing_mapping: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Aplica displayFolder canonico para todas as measures.")
    parser.add_argument(
        "--tmdl",
        type=Path,
        default=DEFAULT_TMDL,
        help=f"Caminho do _Medidas.tmdl (padrao: {DEFAULT_TMDL})",
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=DEFAULT_MAPPING,
        help=f"Caminho do CSV de organizacao (padrao: {DEFAULT_MAPPING})",
    )
    return parser.parse_args()


def load_mapping(path: Path) -> dict[str, str]:
    if not path.exists():
        raise FileNotFoundError(f"CSV de organizacao nao encontrado: {path}")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return {row["measure_name"]: row["canonical_folder"] for row in rows}


def split_measure_blocks(lines: list[str]) -> list[tuple[int, int, str]]:
    starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        match = MEASURE_START_RE.match(line)
        if match:
            starts.append((index, match.group(1)))

    blocks: list[tuple[int, int, str]] = []
    for position, (start, name) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        blocks.append((start, end, name))
    return blocks


def update_block(lines: list[str], start: int, end: int, target_folder: str) -> tuple[list[str], bool, bool]:
    block = lines[start:end]
    inserted = False
    changed = False

    for offset, line in enumerate(block):
        match = DISPLAY_FOLDER_RE.match(line)
        if not match:
            continue
        current_folder = match.group(2)
        if current_folder == target_folder:
            return block, False, False
        block[offset] = f"{match.group(1)}{target_folder}{match.group(3)}"
        return block, True, False

    insert_at = None
    for offset, line in enumerate(block):
        if LINEAGE_TAG_RE.match(line):
            insert_at = offset
            break
    if insert_at is None:
        insert_at = len(block)
    block.insert(insert_at, f"\t\tdisplayFolder: {target_folder}\n")
    inserted = True
    changed = True
    return block, changed, inserted


def apply_folders(tmdl_path: Path, mapping: dict[str, str]) -> ApplyStats:
    if not tmdl_path.exists():
        raise FileNotFoundError(f"TMDL nao encontrado: {tmdl_path}")

    original_text = tmdl_path.read_text(encoding="utf-8")
    lines = original_text.splitlines(keepends=True)
    blocks = split_measure_blocks(lines)

    total_measures = len(blocks)
    mapped_measures = 0
    updated_measures = 0
    inserted_display_folder = 0
    unchanged_measures = 0
    missing_mapping = 0

    output_lines: list[str] = []
    cursor = 0

    for start, end, name in blocks:
        output_lines.extend(lines[cursor:start])
        target_folder = mapping.get(name)
        if target_folder is None:
            output_lines.extend(lines[start:end])
            missing_mapping += 1
            cursor = end
            continue

        mapped_measures += 1
        updated_block, changed, inserted = update_block(lines, start, end, target_folder)
        output_lines.extend(updated_block)
        if changed:
            updated_measures += 1
        else:
            unchanged_measures += 1
        if inserted:
            inserted_display_folder += 1
        cursor = end

    output_lines.extend(lines[cursor:])
    new_text = "".join(output_lines)
    if new_text != original_text:
        tmdl_path.write_text(new_text, encoding="utf-8")

    return ApplyStats(
        total_measures=total_measures,
        mapped_measures=mapped_measures,
        updated_measures=updated_measures,
        inserted_display_folder=inserted_display_folder,
        unchanged_measures=unchanged_measures,
        missing_mapping=missing_mapping,
    )


def main() -> None:
    args = parse_args()
    mapping = load_mapping(args.mapping)
    stats = apply_folders(args.tmdl, mapping)
    print(f"[ok] Measures no TMDL: {stats.total_measures}")
    print(f"[ok] Measures com mapeamento: {stats.mapped_measures}")
    print(f"[ok] Measures atualizadas: {stats.updated_measures}")
    print(f"[ok] displayFolder inserido: {stats.inserted_display_folder}")
    print(f"[ok] Measures sem mudanca: {stats.unchanged_measures}")
    print(f"[ok] Measures sem mapeamento: {stats.missing_mapping}")


if __name__ == "__main__":
    main()
