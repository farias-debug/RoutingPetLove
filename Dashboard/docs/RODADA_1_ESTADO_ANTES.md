# RODADA 1 - Estado ANTES das Mudanças

Data: 2026-03-05

## Estrutura do Report

### Páginas (2)
| ID | Nome | Visuais | Dimensões |
|---|---|---|---|
| 9b8d47009241dc052b91 | Executivo | 9 | 1280x720 |
| 78d53a1ede414390cb10 | SPR | 7 | 1280x720 |

### Tema Atual
- **Nome:** Petlove Supply - KPI Theme v3 (Alinhado)
- **Arquivo:** `Petlove_Supply_-_KPI_Theme_v3_3434782681173144.json`
- **Cores primárias:**
  - Roxo escuro: #441A80
  - Roxo médio: #5B2D8C, #7B44C2
  - Verde: #4CAF50, #27AE60
  - Laranja: #F5A623, #F39C12
  - Vermelho: #E74C3C
- **Total de cores na paleta:** 100+

### Custom Visuals em Uso
1. **htmlContent** (2 versões):
   - `htmlContent443BE3AD55E043BF878BED274D3A6855`
   - `htmlContent443BE3AD55E043BF878BED274D3A6865`
2. **powerKPI:** `powerKPI462CE5C2666F4EC8A8BDD7E5587320A3`
3. **inforiverAppPremium:** `inforiverAppPremium2B7A5FD2992D434DAE0B149479307B7B`

## Página: Executivo (9b8d47009241dc052b91)

### HTML Cards Identificados (3)
| Visual ID | Medida | Posição (x, y, w, h) |
|---|---|---|
| 342d6a88d8b70e616911 | HTML Card Total Pedidos | (0, 26.67, 246.67, 211.11) |
| 2eb1d4ed950e087aa501 | HTML Card Total Volumes | (524.44, 26.67, 250, 210) |
| 1e581a9cb024044e836b | HTML Card Comparativo Semanal | (754.44, 228.89, 524.44, 196.67) |

### Outros Visuais (6)
| Visual ID | Tipo | Análise Pendente |
|---|---|---|
| 6ea4bc1c2e9de1060c5d | ? | Sim |
| 8ff98b48a7762169b82e | ? | Sim |
| 9cb87934163ec6a0ded1 | ? | Sim |
| a92ee58a73108da0048a | ? | Sim |
| c94d096fb0170001074b | ? | Sim |
| f61dcbbfbc652ab607a1 | ? | Sim |

## Página: SPR (78d53a1ede414390cb10)

### Visuais (7)
- Análise pendente

## Problemas Identificados

### 1. Layout e Alinhamento
- **Grid não padronizado:** Posições não seguem grid de 12 colunas
- **Espaçamentos inconsistentes:**
  - Gap entre Card Pedidos e Card Volumes: ~277px
  - Gap entre Card Volumes e Card Comparativo: ~230px
- **Sem alinhamento vertical:** Cards em alturas diferentes (26.67 vs 228.89)

### 2. Custom Visuals
- **Alta dependência de HTML:** 3+ HTML cards apenas na página Executivo
- **Manutenibilidade:** HTML cards dificulta versionamento e manutenção
- **Performance:** Custom visuals podem impactar tempo de renderização

### 3. Tema
- **Paleta excessiva:** 100+ cores (complexidade desnecessária)
- **Cores não semânticas:** Falta nomenclatura clara (sucesso, erro, alerta)
- **Sem padronização de cinzas:** Para backgrounds, borders, textos

### 4. Formatação (a verificar em TMDL)
- Tipagem de medidas
- FormatString consistente
- Agrupamento em pastas

## Metas da RODADA 1

1. ✅ **Tema JSON:** Simplificar paleta para 8-12 cores semânticas
2. ✅ **Formatação:** Padronizar FormatString em lote
3. ✅ **Substituir HTML:** 5 cards HTML → nativos
4. ✅ **Cabeçalho:** Template padrão com filtros
5. ✅ **Grid:** Definir 12 colunas e alinhar tudo
6. ✅ **Espaçamentos:** Padronizar 16px entre visuais

## Próximos Passos

1. Ler demais visuais para mapear tipos
2. Ler measures TMDL para analisar formatação
3. Criar tema JSON otimizado
4. Gerar scripts de substituição
