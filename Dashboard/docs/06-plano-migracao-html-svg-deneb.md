# 06 — Plano de Migração HTML → SVG / Nativo / Deneb

> Plano de migração de **60 medidas HTML/SVG** para alternativas sustentáveis.
> Triage executada em 2026-03-06 (Fase 2 Sprint 1).

---

## Triage Consolidada — 60 Medidas (5 Grupos)

| Grupo | Qtd | Origem | Destino | Sprint |
|-------|-----|--------|---------|--------|
| **A — Nativo** | 6 | 90.Legado\01.HTML\01.Cards | New Card nativo | S1 |
| **B — SVG existe** | 7 | 90.Legado\01.HTML\01.Cards | Substituir por SVG Card existente | S1 |
| **C — SVG a criar** | 20 | 90.Legado\01.HTML\01.Cards | Criar SVG DAX template | S2-S3 |
| **D — Complexo** | 10 | 90.Legado\01.HTML\02-05 | Matrix nativa / Line Chart / Deneb / Descarte | S2-S3 |
| **E — SVG validar** | 17 | 06.Shared\03.SVG Cards | Validar renderização, manter | S1 |

---

## Grupo A — Substituir por Nativo (6 medidas)

Cards simples (≤2100 chars), só valor + label.

| Medida | Chars | Ação |
|--------|-------|------|
| HTML Card KM Total | 1859 | → New Card nativo |
| HTML Card Peso Total | 1873 | → New Card nativo |
| HTML Card Total Volumes | 1892 | → New Card nativo |
| HTML Card Veiculos | 1901 | → New Card nativo |
| HTML Card Total Rotas | 1958 | → New Card nativo |
| HTML Card Total Pedidos | 2051 | → New Card nativo |

## Grupo B — SVG Card Já Existe (7 medidas)

| Medida HTML | SVG Equivalente |
|-------------|-----------------|
| HTML Card Capacidade | SVG Card Capacidade |
| HTML Card Eficiencia KM | SVG Card Eficiencia KM |
| HTML Card ORH | SVG Card ORH |
| HTML Card SPR Ped | SVG Card SPR Ped |
| HTML Card SPR Vol | SVG Card SPR Vol |
| HTML Card Total Pedidos | SVG Card Total Pedidos |
| HTML Card Total Rotas | SVG Card Total Rotas |

## Grupo C — Criar SVG Template (20 medidas)

| Medida | Chars | Complexidade |
|--------|-------|-------------|
| HTML Card Alerta | 3753 | Média |
| HTML Card Alerta Filiais | 3673 | Média |
| HTML Card Consolidacao | 3759 | Média |
| HTML Card Desvio SPR | 4209 | Média |
| HTML Card Entregas | 3592 | Baixa |
| HTML Card Filial Spotlight | 3839 | Média |
| HTML Card Ocupacao Frota | 4000 | Média |
| HTML Card Performance Geral | 4118 | Média |
| HTML Card Produtividade | 4750 | Média |
| HTML Card SPR KM | 3370 | Baixa |
| HTML Card SPR Peso | 3589 | Baixa |
| HTML Card Status Frota | 3936 | Média |
| HTML Card Variacao Diaria | 3268 | Baixa |
| HTML Card YTD Resumo | 3835 | Baixa |
| HTML Card Comparativo Semanal | 5302 | Alta |
| HTML Card MoM Resumo | 5336 | Alta |
| HTML Card Progresso Metas | 5171 | Alta |
| HTML Card Reconciliacao | 5209 | Alta |
| HTML Card Semana Resumo | 4813 | Alta |
| HTML Card SPR Plan vs Real | 4873 | Alta |

## Grupo D — Complexo / Refatorar (10 medidas)

| Medida | Chars | Flags | Destino |
|--------|-------|-------|---------|
| HTML Card Aderencia Radar | 6575 | SVG,LAYOUT | Deneb ou Descarte |
| HTML Card ORH Cenarios | 6333 | SVG,LAYOUT | Decomp. em 3 SVG |
| HTML Ranking Entregas Semana | 3512 | CONCATX,TABLE | Matrix nativa |
| HTML Ranking ORH Semana | 3314 | CONCATX,TABLE | Matrix nativa |
| HTML Ranking Rotas Criticas Semana | 3252 | CONCATX,TABLE | Matrix nativa |
| HTML Ranking SPR Semana | 3531 | CONCATX,TABLE | Matrix nativa |
| HTML Tabela Filiais Consolidado Semana | 3132 | CONCATX,TABLE | Matrix nativa |
| HTML Tabela Ocupacao Tipo Veiculo Semana | 3314 | CONCATX,TABLE | Matrix nativa |
| HTML Grafico Barras Filial Semana | 2955 | CONCATX,SVG | Clustered Bar nativo |
| HTML Grafico Tendencia Mensal | 2833 | CONCATX,SVG | Line Chart nativo |
| HTML Grafico Tendencia Semanal | 2860 | CONCATX,SVG | Line Chart nativo |
| HTML Torre Controle Operacional | 4254 | SVG,LAYOUT | Decomp. em módulos M1 |

