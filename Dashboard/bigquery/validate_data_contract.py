"""
Validacao de contratos da arquitetura v7 canonica.

Na v7 NAO existem views api_* separadas. A API (queries.js) consulta
diretamente base_execucao_canonica e metas_pivot_canonico.

Este script valida:
  1. Schema obrigatorio de base_execucao_canonica (todas as colunas usadas pelos endpoints)
  2. Schema de metas_pivot_canonico (9 colunas esperadas)
  3. Score operacional em [0, 100] quando calculado
  4. Campos percentuais em [0, 1]
  5. Ausencia de NULLs em data_referencia
  6. Valores canonicos de metas conforme catalogo oficial

Uso: python validate_data_contract.py
"""

import sys
from google.cloud import bigquery

PROJECT = "data-aileron-482822-d0"
DATASET = "monitoramento_carga"
FQN = f"{PROJECT}.{DATASET}"

client = bigquery.Client(project=PROJECT)

# ---------------------------------------------------------------
# Colunas obrigatorias de base_execucao_canonica
# (consumidas por queries.js em todos os endpoints da API)
# ---------------------------------------------------------------
BASE_EXEC_REQUIRED_COLUMNS = {
    "id_carga",
    "data_referencia",
    "filial",
    "transportador",
    "status_tms",
    "tipo_veiculo",
    "tipo_filial",
    "qtd_pedidos",
    "qtd_volumes",
    "qtd_entregues",
    "qtd_insucessos",
    "peso_real_kg",
    "capacidade_peso_kg",
    "km_plan",
    "km_real",
    "tempo_operacional_h",
    "tempo_plan_h",
    "valor_total",
    "flag_rota_concluida",
    "flag_overtime",
    "flag_nao_planejada",
    "flag_sem_tempo",
    "flag_entrega_critica",
    "flag_match_critico",
    "motorista",
    "placa",
    "rota",
    "ocup_peso_veiculo",
    "pct_entrega_efetiva",
    "dpph",
    "motorista_key_canonico",
}

# Colunas esperadas em metas_pivot_canonico (8 obrigatorias + 1 opcional)
METAS_PIVOT_REQUIRED = {
    "meta_spr_ped",
    "meta_spr_vol",
    "meta_entregas",
    "meta_rotas",
    "meta_orh",
    "meta_ader_vol",
    "meta_ocup",
    "meta_dpph",
}
METAS_PIVOT_OPTIONAL = {"meta_custo_medio_carga"}

# Catalogo canonico de metas (valores de referencia)
CANONICAL_METAS = {
    "meta_spr_ped": 42.0,
    "meta_spr_vol": 67.0,
    "meta_entregas": 0.98,
    "meta_rotas": 0.95,
    "meta_orh": 7.0,
    "meta_ader_vol": 0.90,
    "meta_ocup": 0.85,
}

