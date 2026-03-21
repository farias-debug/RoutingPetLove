# Gestão de Issues

Gerencie issues do projeto RoutingPetLove via GitHub CLI.

## Ações Disponíveis

### Criar Issue
```bash
gh issue create \
  --title "[TYPE] Descrição clara e concisa" \
  --label "type: feature,domain: bigquery,priority: medium" \
  --milestone "Sprint X — Nome" \
  --body "## Descrição\n\n## Critérios de Aceite\n- [ ] ..."
```

### Priorizar Backlog
```bash
# Ver todas as issues abertas ordenadas
gh issue list --state open --json number,title,labels,milestone --jq 'sort_by(.labels | map(.name) | join(",")) | .[] | "#\(.number) [\(.labels | map(.name) | join(", "))] \(.title)"'
```

### Mover Issue para Sprint
```bash
gh issue edit <número> --milestone "Sprint X — Nome"
```

### Atualizar Status
```bash
# Iniciar trabalho
gh issue edit <número> --add-label "status: in-progress" --remove-label "status: blocked"

# Bloquear
gh issue edit <número> --add-label "status: blocked" --remove-label "status: in-progress"

# Solicitar review
gh issue edit <número> --add-label "status: needs-review" --remove-label "status: in-progress"
```

### Fechar Issue
```bash
gh issue close <número> --comment "Resolvido via commit <hash>"
```

### Buscar Issues
```bash
# Por domínio
gh issue list --label "domain: bigquery" --state open

# Bugs críticos
gh issue list --label "type: bug,priority: critical" --state open

# Sprint atual
gh issue list --milestone "Sprint 1 — Fundação" --state open
```

## Boas Práticas

1. Uma issue = uma entrega atômica
2. Título segue padrão: `[TYPE] Verbo + objeto`
3. Labels: mínimo type + domain
4. Sempre linkar PR à issue: `Closes #XX`
