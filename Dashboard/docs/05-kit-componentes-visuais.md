# 05 — Kit de Componentes Visuais

> 8 componentes padronizados para o dashboard. Cada componente define quando usar, layout, regras visuais, medidas obrigatórias e nível de complexidade.

---

## C1 — KPI Card Principal

### Quando Usar
Destaque de métrica core no **Nível 2** de qualquer módulo. Máximo 5 por módulo.

### Layout (grid 3×1)
```
┌─────────────────────────────┐
│  Label (11px #6A7282)       │
│  VALOR  (24px bold #441A80) │
│  Δ D-1  ▲/▼ (12px cor)     │
└─────────────────────────────┘
```

### Especificações
| Prop | Valor |
|------|-------|
| Fundo | `#F9FAFB` (Surface) |
| Borda | `1px solid #E5E7EB` |
| Border-radius | `4px` |
| Largura | 2-3 colunas do grid 12 |
| Altura | `80-100px` |
| Padding | `16px` |

### Medidas Obrigatórias (do KPI pack)
- `[KPI] Valor` — número principal
- `[KPI] Trend D-1` — variação D-1 (▲ positivo, ▼ negativo)
- `[KPI] Cor` — cor condicional do card

### Versão Easy (nativo)
Card visual nativo do Power BI com:
- Callout value = `[KPI] Valor`
- Category label = Label fixa
- Formatação condicional de cor no valor via `[KPI] Cor`

### Versão Premium (SVG)
SVG via DAX com layout completo:
- Valor principal + delta + ícone de tendência + barra de progresso
- Requer medida `SVG Card [KPI]` no grupo `06. Shared\03. SVG Cards`

### Riscos de Manutenção
- SVG: qualquer mudança de layout exige edição DAX manual
- Nativo: limitado em layout mas zero manutenção

---

## C2 — KPI Card de Alerta

### Quando Usar
Métrica que **violou threshold** — requer ação imediata. Substitui o KPI Card Principal quando `[KPI] Status Codigo ≠ 1`.

### Layout
```
┌─────────────────────────────┐
│ ⚠️ Label    (11px #6A7282)  │
│ VALOR       (24px bold COR) │
│ Microcopy ação (11px #E74C3C│
│               ou #F5A623)   │
└─────────────────────────────┘
```

### Diferenças vs C1
| Aspecto | C1 KPI Card | C2 Alerta |
|---------|-------------|-----------|
| Fundo | `#F9FAFB` | Branco com borda-esquerda `4px solid COR` |
| Cor do valor | `#441A80` | Condicional (Success/Warning/Danger) |
| Microcopy | Não | **Sim** — texto de ação |
| Ícone | Seta tendência | ⚠️ ou 🔴 |

### Medidas Obrigatórias
- `[KPI] Valor`, `[KPI] Status Codigo`, `[KPI] Cor`, `[KPI] Acao`
- `[KPI] Icone` (⚠️/🔴/✅)
- `[KPI] Texto Card` (microcopy)

### Regra de Ativação
```
SE [KPI] Status Codigo = 0 (Danger)  → Borda #E74C3C, ícone 🔴
SE [KPI] Status Codigo = 2 (Warning) → Borda #F5A623, ícone ⚠️
SE [KPI] Status Codigo = 1 (OK)      → Não exibir Alerta, usar C1
```

---

## C3 — Meta vs Real

### Quando Usar
Comparação direta planejado vs executado. Central nos módulos M2 (Execução), M5 (Capacidade), M6 (Plano vs Real).

### Layout
```
┌─────────────────────────────────────────┐
│  META  ────────────────────■──  REAL    │
│  1.200          [barra progresso]  1.050│
│  Aderência: 87.5%  (cor condicional)    │
└─────────────────────────────────────────┘
```

### Variantes

| Variante | Visual | Quando |
|----------|--------|--------|
| Barra única | Progress bar horizontal | Aderência de uma dimensão |
| Clustered bar | Barras lado a lado | Comparar múltiplas dimensões |
| Bullet chart | Barra com marker | Meta fixa + realizado variável |

