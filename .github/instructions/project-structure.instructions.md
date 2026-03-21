---
applyTo:
  - "**/*.md"
  - "**/*.ps1"
  - ".github/**"
---

# Instruções — Estrutura do Projeto

## Visão Geral

Monitoramento logístico last-mile (Petlove) com pipeline de dados completo.

```
TMS Web → CSV → BigQuery (v4 analítico + v5 publicação + v6 API)
    → Google Sheets (13 abas) → Apps Script (Dashboard Visual)
    → API Cloud Run → React Dashboard (Dashboard/frontend/)
```

## Estrutura Canônica

```
Projetos/
├── .github/                    # Agentes, instruções, prompts (Copilot/GitHub)
│   ├── agents/                 #   Agentes especializados
│   ├── instructions/           #   Instruções por domínio
│   └── _old/                   #   Legado (Power BI, etc.)
├── Dashboard/                  # Projeto completo (pipeline + frontend + API)
│   ├── bigquery/               #   SQL (v4+v5+v6), deploy, load, sync
│   │   └── _deploy/            #     Módulos SQL individuais
│   ├── extraction/             #   Extração TMS + consolidação CSV
│   ├── config/                 #   Config Google Sheets + credentials
│   ├── google_apps/            #   Apps Script (dashboard visual Sheets)
│   ├── api/                    #   API Node.js/Express (Cloud Run)
│   ├── frontend/               #   React dashboard (Vite + shadcn/ui + Recharts)
│   │   └── src/                #     components/ + pages/ + hooks/ + services/
│   ├── data/                   #   Fontes (CSV/XLSX) — NÃO editar
│   ├── docs/                   #   Documentação técnica
│   ├── output/                 #   Outputs auxiliares
│   └── _archive/               #   Código legado
└── scripts/                    # Automação raiz (daily, git sync, health, setup)
```

## Infraestrutura

| Componente | Detalhe |
|------------|---------|
| BigQuery | `data-aileron-482822-d0` / `monitoramento_carga` |
| Google Sheets | `1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4` |
| API | Cloud Run: `dashboard-logistico-api-745676656148.us-central1.run.app` |
| Frontend | Firebase Hosting: `data-aileron-482822-d0.web.app` |
| Python | 3.14+ (`.venv/` em Dashboard/) |
| Node.js | 22+ (Playwright, API, googleapis) |
| React | 18.3 + Vite 5.4 + TypeScript 5.8 + shadcn/ui |
| Auth | ADC (`gcloud auth application-default login`) |

## Convenções

- **Não editar** nada em `data/`, `_archive/`
- Scripts Python usam a `.venv` de `Dashboard/.venv/`
- Node.js packages em `Dashboard/node_modules/` (Playwright)
- React packages em `Dashboard/frontend/node_modules/` (npm)
- API packages em `Dashboard/api/node_modules/` (npm)
- Documentação em `Dashboard/docs/`
- Automação raiz em `scripts/`