## Grupo E — SVG Cards Existentes (17 medidas) ✅ CONCLUÍDO

> **Bug corrigido**: `ENCODEURL` não é função DAX válida no PBI Desktop.
> Substituído por `SUBSTITUTE(_svg, "#", "%23")` em 17/17 medidas.
> Commit: `8095d1c` — validação DAX: 17/17 renderizam corretamente.

| Medida SVG | Chars | Status |
|------------|-------|--------|
| SVG Card Capacidade | 2068 | ✅ OK |
| SVG Card Capacidade Pedidos | 2185 | ✅ OK |
| SVG Card Capacidade Peso | 3036 | ✅ OK |
| SVG Card Capacidade Veiculos | 2193 | ✅ OK |
| SVG Card Capacidade Volumes | 2186 | ✅ OK |
| SVG Card Eficiencia KM | 2535 | ✅ OK |
| SVG Card Ocupacao Composta | 2107 | ✅ OK |
| SVG Card ORH | 2529 | ✅ OK |
| SVG Card Pedidos Hora | 2845 | ✅ OK |
| SVG Card Rotas Planejadas | 2373 | ✅ OK |
| SVG Card Rotas Realizadas | 2521 | ✅ OK |
| SVG Card Score Operacional | 2472 | ✅ OK |
| SVG Card SPR Ped | 2564 | ✅ OK |
| SVG Card SPR Vol | 2564 | ✅ OK |
| SVG Card Total Pedidos | 1862 | ✅ OK |
| SVG Card Total Rotas | 2284 | ✅ OK |
| SVG Strip Alerta Operacional | 2415 | ✅ OK |

---

## Inventário Original (referência)

### 90. Legado\01. HTML\02. Rankings (4 medidas)

| # | Medida | Função | Classificação |
|---|--------|--------|---------------|
| 1 | HTML Rank Top 5 SPR | Ranking top 5 filiais SPR | 🟡 Refatorar → nativo |
| 2 | HTML Rank Bottom 5 SPR | Ranking bottom 5 filiais SPR | 🟡 Refatorar → nativo |
| 3 | HTML Rank Top 5 ORH | Ranking top 5 filiais ORH | 🟡 Refatorar → nativo |
| 4 | HTML Rank Bottom 5 ORH | Ranking bottom 5 filiais ORH | 🟡 Refatorar → nativo |

### 90. Legado\01. HTML\03. Tabelas (2 medidas)

| # | Medida | Função | Classificação |
|---|--------|--------|---------------|
| 1 | HTML Tabela Resumo Dia | Tabela resumo do dia | 🟡 Refatorar → nativo |
| 2 | HTML Tabela Detalhe Filial | Tabela detalhe filial | 🟡 Refatorar → nativo |

### 90. Legado\01. HTML\04. Graficos (3 medidas)

| # | Medida | Função | Classificação |
|---|--------|--------|---------------|
| 1 | HTML Grafico Barras | Gráfico barras inline | 🔵 Descartar (nativo superior) |
| 2 | HTML Grafico Progress | Barra de progresso | 🟡 Refatorar → SVG ou nativo |
| 3 | HTML Grafico Donut | Donut inline | 🔵 Descartar (nativo superior) |

### 90. Legado\01. HTML\05. Torre (1 medida)

| # | Medida | Função | Classificação |
|---|--------|--------|---------------|
| 1 | HTML Torre Resumo | Resumo torre controle | 🔴 Substituir rápido |

---

## Classificação Consolidada

| Classificação | Qtd | Descrição | Prazo |
|---------------|-----|-----------|-------|
| 🔴 Substituir rápido | **23** | Substituição direta por nativo + formatação ou SVG Card existente | Sprint 1 |
| 🟡 Refatorar depois | **14** | Requer redesign do layout ou lógica — planejar | Sprint 2 |
| 🔵 Avaliar descarte | **7** | Função coberta por visual nativo superior — provavelmente descartável | Sprint 1-2 |
| **Total** | **44** | | |

---

## Estratégia de Migração por Tipo

### Cards HTML (23 🔴) → SVG Card ou Nativo

**Caminho preferencial: SVG via DAX**

As 17 medidas SVG existentes em `06. Shared\03. SVG Cards` já cobrem boa parte dos KPIs. A estratégia é:

