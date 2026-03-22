# GAPS, Melhorias e Ajustes Necessários

> Levantamento: 2026-03-20 | Atualizado: 2026-03-20 (reorganização v2)

---

## GAPS CRÍTICOS (Ação Imediata)

### 1. ~~Orquestrador não inclui pipeline BigQuery~~ ✅ RESOLVIDO
- **Solução**: `scripts/daily_pipeline.ps1` reescrito com 4 estágios BQ:
  consolidar → bq load → sync Sheets → git sync. Flags: `-SkipConsolidar`, `-SkipSync`, `-SkipGit`.

### 2. ~~`daily_pipeline.ps1` referencia scripts legados~~ ✅ RESOLVIDO
- **Solução**: Reescrito para usar pipeline BQ (load_raw_to_bq.py + sync_bq_to_sheets.py).

### 3. Tabelas `raw_planejamento` e `raw_dim_filial` não são recarregadas
- **Problema**: `load_raw_to_bq.py` tem configuração para carregar essas tabelas mas o fluxo
  atual só carrega `raw_monitoramento`. As tabelas de planejamento e dimensão filial no BQ
  podem estar desatualizadas se os Excel locais forem editados.
- **Impacto**: Marts que cruzam planejamento × monitoramento podem ter dados obsoletos.
- **Ação**: Incluir `--table all` ou `--table raw_dim_filial` no fluxo quando houver alteração
  nas fontes Excel. Completar a implementação do loader XLSX no `load_raw_to_bq.py`.

---

## GAPS MODERADOS (Planejar)

### 4. Sem validação pós-carga no BigQuery
- **Problema**: Após `bq load`, não há validação automática de integridade (contagem de linhas,
  verificação de NULLs em colunas críticas, etc.).
- **Ação**: Adicionar etapa de `validate` no `load_raw_to_bq.py` que compare:
  - `count(*)` do CSV vs `count(*)` da tabela BQ
  - `count(DISTINCT id_carga)` para detectar duplicatas
  - `MIN/MAX(dtabertura)` para confirmar período esperado

### 5. Sem alertas/notificações de erro
- **Problema**: Se algum estágio falhar, o único feedback é o log no terminal.
  Não há alertas por email, Slack ou qualquer canal de notificação.
- **Ação futura**: Integrar notificação de falha (Google Chat webhook, email via SendGrid, etc.)

### 6. Sem agendamento automático (cron/scheduler)
- **Problema**: Todo o pipeline é executado manualmente. Não há Task Scheduler, cron job
  ou Cloud Function agendando a execução diária.
- **Ação**: Configurar Windows Task Scheduler para executar o pipeline BQ diariamente
  após horário de fechamento operacional, ou usar Cloud Scheduler + Cloud Functions.

### 7. `health_check.ps1` (root) não verifica BigQuery
- **Problema**: O health check verifica Git, Python, Node.js, dados locais, mas não testa
  conectividade BigQuery, estado das views ou validade das credenciais ADC.
- **Ação**: Adicionar checks de `bq ls`, `bq query count(*)` e teste de ADC no health check.

---

## MELHORIAS RECOMENDADAS

### 8. ~~Unificar orquestração em script único~~ ✅ RESOLVIDO
- **Solução**: `scripts/daily_pipeline.ps1` é o orquestrador BQ unificado (4 estágios).

### 9. Limpeza periódica de artefatos
- `output/playwright/` acumula centenas de screenshots de teste (400+).
  Configurar rotina de limpeza ou mover para `_archive` após cada ciclo.
- `data/Relatorio_Monitoramento_Carga/` acumula CSVs incrementais já consolidados.
  Após consolidação confirmada, mover para `_archive/incrementais/`.
- CSVs `.bak_*` em `data/` devem ser limpos periodicamente.

### 10. Logs estruturados e histórico de execução
- Atual: `logs/periodo_detectado_*.json` (apenas detecção de período).
- Ideal: Log JSON de cada execução completa do pipeline com timestamps,
  contagens, duração de cada etapa e status final.
- Permite dashboardizar a saúde do pipeline.

### 11. Testes automatizados
- Não há testes unitários ou de integração automatizados.
- Sugestão:
  - Testes unitários para funções de normalização CSV (`load_raw_to_bq.py`)
  - Teste de integração: carregar amostra → verificar views → comparar contagens
  - Smoke test: `bq query --dry_run` nos SQLs para validar sintaxe

