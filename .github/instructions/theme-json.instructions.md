---
applyTo:
  - "Dashboard/theme/*.json"
  - "Dashboard/config/tema_petlove.json"
---

# Instruções — Governança de Tema JSON Power BI

## Arquivos de Tema

| Arquivo | Papel |
|---------|-------|
| `Dashboard/theme/monitoramento_operacional_base.json` | Tema principal aplicado ao relatório |
| `Dashboard/config/tema_petlove.json` | Tema histórico de referência |

## Paleta Obrigatória

Qualquer tema JSON deve usar esta paleta como base:

```json
{
  "dataColors": ["#441A80", "#5B2D8C", "#F5A623", "#4CAF50", "#E74C3C", "#6A7282"],
  "background": "#FFFFFF",
  "foreground": "#441A80",
  "tableAccent": "#441A80",
  "good": "#4CAF50",
  "neutral": "#F5A623",
  "bad": "#E74C3C"
}
```

### Mapeamento de Tokens

| Token | Hex | Propriedade no Tema |
|-------|-----|---------------------|
| Primary | `#441A80` | `foreground`, `tableAccent`, `dataColors[0]` |
| Primary-2 | `#5B2D8C` | `dataColors[1]`, headers hover |
| Warning | `#F5A623` | `neutral`, `dataColors[2]` |
| Success | `#4CAF50` | `good`, `dataColors[3]` |
| Danger | `#E74C3C` | `bad`, `dataColors[4]` |
| Background | `#FFFFFF` | `background` |
| Surface | `#F9FAFB` | visual backgrounds, card fill |
| Border | `#E5E7EB` | outlines, gridlines |
| Text secondary | `#6A7282` | `dataColors[5]`, axis labels |
| Text muted | `#A3A8B2` | subtitles, footnotes |

## Regras de Governança do Tema

### Obrigatório

1. **Toda alteração de cor deve passar pelo tema JSON** — nunca hardcodar cor diretamente no visual
2. **Manter consistência** entre tema e paleta documentada no AGENTS.md
3. **Testar contraste** antes de aplicar — fundo branco com texto muted exige cuidado
4. **Não usar cor como único indicador** — combinar com ícone e/ou texto

### Formatação

- Números inteiros: `#,##0`
- Percentuais: `0.0%` ou `0%`
- Moeda: `R$ #,##0.00`
- Datas em eixos: `DD/MM` (curto) ou `DD/MM/YYYY` (completo)

### Tipografia no Tema

- Font family: `Segoe UI` (padrão Power BI)
- KPI valor principal: `24px bold`
- KPI valor secundário: `18px bold`
- Labels: `11px regular`
- Títulos de visual: `14px bold`, cor `#441A80`

### Espaçamentos

- Padding interno de cards: `8px` mínimo
- Gap entre visuais: `16px`
- Margem da página: `24px`

## Estrutura Mínima do theme.json

```json
{
  "name": "Petlove Monitoramento Operacional",
  "dataColors": [...],
  "background": "#FFFFFF",
  "foreground": "#441A80",
  "tableAccent": "#441A80",
  "good": "#4CAF50",
  "neutral": "#F5A623",
  "bad": "#E74C3C",
  "maximum": "#441A80",
  "center": "#F5A623",
  "minimum": "#E74C3C",
  "visualStyles": {
    "*": {
      "*": {
        "general": [{ "responsive": true }]
      }
    }
  }
}
```

## O Que NÃO Fazer

- Não criar temas alternativos sem deprecar o anterior
- Não aplicar cores fora da paleta oficial
- Não alterar font family sem justificativa
- Não usar gradientes complexos — manter paleta flat
- Não duplicar definições entre `theme/` e `config/`