1. **Validar** as 17 SVG Cards existentes (corrigir erros conhecidos)
2. **Mapear** quais HTML Cards já têm equivalente SVG
3. **Criar** SVG Cards faltantes seguindo o padrão existente
4. **Substituir** o visual HTML Content Viewer pelo Image visual (para SVG via DAX)
5. **Mover** medidas HTML substituídas para `90. Legado\02. Aposentado\`

**Caminho alternativo: Card Nativo**

Para cards mais simples (só valor + label), usar Card visual nativo com formatação condicional. Menos customizável mas zero manutenção.

| Complexidade do Card | Recomendação |
|---------------------|-------------|
| Valor + label | **Nativo** (Card visual) |
| Valor + label + delta + cor | **Nativo** (New Card visual com reference labels) |
| Valor + label + delta + barra + ícone + microcopy | **SVG via DAX** |

### Rankings HTML (4 🟡) → Tabela Nativa

Rankings HTML são desnecessários. Substituir por:
1. **Tabela nativa** com formatação condicional (data bars, background color)
2. **Stacked bar chart** horizontal nativo
3. **Deneb lollipop** se estética premium for desejada (não prioritário)

Passos:
1. Criar medidas `Rank Filial SPR` / `Rank Filial ORH` (se não existem)
2. Configurar Table visual com Top N filter (5)
3. Adicionar formatação condicional: data bars + cor
4. Remover HTML Rank medidas do report

### Tabelas HTML (2 🟡) → Tabela/Matrix Nativa

Tabelas HTML são completamente desnecessárias no Power BI. Substituir por:
1. **Matrix nativa** (linhas = filial, colunas = métricas)
2. **Table nativa** com formatação condicional
3. Aplicar conditional formatting por coluna

### Gráficos HTML (3 🔵) → Nativo ou Descarte

| Gráfico HTML | Ação | Alternativa |
|-------------|------|-------------|
| Barras | Descartar | Clustered bar nativo |
| Progress | Refatorar | Gauge nativo ou SVG barra simples |
| Donut | Descartar | Donut/Pie nativo |

### Torre Resumo HTML (1 🔴) → Recompor no Módulo M1

Card de resumo da Torre de Controle. Substituir por:
- Composição de 3-5 KPI Cards nativos ou SVG no Nível 2 do módulo M1
- Não tentar replicar o layout HTML composto — dividir em componentes independentes

---

## SVG Cards Existentes — Status de Validação

As 17 medidas em `06. Shared\03. SVG Cards` precisam validação antes de serem usadas como substitutas:

| Status | Ação |
|--------|------|
| Funcionando corretamente | Usar como substituto direto |
| Com erros de renderização | Corrigir DAX/SVG e testar |
| Cobrindo KPI sem HTML equivalente | Manter para uso futuro |
| Duplicando Card nativo | Avaliar descarte |

### Próximo passo: Inventariar SVG Cards
Executar no Power BI Desktop (via MCP) uma query para listar e testar cada SVG Card.

---

## Plano de Execução (3 Sprints)

### Sprint 1 — Quick Wins (1 semana)

| # | Ação | Medidas Afetadas | Impacto |
|---|------|-------------------|---------|
| 1 | Validar e corrigir 17 SVG Cards | 06.Shared\03.SVG Cards | Alto |
| 2 | Substituir 11 HTML KPI Cards básicos por nativo | 90.Legado\01.HTML\01.Cards | Alto |
| 3 | Descartar HTML Gráfico Barras + Donut (2) | 90.Legado\01.HTML\04.Graficos | Baixo |
| 4 | Substituir HTML Torre Resumo por 5 KPI Cards | 90.Legado\01.HTML\05.Torre | Médio |

**Resultado Sprint 1**: −16 medidas HTML, +0 novas (reuso de SVG/nativo existentes)

### Sprint 2 — Refatoração (1-2 semanas)

| # | Ação | Medidas Afetadas | Impacto |
|---|------|-------------------|---------|
| 5 | Substituir 12 HTML KPI Cards complexos por SVG | 90.Legado\01.HTML\01.Cards | Alto |
| 6 | Migrar 4 HTML Rankings → Table nativa | 90.Legado\01.HTML\02.Rankings | Médio |
| 7 | Migrar 2 HTML Tabelas → Matrix nativa | 90.Legado\01.HTML\03.Tabelas | Médio |
| 8 | Refatorar HTML Gráfico Progress → SVG ou Gauge | 90.Legado\01.HTML\04.Graficos | Baixo |

**Resultado Sprint 2**: −19 medidas HTML adicionais

### Sprint 3 — Limpeza (1 semana)

| # | Ação | Medidas Afetadas | Impacto |
|---|------|-------------------|---------|
| 9 | Avaliar descarte das 7 medidas 🔵 | Diversas | Baixo |
| 10 | Mover todas as HTML migradas para `90. Legado\02. Aposentado\` | 44 medidas | Baixo |
| 11 | Atualizar report pages para remover HTML Content Viewers | Report | Alto |
| 12 | Validar visualmente todos os módulos afetados | Report | Alto |

**Resultado Sprint 3**: Legado HTML = 0 em uso ativo

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| SVG Cards com erros impossibilitam substituição | Fallback para Card nativo (versão easy) |
| Visual HTML Content Viewer em uso por não-legado | Auditar todos os visuais que usam HTML antes de remover |
| Perda de layout composto (HTML permite qualquer layout) | Aceitar trade-off: menos customização, mais sustentabilidade |
| Tempo de migração subestimado | Validar Sprint 1 antes de planejar Sprint 2 |
