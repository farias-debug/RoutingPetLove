---
name: dashboard-ux-system
description: >
  DOMAIN SKILL — Design system para dashboards operacionais Power BI.
  USE FOR: definir módulos visuais, layout grid 12 colunas, hierarquia de leitura,
  kit de componentes, alertas com microcopy, paleta obrigatória.
  DO NOT USE FOR: modificar medidas DAX, alterar pipeline Python, migração HTML.
---

# Dashboard UX System

## Domínio

Design system e organização visual de dashboards operacionais de transporte last mile em Power BI.

## Quando Usar

- Definir ou redesenhar módulos visuais do dashboard
- Especificar componentes padrão (KPI card, alerta, meta vs real, etc.)
- Aplicar hierarquia visual de 3 níveis
- Definir layout em grid 12 colunas com espaçamentos 8/16/24px
- Criar alertas com regra + cor/ícone + microcopy de ação
- Garantir conformidade com a paleta obrigatória

## Princípios

1. **Organizar por módulos**, não por abas canônicas
2. **Cada módulo responde**: O que mudou? Onde está o problema? Por quê? O que fazer?
3. **Hierarquia de 3 níveis**: título+filtros → KPIs → detalhes
4. **Foco na exceção**, não no caso normal
5. **Menos decoração, mais sinalização**

## Paleta

| Token | Cor |
|-------|-----|
| Primary | `#441A80` |
| Primary-2 | `#5B2D8C` |
| Warning | `#F5A623` |
| Success | `#4CAF50` |
| Danger | `#E74C3C` |
| Background | `#FFFFFF` |
| Surface | `#F9FAFB` |
| Border | `#E5E7EB` |
| Text secondary | `#6A7282` |
| Text muted | `#A3A8B2` |

## Grid e Espaçamentos

- 12 colunas por módulo
- Espaçamentos: `8px` (tight) / `16px` (normal) / `24px` (section)
- Bordas: `1px solid #E5E7EB`, radius `4px`
- Títulos: `14px bold #441A80`
- Labels: `11px regular #6A7282`
- KPI valores: `24px bold` (destaque) / `18px bold` (secundário)

## Kit de 8 Componentes

| # | Componente | Uso Principal |
|---|-----------|---------------|
| 1 | KPI Card Principal | Métrica core no Nível 2 |
| 2 | KPI Card de Alerta | Métrica fora da meta + ação sugerida |
| 3 | Meta vs Real | Barras comparativas plan vs exec |
| 4 | Ranking Top/Bottom | Filiais/rotas melhor/pior desempenho |
| 5 | Tendência Curta | Sparkline últimos 7 dias |
| 6 | Tabela Investigação | Drill-through detalhado |
| 7 | Painel de Filtros | Filtros contextuais topo do módulo |
| 8 | Tooltip Rico | Tooltip page com contexto adicional |

## Alertas

Todo alerta deve conter:
- **Regra**: condição que dispara (ex: `% Aderência < 85%`)
- **Visual**: cor e/ou ícone (⚠️ 🔴 ✅)
- **Microcopy**: ação curta (ex: "Investigar queda de ocupação")

## Módulos Recomendados

1. Torre de Controle do Dia — status geral, operação agora
2. Execução e Volume — volume executado, progresso
3. Eficiência / SPR — performance por rota
4. Jornada / ORH — jornadas, tempo operacional
5. Capacidade e Mix Veículos — ocupação, frota
6. Plano vs Real — aderência, desvios
7. Entregas — taxa de sucesso, insucessos
8. Investigação Operacional — drill-through por filial/rota
