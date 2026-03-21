# Dashboard Monitoramento Logístico — Last Mile

Painel de monitoramento de cargas last-mile (Petlove) com pipeline de dados completo:
**TMS → CSV → BigQuery → Google Sheets → Apps Script (Dashboard Visual)**.

## Arquitetura

```text
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐
│  TMS Web     │───▶│  CSVs Locais    │───▶│  BigQuery        │───▶│ Google       │───▶│ Apps Script  │
│  (Playwright)│    │  (Consolidado)  │    │  (v4+v5+v6 Views)│    │ Sheets (13)  │    │ (Painéis)    │
└──────────────┘    └─────────────────┘    └──────────────────┘    └──────────────┘    └──────────────┘
 extrair_relatorio   consolidar_            load_raw_to_bq.py      sync_bq_to_         main.gs
 _tms.mjs            monitoramento.py       pipeline_v4.sql        sheets.py           dashboard_
                                            pipeline_v5.sql                            builder.gs
                                            pipeline_v6_api.sql
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │  React Dashboard │
                                           │  (frontend/)     │
                                           └──────────────────┘
```text

## Estrutura do Projeto

```text
Dashboard/
├── api/                       # API Node/Express publicada no Cloud Run
├── bigquery/                  # SQL (v4 analítico + v5 publicação + v6 API), deploy, load, sync
│   └── _deploy/               #   Módulos SQL individuais (UDFs + Views)
├── extraction/                # Extração TMS (Playwright) + consolidação CSV
├── config/                    # Config Google Sheets + credentials
├── frontend/                  # React Dashboard (Vite + shadcn/ui + Recharts)
│   ├── src/pages/             #   10 páginas publicadas do painel
│   ├── src/hooks/             #   React Query hooks (useApiData, useGlobalFilters)
│   ├── src/services/api/      #   Client API + mock adapter
│   └── src/components/        #   Componentes UI (shadcn + dashboard)
├── google_apps/               # Apps Script (dashboard visual no Sheets)
│   ├── main.gs                #   Entry points
│   ├── dashboard_builder.gs   #   Construção dos painéis
│   ├── panel_cache.gs         #   Cache materializado
│   └── ...                    #   8 módulos .gs + Sidebar.html
├── data/                      # Fontes locais (CSV/XLSX) — NÃO editar
├── docs/                      # Documentação técnica
└── _archive/                  # Código legado (v2, v3, Power BI, experimentos)
```

## Pipeline de Dados — Fluxo Atual (7 Estágios)

| # | Estágio | Script | Entrada | Saída |
| --- | --------- | -------- | --------- | ------- |
| 1 | **Extrair TMS** | `extraction/extrair_relatorio_tms.mjs` | TMS Web (Playwright) | CSVs incrementais em `data/Relatorio_Monitoramento_Carga/` |
| 2 | **Consolidar** | `extraction/consolidar_monitoramento.py` | CSVs incrementais | `data/Relatorio_Monitoramento_Carga_Completo.csv` |
| 3 | **Carregar BigQuery** | `bigquery/load_raw_to_bq.py` | CSV consolidado | `raw_monitoramento` (BigQuery) |
| 4 | **Views Analíticas** | Auto-refresh | `pipeline_v4.sql` (14 UDFs + staging/dims/fatos/marts) | 45 objetos BigQuery |
| 5 | **Views Publicação** | Auto-refresh | `pipeline_v5_publicacao.sql` | 13 views finais (nomes PT-BR) |
| 6 | **Sync Sheets** | `bigquery/sync_bq_to_sheets.py` | 13 views BigQuery | 13 abas Google Sheets |
| 7 | **Dashboard Visual** | `google_apps/main.gs` | 13 abas de dados | PAINEL_GERENCIAL, PAINEL_OPERACIONAL, DRILLDOWN |

## Infraestrutura

| Componente | Detalhe |
| ------------ | --------- |
| **BigQuery** | Projeto `data-aileron-482822-d0`, dataset `monitoramento_carga` |
| **Google Sheets** | Spreadsheet ID `1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4` |
| **Python** | 3.14+ (`.venv/`), pandas, pyarrow, google-cloud-bigquery, gspread |
| **Node.js** | 22+ (playwright, googleapis) |
| **Auth** | ADC (`gcloud auth application-default login`), env vars `TMS_USER`/`TMS_PASS` |

## Comandos Principais

```powershell
# Setup
..\scripts\setup_monitoramento.ps1

# Pipeline diário (consolidação → carga BQ → sync Sheets)
..\scripts\daily_pipeline.ps1

# Pipeline BigQuery (carga → views → sync Sheets)
.venv\Scripts\python.exe bigquery\load_raw_to_bq.py
.venv\Scripts\python.exe bigquery\sync_bq_to_sheets.py "1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4"

# Deploy BigQuery (quando SQL for alterado)
.venv\Scripts\python.exe bigquery\deploy_v4.py
.venv\Scripts\python.exe bigquery\deploy_v5_publicacao.py

# Extração TMS
node extraction\extrair_relatorio_tms.mjs

# Apps Script (push/pull)
cd google_apps; npx @google/clasp push

# Frontend React (dev)
cd frontend; npm install; npm run dev

# Frontend React (build produção)
cd frontend; npm run build
```

## Fontes de Dados

| Fonte | Arquivo | Formato |
| ------- | --------- | --------- |
| Monitoramento TMS | `data/Relatorio_Monitoramento_Carga_Completo.csv` | CSV (`;`, UTF-8-SIG, decimal `,`) |
| Planejamento | `data/Relorio_Planejamento_Carga_Completo.xlsx` | Excel |
| Dimensão Filial | `data/tab_auxiliar/dim_filial.xlsx` | Excel |
| Demais dimensões | `data/tab_auxiliar/dim_*.xlsx` | Excel (7 tabelas) |

## Convenções

- **`_archive/`** contém código legado — não faz parte do fluxo ativo
- **`data/`** é gerado pelo pipeline — não editar manualmente
- **BigQuery v4** = camada analítica (UDFs, staging, dims, fatos, marts)
- **BigQuery v5** = camada de publicação (13 views com nomes PT-BR pro Sheets)
- O CSV do TMS usa formato BR: separador `;`, decimal `,`, timestamps `DD/MM/YYYY HH:MM`

## Estado Atual do Produto

- o frontend ativo do dashboard está em frontend/
- a API consumida pelo frontend está em api/
- o cockpit executivo-operacional já é a home principal publicada
- as abas setoriais estão em expansão para o padrão longo com hero analítico, navegação intra-página e blocos de leitura executiva

## Documentação Canônica

- docs/diagnostico_melhorias_dashboard.md: diagnóstico consolidado, fechamento formal da Onda 1, Fase 1 e roadmap das próximas ondas
- docs/setup_redesign_cockpit.md: escopo e publicação do cockpit executivo-operacional
- docs/publicacao_frontend.md: publicação do frontend e validações associadas
- docs/data_contract_frontend.md: contrato analítico padronizado da Fase 2 entre frontend, API e BigQuery
- docs/matriz_contrato_front_api_bq.md: aderência operacional por hook, endpoint, fonte, filtros, grão e camadas temporais

## Observação de Operação

- o frontend não deve mais ser tratado como projeto externo separado
- as validações de build do painel devem ser executadas a partir de frontend/
- o diagnóstico em docs/diagnostico_melhorias_dashboard.md é a referência principal para as próximas ondas de refinamento visual e analítico
