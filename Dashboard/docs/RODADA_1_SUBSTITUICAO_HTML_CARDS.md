# RODADA 1 - Substituição de HTML Cards por Nativos

Data: 2026-03-05

## Cards a Substituir

### 1. HTML Card Total Pedidos (342d6a88d8b70e616911)
**Posição atual:** (0, 26.67, 246.67, 211.11)

**Estrutura HTML:**
- Título: "TOTAL DE PEDIDOS"
- Valor principal: [Total Pedidos] (#,##0)
- Subtitle: "Pedidos entregues no período"
- Label: "D-1: +XX | WoW: +XX"

**Substituição:**
- **Visual nativo:** Multi-row card
- **Medidas a exibir:**
  1. Total Pedidos (formato: #,##0)
  2. Var D-1 Pedidos (formato: +#,##0;-#,##0)
  3. Var WoW Pedidos (formato: +#,##0;-#,##0)
- **Formatação condicional:** Verde (#10B981) para positivo, Vermelho (#EF4444) para negativo
- **Título do visual:** "TOTAL DE PEDIDOS"

---

### 2. HTML Card Total Volumes (2eb1d4ed950e087aa501)
**Posição atual:** (524.44, 26.67, 250, 210)

**Estrutura HTML:**
- Título: "TOTAL DE VOLUMES"
- Valor principal: [Total Volumes] (#,##0)
- Subtitle: "Volumes transportados"
- Label: "Média: X.X pedidos/rota"

**Substituição:**
- **Visual nativo:** Multi-row card
- **Medidas a exibir:**
  1. Total Volumes (formato: #,##0)
  2. Media Pedidos por Rota (formato: 0.0)
- **Título do visual:** "TOTAL DE VOLUMES"

---

### 3. HTML Card Comparativo Semanal (1e581a9cb024044e836b)
**Posição atual:** (754.44, 228.89, 524.44, 196.67)

**Estrutura HTML:**
- Grid 5 colunas: Rotas | Pedidos | SPR | Entregas | ORH
- Cada coluna mostra:
  - Label (ex: "Rotas")
  - Seta (↑ verde ou ↓ vermelho)
  - Valor variação WoW (formato: +0.0%)

**Substituição:**
- **Visual nativo:** Table (tabela horizontal)
- **Colunas:**
  1. KPI (texto fixo)
  2. Variação WoW (valor)
- **Linhas (5 medidas):**
  1. Var WoW Rotas
  2. Var WoW Pedidos
  3. Var WoW SPR Pedidos (%)
  4. Var WoW % Entregas
  5. Var WoW ORH Tempo (%)
- **Formatação condicional:** Background color verde/vermelho baseado no sinal
- **Ícones:** Data bars (barras de dados) nativas
- **Título do visual:** "Comparativo WoW"

---

## Medidas Adicionais Necessárias

Nenhuma medida nova necessária. Todas as medidas já existem:
- ✅ Total Pedidos
- ✅ Total Volumes
- ✅ Var D-1 Pedidos
- ✅ Var WoW Pedidos
- ✅ Var WoW Rotas
- ✅ Var WoW SPR Pedidos (%)
- ✅ Var WoW % Entregas
- ✅ Var WoW ORH Tempo (%)
- ✅ Media Pedidos por Rota

---

## Benefícios da Substituição

1. **Manutenibilidade:** Visuais nativos são versionáveis e editáveis no Power BI Desktop
2. **Performance:** Sem overhead de renderização HTML
3. **Interatividade:** Cross-filtering nativo (se desejado)
4. **Acessibilidade:** Screen readers funcionam melhor com visuais nativos
5. **Tema:** Aplicação automática do tema customizado (cores, fontes)

---

## Trade-offs (O que perdemos)

1. **Ícones SVG personalizados:** Cards nativos não suportam ícones vetoriais embutidos
2. **Layout pixel-perfect:** HTML permite controle total de CSS
3. **Transições/hover:** Efeitos visuais customizados

**Mitigação:** Usar título do visual + formatação condicional de cor para manter clareza visual

---

## Próximos Passos

1. ✅ Documentar especificação da substituição
2. [ ] Criar JSON dos novos visuais nativos
3. [ ] Substituir arquivos visual.json no PBIP
4. [ ] Testar no Power BI Desktop
5. [ ] Ajustar posições e tamanhos (grid 12 colunas)
6. [ ] Aplicar tema customizado
7. [ ] Validar formatação condicional
