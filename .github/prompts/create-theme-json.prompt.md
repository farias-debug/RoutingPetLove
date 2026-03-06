---
description: >
  Cria ou atualiza o tema JSON do Power BI com a paleta oficial Petlove,
  garantindo conformidade com o design system do dashboard.
  Produz ou atualiza Dashboard/theme/monitoramento_operacional_base.json.
mode: agent
---

# Criar/Atualizar Tema JSON Power BI

## Objetivo

Garantir que o tema JSON do Power BI esteja alinhado com a paleta oficial e as regras visuais do Painel Monitoramento Petlove.

## Passos

1. **Ler tema atual**
   - Abrir `Dashboard/theme/monitoramento_operacional_base.json`
   - Verificar também `Dashboard/config/tema_petlove.json` (referência histórica)

2. **Validar paleta**
   Conferir se o tema contém todas as cores oficiais:

   | Token | Cor | Propriedade |
   |-------|-----|-------------|
   | Primary | `#441A80` | foreground, tableAccent, dataColors[0] |
   | Primary-2 | `#5B2D8C` | dataColors[1] |
   | Warning | `#F5A623` | neutral, dataColors[2] |
   | Success | `#4CAF50` | good, dataColors[3] |
   | Danger | `#E74C3C` | bad, dataColors[4] |
   | Text secondary | `#6A7282` | dataColors[5] |
   | Background | `#FFFFFF` | background |
   | Surface | `#F9FAFB` | visual backgrounds |
   | Border | `#E5E7EB` | outlines, gridlines |
   | Text muted | `#A3A8B2` | subtitles |

3. **Validar estrutura**
   O tema deve conter no mínimo:
   - `name`: "Petlove Monitoramento Operacional"
   - `dataColors`: array com 6+ cores
   - `background`, `foreground`, `tableAccent`
   - `good`, `neutral`, `bad` (semáforo)
   - `maximum`, `center`, `minimum` (divergente)
   - `visualStyles` com configurações de responsividade e tipografia

4. **Validar tipografia**
   - Font family: Segoe UI
   - Tamanhos padronizados: 11px labels, 14px títulos, 18-24px KPIs

5. **Aplicar correções**
   Se houver divergências, atualizar `Dashboard/theme/monitoramento_operacional_base.json`

6. **Documentar**
   Registrar o que foi alterado e por quê

## Referência de Estrutura Completa

```json
{
  "name": "Petlove Monitoramento Operacional",
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

## Saída

- Tema JSON validado e atualizado
- Lista de correções aplicadas
- Confirmação de conformidade com paleta oficial