### Medidas Obrigatórias
- `[KPI] Meta` — valor de referência
- `[KPI] Valor` — valor realizado
- `[KPI] Delta%` — aderência percentual
- `[KPI] Cor` — cor condicional

### Implementação
- **Easy**: Clustered bar nativo (Meta vs Real como 2 séries)
- **Premium**: Bullet chart via Deneb (Vega-Lite) — justificável aqui pois bullets não existem nativos

---

## C4 — Ranking Top/Bottom

### Quando Usar
Filiais ou rotas com melhor/pior performance. Presente em quase todos os módulos no Nível 3.

### Layout
```
┌─ TOP 5 ─────────────────────────────────┐
│  1. Cajamar       SPR 28.3  ████████████│
│  2. Extrema       SPR 26.1  ██████████  │
│  3. Itapevi       SPR 24.8  █████████   │
│  ...                                     │
├─ BOTTOM 5 ──────────────────────────────┤
│  1. Mogi Guaçu    SPR 12.1  ████       │
│  2. Sorocaba      SPR 14.5  █████      │
│  ...                                     │
└─────────────────────────────────────────┘
```

### Medidas Obrigatórias
- Medida de ranking: `Rank Filial [Métrica]`
- Valor da métrica
- `Filial` (dimensão para label)

### Implementação
| Opção | Complexidade | Quando |
|-------|-------------|--------|
| Table nativa + formatação condicional | Baixa | Ranking simples, sem visual bar |
| Stacked bar horizontal (nativo) | Baixa | Ranking com barra proporcional |
| Lollipop Deneb | Média | Ranking visual premium — justificável |

### Regras
- Sempre mostrar **Top e Bottom** (não apenas um lado)
- Máximo 5 por lado (total 10 linhas)
- Formatação condicional: Top em `#4CAF50`, Bottom em `#E74C3C`
- Label da filial visível sem truncamento

---

## C5 — Tendência Curta (Sparkline / Short Trend)

### Quando Usar
Exibir evolução dos últimos 7 dias ou últimas 4 semanas. Complementa KPI Cards no Nível 2 ou aparece no Nível 3.

### Layout
```
┌──────────────────┐
│  SPR Ped 7d      │
│  ╱╲_╱╲╱──       │
│  Min: 18  Max:31 │
└──────────────────┘
```

### Variantes

| Variante | Visual | Quando |
|----------|--------|--------|
| Line chart nativo mini | Nativo | Série temporal simples |
| Sparkline SVG | DAX | Dentro de KPI Card premium |
| Small multiple Deneb | Deneb | Múltiplas filiais em grid |

### Medidas Obrigatórias
- Medida temporal (ex: `SPR Ped Realizado`)
- `Ref Data Selecionada` (âncora temporal)
- Eixo: `dim_calendario[Data]`

### Regras
- Sem eixo Y visível (sparkline pura)
- Sem legenda
- Cor da linha: `#441A80`
- Ponto final destacado (último dia)
- Min/Max opcionais como tooltip

---

## C6 — Tabela de Investigação (Drill-Through)

### Quando Usar
Módulo M8 — drill-through para detalhe de filial/rota. Único componente do nível mais granular.

### Layout
```
┌─ Filtro: [Filial: SP01] [Data: 2025-01-15] ──── [← Voltar] ─┐
│                                                                │
│  Rota │SPR P│SPR V│Ader%│%Ent │ΔKM  │ΔTempo│Flags            │
│  R001 │ 28  │ 180 │ 92% │ 95% │-2.3 │+0:15 │ ⚠️ Overtime     │
│  R002 │ 15  │  90 │ 78% │ 88% │+5.1 │+1:20 │ 🔴 >Cap, OT    │
│  R003 │ 32  │ 210 │ 98% │100% │-0.5 │-0:05 │ ✅              │
│  ...  │     │     │     │     │     │      │                  │
└────────────────────────────────────────────────────────────────┘
```

