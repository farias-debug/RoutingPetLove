# Deploy Pipeline BigQuery

Execute o deploy completo do pipeline BigQuery v7 no dataset `monitoramento_carga`.

## Passos

1. Ativar o venv: `Dashboard\.venv\Scripts\activate`
2. Garantir autenticação: `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/bigquery,https://www.googleapis.com/auth/cloud-platform`
3. Deploy v7 (pipeline único): `python Dashboard/bigquery/deploy_v7_dashboard.py`
4. Validar contagem de objetos (esperado: 3 raw + 11 UDFs + 7 views)

## Regras

- NUNCA usar `bq.cmd` — causa corrupção de encoding (cp1252). Sempre via Python API.
- Projeto BQ: `data-aileron-482822-d0`
- Dataset: `monitoramento_carga`
- Conta: `lucas.batista@petlove.com.br`
