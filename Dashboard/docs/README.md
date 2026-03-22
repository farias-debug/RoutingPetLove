# Documentação — Monitoramento Logístico Last-Mile

## Documentos Ativos

| Documento | Descrição |
|-----------|-----------|
| [AUDITORIA_ARQUITETURA_PIPELINE.md](AUDITORIA_ARQUITETURA_PIPELINE.md) | **Auditoria completa: arquitetura SQL, medidas, fluxo, recomendações (2026-03-21)** |
| [MAPA_PROJETO_MONITORAMENTO.md](MAPA_PROJETO_MONITORAMENTO.md) | Visão geral do projeto (escopo, período, frequência, usuários) |
| [PIPELINE_V4_DOCUMENTACAO.md](PIPELINE_V4_DOCUMENTACAO.md) | Documentação de deploy do pipeline v4 (28 statements) |
| [data_contract_frontend.md](data_contract_frontend.md) | Contrato analítico Frontend ↔ API ↔ BigQuery (v2.0) |
| [matriz_contrato_front_api_bq.md](matriz_contrato_front_api_bq.md) | Matriz completa Hook × Endpoint × Fonte BQ × Filtros × Status |
| [mapeamento_arquitetura.md](mapeamento_arquitetura.md) | Fluxo ponta a ponta: TMS → Playwright → Python → BQ → Consumo |
| [publicacao_frontend.md](publicacao_frontend.md) | URLs de produção/staging, revisões Cloud Run, status de deploy |
| [setup_redesign_cockpit.md](setup_redesign_cockpit.md) | Redesign da home → CockpitOperacional, rotas e escopo |
| [AUDITORIA_SCRIPT_MONITORAMENTO.md](AUDITORIA_SCRIPT_MONITORAMENTO.md) | Auditoria do Apps Script Google Sheets (schema .xlsx, gaps) |

## Documentos Históricos

Registros de tarefas concluídas e logs de execução. Mantidos para referência.

| Documento | Descrição |
|-----------|-----------|
| [GAPS_E_MELHORIAS.md](GAPS_E_MELHORIAS.md) | Tracker de gaps e melhorias (maioria resolvida) |
| [correcao_regras_negocio.md](correcao_regras_negocio.md) | Log de correções em metas, KPIs, mocks e endpoints |
| [validacao_funcional_frontend.md](validacao_funcional_frontend.md) | Log de validações: deploy v6, Zod, paginação, smoke tests |
| [setup_evolucao_dashboard.md](setup_evolucao_dashboard.md) | Checklist de setup (frontend, API, SQL, Firebase, Cloud Run) |
| [setup_execucao_real.md](setup_execucao_real.md) | Versões de ferramentas encontradas no ambiente |
| [diagnostico_integracao_real.md](diagnostico_integracao_real.md) | Diagnóstico do que existia vs. faltava para integração real |

## Documentos Arquivados

Movidos para `_archive/` por estarem supersedidos:

- `diagnostico_melhorias_dashboard.md` → supersedido por `correcao_regras_negocio` + `GAPS_E_MELHORIAS`
- `gaps_regras_negocio.md` → supersedido por `correcao_regras_negocio` + `data_contract_frontend` v2
- `mapeamento_pagina_para_view.md` → supersedido por `matriz_contrato_front_api_bq`
- `PLANO_CANONICO_ABAS_E_VISUAL.md` → supersedido (frontend React substituiu Sheets como consumer principal)
