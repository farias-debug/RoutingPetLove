# 06 — Plano de Migração HTML → SVG / Nativo / Deneb

> Plano de migração das 44 medidas HTML legadas (`90. Legado\01. HTML\*`) para alternativas sustentáveis.

---

## Inventário do Legado HTML

### 90. Legado\01. HTML\01. Cards (34 medidas)

Medidas que geram HTML inline para exibição como KPI Cards via visual HTML Content Viewer.

| # | Medida | Função | Classificação |
|---|--------|--------|---------------|
| 1 | HTML KPI Entregas | Card entregas efetivas | 🔴 Substituir rápido |
| 2 | HTML KPI Insucessos | Card taxa de insucesso | 🔴 Substituir rápido |
| 3 | HTML KPI Jornada | Card jornada média | 🔴 Substituir rápido |
| 4 | HTML KPI ORH | Card ORH | 🔴 Substituir rápido |
| 5 | HTML KPI Pedidos | Card pedidos/rota | 🔴 Substituir rápido |
| 6 | HTML KPI Produtividade | Card produtividade | 🔴 Substituir rápido |
| 7 | HTML KPI Rotas | Card total rotas | 🔴 Substituir rápido |
| 8 | HTML KPI SPR Ped | Card SPR pedidos | 🔴 Substituir rápido |
| 9 | HTML KPI SPR Vol | Card SPR volumes | 🔴 Substituir rápido |
| 10 | HTML KPI Tempo | Card tempo médio | 🔴 Substituir rápido |
| 11 | HTML KPI Volumes | Card volumes/rota | 🔴 Substituir rápido |
| 12-22 | HTML KPI [Variantes] (×11) | Cards variantes com alertas | 🔴 Substituir rápido |
| 23-30 | HTML KPI [Status] (×8) | Cards com badge de status | 🟡 Refatorar depois |
| 31-34 | HTML KPI [Auxiliar] (×4) | Cards auxiliares diversos | 🔵 Avaliar descarte |

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
