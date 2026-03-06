# 04 — Mapa de Módulos do Painel

> Estrutura do dashboard em 8 módulos operacionais. Cada módulo responde a uma pergunta, orienta uma ação e se alimenta de grupos de medidas específicos.

## Visão Geral

```
┌──────────────────────────────────────────────────────────┐
│  M1  Torre de Controle do Dia                            │
│  O que está acontecendo agora?                           │
├──────────────────────────────────────────────────────────┤
│  M2  Execução e Volume           │  M3  Eficiência SPR  │
│  Quanto executamos?              │  A performance é boa? │
├──────────────────────────────────┤──────────────────────┤
│  M4  Jornada e ORH               │  M5  Capacidade/Mix  │
│  Jornadas dentro do limite?      │  Frota bem usada?     │
├──────────────────────────────────┤──────────────────────┤
│  M6  Plano vs Real               │  M7  Entregas        │
│  Aderência ao planejado?         │  Entregamos bem?      │
├──────────────────────────────────────────────────────────┤
│  M8  Investigação Operacional (drill-through)            │
│  Detalhe de filial/rota específica                       │
└──────────────────────────────────────────────────────────┘
```

---

## M1 — Torre de Controle do Dia

| Item | Detalhe |
|------|---------|
| **Pergunta** | Como está a operação agora? O que mudou desde ontem? |
| **Ação** | Identificar exceções imediatas, priorizar intervenções |
| **Grupos** | 01. Operacao, 06. Shared\01. Temporal |
| **Prioridade** | 🔴 Alta — primeira página, leitura em <10 segundos |

### KPIs de Destaque (5)

1. **Total Rotas** + Var D-1 + tendência
2. **SPR Ped Realizado** + Gap vs Meta
3. **% Entregas Efetivas** + Var D-1
4. **Tempo Médio Realizado** + Gap ORH
5. **Score Operacional** (ponderado)

### Layout (3 níveis)

```
Nível 1: [Filtro Data] [Filtro Filial] [Filtro Tipo Veículo]
Nível 2: [KPI Card ×5] — leitura imediata
Nível 3: [Alerta Strip] [Ranking Top/Bottom 5 Filiais] [Variação D-1 resumo]
```

### Visuais Recomendados

- 5 KPI Cards (nativo com formatação condicional ou SVG via DAX)
- Strip de alertas (texto + cor + ícone)
- Tabela ranking filiais com formatação condicional
- Gráfico barras horizontal top/bottom 5

---

## M2 — Execução e Volume

| Item | Detalhe |
|------|---------|
| **Pergunta** | Qual o volume executado vs planejado? Como foi o progresso? |
| **Ação** | Verificar aderência, identificar filiais atrasadas |
| **Grupos** | 01. Operacao\05. Plan vs Real, 01. Operacao\06. Status, 05. Plano vs Real |
| **Prioridade** | 🔴 Alta |

### KPIs de Destaque (4)

1. **Op Progresso Rotas (%)** — barra progresso
2. **Op Progresso Pedidos (%)**
3. **Cobertura Rotas (%)**
4. **Op Rotas Nao Planejadas**

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial]
Nível 2: [Progresso Rotas gauge] [Progresso Pedidos gauge] [Cobertura %] [Não Planejadas]
Nível 3: [Status Rota breakdown] [Tabela filiais × progresso] [Gráfico tendência semanal]
```

### Visuais Recomendados

- Gauge nativo (progresso)
- Clustered bar (status de rota: Aguardando, Carregada, Finalizada)
- Matrix filial × métricas com formatação condicional
- Linha de tendência WoW

---

## M3 — Eficiência / SPR

| Item | Detalhe |
|------|---------|
| **Pergunta** | A performance por rota está adequada? Onde desviar? |
| **Ação** | Ajustar roteirização, investigar filiais abaixo da meta |
| **Grupos** | 02. SPR e Performance |
| **Prioridade** | 🔴 Alta |

### KPIs de Destaque (4)

1. **KPI SPR Ped** (pack completo)
2. **KPI SPR Vol** (pack completo)
3. **KPI Desvio SPR** (plan vs real)
4. **Entregas Efetivas/h**

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial] [Filtro Tipo Veículo]
Nível 2: [KPI SPR Ped Card] [KPI SPR Vol Card] [KPI Desvio Card] [Entregas/h]
Nível 3: [Ranking filiais SPR] [Scatter produtividade h × SPR] [Tendência MA7 SPR]
```

### Visuais Recomendados

- KPI Cards nativos ou SVG
- Tabela ranking com formatação semáforo
- Gráfico scatter (ped/h × SPR Ped)
- Linha MA7 SPR Pedidos

---

## M4 — Jornada / ORH

| Item | Detalhe |
|------|---------|
| **Pergunta** | As jornadas estão dentro dos limites? Há ociosidade? |
| **Ação** | Consolidar rotas curtas, redistribuir overtime |
| **Grupos** | 03. Jornada e ORH |
| **Prioridade** | 🟡 Média-Alta |

### KPIs de Destaque (5)

