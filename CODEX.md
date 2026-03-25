# Dashboard Monitoramento Logístico Petlove — Codex Project Instructions

> Idioma padrão: português-BR. Responda sempre em PT-BR a menos que instruído contrário.

## Projeto

Dashboard de monitoramento logístico last-mile da Petlove. Pipeline de dados que extrai do TMS, consolida CSVs, carrega no BigQuery, e serve um dashboard React via API Cloud Run.

## Escopo

- **Diretório principal**: `Dashboard/`
- **Scripts automação**: `scripts/`
- **GitHub config**: `.github/`
- **NUNCA editar**: `data/`, `_archive/`, `_tmp/`, `node_modules/`, `.venv/`

## Infraestrutura GCP

| Recurso | Valor |
|---------|-------|
| Projeto GCP | `data-aileron-482822-d0` |
| Dataset BigQuery | `monitoramento_carga` |
| API Cloud Run | `dashboard-logistico-api-745676656148.us-central1.run.app` |
| Cloud Run Job | `pipeline-tms-bq` (us-central1) |
| Cloud Scheduler | `trigger-pipeline-tms-bq` — cron `0 8 * * 1-5` |
| Firebase Hosting | `data-aileron-482822-d0.web.app` |
| GCS Bucket | `petlove-tms-data` (prefix `tms-monitoramento`) |
| Service Account | `pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com` |

## Arquitetura Pipeline (v7 — Ativo)

```
TMS Web (Playwright) → CSV incrementais → BigQuery raw
    → pipeline_dashboard_v7.sql (11 UDFs + 6 views)
        → base_execucao_canonica (view atômica, fonte única)
            → API Cloud Run (queries.js) → React Dashboard (Firebase)
```

### Pipeline Cloud Run Job — 4 Estágios

| # | Estágio | Script | Input → Output |
|---|---------|--------|----------------|
| 1 | Download dims GCS | run_pipeline.mjs | GCS → local XLSX |
| 2 | Extração TMS | extrair_relatorio_tms.mjs | TMS Web → CSV |
| 3 | Consolidação | consolidar_monitoramento.py | CSVs → CSV único |
| 4 | Carga BigQuery | load_raw_to_bq.py | CSV → raw_monitoramento |

### Scripts Críticos

- `Dashboard/bigquery/pipeline_dashboard_v7.sql` — Pipeline SQL ativo (FONTE ÚNICA)
- `Dashboard/bigquery/load_raw_to_bq.py` — Normaliza CSV BR → BQ
- `Dashboard/bigquery/deploy_v7_dashboard.py` — Deploy no BigQuery
- `Dashboard/extraction/extrair_relatorio_tms.mjs` — Scraper Playwright
- `Dashboard/extraction/consolidar_monitoramento.py` — Consolidação CSV
- `Dashboard/api/server.js` — API Express (15 endpoints, porta local 3001 / Cloud Run via `PORT=8080`)
- `Dashboard/api/queries.js` — TODAS as queries KPI (fonte única)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Extração | Node.js 22+ (Playwright), Python 3.14+ |
| Pipeline SQL | BigQuery (CREATE OR REPLACE) |
| API | Node.js Express (Cloud Run) |
| Frontend | React 18.3 + Vite 5.4 + TypeScript 5.8 + shadcn/ui + Tailwind 3.4 + Recharts |
| Auth | ADC (`gcloud auth application-default login`) |
| CI/CD | GitHub Actions (6 workflows) |

## Regras Fundamentais

1. **Todos KPIs calculados EXCLUSIVAMENTE em `queries.js`** a partir de `base_execucao_canonica`
2. **Nunca duplicar lógica de KPI** em views, scripts ou frontend
3. **Nunca usar `bq.cmd` diretamente** — encoding cp1252 corrompe dados. Use Python API.
4. **CSV**: separador `;`, UTF-8, datas BR → ISO, vírgula → ponto, HH:MM → horas decimais
5. **SQL**: snake_case, prefixos fn_/stg_/dim_, CREATE OR REPLACE
6. **Corrigir divergências de dados na ORIGEM** (SQL/API), nunca no frontend
7. **Frontend**: reuse hooks em src/hooks/, schemas em src/services/api/, design system Petlove
8. **Pipeline v7 é a ÚNICA versão ativa** — v4/v5/v6 são legado em _archive
9. **Credenciais NUNCA versionadas** — use ADC ou .env

## Comandos Operacionais

```powershell
# Pipeline diário (Cloud Run Job)
gcloud run jobs execute pipeline-tms-bq --region us-central1

# Pipeline local (legado)
.\scripts\daily_pipeline.ps1

# Deploy BigQuery v7
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\deploy_v7_dashboard.py

# API local
cd Dashboard\api; node server.js

# Frontend dev
cd Dashboard\frontend; npm run dev

# Health check
.\scripts\health_check.ps1

# GitHub standup
.\scripts\gh_daily_standup.ps1
```

## Estrutura de Diretórios

```
Projetos/
├── .github/agents/          # 4 agentes especializados (+ codex-cli)
├── .github/instructions/    # Instruções por domínio
├── .github/prompts/         # 7 prompts operacionais
├── .claude/                 # Config Claude Code CLI
├── Dashboard/
│   ├── api/                 # API Express (Cloud Run)
│   ├── bigquery/            # SQL pipeline v7 + deploy + load
│   ├── config/              # Credenciais e config
│   ├── data/                # Dados brutos — NÃO EDITAR
│   ├── docs/                # Documentação canônica
│   ├── extraction/          # Extração TMS + consolidação
│   ├── frontend/            # React dashboard
│   ├── pipeline/            # Cloud Run Job (Dockerfile, run_pipeline.mjs)
│   └── scripts/             # Scripts auxiliares
├── scripts/                 # Automação PowerShell (raiz)
├── CODEX.md                 # ← Este arquivo (instruções Codex)
├── CLAUDE.md                # Instruções Claude Code (em .claude/)
└── AGENTS.md                # Visão geral agentes
```

## Documentação Canônica

- `Dashboard/docs/ESTRUTURA_CANONICA_PROJETO.md` — Estrutura oficial
- `Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md` — Pipeline BQ detalhado
- `Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md` — Modelo de dados

## GitHub Project Management

- **GitHub CLI (`gh`)** é o centro operacional
- Labels: `type:*`, `domain:*`, `priority:*` + milestone
- Branches: `feat/`, `fix/`, `chore/`, `docs/`
- PR → sempre referencia issue com `Closes #XX`
- Workflows: health-check, validate-sql, lovable-sync, weekly-report, issue-triage, deploy-pipeline-job

## Coordenação com Outros Agentes

O Codex opera como **agente CLI** coordenado pelo Project Manager:

- **Claude Code** — Outro agente CLI (config em `.claude/`)
- **Copilot** — Agente VS Code (config em `.github/agents/`)
- **Project Manager** — Coordena via issues/PRs no GitHub

### Fluxo de Trabalho

1. Project Manager cria issue com labels + milestone
2. Codex/Claude recebe tarefa via prompt ou `codex exec`
3. Executa mudanças no workspace
4. Cria branch + commit + PR referenciando issue
5. CI/CD valida via GitHub Actions
