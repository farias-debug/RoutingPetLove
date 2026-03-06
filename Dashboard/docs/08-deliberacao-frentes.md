# 08 — Deliberação de Frentes de Trabalho

**Data**: 2026-03-06
**Agentes consultados**: Semantic Auditor, UX Architect, HTML Migration
**Status**: Planos deliberados, execução pendente

---

## Visão Consolidada

Três frentes paralelas com interdependências controladas:

```
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ FRENTE SEMÂNTICA │   │ FRENTE UX/VISUAL │   │ FRENTE MIGRAÇÃO  │
│ Semantic Auditor │   │ UX Architect     │   │ HTML Migration   │
├─────────────────┤   ├──────────────────┤   ├──────────────────┤
│ QW: LocalDates, │   │ QW: Renomear     │   │ S1: 34 Cards     │
│    Backoffice,  │   │    páginas,      │   │    HTML → nativo │
│    descriptions │   │    tema, slicers │   │    ou SVG        │
│ S1: SVG Cards,  │◄──┤ S1: Merge 06+07 │   │ S2: 6 Rankings   │
│    displayFolder│   │    Scoreboard    │   │    + Tabelas     │
│ S2: KPI Packs,  │──►│ S2: Criar M4,M7 │◄──┤ S3: 4 Gráficos  │
│    descriptions │   │    (Jornada,     │   │    + Torre       │
│ S3: Refatoração │   │    Entregas)     │   │ S4: Cleanup      │
│    legado       │──►│ S3: M8 drill,   │◄──┤    arquivo morto  │
│                 │   │    tooltips      │   │                  │
└─────────────────┘   └──────────────────┘   └──────────────────┘
```

## Sequência Recomendada

### Fase 1 — Quick Wins (todas as frentes em paralelo)

| # | Ação | Frente | Risco |
|---|------|--------|-------|
| QW-09 | Desabilitar auto date/time (7 LocalDateTables) | Semântica | Nenhum |
| QW-03 | Remover 8 medidas 99.Backoffice | Semântica | Muito baixo |
| QW-02a | Descriptions nas top 20 medidas | Semântica | Nenhum |
| FIX-01 | Corrigir formatString inconsistentes | Semântica | Nenhum |
| QW-R1 | Renomear páginas (convenção Mn) | UX | Nenhum |
| QW-R2 | Validar tema JSON aplicado | UX | Nenhum |
| QW-R5 | Sincronizar slicers cross-page | UX | Baixo |

### Fase 2 — Sprint 1 (consolidação)

| Ação | Frente | Dep |
|------|--------|-----|
| Triar 17 SVG Cards (corrigir/descartar/congelar) | Semântica | — |
| Normalizar 100% displayFolders | Semântica | — |
| Merge páginas 06+07 → M2 Execução e Volume | UX | — |
| Classificar Scoreboard (resumo vs comparativo) | UX | — |
| Otimizar M1 Torre de Controle | UX | — |
| Triar 34 Cards HTML → sub-grupos A/B/C | Migração | — |
| Migrar sub-grupo A (nativos) e B (SVG template) | Migração | Template SVG |

### Fase 3 — Sprint 2 (criação + governança)

| Ação | Frente | Dep |
|------|--------|-----|
| Descriptions em massa (≥80% medidas) | Semântica | — |
| Criar 3 KPI Packs (01, 04, 05) | Semântica | — |
| Triar 98.Suporte (hidden vs expostas) | Semântica | — |
| Criar página M4 Jornada/ORH | UX | Medidas 03.* validadas |
| Criar página M7 Entregas | UX | Medidas 98.* validadas |
| Migrar Rankings HTML → Matrix/Deneb | Migração | Sprint 1 OK |
| Migrar Tabelas HTML → Matrix nativo | Migração | Sprint 1 OK |

### Fase 4 — Sprint 3 (refinamento)

| Ação | Frente | Dep |
|------|--------|-----|
| Eliminar grupo 90.Legado por completo | Semântica | Migração Sprint 3 |
| Consolidar duplicatas, nomenclatura 100% | Semântica | — |
| Criar M8 Investigação (drill-through) | UX | Scoreboard classificado |
| Criar 2 tooltip pages (TT-Filial, TT-Rota) | UX | — |
| Migrar Gráficos + Torre HTML | Migração | Sprints 1-2 OK |
| Cleanup final: arquivo morto + documentação | Migração | Tudo OK |

---

## Interdependências Críticas

| De | Para | Bloqueio |
|----|------|----------|
| UX Architect | HTML Migration | Destino visual dos HTML Cards (nativo vs SVG vs Deneb) |
| Semantic Auditor | UX Architect | Quais SVG Cards manter/reconstruir/descartar |
| Semantic Auditor | HTML Migration | Mapeamento medida legada → medida core |
| UX Architect | Semantic Auditor | Medidas faltantes para M4 Jornada e M7 Entregas |

## Métricas Consolidadas

| Métrica | Baseline | Meta Fase 2 | Meta Final |
|---------|----------|-------------|------------|
| Medidas total | 389 | ≤375 | ≤340 |
| Medidas com description | ~0% | ≥80% | 100% |
| LocalDateTables | 7 | 0 | 0 |
| Medidas HTML legadas | 44 | ≤10 | 0 |
| SVG Cards com erro | 17 | ≤5 | 0 |
| KPI Packs completos | 4 | 7 | 7 |
| Páginas com hierarquia 3 níveis | ~0 | ≥4 | 8 |
| Tooltip pages | 0 | 0 | 2 |
| Drill-through pages | 0 | 0 | 1 |

## Templates SVG Padronizados

3 templates definidos pelo HTML Migration:
1. **KPI Card com semáforo** (220×120px) — valor, meta, %, badge cor
2. **Badge de status** (dinâmico×24px) — pill com texto e cor
3. **Sparkline** (180×48px) — mini line chart via polyline

Todos usam paleta obrigatória (#441A80, #4CAF50, #F5A623, #E74C3C) e fonte Segoe UI.

---

## Próximo Passo

Executar **Fase 1 — Quick Wins** numa única sessão:
1. MCP: Desabilitar auto-date, remover Backoffice, descriptions, formatString
2. Report: Renomear páginas, validar tema, sincronizar slicers
3. Git commit após cada lote

**Sinal para iniciar**: Confirmar pelo operador.
