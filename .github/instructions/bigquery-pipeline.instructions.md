---
applyTo:
  - "Dashboard/bigquery/**"
  - "Dashboard/extraction/**"
  - "Dashboard/config/**"
---

# Instruções — Pipeline BigQuery

## Fonte Documental

- Referência arquitetural e operacional do pipeline: `Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md`
- Referência semântica de dados: `Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md`
- Não criar novos documentos ativos com nomes versionados para descrever o pipeline corrente.

## Arquitetura de Dados (v7 — fonte única)

```
raw_monitoramento (CSV → BQ load)
raw_planejamento  (XLSX → BQ load)
raw_dim_filial    (XLSX → BQ load)
        ↓
pipeline_dashboard_v7.sql — UDFs + stg + dim + base_execucao_canonica + metas_globais + metas_pivot_canonico
        ↓
queries.js — agrega dinamicamente de base_execucao_canonica com filtros
        ↓
server.js (API Cloud Run) → React Frontend
```

## pipeline_dashboard_v7.sql — Único arquivo de deploy

Contém em ordem:
- UDFs (11): `normalize_text`, `safe_div`, `adherence_ratio`, `status_higher`, `status_target_band`, `capacity_status`, `status_score`, `fn_score_operacional`, `vehicle_type_canonical`, `vehicle_weight_capacity`, `motorista_key_canonical`
- Staging (2): `stg_monitoramento`, `stg_planejamento`
- Dimensão (1): `dim_filial`
- Metas (1): `metas_globais`
- Pivot (1): `metas_pivot_canonico`
- Canônica (1): `base_execucao_canonica` — única fonte atômica da API

Deploy via: `python Dashboard/bigquery/deploy_v7_dashboard.py`

## Scripts Críticos

| Script | Função |
|--------|--------|
| `load_raw_to_bq.py` | Normaliza CSV BR → BQ (timestamps ISO, decimais ponto, HH:MM→horas) |
| `deploy_v7_dashboard.py` | Deploy completo do pipeline v7 (único arquivo de deploy ativo) |
| `consolidar_monitoramento.py` | Consolida CSVs incrementais |
| `extrair_relatorio_tms.mjs` | Scraper Playwright do TMS |

## Regras de Cálculo de KPIs

- **Todos os KPIs** são calculados exclusivamente dentro de `queries.js` agregando de `base_execucao_canonica`
- **Nunca duplicar** lógica de KPI em views separadas ou scripts externos
- **Score operacional**: calculado via `fn_score_operacional` UDF com 6 componentes (spr_vol, entregas, rotas_concluidas, orh, aderencia_vol, ocupacao_peso)
- **Aderência**: sempre via `adherence_ratio` UDF (capped em 1.0 — `LEAST(1.0, safe_div(real, plan))`)
- **ORH**: denominador é `tempo_operacional_h` (ts_primeira_baixa→ts_ultima_baixa, fallback tempo_realizado_h)

## Convenções SQL

- Dataset: `monitoramento_carga`
- Projeto: `data-aileron-482822-d0`
- Views usam `CREATE OR REPLACE VIEW`
- UDFs usam `CREATE OR REPLACE FUNCTION`
- Nomes snake_case, prefixos: `fn_`, `stg_`, `dim_`
- Pipelines legados (v4, v5, v6, v8/Sheets) estão em `Dashboard/bigquery/_archive/`

## Formato CSV (Entrada)

- Separador: `;`
- Encoding: UTF-8
- Timestamps: `DD/MM/YYYY HH:MM:SS` (BR) → converter para ISO
- Decimais: vírgula (`1.234,56`) → converter para ponto
- Duração: `HH:MM` → converter para horas decimais
