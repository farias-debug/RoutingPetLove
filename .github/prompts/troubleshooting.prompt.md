# Troubleshooting — Problemas Comuns

Guia de diagnóstico para problemas recorrentes no projeto de monitoramento.

## API Cloud Run não responde

1. Verificar health: `curl https://dashboard-logistico-api-745676656148.us-central1.run.app/health`
2. Se falhar, checar logs: `gcloud run services logs read dashboard-logistico-api --region us-central1 --limit 30`
3. Verificar se a revision está ativa: `gcloud run revisions list --service dashboard-logistico-api --region us-central1`

## Frontend não carrega dados

1. Verificar se `VITE_API_BASE_URL` está definida no `.env` do frontend
2. Sem a variável, o frontend usa mock fallback (dados estáticos)
3. Testar API diretamente: `/api/filtros/opcoes`, `/api/kpi-diario?periodo=2026-03`
4. Verificar CORS se rodando localhost vs produção

## Dados desatualizados no Dashboard

1. Executar pipeline diário: `.\scripts\daily_pipeline.ps1`
2. Views BQ são auto-refresh (`base_execucao_canonica` roda no momento da query)

## Erro de encoding no BigQuery

- NUNCA usar `bq.cmd` diretamente — causa corrupção cp1252
- Sempre deployar via Python API: `python Dashboard/bigquery/deploy_v7_dashboard.py`

## KPIs operacionais inflados

- TODOS os KPIs são calculados em `queries.js` agregando de `base_execucao_canonica`
- Verificar se o filtro WHERE está sendo aplicado antes do GROUP BY
- Views `vw_*` legacy foram arquivadas — não recriar

## Health check do ambiente

```powershell
.\scripts\health_check.ps1
```

Verifica: Git, Node, Python venv, GitHub Auth, dados CSV, e dependências.
