# Mapa do Projeto — Monitoramento Logístico Last-Mile

> Atualizado: 2026-03-20 | Status: Operacional

## Visão Geral

Sistema de monitoramento de cargas last-mile que extrai dados do TMS (Transport Management System),
processa via BigQuery e exibe em dashboard Google Sheets com Apps Script.

**Período de dados**: Jan/2026 — presente (~27.900 registros)
**Frequência**: Atualização diária manual
**Usuários**: Equipe de operações logísticas Petlove

---

## Módulos do Projeto

### 1. `bigquery/` — BigQuery (SQL + Python)

Módulo central de processamento e publicação de dados.

**Scripts ativos:**

| Script | Função |
|--------|--------|
| `load_raw_to_bq.py` | Normaliza CSV BR → CSV padrão → `bq load` |
| `sync_bq_to_sheets.py` | Sync 13 views BQ → Google Sheets |
| `deploy_v4.py` | Deploy da pipeline analítica |
| `deploy_v5_publicacao.py` | Deploy das views de publicação |
| `pipeline_v4.sql` | SQL completo v4 (45 objetos) |
| `pipeline_v5_publicacao.sql` | SQL completo v5 (13 views) |
| `_deploy/` | Módulos SQL individuais |

---

### 2. `extraction/` — Extração e Consolidação

| Script | Linguagem | Função |
|--------|-----------|--------|
| `extrair_relatorio_tms.mjs` | Node.js | Automação Playwright do TMS |
| `extrair_monitoramento_rotas.ps1` | PowerShell | Wrapper de extração TMS (15 dias lookahead) |
| `consolidar_monitoramento.py` | Python | Merge incremental de CSVs |

---

### 3. `google_apps/` — Dashboard Visual (Apps Script)

Módulo de visualização que constrói painéis interativos no Google Sheets.

| Arquivo | Função |
|---------|--------|
| `main.gs` | Entry points: atualizar, reconstruir, resetar filtros |
| `config.gs` | Constantes, nomes de abas, layout, feature flags |
| `dashboard_builder.gs` | Construção de PAINEL_GERENCIAL, PAINEL_OPERACIONAL, DRILLDOWN |
| `panel_cache.gs` | Cache materializado de dados analíticos |
| `pivot_builder.gs` | Named ranges, tabelas auxiliares, slicers |
| `formatters.gs` | Helpers de formatação e escrita de células |
| `ui.gs` | Sidebar e menus |
| `bq_sync.gs` | Utilitários de integração BigQuery |
| `Sidebar.html` | UI do painel lateral de filtros |

**Abas gerenciadas:**

| Aba | Tipo |
|-----|------|
| PAINEL_GERENCIAL | Dashboard executivo |
| PAINEL_OPERACIONAL | Dashboard operacional |
| DRILLDOWN_ANALITICO | Análise detalhada |
| _CONFIG_PAINEL | Configuração interna |
| _CACHE_PAINEL | Cache de performance |

---

### 4. `Dashboard/frontend/` — Frontend React Dashboard

Dashboard web React que consome as views v5/v6 do BigQuery via API Cloud Run.
Interface principal de visualização, complementando o Google Sheets.

**Status**: Em produção — https://data-aileron-482822-d0.web.app

| Componente | Stack |
|-----------|-------|
| Framework | React 18.3 + Vite 5.4 + TypeScript 5.8 |
| UI | shadcn/ui (40+ componentes) + Tailwind CSS 3.4 |
| Gráficos | Recharts 2.15 (Area, Bar, Line, Radar, Pie) |
| Navegação | React Router DOM 6.30 |
| Data | TanStack React Query (mock data atualmente) |
| Package | Bun |
| Dev server | porta 8080 |

**9 Páginas:**

| Rota | Módulo | View BQ Fonte |
|------|--------|---------------|
| `/` | Resumo Executivo | `resumo_executivo` + `alertas_operacionais` |
| `/planejado-realizado` | Planejado × Realizado | `planejado_vs_realizado` |
| `/custos-eficiencia` | Custos e Eficiência | `eficiencia_rota` + `indicadores_consolidados` |
| `/frota-capacidade` | Frota e Capacidade | `capacidade_frota` |
| `/tempo-sla` | Tempo e SLA | `entregas_e_sla` |
| `/aderencia-atendimento` | Aderência e Atendimento | `scorecard_filiais` + `operacao_diaria` |
| `/transportadores` | Transportadores | `scorecard_transportadores` |
| `/motoristas-jornada` | Motoristas e Jornada | `jornada_motoristas` |
| `/investigacao-operacional` | Investigação Operacional | `drill_rotas_detalhado` |

---

### 5. `data/` — Fontes de Dados

