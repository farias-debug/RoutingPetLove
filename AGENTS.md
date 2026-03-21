# Monitoramento Logístico Last Mile — Petlove

Dashboard operacional de transporte last-mile com pipeline de dados BigQuery e dois frontends.

- **Stack**: Python 3.14 · BigQuery · Google Sheets · Apps Script · React 18 · Node.js 22 (Playwright)
- **Operador**: Lucas Batista

## Arquitetura

```text
TMS Web (Playwright) → CSVs incrementais → CSV consolidado
    → BigQuery (v4 analítico + v5 publicação — 58 objetos)
        → Google Sheets (13 abas) → Apps Script (painéis visuais)
        → React SPA route-eye-ops (9 páginas) [em desenvolvimento]
```

## Estrutura

```text
Projetos/
├── .github/                        # Agentes e instruções Copilot
│   ├── agents/                     #   project-manager, pipeline-engineer,
│   │                               #   frontend-developer, apps-script-engineer,
│   │                               #   repo-executor
│   ├── instructions/               #   bigquery-pipeline, react-dashboard,
│   │                               #   google-apps, project-structure,
│   │                               #   project-management
│   └── _old/                       #   Legado Power BI (arquivado)
├── Dashboard/                      # Backend: pipeline de dados
│   ├── bigquery/                   #   SQL (v4+v5), deploy, load, sync
│   │   └── _deploy/               #     Módulos SQL individuais
│   ├── extraction/                 #   Extração TMS + consolidação CSV
│   ├── config/                     #   Config Sheets + credentials
│   ├── google_apps/                #   Apps Script (clasp managed)
│   ├── data/                       #   Fontes (CSV/XLSX) — NÃO editar
│   ├── docs/                       #   Documentação técnica
│   └── _archive/                   #   Código legado
├── route-eye-ops/                  # Frontend: React SPA dashboard
│   └── src/                        #   9 páginas, shadcn/ui, Recharts
├── scripts/                        # Automação raiz
│   ├── daily_pipeline.ps1          #   Pipeline diário (BQ path)
│   ├── git_daily_sync.ps1          #   Commit + push categorizado
│   ├── health_check.ps1            #   Diagnóstico do ambiente
│   └── setup_monitoramento.ps1     #   Setup inicial
└── AGENTS.md
```

## Pipeline de Dados (7 Estágios)

| # | Estágio | Script | Entrada → Saída |
| --- | --- | --- | --- |
| 1 | Extrair TMS | `extraction/extrair_relatorio_tms.mjs` | TMS Web → CSVs incrementais |
| 2 | Consolidar | `extraction/consolidar_monitoramento.py` | Incrementais → CSV único |
| 3 | Carregar BQ | `bigquery/load_raw_to_bq.py` | CSV → `raw_monitoramento` |
| 4 | Views v4 | Auto-refresh | 14 UDFs + staging/dims/fatos/marts |
| 5 | Views v5 | Auto-refresh | 13 views publicação (PT-BR) |
| 6 | Sync Sheets | `bigquery/sync_bq_to_sheets.py` | 13 views → 13 abas Sheets |
| 7 | Dashboard | `google_apps/main.gs` | Abas dados → Painéis visuais |

## Comandos Principais

```powershell
# Pipeline diário (data path: CSV → BQ → Sheets)
.\scripts\daily_pipeline.ps1

# Comandos individuais
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\load_raw_to_bq.py
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\sync_bq_to_sheets.py "1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4"

# Deploy BQ (quando SQL alterado)
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\deploy_v4.py
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\deploy_v5_publicacao.py

# Extração TMS
node Dashboard\extraction\extrair_relatorio_tms.mjs

# React dashboard (route-eye-ops)
cd route-eye-ops; bun install; bun run dev  # porta 8080

# Apps Script
cd Dashboard\google_apps; npx @google/clasp push
```

## Infraestrutura

| Componente | Detalhe |
| --- | --- |
| BigQuery | `data-aileron-482822-d0` / `monitoramento_carga` |
| Google Sheets | ID `1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4` |
| Python | 3.14+ (`Dashboard/.venv/`) |
| Node.js | 22+ (Playwright, googleapis) |
| React | 18.3 + Vite 5.4 + TypeScript 5.8 + shadcn/ui |
| Auth | ADC (`gcloud auth application-default login`), env `TMS_USER`/`TMS_PASS` |

## Regras

- Pipeline BigQuery é a fonte de verdade — Sheets e React consomem suas views
- Nunca editar `data/`, `output/` diretamente — pipeline recalcula tudo
- Itens obsoletos vão para `_archive/` (gitignored)
- Credenciais nunca versionadas — usar ADC ou `.env`
- Docs em `Dashboard/docs/`, automação em `scripts/`

## Gestão do Projeto

- GitHub CLI (`gh`) é o ponto central de gestão operacional do repositório
- O agente principal de coordenação é o `Project Manager`
- Issues devem usar labels de `type:*`, `domain:*`, `priority:*` e milestone
- Templates, workflows e prompts em `.github/` sustentam o fluxo de backlog, sprint e review
- Script operacional de acompanhamento: `scripts/gh_project_status.ps1`
