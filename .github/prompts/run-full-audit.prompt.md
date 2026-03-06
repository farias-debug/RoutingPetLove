---
description: >
  Executa auditoria completa do projeto Painel Monitoramento Petlove em sequência:
  estrutura, medidas, taxonomia, módulos, componentes, migração e quick wins.
  Produz todos os 7 docs em Dashboard/docs/.
mode: agent
---

# Auditoria Completa do Projeto

## Objetivo

Executar todas as etapas de análise e reestruturação do Painel Monitoramento Petlove, produzindo os 7 artefatos de documentação.

## Sequência de Execução

### Etapa 1 — Auditoria Estrutural

Inspecionar e diagnosticar:
- Coerência de caminhos: `data/` → `transform.py` → `output/powerbi/` → `SemanticModel` → `Report`
- M queries apontam para os CSVs corretos?
- Relacionamentos N:1 estão íntegros?
- Há pastas órfãs, caminhos quebrados, dependências frágeis?
- Há acoplamento entre estrutura física e camada visual?
- Vestígios de HTML contaminando organização de medidas?

**Saída**: `Dashboard/docs/01-auditoria-estrutura-projeto.md`

### Etapa 2 — Inventário de Medidas

Ler `_Medidas.tmdl` e catalogar todas as 389 medidas:
- Nome, displayFolder, expressão, formatString, description
- Tipo, granularidade, dependências, status
- Classificação: core / apoio / legado / duplicada / remoção / refatorar / faltante

**Saída**: `Dashboard/docs/02-inventario-medidas.md`

### Etapa 3 — Taxonomia Alvo

Propor reorganização dos grupos de medidas:
- Grupos principais e subgrupos
- Convenção de nomenclatura (prefixos, sufixos)
- Padrão para medidas base, derivadas, metas, status, alertas, rankings, tooltips, SVG
- Justificativa das mudanças vs estado atual

**Saída**: `Dashboard/docs/03-taxonomia-medidas.md`

### Etapa 4 — Mapa de Módulos Visuais

Definir 6-8 módulos com:
- Pergunta operacional, ação esperada
- KPIs de destaque, visuais recomendados
- Grupos de medidas por módulo
- Prioridade de implementação

**Saída**: `Dashboard/docs/04-mapa-modulos-painel.md`

### Etapa 5 — Kit de Componentes

Especificar 8 componentes padrão:
1. KPI Card Principal
2. KPI Card de Alerta
3. Meta vs Real
4. Ranking Top/Bottom
5. Tendência Curta
6. Tabela de Investigação
7. Painel de Filtros
8. Tooltip Rico

Para cada: quando usar, layout, regras visuais, versão fácil, versão premium, medidas necessárias.

**Saída**: `Dashboard/docs/05-kit-componentes-visuais.md`

### Etapa 6 — Plano de Migração HTML

Inventariar legado HTML, classificar e propor migração:
- Nativo (fase 1) → SVG via DAX (fase 2) → Deneb pontual (fase 3)
- Classificar: manter temp / substituir rápido / refatorar depois / descartar

**Saída**: `Dashboard/docs/06-plano-migracao-html-svg-deneb.md`

### Etapa 7 — Quick Wins

Listar 15+ ações rápidas priorizadas por impacto × esforço:
- Reorganização de medidas
- Correções visuais rápidas
- Limpeza de legado
- Padronizações imediatas

**Saída**: `Dashboard/docs/07-quick-wins.md`

## Regras

- Executar todas as etapas em sequência sem pausa para aprovação
- Ao encontrar ambiguidade, registrar premissa e seguir
- Foco em decisão e ação, não em explicação teórica
- Usar a hierarquia de grupos de medidas como fonte principal
- Prioridade técnica: nativo → SVG → Deneb

## Saída Final

7 arquivos em `Dashboard/docs/` + resumo executivo com:
- Principais problemas encontrados
- Nova organização proposta
- Quick wins prontos
- Próximos passos
