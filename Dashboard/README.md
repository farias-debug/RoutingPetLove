# Dashboard Monitoramento Logístico

Versão canônica final do projeto.

O fluxo ativo é automatizado via Cloud Run Job:

Google Sheets (Planejamento) + TMS Playwright (Monitoramento) → CSV → BigQuery canônico → API Express → Frontend React

## Fluxo ativo (Cloud Run Job `pipeline-tms-bq`)

Orquestrado por [pipeline/run_pipeline.mjs](pipeline/run_pipeline.mjs) — 5 etapas:

0. **Baixar dimensões do GCS** → `data/tab_auxiliar/` (dim_filial, etc.)
1. **Extrair planejamento de rotas** do Google Sheets → `data/planejamento_2026.csv` ([extraction/extrair_planejamento.py](extraction/extrair_planejamento.py))
2. **Extrair relatório TMS** via Playwright → CSVs incrementais ([extraction/extrair_relatorio_tms.mjs](extraction/extrair_relatorio_tms.mjs))
3. **Consolidar CSVs** incrementais → `_Completo.csv` + backup GCS ([extraction/consolidar_monitoramento.py](extraction/consolidar_monitoramento.py))
4. **Carregar raw tables** no BigQuery ([bigquery/load_raw_to_bq.py](bigquery/load_raw_to_bq.py))

Após a carga raw, as views (staging, base_execucao_canonica) atualizam automaticamente.

**Camada semântica:**

- [bigquery/pipeline_dashboard_v7.sql](bigquery/pipeline_dashboard_v7.sql) — fonte única: UDFs + staging + base_execucao_canonica
- [api/server.js](api/server.js) + [api/queries.js](api/queries.js) + [api/helpers.js](api/helpers.js) — API Express
- [frontend/](frontend/) — Dashboard React (Firebase Hosting)

## Estrutura canônica

- [api/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/api): backend Express consumido pelo frontend
- [bigquery/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery): pipeline e validadores ativos
- [frontend/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/frontend): aplicação React publicada no Firebase
- [extraction/](extraction/): extração TMS (Playwright), planejamento (Google Sheets) e consolidação
- [pipeline/](pipeline/): Dockerfile, orquestrador Cloud Run Job e configs de build
- [config/](config/): configurações e credenciais de publicação
- [data/](data/): arquivos de entrada correntes
- [docs/](docs/): documentação ativa
- [_archive/](_archive/): todo conteúdo legado, transitório ou histórico (inclui google_apps arquivado)

## BigQuery ativo

Arquivo único de deploy:

- [bigquery/pipeline_dashboard_v7.sql](bigquery/pipeline_dashboard_v7.sql) — **fonte única de medidas** (UDFs + staging + dim_filial + metas_globais + metas_pivot_canonico + base_execucao_canonica)
- [bigquery/deploy_v7_dashboard.py](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/deploy_v7_dashboard.py) — script de deploy
- [bigquery/validate_pipeline.py](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/validate_pipeline.py)
- [bigquery/validate_data_contract.py](c:/Users/lucas.batista\Documents/Projetos/Dashboard/bigquery/validate_data_contract.py)
- [bigquery/score_parity_test.py](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/score_parity_test.py)
- [bigquery/regression_test.py](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/regression_test.py)

Arquivos `pipeline_sheets_v8.sql`, `sync_bq_to_sheets.py`, `README_DEPLOY_V7_V8.md` e as views `_deploy/20-40` foram movidos para `bigquery/_archive/` — fluxo Google Sheets descontinuado.

## Documentação ativa

Use só estes documentos:

- [docs/README.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/README.md)
- [docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/PLANO_ESTRUTURAL_DADOS_CANONICO.md)
- [docs/CATALOGO_MEDIDAS_CANONICO.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/CATALOGO_MEDIDAS_CANONICO.md)
- [docs/SCHEMA_RAW_CANONICO.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/SCHEMA_RAW_CANONICO.md)
- [docs/PIPELINE_BIGQUERY_CANONICO.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/PIPELINE_BIGQUERY_CANONICO.md)
- [docs/data_contract_frontend.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/data_contract_frontend.md)
- [docs/matriz_contrato_front_api_bq.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/matriz_contrato_front_api_bq.md)
- [docs/AUDIT_REVISAO_ORIGEM_2026-03-22.md](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs/AUDIT_REVISAO_ORIGEM_2026-03-22.md)

Se um documento estiver fora dessa lista e não fizer parte da operação corrente, ele deve ficar em [_archive/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_archive).

## Comandos principais

```powershell
# ── Pipeline Cloud Run (produção) ──
# Build e deploy do container
gcloud builds submit --project=data-aileron-482822-d0 --config=cloudbuild.yaml "C:\...\Dashboard"
gcloud run jobs update pipeline-tms-bq --project=data-aileron-482822-d0 --region=us-central1 --image=gcr.io/data-aileron-482822-d0/pipeline-tms-bq:latest
gcloud run jobs execute pipeline-tms-bq --project=data-aileron-482822-d0 --region=us-central1 --wait

# ── Pipeline local (debug) ──
.venv\Scripts\python.exe extraction\extrair_planejamento.py data
.venv\Scripts\python.exe bigquery\load_raw_to_bq.py
.venv\Scripts\python.exe bigquery\deploy_v7_dashboard.py

# ── Validações ──
.venv\Scripts\python.exe bigquery\validate_pipeline.py
.venv\Scripts\python.exe bigquery\validate_data_contract.py
.venv\Scripts\python.exe bigquery\score_parity_test.py
.venv\Scripts\python.exe bigquery\regression_test.py

# ── Frontend ──
cd frontend && npm run dev
cd .. && npx firebase deploy --only hosting --project data-aileron-482822-d0

# ── API ──
gcloud run deploy dashboard-logistico-api --source api --region us-central1 --project data-aileron-482822-d0 --allow-unauthenticated
```

## Regras de organização

- Não criar novos documentos versionados para explicar o mesmo assunto.
- Atualizar sempre o documento canônico correspondente.
- Qualquer arquivo legado, diagnóstico pontual, backup ou experimento deve ir para [_archive/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_archive).
- As pastas [_tmp/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_tmp) e [downloads/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/downloads) não fazem parte do fluxo principal.
