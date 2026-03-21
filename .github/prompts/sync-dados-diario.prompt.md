# Pipeline Diário — Sync Dados

Execute o pipeline diário completo de sincronização de dados.

## Comando rápido

```powershell
.\scripts\daily_pipeline.ps1
```

## Fluxo detalhado

1. **Consolidar CSVs**: `python Dashboard/extraction/consolidar_monitoramento.py`
2. **Carga BQ**: `python Dashboard/bigquery/load_raw_to_bq.py`
3. **Sync Sheets**: `python Dashboard/bigquery/sync_bq_to_sheets.py`
4. **Git sync**: automático via `scripts/git_daily_sync.ps1`

## Extração TMS (se necessário)

A extração TMS via Playwright não faz parte do pipeline diário automático:

```powershell
Dashboard\extraction\extrair_monitoramento_rotas.ps1
```

## Referências

- Google Sheets ID: `1Z-Jhaf9g4dbnti_ry7IO2J6BuZhCsqhoUREKtWMd3k4`
- Python venv: `Dashboard\.venv\Scripts\python.exe`
- Views BQ auto-refresh ao consultar (não requerem redeploy para dados novos)
