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

## Dados desatualizados no Sheets / Dashboard

1. Executar pipeline diário: `.\scripts\daily_pipeline.ps1`
2. Views BQ são auto-refresh (não precisam de redeploy)
3. Se Sheets não atualizou, reexecutar sync: `python Dashboard/bigquery/sync_bq_to_sheets.py`

## Erro de encoding no BigQuery

- NUNCA usar `bq.cmd` diretamente — causa corrupção cp1252
- Sempre deployar via Python API (`deploy_v4.py`, `deploy_v5_publicacao.py`, etc.)

## KPIs operacionais inflados

- NÃO agregar diretamente de VW_Base_Execucao para KPIs operacionais
- Usar `alertas_rotas` deduplicada por Data+Filial+Rota
- VW_Base_Execucao apenas para custos e campos não disponíveis em alertas

## Health check do ambiente

```powershell
.\scripts\health_check.ps1
```

Verifica: Git, Node, Python venv, GitHub Auth, dados CSV, e dependências.
