# Estrutura Canônica do Projeto — Dashboard Logístico Petlove

> **Atualizado em:** 2026-03-25
> **Fonte:** Leitura direta de todos os arquivos ativos do repositório
> **Versão ativa:** Pipeline v7 (única versão em produção)
> **Revisão Cloud Run API:** `dashboard-logistico-api-00045-hg5`

---

## 0. Governança de Documentação

| Regra | Descrição |
|-------|-----------|
| **Registro de mudanças** | Toda alteração de código, SQL, API ou infra deve ser registrada em [CHANGELOG.md](CHANGELOG.md) |
| **Sem duplicações** | Não criar novo documento para assunto já coberto por um canônico — atualizar o existente |
| **Arquivo morto** | Diagnósticos, relatórios e planos encerrados → mover para `docs/_archive/` |
| **Nomenclatura** | SQL usa `snake_case`, API JSON usa `camelCase`, tipos TypeScript usam `PascalCase` |
| **Deploy** | SQL pipeline e API devem ser deployados juntos quando colunas mudam |

---

## 1. Visão Geral do Projeto

Sistema de monitoramento logístico que coleta dados operacionais do TMS Petlove, processa via BigQuery, expõe via API REST (Cloud Run) e visualiza em dashboard React (Firebase Hosting).

### Infraestrutura Cloud (GCP)

| Recurso               | Identificador                                                                     |
|------------------------|-----------------------------------------------------------------------------------|
| **Projeto GCP**        | `data-aileron-482822-d0`                                                          |
| **Dataset BigQuery**   | `monitoramento_carga`                                                             |
| **Cloud Run API**      | `dashboard-logistico-api-745676656148.us-central1.run.app`                        |
| **Firebase Hosting**   | `data-aileron-482822-d0.web.app` / `data-aileron-482822-d0.firebaseapp.com`       |
| **Cloud Run Job**      | `pipeline-tms-bq` (us-central1) — Container Playwright+Python, 2Gi/2CPU, 15min   |
| **Cloud Scheduler**    | `trigger-pipeline-tms-bq` — cron `0 8 * * 1-5` (Seg-sex 8h BRT)                 |
| **GCS Bucket**         | `petlove-tms-data` (prefix `tms-monitoramento`) — dados TMS e dimensões          |
| **Secret Manager**     | `tms-user`, `tms-pass` — credenciais TMS                                          |
| **Service Account**    | `pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com`                  |

---

## 2. Fluxo de Dados — Pipeline Completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│              CLOUD SCHEDULER (Seg-sex 8h BRT)                           │
│              trigger-pipeline-tms-bq                                    │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ HTTP invoke
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              CLOUD RUN JOB: pipeline-tms-bq                             │
│              Container: Playwright + Python 3.12                        │
│              Orquestrador: run_pipeline.mjs                             │
├───────┬──────────────┬────────────────┬─────────────────────────────────┤
│ Stage │   Stage 1    │    Stage 2     │    Stage 3                      │
│   0   │   EXTRAIR    │  CONSOLIDAR    │   CARREGAR BQ                   │
│ DIMS  │   (TMS)      │   (CSVs)       │   (raw tables)                  │
│ GCS↓  │  Playwright  │  Python merge  │   bq load CLI                   │
└───┬───┘──────┬───────┘───────┬────────┘───────┬─────────────────────────┘
    │          │               │                │
    ▼          ▼               ▼                ▼
 GCS bucket   CSV local       _Completo.csv    → raw_monitoramento
 dim tables   + GCS backup    + GCS backup     → raw_planejamento
                                               → raw_dim_filial
                                                      │
                                                      ▼
                                           ┌─────────────────────┐
                                           │   BIGQUERY v7        │
                                           │   11 UDFs + 6 Views  │
                                           │   (auto-refresh)     │
                                           └──────────┬──────────┘
                                                      │
                                                      ▼
                                           ┌─────────────────────┐
                                           │   API (Cloud Run)    │
                                           │   Node.js Express    │
                                           │   16 endpoints       │
                                           └──────────┬──────────┘
                                                      │
                                                      ▼
                                           ┌─────────────────────┐
                                           │   FRONTEND           │
                                           │   React + Vite       │
                                           │   Firebase Hosting   │
                                           └─────────────────────┘