### Colunas Padrão (via medidas TblExp)
1. Rota (ID)
2. SPR Pedidos (Plan / Real / Delta)
3. SPR Volumes (Plan / Real / Delta)
4. Aderência Pedidos (%)
5. Aderência Volumes (%)
6. % Entregas Efetivas
7. % Insucessos
8. Delta KM (Plan vs Real)
9. Delta Tempo (Plan vs Real)
10. Flags Operacionais (concatenação de tags)

### Medidas Obrigatórias
- 22 medidas `TblExp` do grupo `07. Investigacao\01. Linha Operacional`
- Drill-through filter: `dim_filial[Filial]`, `dim_calendario[Data]`

### Implementação
- Table nativa Power BI com formatação condicional por coluna
- Cores: verde/amarelo/vermelho por threshold em cada coluna
- Botão "Voltar" nativo do drill-through
- **Não usar Deneb** — tabela com formatação resolve

---

## C7 — Painel de Filtros

### Quando Usar
Topo de todo módulo (Nível 1). Contexto obrigatório antes de olhar dados.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [📅 Data ▼]  [🏢 Filial ▼]  [🚛 Tipo Veíc ▼]  [🔄 Reset]│
└─────────────────────────────────────────────────────────────┘
```

### Componentes
| Filtro | Dimensão | Tipo |
|--------|----------|------|
| Data | `dim_calendario[Data]` | Date slicer (range) |
| Filial | `dim_filial[Filial]` | Dropdown multi-select |
| Tipo Veículo | `dim_tipo_veiculo[TipoVeiculo]` | Dropdown multi-select |
| Região | `dim_filial[Região]` | Dropdown (quando aplicável) |

### Regras
- Filtros sync entre páginas do mesmo escopo
- Slicer de data: default = último dia útil disponível
- Botão Reset: limpa todos os filtros (bookmark)
- Altura máxima: 1 linha (40-48px)
- Posição: topo fixo, grid colunas 1-12

---

## C8 — Tooltip Rico (Tooltip Page)

### Quando Usar
Hover sobre KPI Card ou ponto de gráfico. Exibe contexto adicional sem drill-through.

### Layout (canvas 320×240 px)
```
┌──────────────────────────────┐
│  [Filial: Cajamar]           │
│  SPR Ped: 28.3 (Meta: 25)   │
│  Δ D-1: +2.1 ▲              │
│  Ranking: #3 de 37           │
│  Tendência 7d: [sparkline]   │
└──────────────────────────────┘
```

### Medidas Obrigatórias
- Medida principal do contexto
- Meta correspondente
- Variação D-1
- Ranking (posição entre filiais)
- Mini trend (opcional)

### Implementação
- Tooltip page nativa Power BI (320×240 px ou 480×320 px)
- Fundo: `#FFFFFF`, borda: `#E5E7EB`
- Font: `11px` regular
- Máximo 6 linhas de informação
- **Não usar SVG ou Deneb** em tooltips — manter simples

---

## Matriz de Decisão: Nativo vs SVG vs Deneb

| Cenário | Recomendação | Justificativa |
|---------|-------------|---------------|
| KPI Card simples | **Nativo** | Card visual resolve |
| KPI Card com barra + ícone + trend | **SVG** | Nativo não suporta layout composto |
| Ranking top/bottom | **Nativo** ou **Deneb** | Nativo se barra simples; Deneb se lollipop |
| Bullet chart (meta vs real) | **Deneb** | Não existe nativo |
| Histogram distribuição | **Nativo** | Clustered column resolve |
| Sparkline inline em card | **SVG** | Única forma inline |
| Matrix/Tabela formatada | **Nativo** | Formatação condicional suficiente |
| Small multiples grid | **Deneb** | Nativo limitado |
| Gauge/Progress | **Nativo** | Gauge visual resolve |
| Scatter plot | **Nativo** | Scatter nativo suficiente |

### Regra de Ouro
> Se nativo resolve com clareza → **não usar Deneb**.
> Se SVG resolve sem complexidade excessiva → **não usar Deneb**.
> Deneb apenas quando o padrão visual **não existe** nativamente.
