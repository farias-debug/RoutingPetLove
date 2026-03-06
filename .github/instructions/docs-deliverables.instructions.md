---
applyTo:
  - "Dashboard/docs/*.md"
  - "Dashboard/README.md"
---

# Instruções — Documentação e Entregáveis

## Estrutura de Documentação

Os artefatos de documentação ficam em `Dashboard/docs/` e devem ser auto-suficientes para que outra pessoa entenda e mantenha o projeto.

### Arquivos esperados

| Arquivo | Conteúdo |
|---------|----------|
| `01-auditoria-estrutura-projeto.md` | Diagnóstico da estrutura atual, coerência de caminhos, pontos frágeis |
| `02-inventario-medidas.md` | Catálogo completo de medidas com status, grupo, tipo, dependências |
| `03-taxonomia-medidas.md` | Estrutura alvo dos grupos, convenção de nomenclatura, padrões |
| `04-mapa-modulos-painel.md` | Módulos visuais (6-8), perguntas, KPIs, visuais recomendados |
| `05-kit-componentes-visuais.md` | 8 componentes padrão com layout, regras e variantes |
| `06-plano-migracao-html-svg-deneb.md` | Plano de migração do legado HTML |
| `07-quick-wins.md` | 15+ ações rápidas priorizadas por impacto × esforço |

## Padrão de Escrita

### Formato

- Markdown puro (`.md`)
- Tabelas para catálogos e listas estruturadas
- Headings hierárquicos (`#` → `##` → `###`)
- Code blocks para DAX, Python, JSON

### Tom

- Direto e objetivo
- Sem floreios ou justificativas excessivas
- Foco em decisão e ação, não em explicação teórica
- Quando houver ambiguidade, registrar a premissa adotada

### Inventário de Medidas

Cada medida no inventário deve ter no mínimo:

| Campo | Descrição |
|-------|-----------|
| Nome | Nome exato da medida |
| Grupo | Display folder atual |
| Objetivo | O que a medida calcula |
| Tipo | Base, derivada, meta, status, alerta, variação, ranking, tooltip, SVG, format |
| Granularidade | Dia, semana, filial, rota, veículo |
| Dependências | Medidas ou colunas que referencia |
| Status | core / apoio / legado / duplicada / remoção / refatorar / faltante |
| Observações | Notas relevantes |

### Referências Externas

Ao citar referência externa:
1. Verificar LICENSE do repositório
2. Se não houver licença clara, usar apenas como referência visual
3. Nunca copiar artefatos sem base legal
4. Explicitar o que é referência visual vs uso permitido

## Premissas para Documentação

- A fonte principal de verdade são os grupos de medidas e o contexto operacional
- O modelo semântico e os arquivos TMDL são a referência técnica
- O dashboard foca em gestão de roteirização, frota e operação diária/semanal
- Referências externas complementam, nunca substituem a estrutura interna