```

**Pipeline 100% automatizado:** Cloud Scheduler dispara Cloud Run Job (Seg-sex 8h BRT). O job executa extração TMS (Playwright), consolidação (Python) e carga BigQuery. Credenciais via Secret Manager. Dados intermediários persistidos no GCS.

---

## 3. Estrutura de Diretórios — Arquivos Ativos

```
Dashboard/                          ← Raiz do projeto
├── firebase.json                   ← Config Firebase Hosting (public: frontend/dist)
├── .firebaserc                     ← Alias: default/staging/production → data-aileron-482822-d0
├── package.json                    ← Scripts npm root (frontend:dev, pipeline:consolidar, pipeline:bq-load)
├── requirements.txt                ← Deps Python (pandas, openpyxl, pyarrow, google-cloud-bigquery/storage)
├── README.md                       ← Documentação principal
│
├── extraction/                     ← EXTRAÇÃO DE DADOS DO TMS
│   ├── extrair_relatorio_tms.mjs   ← Playwright scraper (TMS → CSV incremental)
│   ├── consolidar_monitoramento.py ← Merge incrementais → _Completo.csv (dedup por Id Carga)
│   └── gcs_storage.py             ← Helper GCS (upload/download/move blobs)
│
├── data/                           ← DADOS FONTE (CSV/XLSX)
│   ├── Relatorio_Monitoramento_Carga_Completo.csv  ← Base histórica consolidada
│   ├── Relorio_Planejamento_Carga_Completo.xlsx    ← Planejamento de cargas
│   ├── Relatorio_Monitoramento_Carga/              ← Incrementais pendentes
│   │   └── _processados/                           ← Incrementais já consumidos
│   └── tab_auxiliar/                               ← Tabelas dimensão (7 arquivos xlsx)
│       ├── dim_filial.xlsx
│       ├── dim_motoristas.xlsx
│       ├── dim_percurso.xlsx
│       ├── dim_rotas_transferencias.xlsx
│       ├── dim_rota_entrega.xlsx
│       ├── dim_transportador.xlsx
│       └── dim_veiculos.xlsx
│
├── bigquery/                       ← PIPELINE BIGQUERY
│   ├── pipeline_dashboard_v7.sql   ← ★ PIPELINE ATIVO (11 UDFs + 6 views)
│   ├── deploy_v7_dashboard.py      ← Deploy: lê SQL, executa statements, valida 18 objetos
│   ├── load_raw_to_bq.py          ← Carga: CSV/XLSX → raw_monitoramento, raw_planejamento, raw_dim_filial
│   ├── validate_data_contract.py   ← Validação do contrato de dados
│   ├── validate_row_counts.py      ← Validação contagem de linhas
│   ├── regression_test.py          ← Testes de regressão
│   ├── _archive/                   ← ❌ v8 sheets (NUNCA ATIVADA)
│   │   └── pipeline_sheets_v8.sql
│   └── _deploy/
│       └── README.md
│
├── api/                            ← API REST (CLOUD RUN)
│   ├── server.js                   ← Express server: 16 endpoints, CORS, error handling
│   ├── queries.js                  ← 20 query builders SQL (todos lêem base_execucao_canonica)
│   ├── helpers.js                  ← 24 funções auxiliares (formatação, filtros, normalização)
│   ├── Dockerfile                  ← Node 22-alpine, 3 deps prod
│   ├── cloudrun.env.yaml           ← Env vars Cloud Run (PROJECT_ID, DATASET, ALLOWED_ORIGINS)
│   └── package.json                ← Deps: express, cors, @google-cloud/bigquery
│
├── frontend/                       ← FRONTEND REACT
│   ├── package.json                ← React 18, Vite, TanStack Query, Zod, shadcn/ui, Recharts
│   ├── vite.config.ts
│   ├── .env                        ← VITE_API_BASE_URL (dev: localhost:3001)
│   ├── .env.production             ← Aponta para Cloud Run
│   ├── .env.staging                ← Aponta para Cloud Run
│   └── src/
│       ├── App.tsx                 ← Router: 9 rotas + 404
│       ├── main.tsx                ← Entry point React
│       │
│       ├── pages/                  ← 10 PÁGINAS
│       │   ├── CockpitOperacional.tsx      ← Home: KPIs, gráficos, alertas, top filiais
│       │   ├── PlanejadoRealizado.tsx      ← Comparativo planejado vs realizado
│       │   ├── CustosEficiencia.tsx        ← Custos e eficiência operacional
│       │   ├── FrotaCapacidade.tsx         ← Ocupação e capacidade de frota
│       │   ├── TempoSla.tsx                ← Tempo e SLA
│       │   ├── AderenciaAtendimento.tsx    ← Aderência ao atendimento
│       │   ├── Transportadores.tsx         ← Performance por transportador
│       │   ├── MotoristasJornada.tsx       ← Jornada de motoristas
│       │   ├── InvestigacaoOperacional.tsx  ← Drill-down operacional
│       │   └── NotFound.tsx                ← 404
│       │
│       ├── components/
│       │   ├── dashboard/          ← 12 COMPONENTES REUTILIZÁVEIS
│       │   │   ├── DashboardLayout.tsx      ← Layout principal (sidebar + content)
│       │   │   ├── GlobalFiltersBar.tsx     ← Barra de filtros (período, filial, etc.)
│       │   │   ├── KPICard.tsx              ← Card de KPI com variação
│       │   │   ├── VariationCards.tsx        ← Cards de variação D-1/WoW
│       │   │   ├── SectionCard.tsx          ← Container de seção
│       │   │   ├── StatusChip.tsx           ← Badge de status (OK/Atenção/Crítico)
│       │   │   ├── TemporalWindowTabs.tsx   ← Tabs de janela temporal (7d/14d/30d/MTD)
│       │   │   ├── PageHeroAnalitico.tsx    ← Header de página analítica
│       │   │   ├── PageSectionNav.tsx       ← Navegação entre seções
│       │   │   ├── EmptyState.tsx           ← Estado vazio padronizado
│       │   │   ├── LoadingSkeleton.tsx      ← Skeleton loading
│       │   │   └── ErrorBoundary.tsx        ← Error boundary React
│       │   └── ui/                 ← shadcn/ui (gerados)
│       │
│       ├── services/api/           ← CAMADA DE DADOS
│       │   ├── client.ts           ← 14 funções de chamada API + fetch wrapper
│       │   ├── schemas.ts          ← 14 schemas Zod (validação runtime)
│       │   └── mockAdapter.ts      ← Mock data para desenvolvimento offline
│       │
│       ├── hooks/
│       │   └── useApiData.ts       ← 13 React Query hooks + useDashboardQuery()
│       │
│       ├── types/
│       │   └── api.ts              ← 14+ interfaces TypeScript (contratos do frontend)
│       │
│       └── lib/                    ← UTILITÁRIOS
│           ├── utils.ts            ← cn() e helpers gerais
│           ├── formatters.ts       ← Formatação pt-BR (números, moeda, %)
│           ├── chartConfig.ts      ← Config padrão Recharts
│           └── dashboardTemporal.ts ← Lógica de janela temporal
│
├── pipeline/                       ← ★ PIPELINE CLOUD (Cloud Run Job)
│   ├── Dockerfile                  ← Multi-runtime: Playwright + Python 3.12
│   ├── run_pipeline.mjs            ← Orquestrador cloud (4 stages)
│   ├── deploy_pipeline_job.sh      ← Script deploy (build + job + scheduler)
│   ├── cloudrun-job.env.yaml       ← Referência de env vars
│   ├── package.json                ← Deps Node para container
│   └── requirements.txt            ← Deps Python para container
│
├── config/                         ← CONFIGURAÇÕES
│   ├── credentials/                ← Credenciais GCP (gitignored)
│   └── planejamento_backfill.csv   ← Backfill de planejamento
│
├── docs/                           ← DOCUMENTAÇÃO ATIVA
│   ├── README.md                            ← Índice dos documentos ativos
│   ├── ESTRUTURA_CANONICA_PROJETO.md        ← ★ Documento mestre (este arquivo)
│   ├── CHANGELOG.md                         ← ★ Registro histórico de todas as alterações
│   ├── CATALOGO_MEDIDAS_CANONICO.md         ← KPIs, fórmulas, nomenclatura canônica
│   ├── PIPELINE_BIGQUERY_CANONICO.md        ← Arquitetura BigQuery v7, UDFs, schema
│   ├── VOCABULARIO_SEMANTICO.md             ← Dicionário SQL → API → Frontend + metas
│   ├── SCHEMA_RAW_CANONICO.md               ← Schema das tabelas raw (contrato de entrada)
│   ├── PLANO_ESTRUTURAL_DADOS_CANONICO.md   ← Camadas, regras de organização
│   ├── data_contract_frontend.md            ← Contrato API → frontend
│   ├── matriz_contrato_front_api_bq.md      ← Rastreabilidade hook → endpoint → BigQuery
│   └── _archive/                            ← 70+ docs históricos (PowerBI, DAX, relatórios encerrados)
│
├── _archive/                       ← ❌ LEGADO (PowerBI, pipelines antigos, google_apps, experimentos)
│
├── output/                         ← Saídas intermediárias (CSVs processados)
├── downloads/                      ← Screenshots e downloads do Playwright
└── scripts/                        ← VAZIO (scripts reais estão em /scripts/ na raiz do workspace)
```

### Diretórios Fora de Dashboard/

```
scripts/                            ← SCRIPTS DE AUTOMAÇÃO (PowerShell)
├── daily_pipeline.ps1              ← ★ Orquestrador principal (extrai → consolida → BQ load → git sync)
├── health_check.ps1                ← Validação completa do ambiente
├── smoke_dashboard_api.ps1         ← Teste de smoke da API publicada
├── git_daily_sync.ps1              ← Commit+push automático categorizado
├── sync_lovable.ps1                ← Sync frontend ↔ Lovable
├── setup_monitoramento.ps1         ← Setup inicial do ambiente
├── gh_bootstrap_repo.ps1           ← Bootstrap de repositório GitHub
├── gh_create_project_v2.ps1        ← Criação de projeto GitHub v2
├── gh_daily_standup.ps1            ← Daily standup automático
└── gh_project_status.ps1           ← Status do projeto GitHub