### 12. Versionamento de schema BigQuery
- Atualmente os SQLs são versionados pelo nome (`pipeline_v4.sql`, `pipeline_v5_publicacao.sql`).
- Não há migration system. Alterações em views requerem re-deploy manual.
- Sugestão: Considerar esquema de migrations numeradas ou hash-based para deploy incremental.

### 13. Documentar dimensões auxiliares no BigQuery
- `dim_motoristas`, `dim_veiculos`, `dim_percurso`, `dim_rota_entrega`, `dim_rotas_transferencias`,
  `dim_transportador` existem como XLSX locais mas **não estão no BigQuery**.
- Se forem necessários para análises futuras, criar views raw correspondentes.

---

## DÍVIDA TÉCNICA

### 14. Scripts de publicação Playwright redundantes
- Existem 3+ variantes de publicação no Sheets:
  - `publicar_google_sheets_tms.mjs` (recorte consolidado)
  - `publicar_visual_google_sheets.mjs` (CSVs finais via Playwright)
  - `publicar_visual_google_sheets_api.mjs` (via API)
  - `gerar_tsv_publicacao_visual.mjs` (TSV format)
- Com o caminho BQ → `sync_bq_to_sheets.py`, os publicadores Playwright podem ser deprecados.
- **Manter apenas**: `publicar_visual_google_sheets_api.mjs` como fallback, e `sync_bq_to_sheets.py` como principal.

### 15. `reconstruir_monitoramento_otimizado.py` é redundante com BigQuery
- Este script Python reconstrói a camada analítica localmente (8 CSVs).
- Com o BigQuery v4+v5, toda a analítica é feita em SQL.
- Manter como fallback para cenários sem BigQuery, mas documentar como **caminho B (legacy)**.

### 16. Formatos de dados inconsistentes na extração
- O TMS exporta `Tempo Realizado` como `HH:MM` (string) em extrações novas
  mas como FLOAT (horas decimais) em dados históricos.
- `load_raw_to_bq.py` já trata essa inconsistência, mas a causa raiz é a extração.
- Ideal: Normalizar no Playwright antes de salvar o CSV.

---

## NOVOS GAPS (Adicionados 2026-03-20 v2)

### 17. ~~route-eye-ops usa dados mock~~ ✅ RESOLVIDO
- **Problema original**: O dashboard React usava `mockData.ts` com dados estáticos.
- **Resolução**: API Cloud Run criada (`Dashboard/api/server.js`), frontend conectado via React Query hooks.
  Mock permanece como fallback quando `VITE_API_BASE_URL` não está definida.
- **URLs**: API `dashboard-logistico-api-*.us-central1.run.app`, Frontend `data-aileron-482822-d0.web.app`

### 18. ~~route-eye-ops não tem `.env`~~ ✅ RESOLVIDO
- **Resolução**: `.env` configurado em `Dashboard/frontend/` com `VITE_API_BASE_URL`.
  Frontend em produção no Firebase Hosting com variável apontando para API Cloud Run.

### 19. `.github/agents` e `AGENTS.md` estavam desatualizados
- **Status**: ✅ RESOLVIDO — Agents reescritos para pipeline BQ, React e Apps Script.
  `AGENTS.md` atualizado na raiz.

---

## PRIORIZAÇÃO SUGERIDA

| # | Item | Esforço | Impacto | Prioridade |
|---|------|---------|---------|------------|
| 1 | Orquestrador BQ | Médio | Alto | **P0** |
| 2 | Corrigir daily_pipeline.ps1 | Baixo | Alto | **P0** |
| 3 | Reload tabelas auxiliares BQ | Baixo | Médio | **P1** |
| 4 | Validação pós-carga | Baixo | Médio | **P1** |
| 8 | Script unificado run_pipeline_bq.ps1 | Médio | Alto | **P1** |
| 6 | Agendamento automático | Médio | Alto | **P1** |
| 7 | Health check com BQ | Baixo | Baixo | **P2** |
| 9 | Limpeza de artefatos | Baixo | Baixo | **P2** |
| 10 | Logs estruturados | Médio | Médio | **P2** |
| 11 | Testes automatizados | Alto | Médio | **P2** |
| 14 | Deprecar publicadores Playwright | Baixo | Baixo | **P3** |
| 15 | Deprecar reconstruir_otimizado.py | Baixo | Baixo | **P3** |
