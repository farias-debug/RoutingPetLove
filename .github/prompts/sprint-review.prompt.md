# Sprint Review

Gere o relatório de sprint review do milestone atual.

## Passos

1. Verificar qual milestone está ativo:
```bash
gh api repos/farias-debug/RoutingPetLove/milestones --jq '.[] | select(.state == "open") | "\(.number) \(.title) — due: \(.due_on | split("T")[0]) — \(.closed_issues)/\(.open_issues + .closed_issues) done"'
```

2. Listar issues fechadas do sprint:
```bash
gh issue list --milestone "<nome do sprint>" --state closed --json number,title,labels,closedAt
```

3. Listar issues abertas (pendentes):
```bash
gh issue list --milestone "<nome do sprint>" --state open --json number,title,labels
```

4. Listar issues bloqueadas:
```bash
gh issue list --label "status: blocked" --state open
```

5. Gerar relatório formatado com:
   - ✅ Issues entregues
   - ⬜ Issues pendentes
   - 🚫 Issues bloqueadas
   - 📊 % de progresso
   - 📋 Recomendações para próximo sprint
