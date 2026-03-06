---
name: html-to-svg-native
description: >
  DOMAIN SKILL — Migração de visuais HTML legados em Power BI para alternativas
  sustentáveis. USE FOR: identificar componentes HTML, planejar substituição por
  visual nativo/SVG/Deneb, classificar por urgência, reconstruir SVG Cards.
  DO NOT USE FOR: criação de novas medidas, design de módulos, alteração de pipeline.
---

# HTML to SVG/Native Migration

## Domínio

Migração de componentes visuais implementados em HTML no Power BI para alternativas nativas, SVG via DAX ou Deneb.

## Quando Usar

- Identificar medidas que geram HTML (strings com tags como `<div>`, `<span>`, `<svg>`)
- Planejar substituição de visuais HTML legados
- Reconstruir SVG Cards (grupo 06. Shared\03) que estão com erros
- Classificar componentes por estratégia de migração
- Implementar SVG via DAX seguindo a paleta oficial

## Contexto do Legado

- **90. Legado**: medidas HTML descontinuadas — referência, não estrutura final
- **06. Shared\03. SVG Cards**: iniciativas com erros — reconstruir, não corrigir
- O projeto começou em HTML, depois houve alteração de direção
- Vestígios HTML podem estar em medidas DAX e em visuals JSON do report

## Classificação de Migração

| Categoria | Critério | Ação |
|-----------|----------|------|
| Substituir rápido | Nativo resolve, baixo esforço | Fase 1 |
| Refatorar com SVG | Badge, semáforo, sparkline | Fase 2 |
| Refatorar com Deneb | Ranking, variance, lollipop | Fase 3 |
| Manter temporariamente | Funciona, sem alternativa simples | Documentar |
| Descartar | Sem valor operacional | Remover |

## Prioridade Técnica

1. **Visual nativo** + formatação condicional + tooltip pages
2. **SVG via DAX** para: badges, semáforos, bullets, sparklines curtas, status icons
3. **Deneb** somente com ganho real de informação

## SVG via DAX — Padrões

### Cores (usar exclusivamente da paleta oficial)

```dax
VAR _corPrimary = "#441A80"
VAR _corSuccess = "#4CAF50"
VAR _corDanger = "#E74C3C"
VAR _corWarning = "#F5A623"
VAR _corBorder = "#E5E7EB"
VAR _corMuted = "#A3A8B2"
```

### Estrutura SVG mínima

```dax
"data:image/svg+xml;utf8," &
"<svg xmlns='http://www.w3.org/2000/svg' width='200' height='40'>" &
  // conteúdo SVG
"</svg>"
```

### Regras

- Usar `viewBox` para responsividade
- Fontes: `font-family='Segoe UI'`
- Tamanhos compactos (max 200×40 para inline)
- Combinar cor + ícone + texto (nunca só cor)
- Testar em diferentes resoluções

## Checklist de Migração

- [ ] Todas as medidas HTML identificadas
- [ ] Cada medida classificada por estratégia
- [ ] SVG Cards do grupo 06.Shared\03 reavaliados
- [ ] Medidas do grupo 90. Legado documentadas como referência
- [ ] Substituições usam paleta oficial
- [ ] Nenhum código copiado de repo externo sem verificar licença
