---
description: >
  Identifica componentes HTML legados no dashboard e projeta substituições
  usando visuais nativos, SVG via DAX ou Deneb. Classifica cada componente
  e produz Dashboard/docs/06-plano-migracao-html-svg-deneb.md.
mode: agent
---

# Migração de Cards HTML para Nativo/SVG/Deneb

## Objetivo

Inventariar os componentes visuais implementados em HTML no Painel Monitoramento Petlove e planejar a migração para alternativas sustentáveis.

## Passos

1. **Inventariar componentes legados**
   - Buscar em `_Medidas.tmdl` medidas com displayFolder contendo "Legado" ou "90."
   - Buscar medidas com displayFolder contendo "SVG" ou "06. Shared\03"
   - Buscar no report JSON (`definition/pages/*/visuals/*/visual.json`) por referências a HTML content
   - Buscar medidas cujo DAX gera HTML (strings com `<div>`, `<span>`, `<table>`, `<svg>`)

2. **Classificar cada componente**

   | Categoria | Critério | Ação |
   |-----------|----------|------|
   | Substituir rápido | Visual nativo resolve, baixo esforço | Implementar nativo |
   | Refatorar com SVG | Precisa de visual compacto (badge, semáforo, sparkline) | Criar SVG via DAX |
   | Refatorar com Deneb | Ganho real de informação (ranking, variance, lollipop) | Implementar Deneb |
   | Manter temporariamente | Funciona, sem alternativa simples | Documentar e priorizar depois |
   | Descartar | Sem valor operacional | Mover para 90. Legado ou remover |

3. **Para cada componente a migrar, especificar**
   - O que o componente faz hoje
   - Qual medida DAX alimenta
   - Qual visual substituto (nativo/SVG/Deneb)
   - Quais medidas precisam ser criadas/alteradas
   - Esforço estimado (baixo/médio/alto)
   - Risco de perda funcional

4. **Tratar grupo 06. Shared\03. SVG Cards**
   - Não assumir continuidade — avaliar conceito
   - Se SVG é válido, reconstruir do zero com a paleta oficial
   - Se não, substituir por nativo

5. **Produzir plano**
   Criar `Dashboard/docs/06-plano-migracao-html-svg-deneb.md`

## Prioridade Técnica

1. **Visual nativo** + formatação condicional + tooltip pages
2. **SVG via DAX** para cards premium, badges, semáforos, sparklines
3. **Deneb** somente com ganho real

## Paleta para SVG

Todos os SVGs devem usar exclusivamente cores da paleta oficial:
- Primary: `#441A80` / Primary-2: `#5B2D8C`
- Warning: `#F5A623` / Success: `#4CAF50` / Danger: `#E74C3C`
- Surface: `#F9FAFB` / Border: `#E5E7EB`
- Text: `#6A7282` / Muted: `#A3A8B2`

## Saída

Arquivo `Dashboard/docs/06-plano-migracao-html-svg-deneb.md` contendo:
- Inventário de componentes HTML/legados
- Classificação por estratégia de migração
- Especificação do substituto por componente
- Cronograma sugerido em 3 fases
- Quick wins de migração
- Riscos e premissas
