---
applyTo: ".github/**"
---

# Instruções — Gestão de Projeto com GitHub CLI

## Papel do GitHub CLI

O GitHub CLI (`gh`) é o ponto central de gestão operacional do projeto.
Toda governança do trabalho deve passar por ele:

- issues
- pull requests
- milestones
- labels
- workflows
- releases
- projetos GitHub (quando o token tiver scopes de project)

## Princípios

1. Toda entrega começa por issue criada e categorizada
2. Toda issue deve ter ao menos `type:*`, `domain:*` e `priority:*`
3. Sempre que possível, associar issue a milestone/sprint
4. Toda implementação relevante deve referenciar issue no PR com `Closes #XX`
5. Não iniciar trabalho estrutural sem antes validar impacto na cadeia:
   TMS -> CSV -> BigQuery -> Sheets -> Apps Script -> API -> Frontend

## Convenções Git

- feature: `feat/<descricao-curta>`
- bugfix: `fix/<descricao-curta>`
- chore: `chore/<descricao-curta>`
- docs: `docs/<descricao-curta>`

## Definição de Pronto

Uma issue só pode ser encerrada quando:

- código ou configuração estiver aplicada
- validação compatível com o domínio tiver sido executada
- documentação mínima estiver atualizada se necessário
- PR ou commit de referência estiver registrado

## Cadência Recomendada

### Daily
- revisar issues `priority: critical` e `priority: high`
- revisar itens `status: blocked`
- verificar falhas em GitHub Actions

### Semanal
- revisar progresso do milestone ativo
- re-priorizar backlog
- fechar ou reescrever issues vagas

### Por Sprint
- definir objetivo do sprint
- limitar WIP
- registrar riscos e dependências externas
- revisar capacidade antes de abrir novas frentes

## Automação Preferencial

Usar scripts PowerShell com `gh` para:

- resumo diário
- relatório de sprint
- criação de backlog inicial
- triagem de issues
- verificação de PRs abertas

## Restrições

- não criar automações que fechem issues sem validação
- não usar labels genéricas demais
- não duplicar backlog para o mesmo objetivo
- não tratar Project do GitHub como fonte única se o token não tiver scopes corretos
