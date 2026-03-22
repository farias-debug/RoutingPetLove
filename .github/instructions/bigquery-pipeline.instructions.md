---
applyTo:
  - "Dashboard/bigquery/**"
  - "Dashboard/extraction/**"
  - "Dashboard/config/**"
---

# Instruções — Pipeline BigQuery

## Arquitetura de Dados

```
raw_monitoramento (CSV → BQ load)
raw_planejamento  (XLSX → BQ load)
raw_dim_filial    (XLSX → BQ load)
        ↓
pipeline_v4.sql — 14 UDFs + staging + dims + fato + marts (28 statements)
        ↓
pipeline_v5_publicacao.sql — 13 views finais (nomes PT-BR) → Google Sheets
        ↓
pipeline_v6_api.sql — views otimizadas → API Cloud Run → React Frontend
```

## Pipeline v4 (Analítico) — 28 statements

- UDFs (14): `01_udf_normalize_text` ... `12_udf_vehicle_weight_capacity` + `fn_*`
- Staging (2): `stg_monitoramento`, `stg_planejamento`
- Dimensões (6): `dim_filial`, `dim_calendario`, `dim_tipo_veiculo`, `dim_metas`, etc.
- Fato (1): `fct_execucao` (84 colunas, ~27.600 registros)
- Marts (4): `mart_ops_kpi_diario`, `mart_ops_kpi_filial`, `mart_ops_kpi_transportador`, `mart_ops_diario_filial`
- Semântico (1): `sem_kpi_cards`

## Pipeline v5 (Publicação) — 13 views PT-BR

Alimentam Google Sheets (1:1 com abas):
`metas_globais`, `dim_filial_tratada`, `kpi_resumo_diario`, `kpi_filial_dia`,
`kpi_transportador_dia`, `kpi_card_latest`, `alertas_rotas`, `drill_rotas`,
`Resumo_Filial`, `Resumo_Ocupacao_Veic_Transp`, `VW_Base_Execucao`,
`Resumo_Semana_Filial_Diario`, `Resumo_Semana_Filial_Matriz`

## Pipeline v6 (API) — views para Cloud Run

Endpoints da API consultam views v4/v5 + views v6 otimizadas para JSON.

## Scripts Críticos

| Script | Função |
|--------|--------|
| `load_raw_to_bq.py` | Normaliza CSV BR → BQ (timestamps ISO, decimais ponto, HH:MM→horas) |
| `sync_bq_to_sheets.py` | Sincroniza 13 views → Google Sheets |
| `deploy_v4.py` | Deploy camada analítica (28 statements) |
| `deploy_v5_publicacao.py` | Deploy camada publicação (13 views) |
| `deploy_v6_api.py` | Deploy views para API |
| `consolidar_monitoramento.py` | Consolida CSVs incrementais |
| `extrair_relatorio_tms.mjs` | Scraper Playwright do TMS |

## Convenções SQL

- Dataset: `monitoramento_carga`
- Projeto: `data-aileron-482822-d0`
- Views usam `CREATE OR REPLACE VIEW`
- UDFs usam `CREATE OR REPLACE FUNCTION`
- Nomes snake_case, prefixos: `fn_`, `stg_`, `dim_`, `fato_`, `mart_`, `visao_`

## Formato CSV (Entrada)

- Separador: `;`
- Encoding: UTF-8
- Timestamps: `DD/MM/YYYY HH:MM:SS` (BR) → converter para ISO
- Decimais: vírgula (`1.234,56`) → converter para ponto
- Duração: `HH:MM` → converter para horas decimais
