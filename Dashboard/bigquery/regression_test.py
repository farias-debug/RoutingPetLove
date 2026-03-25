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
    "base_execucao_canonica_latest": f"""
        SELECT data_referencia, COUNT(*) AS qtd_rotas,
               ROUND(AVG(pct_entrega_efetiva), 4) AS avg_pct_entregas,
               ROUND(AVG(dpph), 2) AS avg_dpph,
               ROUND(AVG(ocup_peso_veiculo), 4) AS avg_ocup_peso
        FROM `{PROJECT}.{DATASET}.base_execucao_canonica`
        WHERE data_referencia = (
          SELECT MAX(data_referencia) FROM `{PROJECT}.{DATASET}.base_execucao_canonica`
        )
        GROUP BY data_referencia
    """,
    "base_execucao_canonica_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.base_execucao_canonica`
    """,
    "metas_pivot_canonico_check": f"""
        SELECT meta_spr_ped, meta_spr_vol, meta_entregas, meta_rotas,
               meta_orh, meta_ader_vol, meta_ocup, meta_dpph
        FROM `{PROJECT}.{DATASET}.metas_pivot_canonico`
        LIMIT 1
    """,
    "metas_globais_count": f"""
        SELECT COUNT(*) AS n FROM `{PROJECT}.{DATASET}.metas_globais`
    """,
    "freshness": f"""
        SELECT MAX(data_referencia) AS max_data,
               DATE_DIFF(CURRENT_DATE(), MAX(data_referencia), DAY) AS dias_atraso
        FROM `{PROJECT}.{DATASET}.base_execucao_canonica`
    """,
    "score_consistency": f"""
        SELECT
          ROUND(AVG(`{PROJECT}.{DATASET}.fn_score_operacional`(
            `{PROJECT}.{DATASET}.status_higher`(
              `{PROJECT}.{DATASET}.safe_div`(b.qtd_volumes, CAST(1 AS FLOAT64)), m.meta_spr_vol),
            `{PROJECT}.{DATASET}.status_higher`(b.pct_entrega_efetiva, m.meta_entregas),
            IF(b.flag_rota_concluida, 'OK', 'Critico'),
            `{PROJECT}.{DATASET}.status_target_band`(b.tempo_operacional_h, m.meta_orh, 1.0, 2.1),
            IF(b.ocup_peso_veiculo IS NOT NULL,
               `{PROJECT}.{DATASET}.status_higher`(b.ocup_peso_veiculo, m.meta_ocup),
               'Informativo'),
            `{PROJECT}.{DATASET}.capacity_status`(b.ocup_peso_veiculo)
          )), 1) AS avg_score
        FROM `{PROJECT}.{DATASET}.base_execucao_canonica` b
        CROSS JOIN `{PROJECT}.{DATASET}.metas_pivot_canonico` m
        WHERE b.data_referencia >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    """,
}

THRESHOLDS = {
    "avg_score": 5.0,
    "avg_pct_entregas": 0.02,
    "avg_dpph": 1.0,
    "avg_ocup_peso": 0.05,
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