| Arquivo | Descrição | Registros |
|---------|-----------|-----------|
| `Relatorio_Monitoramento_Carga_Completo.csv` | Base consolidada TMS | ~27.900 |
| `Relorio_Planejamento_Carga_Completo.xlsx` | Planejamento de cargas | — |
| `tab_auxiliar/dim_filial.xlsx` | Dimensão filial + metas SPR | ~36 |
| `tab_auxiliar/dim_motoristas.xlsx` | Cadastro de motoristas | ~300 |
| `tab_auxiliar/dim_veiculos.xlsx` | Cadastro de veículos | ~200 |
| `tab_auxiliar/dim_transportador.xlsx` | Cadastro de transportadores | ~50 |
| `tab_auxiliar/dim_percurso.xlsx` | Rotas/percursos | ~500 |
| `tab_auxiliar/dim_rota_entrega.xlsx` | Rotas de entrega | ~800 |
| `tab_auxiliar/dim_rotas_transferencias.xlsx` | Rotas de transferência | ~100 |

---

## BigQuery — Modelo de Dados

**Projeto**: `data-aileron-482822-d0` | **Dataset**: `monitoramento_carga`

```
RAW (3 tabelas)
 ├─ raw_monitoramento ──────┐
 ├─ raw_planejamento ───────┤
 └─ raw_dim_filial ─────────┤
                             ▼
UDFs (14 funções)       STAGING (2 views)
 ├─ normalize_text       ├─ stg_monitoramento (41c)
 ├─ safe_div             └─ stg_planejamento (12c)
 ├─ adherence_ratio              │
 ├─ status_*  (scoring)          ▼
 ├─ vehicle_*  (classificação) DIMENSÕES (7 views)
 └─ fn_*  (compostas)      ├─ dim_calendario
                            ├─ dim_filial
                            ├─ dim_veiculo
                            ├─ dim_transportador
                            ├─ dim_status_operacional
                            ├─ dim_planejamento
                            └─ dim_metas
                                 │
                                 ▼
                          FATO (1 view)
                           └─ fct_execucao (84 cols)
                                 │
                    ┌────────────┼────────────────┐
                    ▼            ▼                 ▼
              MARTS OPS    MARTS PLAN        MARTS PROD/FIN
              (8 views)    (2 views)         (6 views)
                    │            │                 │
                    └────────────┼─────────────────┘
                                 ▼
                         PUBLICAÇÃO v5 (13 views)
                          → Google Sheets
```

---

## Infraestrutura e Credenciais

| Recurso | Detalhe |
|---------|---------|
| BigQuery | `data-aileron-482822-d0.monitoramento_carga` |
| Google Sheets | ID `1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4` |
| Apps Script | Gerenciado via clasp (`.clasp.json` em google_apps/) |
| Python | 3.14+ em `.venv/` |
| Node.js | 22+ (Playwright + googleapis) |
| bq CLI | Google Cloud SDK (`bq.cmd`) |
| Auth ADC | `gcloud auth application-default login` (cloud-platform + bigquery + sheets + drive) |
| TMS | Env vars `TMS_USER`, `TMS_PASS` |

---

## Fluxo de Execução

### Pipeline BigQuery (Recomendado)

```
Extrai TMS (Playwright) ──▶ Consolida CSV ──▶ bq load ──▶ Views auto-refresh ──▶ BQ→Sheets ──▶ Apps Script
     [manual]                  [manual]       [manual]      [automático]          [manual]      [manual]
```

### Comandos

```powershell
# 1. Extrair (extraction/)
.\extraction\extrair_monitoramento_rotas.ps1

# 2. Consolidar (extraction/)
.venv\Scripts\python.exe extraction\consolidar_monitoramento.py

# 3. Carregar BigQuery
.venv\Scripts\python.exe bigquery\load_raw_to_bq.py

# 4-5. Views atualizam automaticamente

# 6. Sync para Google Sheets
.venv\Scripts\python.exe bigquery\sync_bq_to_sheets.py "1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4"

# 7. Rebuild visual (via Apps Script)
cd google_apps; npx @google/clasp push
```

---

## Arquivo (`_archive/`)

Código legado mantido apenas como referência histórica:

| Pasta | Conteúdo |
|-------|----------|
| `legacy_bigquery/` | Pipeline v2, v3, backups v5, scripts de deploy/validação obsoletos |
| `legacy_powerbi_scripts/` | Scripts da era Power BI (transform, auditoria, catálogo) |
| `experimentos_google_sheets/` | Abordagens de publicação testadas e descartadas |
| `analises_auxiliares/` | Scripts de análise SPR, tratamento de dimensões |
| `docs_pipeline_antigos/` | Documentação substituída (plano, checklist, auditoria, fluxo) |
| `tmp_scripts/` | Arquivos temporários (.tmp.cjs, .tmp.js, fix_raw_export.py) |
