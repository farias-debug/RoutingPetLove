# Monitoramento Logístico Last-Mile — Petlove

Dashboard operacional de transporte last-mile com pipeline BigQuery + API Cloud Run + React Dashboard.

- **Stack**: Python 3.14 · BigQuery · Node.js 22 (Playwright) · React 18 · TypeScript 5.8 · shadcn/ui
- **GCP**: `data-aileron-482822-d0` / `monitoramento_carga`
- **Operador**: Lucas Batista

---

## Agentes CLI

| Agente | Ferramenta | Quando Usar |
|--------|-----------|-------------|
| **Codex** | `codex` (OpenAI Codex CLI) | Execução autônoma, multi-file edits, build+test, web search |
| **Claude Code** | `claude` (Anthropic) | Análise profunda, debugging complexo, raciocínio longo |

### Codex CLI

```powershell
# Interativo (modo padrão)
codex -p petlove -C C:\Users\lucas.batista\Documents\Projetos

# Full-auto (sem aprovação a cada passo)
codex --full-auto -p petlove -C . "Corrigir endpoint /api/metas"

# Exec não-interativo (CI/scripts)
codex exec -p petlove -C . "Adicionar validação Zod no schema de resposta"

# Code review
codex review -p review -C .

# Via wrapper scripts
.\scripts\codex_run.ps1 -Mode full-auto -Prompt "desc da tarefa"
.\scripts\codex_resolve_issue.ps1 -IssueNumber 42
.\scripts\codex_standup.ps1
```

### Claude Code

```powershell
claude -C C:\Users\lucas.batista\Documents\Projetos
claude -p "Analisar divergência de KPI no endpoint /api/aderencia" --output-format text
```

### Profiles Codex (`~/.codex/config.toml`)

| Profile | Sandbox | Approvals | Uso |
|---------|---------|-----------|-----|
| `petlove` | workspace-write | on-request | Desenvolvimento padrão |
| `review` | read-only | never | Code review |
| `quick` | workspace-write | on-request | Tarefas rápidas (gpt-4.1) |

---

## Agentes VS Code (Copilot)

| Arquivo | Papel |
|---------|-------|
| `.github/agents/project-manager.agent.md` | Coordena issues, sprints, PRs via GitHub CLI |
| `.github/agents/pipeline-engineer.agent.md` | BigQuery pipeline v7, extração TMS |
| `.github/agents/frontend-developer.agent.md` | React + shadcn/ui + Recharts |
| `.github/agents/repo-executor.agent.md` | Reorganização estrutural, docs |
| `.github/agents/codex-cli.agent.md` | Delegação para Codex CLI |

---

## Arquitetura

```
TMS Web (Playwright) → CSV incrementais → BigQuery raw
    → pipeline_dashboard_v7.sql [11 UDFs + 6 views]
        → base_execucao_canonica (view atômica — FONTE ÚNICA)
            → API Cloud Run (queries.js) → React Dashboard (Firebase)
```

### Pipeline Cloud Run Job — 4 Estágios

| # | Estágio | Script | Input → Output |
|---|---------|--------|----------------|
| 1 | Download dims GCS | run_pipeline.mjs | GCS → local XLSX |
| 2 | Extração TMS | extrair_relatorio_tms.mjs | TMS Web → CSV |
| 3 | Consolidação | consolidar_monitoramento.py | CSVs → CSV único |
| 4 | Carga BigQuery | load_raw_to_bq.py | CSV → raw_monitoramento |

---

## Estrutura

```
Projetos/
├── .github/
│   ├── agents/          # 5 agentes (4 Copilot + codex-cli)
│   ├── instructions/    # bigquery-pipeline, react-dashboard, project-structure, project-management
│   ├── prompts/         # 7 prompts operacionais
│   └── workflows/       # 6 GitHub Actions
├── .claude/             # Config Claude Code CLI
├── .vscode/             # Settings, tasks (inclui tasks Codex), launch
├── Dashboard/
│   ├── api/             # API Express (server.js + queries.js)
│   ├── bigquery/        # pipeline_dashboard_v7.sql + deploy + load
│   ├── config/          # Credenciais
│   ├── data/            # CSV/XLSX — NÃO EDITAR
│   ├── docs/            # Docs canônicos
│   ├── extraction/      # Playwright TMS + consolidação
│   ├── frontend/        # React 18 + Vite + shadcn/ui
│   └── pipeline/        # Cloud Run Job (Dockerfile, run_pipeline.mjs)
├── scripts/
│   ├── codex_run.ps1            # Wrapper Codex CLI
│   ├── codex_resolve_issue.ps1  # Resolver issue via Codex
│   ├── codex_standup.ps1        # Standup com análise Codex
│   ├── daily_pipeline.ps1       # Pipeline legado (local)
│   ├── gh_daily_standup.ps1     # Standup GitHub CLI
│   ├── health_check.ps1         # Health check completo
│   └── git_daily_sync.ps1       # Git sync diário
├── AGENTS.md            # ← Este arquivo
├── CODEX.md             # Instruções projeto para Codex CLI
└── .claude/CLAUDE.md    # Instruções para Claude Code
```

---

## Comandos Operacionais

```powershell
# Pipeline Cloud Run Job
gcloud run jobs execute pipeline-tms-bq --region us-central1

# Deploy BigQuery v7
& Dashboard\.venv\Scripts\python.exe Dashboard\bigquery\deploy_v7_dashboard.py

# API local (porta 3001)
cd Dashboard\api; node server.js

# Frontend dev (porta 8080)
cd Dashboard\frontend; npm run dev

# Health check
.\scripts\health_check.ps1

# Standup
.\scripts\gh_daily_standup.ps1
.\scripts\codex_standup.ps1
```

---

## Infraestrutura GCP

| Recurso | Valor |
|---------|-------|
| Projeto | `data-aileron-482822-d0` |
| Dataset BigQuery | `monitoramento_carga` |
| Cloud Run API | `dashboard-logistico-api-745676656148.us-central1.run.app` |
| Cloud Run Job | `pipeline-tms-bq` (us-central1) |
| Cloud Scheduler | `trigger-pipeline-tms-bq` — `0 8 * * 1-5` |
| Firebase | `data-aileron-482822-d0.web.app` |
| GCS Bucket | `petlove-tms-data` |
| Secret Manager | `tms-user`, `tms-pass` |

---

## Regras Fundamentais

1. **Todos KPIs exclusivamente em `Dashboard/api/queries.js`** — nunca duplicar
2. **Pipeline v7 é o ÚNICO ativo** — outros em `_archive`
3. **NUNCA usar `bq.cmd`** — encoding cp1252 corrompe dados
4. **Corrigir divergências na origem** (SQL/API), não no frontend
5. **Credenciais NUNCA versionadas** — usar ADC ou `.env`
6. **`git push` e deploys requerem aprovação** — nunca automático

---

## Skills Codex (`~/.codex/skills/`)

| Skill | Uso |
|-------|-----|
| `monitoramento-logistico` | Pipeline BQ, API Express, React Dashboard, GitHub workflow |
| `playwright` | Automação browser (extração TMS) |
| `doc` | Geração de documentação |

---

## Documentação Canônica

- `Dashboard/docs/ESTRUTURA_CANONICA_PROJETO.md`
- `Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md`
- `Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md`