.github/
├── PULL_REQUEST_TEMPLATE.md
├── workflows/                      ← CI/CD (GitHub Actions)
│   ├── health-check.yml            ← Seg-sex 8h: valida estrutura, SQL, arquivos críticos
│   ├── validate-sql.yml            ← Push/PR: valida sintaxe SQL v7
│   ├── lovable-sync.yml            ← A cada 30min: sync frontend ↔ Lovable
│   ├── weekly-report.yml           ← Sexta 11h: issue com métricas semanais
│   ├── issue-triage.yml            ← Auto-labeling de issues por conteúdo
│   └── deploy-pipeline-job.yml     ← Deploy Cloud Run Job (push em pipeline/** ou manual)
├── agents/                         ← Copilot agent files (5 agentes)
├── instructions/                   ← Copilot instruction files
├── prompts/                        ← Copilot prompt files
└── ISSUE_TEMPLATE/                 ← Templates de issues
```

---

## 4. BigQuery — Pipeline v7 (17 Objetos)

### 4.1 UDFs (11)

| #  | UDF                        | Propósito                                              |
|----|----------------------------|--------------------------------------------------------|
| 1  | `normalize_text`           | Normalização de texto (NFD, uppercase, trim, compress) |
| 2  | `safe_div`                 | Divisão segura (retorna NULL se divisor = 0)           |
| 3  | `adherence_ratio`          | Cálculo de aderência (LEAST(real/plan, 1.0))           |
| 4  | `status_higher`            | Compara dois status e retorna o mais severo            |
| 5  | `status_target_band`       | Classifica valor vs meta em OK/Atenção/Crítico         |
| 6  | `capacity_status`          | Status de capacidade (ocupação peso)                   |
| 7  | `status_score`             | Score numérico a partir de status                      |
| 8  | `fn_score_operacional`     | Score operacional composto (6 KPIs ponderados)         |
| 9  | `vehicle_type_canonical`   | Canoniza tipo de veículo (Utilitário, Van, Passeio)    |
| 10 | `vehicle_weight_capacity`  | Capacidade de peso por tipo de veículo (lookup)        |
| 11 | `motorista_key_canonical`  | Chave canônica de motorista (normaliza nome+placa)     |

### 4.2 Views (6)

| #  | View                       | Fonte Principal           | Propósito                                                  |
|----|----------------------------|---------------------------|------------------------------------------------------------|
| 1  | `stg_monitoramento`        | `raw_monitoramento`       | Staging: normaliza, tipifica, limpa dados execução         |
| 2  | `stg_planejamento`         | `raw_planejamento`        | Staging: normaliza dados de planejamento                   |
| 3  | `dim_filial`               | `raw_dim_filial`          | Dimensão filial: nome, tipo, região                        |
| 4  | `metas_globais`            | Hardcoded no SQL          | Metas por KPI com intervalos target                        |
| 5  | `metas_pivot_canonico`     | `metas_globais`           | Pivot das metas para join direto nas queries               |
| 6  | `base_execucao_canonica`   | `stg_monitoramento` + `stg_planejamento` + `dim_filial` | ★ VIEW ATÔMICA — fonte única de dados para a API |

### 4.3 Raw Tables (3, carregadas via load_raw_to_bq.py)

| Tabela              | Fonte Local                                     | Modo     |
|---------------------|--------------------------------------------------|----------|
| `raw_monitoramento` | `data/Relatorio_Monitoramento_Carga_Completo.csv`| TRUNCATE |
| `raw_planejamento`  | `data/Relorio_Planejamento_Carga_Completo.xlsx`  | TRUNCATE |
| `raw_dim_filial`    | `data/tab_auxiliar/dim_filial.xlsx`               | TRUNCATE |

### 4.4 Fluxo de Dependências

```
raw_monitoramento ──→ stg_monitoramento ──┐
raw_planejamento  ──→ stg_planejamento  ──┤
raw_dim_filial    ──→ dim_filial        ──┤
                      metas_globais     ──┤──→ base_execucao_canonica ★
                      metas_pivot_canonico ┘
                            ↑
                      metas_globais (pivot)
```

---

## 5. API — 16 Endpoints

| Endpoint                         | Método | O que Retorna                                       |
|----------------------------------|--------|-----------------------------------------------------|
| `/health`                        | GET    | Status da API + projeto/dataset                     |
| `/api/metas`                     | GET    | Array de KPIs com meta, sentido, unidade            |
| `/api/filtros/opcoes`            | GET    | 6 arrays: períodos, filiais, transportadores, etc.  |
| `/api/resumo/cards`              | GET    | 10 KPI cards com valor, meta, delta, trends D1/WoW  |
| `/api/resumo/tendencia-semanal`  | GET    | Série semanal: rotas, pedidos, score, etc.          |
| `/api/filiais/performance`       | GET    | Performance por filial (25+ métricas)               |
| `/api/alertas`                   | GET    | Alertas paginados com prioridade e flags            |
| `/api/alertas/contagem`          | GET    | Contagem por tipo de alerta                         |
| `/api/drill-rotas`               | GET    | Drill-down por rota paginado com sort dinâmico      |
| `/api/transportadores`           | GET    | Ranking transportadores com custo, score, share     |
| `/api/frota/ocupacao-tipo`       | GET    | Ocupação por tipo veículo (SPR, ORH, custo)         |
| `/api/motoristas`                | GET    | Lista motoristas paginada (jornada, overtime, score) |
| `/api/motoristas/kpis`           | GET    | KPIs agregados de motoristas (ativos, avg jornada)  |
| `/api/kpi-diario`                | GET    | KPI consolidado do dia (35+ métricas)               |
| `/api/executivo/serie-diaria`    | GET    | Série diária executiva (rotas, score, filiais crit) |

**Todas as queries lêem de:**

- `base_execucao_canonica` (dados operacionais)
- `metas_pivot_canonico` (metas para cálculo de status/score)
- `metas_globais` (metadados de KPIs)

**Filtros comuns suportados:** `?periodo=`, `?filial=`, `?transportador=`, `?tipoVeiculo=`, `?status=`, `?janela=`

---

## 6. Frontend — 9 Rotas

| Rota              | Página                    | Dados Consumidos                              |
|-------------------|---------------------------|-----------------------------------------------|
| `/`               | CockpitOperacional        | cards, kpi-diario, filiais/performance, alertas, serie-diaria, tendencia-semanal |
| `/planejado`      | PlanejadoRealizado        | filiais/performance, metas                    |
| `/custos`         | CustosEficiencia          | transportadores, frota/ocupacao-tipo          |
| `/frota`          | FrotaCapacidade           | frota/ocupacao-tipo                           |
| `/tempo-sla`      | TempoSla                  | filiais/performance, drill-rotas              |
| `/aderencia`      | AderenciaAtendimento      | filiais/performance                           |
| `/transportadores`| Transportadores           | transportadores                               |
| `/motoristas`     | MotoristasJornada         | motoristas, motoristas/kpis                   |
| `/investigacao`   | InvestigacaoOperacional   | drill-rotas, alertas                          |
| `*`               | NotFound                  | —                                             |

### Stack Frontend

| Tecnologia          | Versão   | Papel                            |
|---------------------|----------|----------------------------------|
| React               | 18       | UI framework                     |
| Vite                | 8        | Build tool                       |
| TanStack React Query| 5        | Cache/fetch de dados             |
| Zod                 | 3        | Validação runtime de schemas     |
| Recharts            | 2        | Gráficos                         |
| shadcn/ui           | —        | Componentes UI (Radix + Tailwind)|
| Tailwind CSS        | 4        | Estilização                      |
| React Router        | 7        | Roteamento                       |

---

## 7. Pipeline Cloud — Cloud Run Job

O pipeline de dados é executado automaticamente via Cloud Run Job, disparado pelo Cloud Scheduler.

### Infraestrutura

| Recurso              | Identificador                                                              |
|----------------------|----------------------------------------------------------------------------|
| **Cloud Run Job**    | `pipeline-tms-bq` (us-central1)                                           |
| **Container**        | `gcr.io/data-aileron-482822-d0/pipeline-tms-bq`                           |
| **Base image**       | `mcr.microsoft.com/playwright:v1.52.0-noble` + Python 3.12                |
| **Recursos**         | 2Gi RAM, 2 CPU, timeout 15min, max 1 retry                                |
| **Scheduler**        | `trigger-pipeline-tms-bq` — cron `0 8 * * 1-5` (Seg-sex 8h BRT)          |
| **Service Account**  | `pipeline-tms-bq@data-aileron-482822-d0.iam.gserviceaccount.com`           |
| **Secrets**          | `tms-user`, `tms-pass` (Secret Manager)                                    |
| **GCS Bucket**       | `petlove-tms-data` (prefix `tms-monitoramento`)                           |

### Stages do Orquestrador (run_pipeline.mjs)

| Stage | Ação                | Ferramenta                          | Saída                          |
|-------|---------------------|-------------------------------------|--------------------------------|
| 0     | Baixar dimensões    | @google-cloud/storage               | tab_auxiliar/ + planejamento   |
| 1     | Extrair TMS         | Playwright (extrair_relatorio_tms)  | CSVs incrementais              |
| 2     | Consolidar CSVs     | Python (consolidar_monitoramento)   | _Completo.csv                  |
| 3     | Carregar BigQuery   | Python (load_raw_to_bq.py --table all) | raw_monitoramento, raw_planejamento, raw_dim_filial |

### Deploy

```bash
# Deploy manual via script
cd Dashboard/pipeline
bash deploy_pipeline_job.sh

# Ou via GitHub Actions (automático em push para pipeline/**)
# Também disponível via workflow_dispatch no GitHub
```

### Execução manual

```bash
gcloud run jobs execute pipeline-tms-bq --region=us-central1 --wait
```

---

## 8. Automação e CI/CD

### 8.1 O que EXISTE e FUNCIONA

| Componente                         | Como Roda          | Frequência                              |
|------------------------------------|--------------------|-----------------------------------------|
| **Cloud Run Job `pipeline-tms-bq`** | Cloud Scheduler   | Seg-sex 8h BRT (automático)             |
| `scripts/daily_pipeline.ps1`       | Manual local       | Legado — substituído pelo Cloud Run Job  |
| `.github/workflows/health-check`   | GitHub Actions     | Seg-sex 8h BRT (cron) + manual          |
| `.github/workflows/validate-sql`   | GitHub Actions     | Push/PR em `bigquery/**/*.sql`          |
| `.github/workflows/lovable-sync`   | GitHub Actions     | A cada 30min horário comercial + push   |
| `.github/workflows/weekly-report`  | GitHub Actions     | Sexta 11h BRT                           |
| `.github/workflows/issue-triage`   | GitHub Actions     | Ao abrir issue                          |
| `.github/workflows/deploy-pipeline-job` | GitHub Actions | Push em `pipeline/**` + manual dispatch |

### 8.2 O que NÃO EXISTE (apenas documentado como futuro)

| Componente               | Status      | Referência                                     |
|--------------------------|-------------|------------------------------------------------|
| Deploy automático API    | ❌ Manual    | Via `gcloud run deploy` direto                 |
| Deploy automático frontend | ❌ Manual  | Via `firebase deploy` direto                   |

---

## 9. O que é LEGADO e pode ser IGNORADO

| Localização                          | Conteúdo                           | Status             |
|--------------------------------------|------------------------------------|--------------------|
| `Dashboard/_archive/`                | PowerBI, pipelines antigos, google_apps, temp | ❌ Inativo/Legado  |
| `Dashboard/bigquery/_archive/`       | pipeline_sheets_v8.sql             | ❌ Nunca ativada   |
| `Dashboard/docs/_archive/`           | 60+ docs históricos                | ❌ Referência hist.|
| `_tmp/`                              | Scripts de debug, validação temp   | ❌ Temporário      |
| `_tmp/RoutingPetLove-rewrite/`       | Fork v4/v5/v6 (dev histórico)     | ❌ Nunca migrado   |

---

## 10. Desenvolvimento Local

### Comandos para rodar

```powershell
# API local (porta 3001)
cd Dashboard/api
node server.js

# Frontend (porta 8081)
cd Dashboard/frontend
npx vite --host --port 8081

# Deploy Pipeline Cloud (Cloud Run Job + Scheduler)
cd Dashboard/pipeline
bash deploy_pipeline_job.sh

# Executar pipeline cloud manualmente
gcloud run jobs execute pipeline-tms-bq --region=us-central1 --wait

# Pipeline local (legado — substituído pelo Cloud Run Job)
cd (raiz workspace)
.\scripts\daily_pipeline.ps1

# Deploy BigQuery v7
cd Dashboard
python bigquery/deploy_v7_dashboard.py

# Carga raw tables
python bigquery/load_raw_to_bq.py --table all

# Deploy API Cloud Run (a partir da raiz Dashboard/)
cd Dashboard
gcloud run deploy dashboard-logistico-api --source api --region us-central1 --project data-aileron-482822-d0 --allow-unauthenticated

# Deploy Frontend Firebase (a partir da raiz Dashboard/)
cd Dashboard
cd frontend && npx vite build && cd ..
npx firebase deploy --only hosting --project data-aileron-482822-d0
```

### Variáveis de ambiente necessárias

| Variável                  | Onde                       | Para quê                            |
|---------------------------|----------------------------|-------------------------------------|
| `TMS_USER`                | Secret Manager (cloud)     | Login TMS Petlove                   |
| `TMS_PASS`                | Secret Manager (cloud)     | Senha TMS Petlove                   |
| `TMS_GCS_BUCKET`          | Cloud Run Job env          | Bucket GCS para persistência        |
| `TMS_GCS_PREFIX`          | Cloud Run Job env          | Prefixo no bucket GCS              |
| `PIPELINE_DAYS_BACK`      | Cloud Run Job env          | Dias para extrair (default: 7)      |
| `VITE_API_BASE_URL`       | `.env` frontend            | URL da API (dev: localhost:3001)    |
| `BIGQUERY_PROJECT_ID`     | cloudrun.env.yaml          | Projeto GCP                         |
| `BIGQUERY_DATASET`        | cloudrun.env.yaml          | Dataset BigQuery                    |
| `ALLOWED_ORIGINS`         | cloudrun.env.yaml          | CORS origins permitidas             |

---

## 11. Contagens Verificadas

| Categoria                | Quantidade |
|--------------------------|------------|
| UDFs BigQuery (v7)       | 11         |
| Views BigQuery (v7)      | 6          |
| Raw tables               | 3          |
| Endpoints API            | 16         |
| Query builders (queries.js) | 20      |
| Helpers (helpers.js)     | 24         |
| Dependências API (prod)  | 3          |
| Páginas frontend         | 10         |
| Componentes dashboard    | 12         |
| Hooks React Query        | 13         |
| Schemas Zod              | 14         |
| Funções client.ts        | 14         |
| Interfaces TypeScript    | 14+        |
| GitHub Actions workflows | 6          |
| Scripts PowerShell       | 10         |
| Pipeline cloud files     | 6          |
| Docs ativos              | 10         |

---

## 12. Deploy Rápido — Referência

### API Cloud Run

```powershell
# Build + deploy (de C:\Users\lucas.batista\Documents\Projetos)
gcloud builds submit --project=data-aileron-482822-d0 --tag "gcr.io/data-aileron-482822-d0/dashboard-logistico-api:latest" "Dashboard\api"
gcloud run services update dashboard-logistico-api --project=data-aileron-482822-d0 --region=us-central1 --image="gcr.io/data-aileron-482822-d0/dashboard-logistico-api:latest"
```

### BigQuery Pipeline v7

```powershell
cd C:\Users\lucas.batista\Documents\Projetos\Dashboard
uv run bigquery\deploy_v7_dashboard.py
```

### Pipeline Cloud Run Job (manual)

```powershell
gcloud run jobs execute pipeline-tms-bq --region=us-central1 --project=data-aileron-482822-d0 --wait
```

### Revisões Cloud Run API

| Revisão | Data | Mudanças |
|---------|------|----------|
| `00045-hg5` | 2026-03-25 | 9 bug fixes (ver CHANGELOG) |
| `00044-nvl` | 2026-03-23 | Ruptura controlada Sheets + refatoração v7 |
| Tabelas dimensão (xlsx)  | 7          |
