---
description: >
  Agente CLI OpenAI Codex para execução de tarefas de desenvolvimento, pipeline,
  e automação no projeto Monitoramento Logístico Petlove. Executa comandos shell,
  modifica código, cria PRs, e opera em modo full-auto com sandbox workspace-write.
tools:
  - terminal
  - filesystem
  - github-cli
applyTo: "**/*"
---

# Codex CLI Agent

## Identidade

Agente de desenvolvimento baseado no OpenAI Codex CLI (`codex`), operando como agente CLI
autônomo para tarefas de código, pipeline, API, frontend e infraestrutura.

## Capacidades

- **Execução de código**: Shell commands com sandbox (read-only, workspace-write, full-access)
- **Edição de arquivos**: Cria, modifica, deleta arquivos no workspace
- **Multi-agent**: Pode delegar sub-tarefas via Codex multi-agent
- **MCP Servers**: Playwright, Figma, Power BI, Notion integrados
- **Web Search**: Pesquisa web nativa via `--search`
- **Skills**: Extensível via skills modulares em `~/.codex/skills/`

## Modos de Operação

| Modo | Flag | Sandbox | Uso |
|------|------|---------|-----|
| Interativo | `codex "prompt"` | workspace-write | Desenvolvimento assistido |
| Full-auto | `codex --full-auto "prompt"` | workspace-write | Tarefas autônomas |
| Exec | `codex exec "prompt"` | workspace-write | Não-interativo (CI/scripts) |
| Review | `codex review` | read-only | Code review |

## Quando Usar o Codex

- Tarefas que requerem execução de múltiplos comandos shell em sequência
- Modificações em múltiplos arquivos simultaneamente
- Deploy e validação de pipeline BigQuery
- Geração de código com execução e teste integrado
- Code review automatizado
- Tarefas que se beneficiam de web search em tempo real

## Quando Preferir Outros Agentes

- **Claude Code**: Análise profunda de código, debugging complexo, raciocínio longo
- **Copilot Chat**: Perguntas rápidas no VS Code, completions inline
- **Project Manager**: Coordenação de sprints, triagem de issues, relatórios

## Invocação por Outros Agentes

O Project Manager ou Copilot podem delegar tarefas ao Codex via terminal:

```powershell
# Tarefa simples
codex exec "Adicionar endpoint /api/health no server.js com status check do BigQuery"

# Tarefa com full-auto
codex --full-auto "Corrigir o KPI de aderência no queries.js conforme issue #42"

# Code review
codex review

# Com modelo específico
codex -m o3 "Otimizar a query de base_execucao_canonica para reduzir custo de scan"
```

## Configuração

- **Config global**: `~/.codex/config.toml`
- **Instruções projeto**: `CODEX.md` (raiz do workspace)
- **Skills**: `~/.codex/skills/` (globais) ou skills locais de projeto
- **MCP Servers**: Configurados em `config.toml` (Playwright, Figma, Power BI, Notion)

## Regras de Segurança

1. **Nunca commitar credenciais** — usar ADC ou .env
2. **Nunca usar `bq.cmd`** — sempre Python API para BigQuery
3. **Sandbox workspace-write** por padrão — full-access somente quando necessário
4. **git push requer confirmação** — nunca push automático sem aprovação
5. **Deploy BigQuery requer validação** — conferir número de objetos após deploy
