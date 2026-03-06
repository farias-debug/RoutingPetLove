# 08 — Deliberação de Frentes de Trabalho

**Data**: 2026-03-06
**Agentes consultados**: Semantic Auditor, UX Architect, HTML Migration
**Status**: Fase 1 Quick Wins concluída (2026-03-07) — Sprint 3 em andamento

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
| QW-09 | Desabilitar auto date/time (7 LocalDateTables) | Semântica | ✅ Concluído |
| QW-03 | Remover 8 medidas 99.Backoffice | Semântica | ✅ Concluído |
| QW-02a | Descriptions nas top 20 medidas | Semântica | ✅ Concluído |
| FIX-01 | Corrigir formatString inconsistentes (24 medidas) | Semântica | ✅ Concluído |
| QW-R1 | Renomear páginas (convenção Mn) | UX | ✅ Concluído |
| QW-R2 | Validar tema JSON aplicado (#441A80) | UX | ✅ Concluído |
| QW-R5 | Sincronizar slicers cross-page | UX | ⏸️ N/A (HTML-based) |

### Fase 2 — Sprint 1 (consolidação)

| Ação | Frente | Status |
|------|--------|--------|
| Triar 17 SVG Cards (corrigir/descartar/congelar) | Semântica | ✅ Concluído |
| Normalizar 100% displayFolders | Semântica | ✅ Concluído |
| Merge M2a→M2 (rename) + plano M2b consolidação Desktop | UX | ✅ Concluído |
| Classificar Scoreboard → **COMPARATIVO** (ranking cross-filial) | UX | ✅ Concluído |
| Triar 60 HTML/SVG measures → 5 grupos (A/B/C/D/E) | Migração | ✅ Concluído |
| Fix ENCODEURL→SUBSTITUTE em 17 SVG Cards (Grupo E) | Migração | ✅ Concluído (`8095d1c`) |
| Otimizar M1 Torre de Controle | UX | ⏳ Fase 2 Sprint 2 |
| Migrar sub-grupo A (6 nativos) e B (7 SVG existentes) | Migração | ⏳ Próximo |

### Fase 3 — Sprint 2 (criação + governança)

| Ação | Frente | Dep |
|------|--------|-----|
| Descriptions em massa (≥80% medidas) | Semântica | ✅ Concluído — 100% (`94fc99e`) |
| Criar 3 KPI Packs (01, 04, 05) | Semântica | ✅ Concluído — 8 packs (`761b1e3`) |
| Triar 98.Suporte (hidden vs expostas) | Semântica | ✅ Concluído — relocado→08.Entregas (`761b1e3`) |
| Criar página M4 Jornada/ORH | UX | ✅ Concluído — shell criada (`af1fc2e`) |
| Criar página M7 Entregas | UX | ✅ Concluído — shell criada (`af1fc2e`) |
| Migrar Rankings HTML → Matrix/Deneb | Migração | Sprint 1 OK |
| Migrar Tabelas HTML → Matrix nativo | Migração | Sprint 1 OK |

### Fase 4 — Sprint 3 (refinamento)

| Ação | Frente | Dep |
|------|--------|-----|
| Eliminar grupo 90.Legado por completo | Semântica | ✅ Concluído — 61 medidas removidas (`a356cd9`) |
| Consolidar duplicatas, nomenclatura 100% | Semântica | ✅ Concluído — sem duplicatas reais |
| Criar M8 Investigação (drill-through) | UX | ✅ M8 Análise Filiais já existe — drill-through via Desktop |
| Criar 2 tooltip pages (TT-Filial, TT-Rota) | UX | ✅ Concluído (`af1fc2e`) |
| Migrar Gráficos + Torre HTML | Migração | ✅ Eliminados com 90.Legado |
| Cleanup final: arquivo morto + documentação | Migração | ✅ Concluído |

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
| Medidas total | 389 → 381 → **432** | ~~≤375~~ 432 (3 KPI Packs) | **371** (após cleanup legado) ✅ |
| Medidas com description | ~0% → **~53%** (204/381) → **100%** (381/381) | ~~≥80%~~ ✅ 100% | 100% |
| LocalDateTables | 7 → **0** | 0 | 0 |
| Medidas HTML legadas | 44 → **43 triadas (A:6 B:7 C:20 D:10)** | ≤10 | **0** ✅ |
| SVG Cards validar | 17 → **17 triadas (grupo E)** | ≤5 erros | **0 erros** ✅ (eliminadas) |
| KPI Packs completos | 4 → **8** | ~~7~~ ✅ 8 | 8 |
| Scoreboard classificado | — → **COMPARATIVO** | — | — |
| Páginas com hierarquia 3 níveis | ~0 | ≥4 | 8 |
| Tooltip pages | 0 | 0 | **2** ✅ |
| Drill-through pages | 0 | 0 | **1** (M8) ✅ |

## Templates SVG Padronizados

3 templates definidos pelo HTML Migration:
1. **KPI Card com semáforo** (220×120px) — valor, meta, %, badge cor
2. **Badge de status** (dinâmico×24px) — pill com texto e cor
3. **Sparkline** (180×48px) — mini line chart via polyline

Todos usam paleta obrigatória (#441A80, #4CAF50, #F5A623, #E74C3C) e fonte Segoe UI.

---

## Histórico de Execução

### Fase 1 — Concluída em 2026-03-07

**Commit**: `1ccb55b` — 144 files changed, +5033/-18206

Resultados:
- Modelo: 389 → 381 medidas (8 Backoffice removidas)
- Tabelas: 15 → 7 (8 LocalDateTable + DateTableTemplate removidas)
- 20 medidas core com descrições adicionadas (204 total com description)
- 24 formatStrings padronizadas
- 8 páginas renomeadas para convenção Mn (M1-M8)
- Tema JSON substituído pela paleta correta (#441A80)
- QW-R5 (slicers) adiado — report usa HTML custom visuals para filtros

### Sprint 2 — Concluído

**Commits**: `94fc99e`, `8be28f6`, `761b1e3`, `80f2279`

Resultados:
- Descriptions: 0% → 100% (432/432 medidas)
- KPI Packs: 5 → 8 (+Rotas, +Capacidade, +Aderência = 42 medidas novas)
- 98.Suporte eliminado → relocado para 08.Entregas
- Medidas total: 381 → 432

### Sprint 3 — Concluído

**Commits**: `667d6bf` (PBI sync), `a356cd9` (legado), `af1fc2e` (páginas)

Resultados:
- 51 medidas pushed para PBI Desktop via MCP (432/432 live)
- 90.Legado eliminado: 43 HTML + 17 SVG + 1 orphan = 61 medidas removidas
- Duplicatas analisadas — nenhuma consolidação necessária
- Medidas total: 432 → 371
- 4 páginas criadas: M4 Jornada e ORH, M7 Entregas, TT-Filial, TT-Rota
- Total páginas: 8 → 12
- Display folders: 01-08 limpos, 90.Legado eliminado por completo

## Próximo Passo

Todas as fases concluídas em nível de TMDL/PBIR. Itens restantes requerem **Power BI Desktop**:

1. Configurar TT-Filial e TT-Rota como tooltip pages no Desktop (pageType)
2. Adicionar visuais nas páginas M4, M7, TT-Filial, TT-Rota
3. Configurar drill-through em M8 Análise Filiais
4. Migrar visuais HTML remanescentes (Grupos A+B) para nativos/SVG no Desktop
5. Push final para repositório
