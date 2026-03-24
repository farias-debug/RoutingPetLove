# Dashboard Monitoramento Logístico

Versão canônica final do projeto.

O fluxo ativo é simples:

TMS -> CSV consolidado -> BigQuery canônico -> API Express -> Frontend React

## Fluxo ativo

1. Extração e consolidação dos dados em [extraction/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/extraction) e [data/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/data)
2. Carga raw no BigQuery com [bigquery/load_raw_to_bq.py](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/load_raw_to_bq.py)
3. Publicação da camada canônica com [bigquery/pipeline_dashboard_v7.sql](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/pipeline_dashboard_v7.sql) (fonte única — UDFs + staging + base_execucao_canonica)
4. API publicada a partir de [api/server.js](c:/Users/lucas.batista/Documents/Projetos/Dashboard/api/server.js), [api/queries.js](c:/Users/lucas.batista/Documents/Projetos/Dashboard/api/queries.js) e [api/helpers.js](c:/Users/lucas.batista/Documents/Projetos/Dashboard/api/helpers.js)
5. Dashboard React em [frontend/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/frontend)

## Estrutura canônica

- [api/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/api): backend Express consumido pelo frontend
- [bigquery/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery): pipeline e validadores ativos
- [frontend/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/frontend): aplicação React publicada no Firebase
- [extraction/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/extraction): extração TMS e consolidação
- [google_apps/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/google_apps): automações de Google Apps Script ainda ativas
- [config/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/config): configurações e credenciais de publicação
- [data/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/data): arquivos de entrada correntes
- [docs/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/docs): documentação ativa
- [_archive/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_archive): todo conteúdo legado, transitório ou histórico

## BigQuery ativo

Arquivo único de deploy:

- [bigquery/pipeline_dashboard_v7.sql](c:/Users/lucas.batista/Documents/Projetos/Dashboard/bigquery/pipeline_dashboard_v7.sql) — **fonte única de medidas** (UDFs + staging + dim_filial + base_execucao_canonica + pub_metas + metas_pivot_canonico)
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
# pipeline de dados
.venv\Scripts\python.exe bigquery\load_raw_to_bq.py
.venv\Scripts\python.exe bigquery\deploy_v7_dashboard.py
.venv\Scripts\python.exe bigquery\sync_bq_to_sheets.py "1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4"

# validações
.venv\Scripts\python.exe bigquery\validate_pipeline.py
.venv\Scripts\python.exe bigquery\validate_data_contract.py
.venv\Scripts\python.exe bigquery\score_parity_test.py
.venv\Scripts\python.exe bigquery\regression_test.py

# frontend
cd frontend
npm run dev
npm run build

# publicação frontend
cd ..
npx firebase deploy --only hosting --project data-aileron-482822-d0

# publicação API
gcloud run deploy dashboard-logistico-api --source api --region us-central1 --project data-aileron-482822-d0 --allow-unauthenticated
```

## Regras de organização

- Não criar novos documentos versionados para explicar o mesmo assunto.
- Atualizar sempre o documento canônico correspondente.
- Qualquer arquivo legado, diagnóstico pontual, backup ou experimento deve ir para [_archive/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_archive).
- As pastas [_tmp/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/_tmp) e [downloads/](c:/Users/lucas.batista/Documents/Projetos/Dashboard/downloads) não fazem parte do fluxo principal.
