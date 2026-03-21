# Daily Standup

Execute o standup diário automatizado do projeto RoutingPetLove.

## Relatório

### 1. O que foi feito (últimas 24h)
```bash
gh issue list --state closed --json number,title,closedAt --jq '[.[] | select(.closedAt > (now - 86400 | todate))] | .[] | "✅ #\(.number) \(.title)"'
```

### 2. O que fazer hoje (mais prioritárias)
```bash
gh issue list --label "priority: critical" --state open --json number,title --jq '.[] | "🔴 #\(.number) \(.title)"'
gh issue list --label "priority: high" --state open --json number,title --jq '.[:5] | .[] | "🟠 #\(.number) \(.title)"'
```

### 3. Bloqueios
```bash
gh issue list --label "status: blocked" --state open --json number,title --jq '.[] | "🚫 #\(.number) \(.title)"'
```

### 4. Progresso do sprint
```bash
gh api repos/farias-debug/RoutingPetLove/milestones --jq '.[] | select(.state == "open") | "\(.title): \(.closed_issues)/\(.open_issues + .closed_issues)"'
```

## Formato de Saída

```
📅 Standup — {data}

✅ FEITO:
- ...

📋 HOJE:
- ...

🚫 BLOQUEIOS:
- ...

📊 SPRINT: {nome} — {X}/{Y} issues ({%})
```