1. **KPI ORH** (pack completo)
2. **Utilização Jornada 8h (%)**
3. **% Rotas Curtas (<4h)**
4. **% Rotas Overtime (>8h)**
5. **Potencial Consolidação (rotas)**

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial]
Nível 2: [KPI ORH Card] [Utilização %] [% Curtas] [% Overtime] [Potencial]
Nível 3: [Distribuição tempo (histogram nativo)] [Cenários consolidação] [Ranking filiais ORH]
```

### Visuais Recomendados

- KPI Card ORH
- Histogram (distribuição de tempo por faixa)
- Stacked bar (curtas / normais / overtime)
- Tabela filiais × tempo médio com formatação

---

## M5 — Capacidade e Mix de Veículos

| Item | Detalhe |
|------|---------|
| **Pergunta** | A frota está sendo usada adequadamente? Há saturação? |
| **Ação** | Redistribuir tipos, ajustar alocação por filial |
| **Grupos** | 04. Frota e Capacidade |
| **Prioridade** | 🟡 Média |

### KPIs de Destaque (4)

1. **Ocupação Pedidos (%)**
2. **% Rotas Acima Cap**
3. **Rotas por Veículo Dia**
4. **Status Capacidade** (semáforo)

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial] [Filtro Tipo Veículo]
Nível 2: [Ocupação % gauge] [% Acima Cap] [Rotas/Veíc/Dia] [Status]
Nível 3: [Matrix tipo × ocupação] [Ranking filiais ocupação] [Gap capacidade]
```

### Visuais Recomendados

- Gauge ocupação
- Matrix tipo veículo × métricas com heatmap
- Bar chart gap capacidade por filial
- Tabela filial × capacidade com formatação

---

## M6 — Plano vs Real + Reconciliação

| Item | Detalhe |
|------|---------|
| **Pergunta** | Qual a aderência ao planejamento? Onde houve desvio? |
| **Ação** | Calibrar roteirização, ajustar parâmetros de planejamento |
| **Grupos** | 05. Plano vs Real |
| **Prioridade** | 🟡 Média |

### KPIs de Destaque (5)

1. **Aderência Pedidos (%)**
2. **Aderência Volumes (%)**
3. **Cobertura Rotas (%)**
4. **% Match Mesmo Dia**
5. **Gap Médio Plan vs Real (dias)**

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial]
Nível 2: [Aderência Ped] [Aderência Vol] [Cobertura] [Match %] [Gap dias]
Nível 3: [Desvios por dimensão (ped/vol/km/tempo)] [Match temporal breakdown] [Tabela filiais × aderência]
```

### Visuais Recomendados

- KPI Cards aderência
- Clustered bar desvios absolutos (5 dimensões)
- Pie/donut match temporal (Mesmo Dia, D±1, Fora, Sem Planejado)
- Matrix filiais × aderências

---

## M7 — Entregas

| Item | Detalhe |
|------|---------|
| **Pergunta** | A taxa de sucesso está na meta? Onde há mais insucessos? |
| **Ação** | Investigar causas de insucesso, ajustar rotas problemáticas |
| **Grupos** | 98. Suporte (proposto: 08. Entregas) |
| **Prioridade** | 🟡 Média |

### KPIs de Destaque (4)

1. **KPI Entregas** (pack completo)
2. **Total Entregas** / **Total Insucessos**
3. **Taxa Sucesso MA7**
4. **Pior Filial Entregas Semana**

### Layout

```
Nível 1: [Filtro Data] [Filtro Filial]
Nível 2: [KPI Entregas Card] [Total Entregas] [Total Insucessos] [MA7]
Nível 3: [Ranking filiais entregas] [Tendência MA7] [Top 3 piores]
```

---

## M8 — Investigação Operacional (Drill-Through)

| Item | Detalhe |
|------|---------|
| **Pergunta** | Qual o detalhe dessa filial/rota específica? |
| **Ação** | Diagnosticar causa-raiz de exceções |
| **Grupos** | 07. Investigacao\01. Linha Operacional + transversal |
| **Prioridade** | 🟡 Média |

### Funcionamento

- **Drill-through** ativado por filial e/ou data
- Usa medidas `TblExp` no nível de linha
- Exibe todas as rotas da filial/data com flags de exceção

### Colunas da Tabela de Investigação

SPR Ped/Vol (Plan/Real/Delta), Aderência Ped/Vol, % Entregas, % Insucessos, Delta KM/Pedidos/Volumes/Tempo Plan × Real, Flags (Acima Capacidade, Overtime, Fora D±1, Não Planejada, Sem Tempo), Tags Operacionais.

### Visual Recomendado

- Tabela detalhada com formatação condicional por coluna
- Filtro drill-through (filial, data)
- Botão "Voltar" para módulo de origem

---

## Mapeamento Módulos → Páginas Atuais

| Módulo | Página Atual | Ação |
|--------|-------------|------|
| M1 Torre de Controle | 01 Torre de Controle | Manter, otimizar |
| M2 Execução e Volume | 06/07 KPIs Diários | Consolidar em 1 |
| M3 Eficiência SPR | 03 Eficiencia SPR | Manter |
| M4 Jornada ORH | *(não existe)* | **Criar** |
| M5 Capacidade Mix | 04 Capacidade e Mix | Manter |
| M6 Plano vs Real | 05 Plano vs Real | Manter |
| M7 Entregas | *(não existe)* | **Criar** |
| M8 Investigação | *(não existe)* | **Criar** |
| — | 02 Scoreboard | Avaliar → pode ser M1 ou M8 |
| — | 08 Análise Filiais | Avaliar → pode ser M8 |

### Ações sobre Páginas

- **Criar 3 páginas**: Jornada/ORH, Entregas, Investigação (drill-through)
- **Consolidar 2 páginas**: KPIs Diários 06+07 → Execução e Volume
- **Reavaliar 2 páginas**: Scoreboard e Análise Filiais (fundir com Torre de Controle ou Investigação)
- **Criar tooltip pages**: pelo menos 1 para KPI detalhado, 1 para filial spotlight