# ---------------------------------------------------------------
# Contratos: (descricao, query SQL, funcao validadora)
# ---------------------------------------------------------------
CONTRACTS = [
    # ------ 1. base_execucao_canonica: schema completo ------
    (
        "base_execucao_canonica: colunas obrigatorias para todos os endpoints",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'base_execucao_canonica'
        """,
        lambda rows: (
            lambda found: (
                BASE_EXEC_REQUIRED_COLUMNS.issubset(found),
                (
                    f"faltando: {BASE_EXEC_REQUIRED_COLUMNS - found}"
                    if not BASE_EXEC_REQUIRED_COLUMNS.issubset(found)
                    else ""
                ),
            )
        )({r["column_name"] for r in rows}),
    ),
    # ------ 2. metas_pivot_canonico: 9 colunas ------
    (
        "metas_pivot_canonico: schema 8 obrigatorias + 1 opcional",
        f"""
        SELECT column_name
        FROM `{PROJECT}.{DATASET}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = 'metas_pivot_canonico'
        ORDER BY ordinal_position
        """,
        lambda rows: (
            lambda found: (
                METAS_PIVOT_REQUIRED.issubset(found),
                (
                    f"faltando: {METAS_PIVOT_REQUIRED - found}"
                    if not METAS_PIVOT_REQUIRED.issubset(found)
                    else ""
                ),
            )
        )({r["column_name"] for r in rows}),
    ),
    # ------ 3. Score operacional em [0, 100] ------
    (
        "base_execucao_canonica: score operacional computado em [0, 100]",
        f"""
        WITH scored AS (
          SELECT
            `{FQN}.fn_score_operacional`(
              `{FQN}.status_higher`(`{FQN}.safe_div`(b.qtd_volumes, CAST(1 AS FLOAT64)), m.meta_spr_vol),
              `{FQN}.status_higher`(b.pct_entrega_efetiva, m.meta_entregas),
              IF(b.flag_rota_concluida, 'OK', 'Critico'),
              `{FQN}.status_target_band`(b.tempo_operacional_h, m.meta_orh, 1.0, 2.1),
              IF(b.ocup_peso_veiculo IS NOT NULL,
                 `{FQN}.status_higher`(b.ocup_peso_veiculo, m.meta_ocup),
                 'Informativo'),
              `{FQN}.capacity_status`(b.ocup_peso_veiculo)
            ) AS score
          FROM `{FQN}.base_execucao_canonica` b
          CROSS JOIN `{FQN}.metas_pivot_canonico` m
          WHERE b.data_referencia IS NOT NULL
          LIMIT 5000
        )
        SELECT
          COUNTIF(score < 0 OR score > 100) AS out_of_range,
          COUNT(*) AS total
        FROM scored
        WHERE score IS NOT NULL
        """,
        lambda rows: (
            rows[0]["out_of_range"] == 0 and rows[0]["total"] > 0,
            (
                f"out_of_range={rows[0]['out_of_range']}, total={rows[0]['total']}"
                if rows[0]["out_of_range"] != 0 or rows[0]["total"] == 0
                else ""
            ),
        ),
    ),
    # ------ 4a. pct_entrega_efetiva em [0, 1] ------
    (
        "base_execucao_canonica: pct_entrega_efetiva em [0, 1]",
        f"""
        SELECT
          COUNTIF(pct_entrega_efetiva < 0 OR pct_entrega_efetiva > 1) AS oor,
          COUNT(*) AS total
        FROM `{FQN}.base_execucao_canonica`
        WHERE pct_entrega_efetiva IS NOT NULL
        """,
        lambda rows: (
            rows[0]["oor"] == 0 and rows[0]["total"] > 0,
            (
                f"fora_de_range={rows[0]['oor']}, total={rows[0]['total']}"
                if rows[0]["oor"] != 0 or rows[0]["total"] == 0
                else ""
            ),
        ),
    ),
    # ------ 4b. ocup_peso_veiculo em [0, 1] (tolerancia ate 1.5 para sobrecarga) ------
    (
        "base_execucao_canonica: ocup_peso_veiculo em [0, 1.5]",
        f"""
        SELECT
          COUNTIF(ocup_peso_veiculo < 0 OR ocup_peso_veiculo > 1.5) AS oor,
          COUNT(*) AS total
        FROM `{FQN}.base_execucao_canonica`
        WHERE ocup_peso_veiculo IS NOT NULL
        """,
        lambda rows: (
            rows[0]["oor"] == 0 and rows[0]["total"] > 0,
            (
                f"fora_de_range={rows[0]['oor']}, total={rows[0]['total']}"
                if rows[0]["oor"] != 0 or rows[0]["total"] == 0
                else ""
            ),
        ),
    ),
    # ------ 5. Sem NULL em data_referencia ------
    (
        "base_execucao_canonica: sem NULL em data_referencia",
        f"""
        SELECT
          COUNTIF(data_referencia IS NULL) AS n_null,
          COUNT(*) AS total
        FROM `{FQN}.base_execucao_canonica`
        """,
        lambda rows: (
            rows[0]["n_null"] == 0 and rows[0]["total"] > 0,
            (
                f"nulls={rows[0]['n_null']}, total={rows[0]['total']}"
                if rows[0]["n_null"] != 0 or rows[0]["total"] == 0
                else ""
            ),
        ),
    ),
    # ------ 6. Valores canonicos de metas ------
    (
        "metas_pivot_canonico: valores conferem com catalogo canonico",
        f"""
        SELECT
          meta_spr_ped,
          meta_spr_vol,
          meta_entregas,
          meta_rotas,
          meta_orh,
          meta_ader_vol,
          meta_ocup
        FROM `{FQN}.metas_pivot_canonico`
        LIMIT 1
        """,
        lambda rows: (
            lambda r: (
                all(
                    abs(r.get(col, -999) - expected) < 0.001
                    for col, expected in CANONICAL_METAS.items()
                ),
                "; ".join(
                    f"{col}: esperado={expected}, obtido={r.get(col)}"
                    for col, expected in CANONICAL_METAS.items()
                    if r.get(col) is None or abs(r.get(col) - expected) >= 0.001
                ),
            )
        )(dict(rows[0]) if rows else {}),
    ),
    # ------ Extra: base_execucao_canonica tem dados recentes ------
    (
        "base_execucao_canonica: dados existem e sao recentes (ultimos 90 dias)",
        f"""
        SELECT
          COUNT(*) AS total,
          MAX(data_referencia) AS max_data,
          MIN(data_referencia) AS min_data
        FROM `{FQN}.base_execucao_canonica`
        WHERE data_referencia >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
        """,
        lambda rows: (
            rows[0]["total"] > 0,
            (
                f"total={rows[0]['total']}, max_data={rows[0]['max_data']}"
                if rows[0]["total"] == 0
                else ""
            ),
        ),
    ),
]


def run_contract(name, query, validator):
    """Executa uma query e valida o resultado via a funcao validadora.

    O validator pode retornar:
      - (bool, str): tupla com resultado e detalhe
      - bool: apenas resultado (compatibilidade)
    """
    try:
        rows = [dict(r) for r in client.query(query).result()]
        result = validator(rows)
        if isinstance(result, tuple):
            ok, detail = result
        else:
            ok = result
            detail = ""
        return name, "PASS" if ok else "FAIL", detail or f"{len(rows)} rows"
    except Exception as exc:
        return name, "ERROR", str(exc)


def main():
    print("=" * 72)
    print("DATA CONTRACT VALIDATION - arquitetura v7 canonica")
    print("  base_execucao_canonica + metas_pivot_canonico")
    print(f"  projeto: {PROJECT} / dataset: {DATASET}")
    print("=" * 72)
    total = len(CONTRACTS)
    passed = 0
    failed = 0
    errors = 0

    for name, query, validator in CONTRACTS:
        label, status, detail = run_contract(name, query, validator)
        icon = {"PASS": "OK", "FAIL": "FAIL", "ERROR": "ERR"}.get(status, "??")
        print(f"  [{icon:4s}] {label}")
        if status != "PASS":
            print(f"         -> {detail}")
        if status == "PASS":
            passed += 1
        elif status == "FAIL":
            failed += 1
        else:
            errors += 1

    print("-" * 72)
    print(f"Total: {total} | PASS: {passed} | FAIL: {failed} | ERROR: {errors}")
    print("=" * 72)
    sys.exit(0 if failed == 0 and errors == 0 else 1)


if __name__ == "__main__":
    main()
