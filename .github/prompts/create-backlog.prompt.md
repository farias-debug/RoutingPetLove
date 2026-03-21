# Criar Backlog de Issues

Crie um conjunto de issues iniciais para o projeto RoutingPetLove com base no estado atual.

## Análise prévia

1. Verificar o que já existe no repositório (issues abertas)
2. Analisar a cadeia de dependências do projeto
3. Identificar gaps e melhorias necessárias

## Issues a criar por Sprint

### Sprint 1 — Fundação
```bash
gh issue create --title "[CHORE] Configurar branch protection rules" --label "type: chore,domain: infra" --milestone "Sprint 1 — Fundação" --body "Configurar proteção da branch main: require PR reviews, status checks"
gh issue create --title "[DOCS] Documentar arquitetura completa" --label "type: docs,domain: infra" --milestone "Sprint 1 — Fundação" --body "Criar diagrama de arquitetura em Dashboard/docs/"
gh issue create --title "[CI/CD] Validar workflows GitHub Actions" --label "type: ci/cd,domain: infra" --milestone "Sprint 1 — Fundação" --body "Testar health-check, issue-triage, validate-sql, weekly-report"
```

### Sprint 2 — Pipeline Estável
```bash
gh issue create --title "[FEAT] Validação de data contracts no pipeline" --label "type: feature,domain: bigquery" --milestone "Sprint 2 — Pipeline Estável"
gh issue create --title "[FEAT] Alertas automáticos de pipeline falho" --label "type: feature,domain: bigquery,domain: infra" --milestone "Sprint 2 — Pipeline Estável"
gh issue create --title "[CHORE] Testes unitários para deploy scripts" --label "type: chore,domain: bigquery" --milestone "Sprint 2 — Pipeline Estável"
```

### Sprint 3 — Frontend MVP
```bash
gh issue create --title "[FEAT] Todas as 9 páginas funcionais com dados reais" --label "type: feature,domain: frontend" --milestone "Sprint 3 — Frontend MVP"
gh issue create --title "[FEAT] Filtros globais persistentes via URL" --label "type: feature,domain: frontend" --milestone "Sprint 3 — Frontend MVP"
gh issue create --title "[CHORE] Testes E2E com Playwright" --label "type: chore,domain: frontend" --milestone "Sprint 3 — Frontend MVP"
```

### Sprint 4 — Produção
```bash
gh issue create --title "[FEAT] Monitoramento e alertas em produção" --label "type: feature,domain: infra" --milestone "Sprint 4 — Produção"
gh issue create --title "[DOCS] Runbook de operações" --label "type: docs,domain: infra" --milestone "Sprint 4 — Produção"
```

## Regras

- Toda issue tem: tipo + domínio + prioridade + milestone
- Usar os templates de issue quando aplicável
- Quebrar issues grandes em sub-tasks
