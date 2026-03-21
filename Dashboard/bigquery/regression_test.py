"""
Teste de regressão: captura KPIs antes e depois do deploy, compara deltas.
Uso: python regression_test.py [--snapshot-only | --compare-only]
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
SNAPSHOT_FILE = Path(__file__).parent / "_regression_snapshot.json"

QUERIES = {
    "mart_kpi_diario_latest": f"""
        SELECT data, qtd_rotas, spr_ped, spr_vol, pct_entregas, orh, dpph,
               ocup_composta, score_operacional
        FROM `{PROJECT}.{DATASET}.mart_kpi_diario`
        ORDER BY data DESC
        LIMIT 1
    """,
    "mart_kpi_filial_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.mart_kpi_filial_dia`
    """,
    "mart_kpi_transp_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.mart_kpi_transportador_dia`
    """,
    "kpi_card_latest_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.kpi_card_latest`
    """,
    "fct_execucao_sample": f"""
        SELECT COUNT(*) AS n, MAX(data_planejada) AS max_data
        FROM `{PROJECT}.{DATASET}.fct_execucao`
    """,
    "alertas_rotas_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.alertas_rotas`
    """,
    "score_consistency": f"""
        SELECT
          ROUND(AVG(score_operacional), 1) AS avg_score,
          MIN(score_operacional) AS min_score,
          MAX(score_operacional) AS max_score
        FROM `{PROJECT}.{DATASET}.mart_kpi_diario`
        WHERE data >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    """,
}

THRESHOLDS = {
    "score_operacional": 5.0,
    "spr_ped": 3.0,
    "spr_vol": 5.0,
    "pct_entregas": 0.02,
    "orh": 1.0,
    "dpph": 1.0,
    "ocup_composta": 0.05,
}


def run_queries(client):
    results = {}
    for name, sql in QUERIES.items():
        rows = list(client.query(sql).result())
        if rows:
            results[name] = {k: _serialize(v) for k, v in dict(rows[0]).items()}
        else:
            results[name] = {}
    return results


def _serialize(val):
    if isinstance(val, (datetime,)):
        return val.isoformat()
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if val is None:
        return None
    return float(val) if isinstance(val, (int, float)) else str(val)


def snapshot(client):
    data = {
        "timestamp": datetime.now().isoformat(),
        "results": run_queries(client),
    }
    SNAPSHOT_FILE.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    print(f"[OK] Snapshot salvo em {SNAPSHOT_FILE}")
    return data


def compare(client):
    if not SNAPSHOT_FILE.exists():
        print("[ERRO] Nenhum snapshot encontrado. Execute --snapshot-only primeiro.")
        sys.exit(1)

    before = json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
    after = {"timestamp": datetime.now().isoformat(), "results": run_queries(client)}

    print(f"\n{'='*60}")
    print(f"REGRESSION TEST — antes: {before['timestamp']}")
    print(f"                  depois: {after['timestamp']}")
    print(f"{'='*60}\n")

    failures = []
    for qname in QUERIES:
        b = before["results"].get(qname, {})
        a = after["results"].get(qname, {})
        print(f"--- {qname} ---")
        for key in set(list(b.keys()) + list(a.keys())):
            bv = b.get(key)
            av = a.get(key)
            if bv == av:
                print(f"  {key}: {av} (sem mudança)")
                continue
            threshold = THRESHOLDS.get(key)
            if threshold and bv is not None and av is not None:
                try:
                    delta = abs(float(av) - float(bv))
                    ok = delta <= threshold
                    symbol = "OK" if ok else "FAIL"
                    print(
                        f"  {key}: {bv} → {av} (delta={delta:.4f}, threshold={threshold}) [{symbol}]"
                    )
                    if not ok:
                        failures.append(
                            f"{qname}.{key}: delta {delta:.4f} > {threshold}"
                        )
                except (TypeError, ValueError):
                    print(f"  {key}: {bv} → {av} (mudou)")
            else:
                print(f"  {key}: {bv} → {av} (mudou)")
        print()

    if failures:
        print(f"\n[FAIL] {len(failures)} regressão(ões) detectada(s):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("[PASS] Nenhuma regressão detectada.")


def main():
    client = bigquery.Client(project=PROJECT)

    if "--snapshot-only" in sys.argv:
        snapshot(client)
    elif "--compare-only" in sys.argv:
        compare(client)
    else:
        print("Capturando snapshot pré-deploy...")
        snapshot(client)
        print(
            "\nExecute o deploy e depois rode: python regression_test.py --compare-only\n"
        )


if __name__ == "__main__":
    main()
