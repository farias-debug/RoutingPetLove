---
name: deneb-pattern-selector
description: >
  DOMAIN SKILL — Seleção de padrões Deneb (Vega/Vega-Lite) para Power BI.
  USE FOR: escolher pattern Deneb adequado para ranking, variance, lollipop,
  small multiples. Avaliar se Deneb é necessário ou se nativo/SVG resolve.
  DO NOT USE FOR: visuais nativos, SVG simples, alteração de medidas, pipeline.
---

# Deneb Pattern Selector

## Domínio

Seleção e orientação de padrões Deneb (Vega/Vega-Lite) para casos onde visuais nativos e SVG não atendem.

## Quando Usar

- Avaliar se um visual realmente precisa de Deneb ou se nativo/SVG resolve
- Selecionar o pattern Vega ou Vega-Lite mais adequado para o caso
- Orientar implementação de: ranking visual, variance/deviation, lollipop chart, small multiples, bullet chart
- Adaptar templates Deneb ao contexto deste dashboard

## Regra Principal

**Se um visual nativo resolve com clareza, NÃO usar Deneb.**

Deneb é a **terceira opção** (após nativo e SVG), e só deve ser usado quando há ganho real de informação.

## Casos Válidos para Deneb

| Caso | Pattern Vega-Lite | Quando Usar |
|------|-------------------|-------------|
| Ranking visual | Bar chart horizontal com labels | Top/bottom filiais ou rotas |
| Variance/Deviation | Diverging bar ou dot plot | Plan vs Real com desvios positivos/negativos |
| Lollipop chart | Point + rule mark | Comparação de valores com referência |
| Small multiples | Faceted chart | Mesma métrica por filial lado a lado |
| Bullet chart | Layered bar + rule | Meta vs atual com ranges |
| Slope chart | Line + point | Evolução entre dois períodos |

## Casos Onde Deneb NÃO é Necessário

| Caso | Alternativa |
|------|-------------|
| KPI card simples | Visual nativo Card |
| Semáforo/badge | SVG via DAX |
| Sparkline inline | SVG via DAX |
| Tabela com formatação | Matrix nativa + formatação condicional |
| Gráfico de barras básico | Bar chart nativo |
| Gráfico de linhas | Line chart nativo |

## Paleta para Deneb

Toda spec Deneb deve usar as cores da paleta oficial:

```json
{
  "config": {
    "range": {
      "category": ["#441A80", "#5B2D8C", "#F5A623", "#4CAF50", "#E74C3C", "#6A7282"]
    },
    "axis": {
      "labelColor": "#6A7282",
      "titleColor": "#441A80",
      "gridColor": "#E5E7EB"
    },
    "view": {
      "stroke": "#E5E7EB"
    },
    "font": "Segoe UI"
  }
}
```

## Referências

- Deneb visual: marketplace Power BI (Coacervo Limited)
- Templates: PBI-David/Deneb-Showcase, avatorl/Deneb-Vega-Templates
- **Regra**: verificar LICENSE antes de copiar qualquer template; adaptar ao contexto do projeto

## Checklist

- [ ] Validado que nativo e SVG não resolvem
- [ ] Pattern Vega-Lite escolhido (preferir Vega-Lite sobre Vega full)
- [ ] Cores da paleta oficial aplicadas via config
- [ ] Font Segoe UI configurada
- [ ] Spec testada com dados representativos
- [ ] Template adaptado ao contexto real (não copy-paste cru)
