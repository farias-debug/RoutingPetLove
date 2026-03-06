---
name: theme-governance
description: >
  DOMAIN SKILL — Governança de tema JSON e paleta visual para Power BI.
  USE FOR: validar tema JSON contra paleta oficial, corrigir divergências de cor,
  padronizar tipografia e espaçamentos, garantir consistência visual.
  DO NOT USE FOR: design de módulos, medidas DAX, pipeline Python.
---

# Theme Governance

## Domínio

Governança do tema JSON do Power BI e consistência visual com a paleta oficial do Painel Monitoramento Petlove.

## Quando Usar

- Validar se o tema JSON está alinhado com a paleta oficial
- Corrigir cores divergentes ou ausentes
- Padronizar tipografia (Segoe UI, tamanhos)
- Garantir que `good`, `neutral`, `bad` estão corretos
- Atualizar tema após mudança na paleta

## Paleta Oficial

| Token | Hex | Papel |
|-------|-----|-------|
| Primary | `#441A80` | Identidade, foreground, tableAccent |
| Primary-2 | `#5B2D8C` | Headers hover, variação |
| Warning | `#F5A623` | Neutral, alerta moderado |
| Success | `#4CAF50` | Good, meta atingida |
| Danger | `#E74C3C` | Bad, desvio crítico |
| Background | `#FFFFFF` | Fundo principal |
| Surface | `#F9FAFB` | Cards, superfícies |
| Border | `#E5E7EB` | Bordas, gridlines |
| Text secondary | `#6A7282` | Labels, subtítulos |
| Text muted | `#A3A8B2` | Texto auxiliar |

## Arquivos de Tema

| Arquivo | Papel |
|---------|-------|
| `Dashboard/theme/monitoramento_operacional_base.json` | Tema ativo |
| `Dashboard/config/tema_petlove.json` | Referência histórica |

## Mapeamento tema.json ↔ Paleta

```json
{
  "dataColors": ["#441A80", "#5B2D8C", "#F5A623", "#4CAF50", "#E74C3C", "#6A7282"],
  "background": "#FFFFFF",
  "foreground": "#441A80",
  "tableAccent": "#441A80",
  "good": "#4CAF50",
  "neutral": "#F5A623",
  "bad": "#E74C3C",
  "maximum": "#441A80",
  "center": "#F5A623",
  "minimum": "#E74C3C"
}
```

## Tipografia

| Elemento | Tamanho | Peso | Cor |
|----------|---------|------|-----|
| Título de visual | 14px | Bold | `#441A80` |
| Label/Subtítulo | 11px | Regular | `#6A7282` |
| KPI destaque | 24px | Bold | `#441A80` |
| KPI secundário | 18px | Bold | `#441A80` |
| Texto auxiliar | 11px | Regular | `#A3A8B2` |

## Regras

- Toda cor deve vir do tema JSON — nunca hardcodar no visual
- Não criar temas alternativos sem deprecar o anterior
- Não usar gradientes complexos — paleta flat
- Font family: somente Segoe UI
- Testar contraste antes de aplicar (WCAG AA)
- Não usar cor como único indicador de estado

## Checklist

- [ ] `dataColors` contém as 6 cores oficiais na ordem correta
- [ ] `good`, `neutral`, `bad` correspondem a Success, Warning, Danger
- [ ] `background` é `#FFFFFF`
- [ ] `foreground` e `tableAccent` são `#441A80`
- [ ] Font family é Segoe UI
- [ ] Não há cores fora da paleta oficial
