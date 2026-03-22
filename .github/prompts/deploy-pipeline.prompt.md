# Deploy Pipeline BigQuery

Execute o deploy completo do pipeline BigQuery (v4 + v5 + v6) no dataset `monitoramento_carga`.

## Passos

1. Ativar o venv: `Dashboard\.venv\Scripts\activate`
2. Garantir autenticação: `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/bigquery,https://www.googleapis.com/auth/cloud-platform`
3. Deploy v4 (analítica): `python Dashboard/bigquery/deploy_v4.py`
4. Deploy v5 (publicação): `python Dashboard/bigquery/deploy_v5_publicacao.py`
5. Deploy v6 (API views): `python Dashboard/bigquery/deploy_v6_api_views.py`
6. Validar contagem de objetos no dataset (esperado: 3 raw + 14 UDFs + ~41 views)

## Regras

- NUNCA usar `bq.cmd` — causa corrupção de encoding (cp1252). Sempre via Python API.
- Projeto BQ: `data-aileron-482822-d0`
- Dataset: `monitoramento_carga`
- Conta: `lucas.batista@petlove.com.br`
