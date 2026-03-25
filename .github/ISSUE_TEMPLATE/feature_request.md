---
name: "✨ Feature Request"
about: Propor uma nova funcionalidade ou melhoria
title: "[FEAT] "
labels: "type: feature"
assignees: ""
---

## Descrição
<!-- O que você precisa? -->

## Domínio
- [ ] BigQuery (pipeline v7)
- [ ] Extração TMS / Pipeline Cloud
- [ ] API Cloud Run
- [ ] React Dashboard (frontend)
- [ ] Infra / Scripts / CI/CD

## Motivação
<!-- Por que essa feature é importante? Qual problema resolve? -->

## Solução Proposta
<!-- Como você imagina que deveria funcionar? -->

## Critérios de Aceite
- [ ]
- [ ]
- [ ]

## Impacto na Cadeia
<!-- Quais componentes são afetados? -->
```
Cloud Scheduler → Cloud Run Job (TMS → CSV → BQ)
    → BigQuery v7 (views auto-refresh)
    → API Cloud Run → React Dashboard (Firebase)
```
