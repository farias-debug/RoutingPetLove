---
name: dashboard-root-cause
description: Use when a dashboard issue spans frontend, API, and BigQuery and requires end-to-end root cause tracing across Dashboard/frontend, Dashboard/api, and Dashboard/bigquery.
argument-hint: "[kpi, tela, endpoint ou inconsistencia]"
disable-model-invocation: true
---

# Dashboard Root Cause

Investigue o problema informado ponta a ponta usando contexto isolado e foco em causa raiz.

Tarefa: investigar $ARGUMENTS.

## Passos obrigatorios

1. Localize a pagina ou componente frontend afetado.
2. Localize o hook, schema e endpoint consumido.
3. Localize a query, view ou script que origina o dado.
4. Identifique exatamente onde o valor ou comportamento diverge.
5. Retorne um resumo objetivo com:
   - causa raiz
   - arquivos mais relevantes
   - ponto ideal de correcao
   - riscos colaterais

## Regras

- Nao proponha correcao no componente se a origem estiver na API ou no SQL.
- Trate _archive e _tmp apenas como referencia historica.
- Priorize precisao semantica do KPI e do contrato de dados.
