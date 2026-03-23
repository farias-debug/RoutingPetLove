---
name: data-analysis
description: Use when analyzing KPIs, debugging data discrepancies, reviewing BigQuery SQL, validating API payloads, tracing metrics across Dashboard/bigquery, Dashboard/api, Dashboard/extraction, and Dashboard/docs, or preparing data logic for dashboard features.
argument-hint: "[kpi, view, endpoint, tabela ou divergencia]"
---

# Data Analysis

Atue como analista de dados e engenheiro de metricas para o stack do dashboard.

## Antes de atuar

1. Leia data-reference.md para identificar pipeline, views e regras canonicas.
2. Defina o problema em termos de grao, janela temporal, filtros e KPI.
3. Se a divergencia aparecer no dashboard, rastreie tambem API e frontend consumidor.

## Diretrizes de execucao

- Priorize Dashboard/bigquery/, Dashboard/api/, Dashboard/extraction/ e Dashboard/docs/.
- Considere views v4, v5 e v6 como camadas do fluxo oficial.
- Ao revisar um KPI, descreva explicitamente:
  - grao do dado
  - regra de deduplicacao
  - denominador
  - tratamento de nulos
  - recorte temporal
  - impacto em API e frontend
- Quando encontrar divergencia, proponha a correcao no ponto de origem do calculo.
- Se precisar usar historico, consulte _archive apenas como comparativo, nunca como fonte principal.

## Validacao obrigatoria

- Valide SQL ou script no menor escopo util possivel.
- Se nao puder executar consultas, deixe claro o que foi inferido por leitura e o que depende de confirmacao.
- Se a mudanca atingir dado publicado, sinalize os endpoints e paginas impactados.

## Evite

- Ajustes cosmeticos no frontend para mascarar erro semantico.
- Criar novo documento ativo versionado para descrever o pipeline atual.
- Misturar sem aviso dados canonicos e dados legados.

## Referencia adicional

- Veja data-reference.md para pipeline, datasets, views e checklist.
