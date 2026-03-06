# Padrões de Formatação de Measures (DAX)

Data: 2026-03-05

## Regras de FormatString

### 1. Números Inteiros
**Padrão:** `#,##0`

**Exemplos:**
- Total Rotas
- Total Pedidos
- Total Volumes
- Veiculos Ativos

### 2. Percentuais
**Padrão:** `0.0%` (1 casa decimal)

**Exceção:** `0.00%` (2 casas) para métricas de precisão alta

**Exemplos:**
- % Entregas Efetivas: `0.0%`
- Aderencia Pedidos (%): `0.0%`
- Utilizacao Jornada 8h (%): `0.0%`

### 3. Decimais (valores absolutos)
**Padrão:** `0.0` (1 casa decimal)

**Exceção:** `0.00` (2 casas) para KPIs como Pedidos/KM

**Exemplos:**
- SPR Ped Realizado: `0.0`
- Media KM por Rota: `0.0`
- Tempo Medio Realizado (h): `0.0`
- Pedidos/KM Realizado: `0.00`

### 4. Valores com Sinal (desvios/variações)
**Padrão:** `+#,##0;-#,##0;0` (inteiros) ou `+0.0;-0.0;0` (decimais)

**Exemplos:**
- Desvio Absoluto Pedidos: `+#,##0;-#,##0;0`
- Var D-1 Rotas: `+#,##0;-#,##0;0`
- Desvio SPR Ped Plan vs Real (pts): `+0.0;-0.0;0`
- Var WoW SPR Pedidos (%): `+0.0%;-0.0%;0.0%`

### 5. Valores Monetários (R$)
**Padrão:** `R$ #,##0.00`

**Exemplos:**
- Custo por Rota (R$): `R$ #,##0.00`
- Custo por Pedido (R$): `R$ #,##0.00`

### 6. Grandes Números (milhares/milhões)
**Padrão:** `#,##0.0,,M` (milhões) ou `#,##0.0,K` (milhares)

**Uso:** Apenas em contextos de visualização onde espaço é crítico

### 7. Texto/Status
**Padrão:** Sem `formatString` (deixar vazio)

**Exemplos:**
- Status ORH
- Alerta Operacional
- Pior Filial SPR Semana
- Match Temporal

## Auditoria de Formatação

### Estado Atual (2026-03-05)
- **Total de measures:** 365
- **Com formatString:** ~149
- **Sem formatString:** ~216 (maioria são medidas de texto/status/HTML)

### Inconsistências Identificadas
- Nenhuma crítica (formatação já está bem padronizada)
- Oportunidade: adicionar formatString em measures auxiliares de cálculo

## Recomendações

1. **Sempre definir formatString** em measures que retornam valores numéricos
2. **Usar separador de milhares** (`,`) para facilitar leitura
3. **Consistência em casas decimais** dentro do mesmo domínio (ex: todas as medidas SPR com 0.0)
4. **Desvios/variações sempre com sinal** (`+` e `-`) para clareza visual
5. **Texto/status sem formatString** (retornam string)

## Próximos Passos

- [ ] Revisar measures auxiliares (flags, helpers) para adicionar formatString se necessário
- [ ] Padronizar casas decimais em medidas de produtividade (Pedidos/h, Volumes/h)
- [ ] Documentar formatação de measures HTML (se forem mantidas)
