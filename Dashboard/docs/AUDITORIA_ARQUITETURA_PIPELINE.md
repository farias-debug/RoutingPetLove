# Auditoria & Consultoria — Arquitetura Pipeline Monitoramento Logístico

**Data**: 2026-03-21
**Escopo**: Pipeline BigQuery (v4 + v5 + v6), API server.js, fluxo ponta a ponta
**Projeto BQ**: `data-aileron-482822-d0.monitoramento_carga`

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visao-geral-da-arquitetura)
2. [Inventário de Objetos](#2-inventario-de-objetos)
3. [Avaliação por Camada](#3-avaliacao-por-camada)
4. [Achados Críticos](#4-achados-criticos)
5. [Mapa de Duplicação de Lógica](#5-mapa-de-duplicacao-de-logica)
6. [Constantes e Hardcodes](#6-constantes-e-hardcodes)
7. [Performance](#7-performance)
8. [Recomendações Priorizadas](#8-recomendacoes-priorizadas)
9. [Changelog de Alterações Recentes](#9-changelog-de-alteracoes-recentes)
10. [Veredicto Geral](#10-veredicto-geral)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│  EXTRAÇÃO (TMS)                                                     │
│  extrair_relatorio_tms.mjs → consolidar_monitoramento.py            │
│  → load_raw_to_bq.py                                                │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  v4 — CAMADA ANALÍTICA  (pipeline_v4.sql, 1.393 linhas)            │
│                                                                     │
│  RAW (3 tables)                                                     │
│    ├── raw_monitoramento                                            │
│    ├── raw_planejamento                                             │
│    └── raw_dim_filial                                               │
│                                                                     │
│  UDFs (14)                                                          │
│    normalize_text, safe_div, adherence_ratio, status_higher,        │
│    status_target_band, capacity_status, status_score, status_color, │
│    vehicle_type_canonical, vehicle_weight_capacity, vehicle_family,  │
│    fn_ocup_composta, fn_tempo_ocioso_jornada, fn_score_operacional  │
│                                                                     │
│  STAGING (2)                                                        │
│    stg_monitoramento (41c) ─→ stg_planejamento (12c)               │
│                                                                     │
│  DIMENSÕES (7)                                                      │
│    dim_calendario, dim_filial, dim_veiculo, dim_transportador,      │
│    dim_status_operacional, dim_planejamento, dim_metas              │
│                                                                     │
│  FATO (1)                                                           │
│    fct_execucao (84 cols, ~28k rows, 1 linha por rota)             │
│                                                                     │
│  MARTS (5)                                                          │
│    mart_ops_diario_filial ── mart_kpi_diario (com 16 LAGs)         │
│    mart_kpi_filial_dia ───── mart_kpi_transportador_dia             │
│    mart_kpi_motorista_dia                                           │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  v5 — CAMADA DE PUBLICAÇÃO  (pipeline_v5_publicacao.sql, 1.069 L)  │
│  13 views PT-BR para Google Sheets                                  │
│                                                                     │
│  metas_globais, dim_filial_tratada, kpi_card_latest,               │
│  kpi_resumo_diario, kpi_filial_dia, kpi_transportador_dia,         │
│  alertas_rotas, drill_rotas, Resumo_Filial,                        │
│  Resumo_Ocupacao_Veic_Transp, VW_Base_Execucao,                    │
│  Resumo_Semana_Filial_Diario, Resumo_Semana_Filial_Matriz          │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  v6 — CAMADA API  (pipeline_v6_api.sql, 313 linhas)                │
│  6 views para consumo REST                                          │
│                                                                     │
│  api_motoristas_jornada, api_resumo_executivo_semanal,              │
│  api_filial_performance, api_transportadores_resumo,                │
│  api_ocupacao_tipo_veiculo, api_alertas_contagem                    │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API (server.js, ~1.450 linhas, 14 endpoints)                       │
│  Express.js — Cloud Run                                             │
│  URL: dashboard-logistico-api-*.us-central1.run.app                 │
│                                                                     │
│  DETALHE: 14/14 endpoints usam SQL inline                           │
│           0/14 endpoints consomem as v6 API views                   │
│           ~1.300 linhas SQL embarcado no server.js                  │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React 18 + Vite + TypeScript + shadcn/ui + Recharts)    │
│  9 páginas, hooks conectados via @tanstack/react-query              │
└─────────────────────────────────────────────────────────────────────┘
```

### Avaliação da Arquitetura em Camadas

| Aspecto | Nota | Comentário |
|---------|------|------------|
| Separação RAW → STG → DIM → FCT → MART | ✅ A | Modelagem Kimball correta |
| UDFs centralizados | ✅ A | 14 UDFs bem definidos |
| Camada de publicação separada (v5) | ✅ B+ | Boa separação, mas PT-BR naming cria overhead |
| Camada API (v6) | ⚠️ C | Criada mas NÃO consumida pelo server.js |
| server.js SQL inline | 🔴 D | 1.300 linhas SQL re-implementando marts |
| Score operacional | 🔴 F | 6 fórmulas divergentes no stack |

---

## 2. Inventário de Objetos

### 2.1 Pipeline v4 — 28 Statements

| # | Tipo | Nome | Linhas | Descrição |
|---|------|------|--------|-----------|
| 1-14 | UDF | normalize_text, safe_div, adherence_ratio, status_higher, status_target_band, capacity_status, status_score, status_color, vehicle_type_canonical, vehicle_weight_capacity, vehicle_family, fn_ocup_composta, fn_tempo_ocioso_jornada, fn_score_operacional | ~140 | Funções reutilizáveis |
| 15 | VIEW | stg_monitoramento | ~60 | Normalização raw (41 cols) |
| 16 | VIEW | stg_planejamento | ~25 | Mapeamento planejamento (12 cols) |
| 17 | VIEW | dim_calendario | ~55 | Calendário derivado das datas em fct |
| 18 | VIEW | dim_filial | ~30 | Filiais + fallback "faltantes" |
| 19 | VIEW | dim_veiculo | ~10 | Veículos canônicos |
| 20 | VIEW | dim_status_operacional | ~10 | Status TMS → fases |
| 21 | VIEW | dim_planejamento | ~15 | Bridge planejado |
| 22 | VIEW | dim_metas | ~20 | 9 KPIs com meta, sentido, unidade |
| 23 | VIEW | fct_execucao | ~200 | Fato central: 5 CTEs, 84 colunas |
| 24 | VIEW | mart_ops_diario_filial | ~65 | Resumo diário × filial |
| 25 | VIEW | mart_kpi_diario | ~110 | KPIs globais diários + 16 LAGs |
| 26 | VIEW | mart_kpi_filial_dia | ~110 | KPIs por filial × dia |
| 27 | VIEW | mart_kpi_transportador_dia | ~110 | KPIs por transportador × dia |
| 28 | VIEW | mart_kpi_motorista_dia | ~80 | KPIs por motorista × dia |

### 2.2 Pipeline v5 — 13 Views de Publicação

| View | Fonte | Rows (deploy) | Propósito |
|------|-------|--------------|-----------|
| metas_globais | dim_metas | 9 | Metas para Sheets |
| dim_filial_tratada | dim_filial | 36 | Filiais tratadas |
| kpi_card_latest | mart_kpi_diario + LAG | 9 | Cards do dia mais recente |
| kpi_resumo_diario | mart_kpi_diario + dim_calendario | 77 | Série diária |
| kpi_filial_dia | mart_kpi_filial_dia | 1.646 | Performance filial/dia |
| kpi_transportador_dia | mart_kpi_transportador_dia | 2.538 | Performance transportador/dia |
| alertas_rotas | fct_execucao | 17.962 | Alertas operacionais |
| drill_rotas | fct_execucao + dim_calendario | 23.731 | Drill detalhado |
| Resumo_Filial | fct_execucao aggregated | 28 | Resumo filial total |
| Resumo_Ocupacao_Veic_Transp | fct_execucao aggregated | 1.639 | Ocupação por transportador |
| VW_Base_Execucao | fct_execucao + dims | 27.627 | Base completa (compatibilidade) |
| Resumo_Semana_Filial_Diario | mart_ops_diario_filial + LAG | 1.646 | Semanal por filial/dia |
| Resumo_Semana_Filial_Matriz | fct_execucao pivot | 6.825 | Matriz pivotada |

### 2.3 Pipeline v6 — 6 Views de API

| View | Fonte | Propósito |
|------|-------|-----------|
| api_motoristas_jornada | fct_execucao | Motoristas agregados |
| api_resumo_executivo_semanal | kpi_resumo_diario | Tendência semanal |
| api_filial_performance | Resumo_Filial + dim_metas | Ranking filiais |
| api_transportadores_resumo | kpi_transportador_dia + Resumo_Ocupacao | Ranking transportadores |
| api_ocupacao_tipo_veiculo | Resumo_Ocupacao_Veic_Transp | Ocupação por veículo |
| api_alertas_contagem | alertas_rotas | Contagens de alertas |

### 2.4 API server.js — 14 Endpoints

| Endpoint | Linhas SQL | Usa View v5/v6? | Complexidade |
|----------|-----------|-----------------|--------------|
| GET /api/metas | ~10 | metas_globais | Baixa |
| GET /api/filtros/opcoes | ~55 | VW_Base_Execucao, alertas_rotas | Média |
| GET /api/resumo/cards | ~95 | alertas_rotas, dim_metas | **Muito Alta** |
| GET /api/resumo/tendencia-semanal | ~60 | VW_Base_Execucao, dim_metas | Alta |
| GET /api/filiais/performance | ~125 | kpi_filial_dia OU Resumo_Filial | **Muito Alta** |
| GET /api/alertas | ~50 | alertas_rotas | Média |
| GET /api/alertas/contagem | ~15 | alertas_rotas | Baixa |
| GET /api/drill-rotas | ~85 | drill_rotas | Alta |
| GET /api/transportadores | ~85 | kpi_transportador_dia + Resumo_Ocupacao | Alta |
| GET /api/frota/ocupacao-tipo | ~28 | Resumo_Ocupacao_Veic_Transp | Baixa |
| GET /api/motoristas | ~45 | api_motoristas_jornada | Média |
| GET /api/motoristas/kpis | ~15 | api_motoristas_jornada | Baixa |
| GET /api/kpi-diario | ~130 | alertas_rotas, VW_Base_Execucao, dim_metas | **Muito Alta** |
| GET /api/executivo/serie-diaria | ~100 | alertas_rotas, dim_metas | Alta |

**Total SQL no server.js**: ~1.300 linhas

---

## 3. Avaliação por Camada

### 3.1 v4 — Camada Analítica

**O que funciona bem:**
- Modelagem dimensional Kimball correta (star schema)
- UDFs centralizados eliminam duplicação de fórmulas em v4
- fct_execucao como grain single-route é correto
- CTEs encadeadas (metas → base → kpis → com_composta → com_status) são legíveis
- 16 LAGs em mart_kpi_diario permitem comparação D-1/D-7

**Problemas identificados:**

1. **Template repetido em 4 marts** — Os marts `mart_kpi_diario`, `mart_kpi_filial_dia`, `mart_kpi_transportador_dia` e `mart_kpi_motorista_dia` copiam o mesmo padrão de ~110 linhas (metas CTE + base CTE + kpis CTE + com_composta CTE + com_status CTE). A única diferença é o GROUP BY. Isso soma ~440 linhas que poderiam ser reduzidas.

2. **CTE metas duplicada 5×** — Cada mart prefetcha as metas via MAX(CASE WHEN...) exatamente igual. Se uma meta for adicionada, é preciso editar 5 marts.

3. **fct_execucao com 84 colunas** — View pesada; qualquer consumidor que faça `SELECT *` busca 84 colds. Aceitável para fact central, mas impacta performance de views downstream.

4. **dim_filial "faltantes"** — CTE que detecta filiais sem mapeamento fazendo full scan de stg_monitoramento. Em volumes maiores, pode ser custoso.

### 3.2 v5 — Camada de Publicação

**O que funciona bem:**
- Separação clara: v5 consome marts, não raw
- Nomes PT-BR alinhados com Google Sheets (necessário para o negócio)
- kpi_card_latest reescrito sem subqueries correlacionadas (CTE ranked + LAG)

**Problemas identificados:**

1. **kpi_card_latest: 9 STRUCTs hardcoded** — 143 linhas para 9 cards. Adicionar um KPI exige adicionar outro STRUCT com 15 campos posicionais. Extremamente frágil.

2. **Resumo_Semana_Filial_Matriz: 20 UNION ALL** — Pivoteia 20 métricas com 20 SELECTs UNION ALL. Difícil de manter.

3. **kpi_resumo_diario e kpi_filial_dia** — Adicionam status/cor que já existem nos marts v4. Se os marts já calculam status/cor, a v5 está recalculando.

4. **4× LEFT JOIN dim_calendario** — Quatro views distintas fazem JOIN com dim_calendario. Poderia ser resolvido materializando data+ano_semana no mart.

### 3.3 v6 — Camada API

**O que funciona bem:**
- Nomes snake_case para consumo por API (correto)
- Boa separação: views específicas por tela do frontend
- api_transportadores_resumo com LEFT JOIN (custos opcionais) é correto

**Problemas identificados:**

1. **api_alertas_contagem SEM filtro temporal** — Retorna totais globais. Deveria receber parâmetro de data ou filtrar CURRENT_DATE().

2. **api_filial_performance: Score recalculado inline** — Usa `status_score(status_higher(...))` inline com 2 KPIs, mas fn_score_operacional existe com 6 KPIs. Resultado: score diverge do v4.

3. **api_motoristas_jornada: fn_score_operacional chamada por rota** — Calcula score dentro do AVG(), o que é semanticamente correto mas computacionalmente caro.

### 3.4 server.js — API REST

**O que funciona bem:**
- Paginação implementada em alertas e drill-rotas
- UDFs BigQuery chamados corretamente no SQL inline
- Normalização camelCase consistente

**Problemas GRAVES:**

1. **0/14 endpoints usa views v6** — As 6 views v6 foram criadas mas NENHUM endpoint as consome. Todo o SQL é inline.

2. **~1.300 linhas SQL embarcadas** — O server.js é essencialmente um "view engine" disfarçado de API. Cada endpoint reimplementa lógica que já existe nos marts.

3. **6 implementações diferentes de Score Operacional** (ver seção 5)

4. **Thresholds hardcoded incompatíveis** — `/api/filiais/performance` usa `>= 0.98` e `>= 0.882` para entregas, mas dim_metas pode ter valores diferentes.

---

## 4. Achados Críticos

### 🔴 CRÍTICO-1: Score Operacional tem 6 fórmulas divergentes

Este é o achado mais grave. O mesmo KPI "Score Operacional" é calculado de 6 formas diferentes no stack:

| Local | Fórmula | KPIs Usados | Resultado |
|-------|---------|-------------|-----------|
| **v4 marts** (fn_score_operacional) | (score_spr + score_entregas + score_rotas + score_orh + score_ader + score_ocup) / 6 × 100 | 6 | 0-100 |
| **server.js /api/resumo/cards** | status_score × 4 KPIs, weighted | 4 | 0-100 |
| **server.js /api/tendencia-semanal** | status_score × 5 KPIs, weighted | 5 | 0-100 |
| **server.js /api/drill-rotas** | (case_delivery×100 + case_overtime×30 + case_critica×30) / 3 | 3 | 0-100 |
| **server.js /api/kpi-diario** | fn_score_operacional UDF (6 params) | 6 | 0-100 |
| **server.js /api/executivo/serie-diaria** | status_score × 5 KPIs + novo divisor | 5 | 0-100 |

**Impacto**: O mesmo dia com mesmos dados pode exibir scores diferentes dependendo da tela do dashboard. Isso é um bug de integridade.

**Causa raiz**: O server.js foi construído em paralelo aos marts, sem consumir as views v6 pré-calculadas.

### 🔴 CRÍTICO-2: v6 API Views não são usadas

As 6 views v6 (`api_motoristas_jornada`, `api_filial_performance`, etc.) foram criadas especificamente para o consumo REST, mas o server.js não as utiliza. Em vez disso, reimplementa toda a lógica inline.

**Impacto**:
- ~1.300 linhas SQL desnecessário no server.js
- Qualquer mudança de regra precisa ser aplicada tanto nas views quanto no server.js
- Drift silencioso entre o que v6 calcula e o que o endpoint retorna

### 🟠 ALTO-1: SPR calculado em 11+ pontos diferentes

```sql
-- Este padrão aparece em 5 marts, 4 views v5 e 2 views v6:
SAFE_DIVIDE(SUM(volumes), CAST(COUNT(DISTINCT rotas) AS FLOAT64))
```

Não é uma UDF porque a agregação (SUM/COUNT) não pode ser encapsulada em UDF escalar BigQuery. Porém, ter a fórmula em 11 pontos é risco de drift.

### 🟠 ALTO-2: Filtro `tipo_filial = 'Unidade'` em 16 pontos

Cada mart, cada view v5 e cada view v6 aplica `WHERE tipo_filial = 'Unidade'` separadamente. Se o negócio precisar incluir "CD" ou "Hub", são 16+ edições.

### 🟡 MÉDIO-1: kpi_card_latest com 9 STRUCTs hardcoded

Cada card é um STRUCT posicional de 15 campos. Se for necessário adicionar novo KPI ("Tempo Médio de Entrega"), é preciso adicionar ~16 linhas de STRUCT sem autocomplete ou validação.

---

## 5. Mapa de Duplicação de Lógica

### Matriz Lógica × Localização

| Lógica de Negócio | v4 UDFs | v4 Marts | v5 Views | v6 Views | server.js | Total |
|--------------------|---------|----------|----------|----------|-----------|-------|
| SPR (volumes/rotas) | — | 5× | 4× | 2× | 5× | **16** |
| Entregas Efetivas | — | 5× | 4× | 1× | 4× | **14** |
| ORH (tempo/rotas) | — | 5× | 3× | 1× | 3× | **12** |
| DPPH (entregas/hora) | — | 5× | 2× | — | 1× | **8** |
| Score Operacional | 1 UDF | 5× | 3× | 2× | 6× | **17** |
| Status + Cor | 3 UDFs | 5× | 4× | 1× | 3× | **16** |
| Ocupação Composta | 1 UDF | 5× | 2× | — | — | **8** |
| Capacidade Peso | 1 UDF | — | 1× | 1× | 1× | **4** |
| Aderência | 1 UDF | 4× | 2× | 1× | 2× | **10** |
| Metas pivot | — | 5× | — | 2× | 5× | **12** |

### Padrão: CTE Metas duplicada

```sql
-- Esta CTE aparece EXATAMENTE igual em 5 marts v4 + 5 endpoints server.js:
metas AS (
  SELECT
    MAX(CASE WHEN kpi_id = 'spr_pedidos' THEN meta END) AS meta_spr_ped,
    MAX(CASE WHEN kpi_id = 'spr_volumes' THEN meta END) AS meta_spr_vol,
    MAX(CASE WHEN kpi_id = 'orh'         THEN meta END) AS meta_orh,
    ...
  FROM dim_metas
)
```

**10 cópias exatas** desta CTE no codebase.

---

## 6. Constantes e Hardcodes

### Listagem completa de valores hardcoded

| Constante | Valor | Localização | Risco |
|-----------|-------|-------------|-------|
| Jornada padrão | 8.0h | fn_tempo_ocioso_jornada, pct_util_jornada | Médio — se regulação mudar |
| ORH banda Atenção | 1.0h | status_target_band calls (5× marts) | Baixo — parâmetro da UDF |
| ORH banda Crítico | 2.1h | status_target_band calls (5× marts) | Baixo — parâmetro da UDF |
| Ocupação OK | 0.85-1.05 | capacity_status UDF | Médio — deveria ser configurável |
| Ocupação Crítico | < 0.70 | capacity_status UDF | Médio |
| Score OK | 1.0 | status_score UDF | Baixo |
| Score Atenção | 0.5 | status_score UDF | Baixo |
| Score Crítico | 0.0 | status_score UDF | Baixo |
| Score Saturado | 0.25 | status_score UDF | Baixo |
| Score ≥ 75 → OK | 75 | kpi_card_latest | Médio — threshold do card |
| Score ≥ 50 → Atenção | 50 | kpi_card_latest | Médio |
| Entregas OK (server) | ≥ 0.98 | /api/filiais/performance | **Alto — diverge de dim_metas** |
| Entregas Atenção (server) | ≥ 0.882 | /api/filiais/performance | **Alto** |
| Rotas OK (server) | ≥ 0.95 | /api/filiais/performance | **Alto** |
| Cores status | #12B76A, #F79009, #F04438 | status_color UDF + 3× server.js | Baixo |
| Capacidades veículo (12) | 50-20000 kg | vehicle_weight_capacity UDF | Médio — novos veículos = editar UDF |
| meta score "100" | 100.0 | kpi_card_latest (Score Diário) | Baixo |

### Constantes no server.js vs. dim_metas

O server.js tem um `mapMetaKpiId()` lookup table (linhas 109-122) que mapeia nomes de KPI para IDs. Se dim_metas mudar os IDs, server.js precisa ser atualizado manualmente.

Adicionalmente, `/api/filiais/performance` hardcoda thresholds (`>= 0.98`, `>= 0.882`) para entregas mas dim_metas pode ter `meta_entregas = 0.95`. Isso causa **inconsistência reportada no dashboard**.

---

## 7. Performance

### 7.1 Patterns de Query Custos

| Pattern | Ocorrências | Impacto |
|---------|-------------|---------|
| Full scan de fct_execucao (84 cols, ~28k rows) | Cada view v5/v6 e mart | Moderado — cresce com dados |
| CROSS JOIN metas (1 row → N rows) | 12× (marts + v6 + server.js) | Baixo — 1 row |
| 16× LAG() OVER em mart_kpi_diario | 1× | Moderado — janela sort |
| REGEXP_EXTRACT para parsing tempo | stg_monitoramento | **Alto** — fragile, slow |
| STRING_AGG LIMIT 3 hardcoded | v5 views | Baixo |
| COUNTIF sem WHERE temporal | api_alertas_contagem | **Alto** — full scan global |
| 6 queries DISTINCT sem LIMIT | /api/filtros/opcoes | Moderado |
| FULL OUTER JOIN normalize_text | /api/transportadores | Moderado |
| UNNEST 9 STRUCTs + CROSS JOIN | kpi_card_latest | Baixo — 1 row input |

### 7.2 Estimativa de Custo BQ

Com ~28k rows e tudo em views (não materialized), cada requisição da API executa:
- **fct_execucao**: scaneada por CADA mart chamado
- Marts não são materializados → recalculados a cada query
- Uma chamada de `/api/kpi-diario` com 130 linhas SQL provavelmente scaneia fct_execucao 2-3× (via alertas_rotas + VW_Base_Execucao)

Para o volume atual (~28k rows), não é crítico. **Se crescer para 100k+ rows**, materialização será necessária.

### 7.3 Views vs. Materialized Views

| Candidata a Materializar | Consumidores | Frequência de Update | Benefício |
|--------------------------|-------------|---------------------|-----------|
| fct_execucao | Tudo | 1×/dia | **Alto** — 84 cols, mais consultada |
| mart_kpi_diario | kpi_resumo_diario, kpi_card_latest | 1×/dia | Alto — 16 LAGs |
| mart_kpi_filial_dia | kpi_filial_dia, server.js | 1×/dia | Médio |
| mart_kpi_transportador_dia | kpi_transportador_dia, server.js | 1×/dia | Médio |

---

## 8. Recomendações Priorizadas

### P0 — Correções de Integridade (Fazer imediatamente)

#### R1: Unificar Score Operacional no server.js
**Problema**: 6 fórmulas divergentes.
**Ação**: Substituir TODOS os cálculos de score no server.js por chamada direta a `fn_score_operacional()` UDF (6 parâmetros), que já é a fonte de verdade nos marts v4.

**Antes** (3 variantes no server.js):
```sql
-- /api/resumo/cards (4 KPIs)
(status_score(spr) + status_score(entregas) + status_score(orh) + status_score(ocup)) / 4 * 100

-- /api/drill-rotas (3 CASE statements)
(case_delivery × 100 + case_overtime × 30 + case_critica × 30) / 3
```

**Depois** (única fórmula):
```sql
fn_score_operacional(s_spr, s_entregas, s_rotas, s_orh, s_ader, s_ocup)
```

**Esforço**: Médio (editar 6 endpoints)
**Impacto**: Crítico

#### R2: Remover thresholds hardcoded do server.js
**Problema**: `/api/filiais/performance` usa `>= 0.98` / `>= 0.882` — diverge de dim_metas.
**Ação**: Substituir por JOIN com dim_metas.

**Esforço**: Baixo
**Impacto**: Alto

#### R3: Adicionar filtro temporal em api_alertas_contagem
**Problema**: Retorna contagem global, não do dia/período.
**Ação**: Adicionar `WHERE a.Data >= @data_inicio` ou `WHERE a.Data = CURRENT_DATE()`.

**Esforço**: Baixo
**Impacto**: Médio

### P1 — Eliminação de Duplicação (Curto prazo)

#### R4: Migrar server.js para consumir views v6 + v5
**Problema**: 14/14 endpoints reimplementam SQL que já existe em views.
**Ação progressiva**:

| Endpoint | View existente que deveria usar |
|----------|-------------------------------|
| /api/metas | `metas_globais` |
| /api/resumo/cards | Criar `api_cards_daily` (baseada em kpi_card_latest + ajustes) |
| /api/resumo/tendencia-semanal | `api_resumo_executivo_semanal` |
| /api/filiais/performance | `api_filial_performance` |
| /api/alertas | `alertas_rotas` + paginação |
| /api/alertas/contagem | `api_alertas_contagem` |
| /api/drill-rotas | `drill_rotas` + paginação |
| /api/transportadores | `api_transportadores_resumo` |
| /api/frota/ocupacao-tipo | `api_ocupacao_tipo_veiculo` |
| /api/motoristas | `api_motoristas_jornada` |
| /api/motoristas/kpis | `api_motoristas_jornada` (agg) |
| /api/kpi-diario | Criar `api_kpi_diario` (baseada em mart_kpi_diario) |
| /api/executivo/serie-diaria | Criar `api_serie_diaria` |
| /api/filtros/opcoes | Criar `api_filtros_opcoes` |

**Resultado**: server.js reduziria de ~1.300 linhas SQL para ~200 (somente paginação, filtros e mapeamento).

**Esforço**: Alto
**Impacto**: Crítico — elimina drift, simplifica manutenção

#### R5: Extrair CTE metas para view materializada
**Problema**: CTE metas copiada 10× no codebase.
**Ação**: Criar view `metas_pivot` que pivoteia dim_metas:
```sql
CREATE VIEW metas_pivot AS
SELECT
  MAX(CASE WHEN kpi_id = 'spr_pedidos' THEN meta END) AS meta_spr_ped,
  ...
FROM dim_metas;
```
Substituir CROSS JOIN metas por CROSS JOIN metas_pivot em todos os marts.

**Esforço**: Baixo
**Impacto**: Médio

### P2 — Melhorias Estruturais (Médio prazo)

#### R6: Parametrizar kpi_card_latest
**Problema**: 9 STRUCTs hardcoded de 15 campos posicionais.
**Ação**: Criar tabela `dim_kpi_card_config` com colunas: kpi_id, label, unidade, formato, acao_critico. A view leria config da tabela em vez de hardcodar.

**Esforço**: Alto
**Impacto**: Médio — melhora maintainability

#### R7: Criar macro/template para marts
**Problema**: 4 marts com padrão idêntico (~440 linhas copiadas).
**Ação**: Se BigQuery suportasse macros (não suporta nativamente), usar geração por script Python. Alternativa: aceitar a duplicação mas documentar o padrão com checklist de edição.

**Esforço**: Médio
**Impacto**: Médio

#### R8: Materializar fct_execucao e marts
**Problema**: Cada query recomputa toda a cadeia de views.
**Ação**: Converter fct_execucao e mart_kpi_diario para MATERIALIZED VIEW com refresh diário pós-load.

**Esforço**: Médio (precisa de scheduled query)
**Impacto**: Alto em performance

#### R9: Consolidar Resumo_Semana_Filial_Matriz
**Problema**: 20 UNION ALL para pivotar métricas.
**Ação**: Usar UNPIVOT (GA no BigQuery) ou tabela de configuração.

**Esforço**: Médio
**Impacto**: Baixo

### P3 — Qualidade e Observabilidade (Longo prazo)

#### R10: Adicionar data contract entre v6 views e server.js
**Ação**: Schema validation automática no deploy — verificar que as colunas esperadas pelo server.js existem na view v6.

#### R11: Criar teste de paridade de score
**Ação**: Test automático que compara score_operacional de mart_kpi_diario com o score retornado por cada endpoint da API para os mesmos dados.

#### R12: Index/clustering em fct_execucao
**Ação**: Se materializada, adicionar `CLUSTER BY (tipo_filial, data_planejada)` — os dois filtros mais frequentes.

---

## 9. Changelog de Alterações Recentes

### Sessão 2026-03-21 — P0/P1/P2

| Item | Arquivo | Descrição |
|------|---------|-----------|
| ✅ P0 | pipeline_v4.sql | DPPH corrigido: `entregas/tempo_operacional` (antes era `entregas/rotas`) |
| ✅ P0 | pipeline_v4.sql | Score v6: `fn_score_operacional` com 6 KPIs (incluindo aderência e ocupação) |
| ✅ P1 | pipeline_v4.sql | `mart_kpi_motorista_dia` adicionado (KPIs por motorista × dia) |
| ✅ P1 | pipeline_v4.sql | `ocup_peso_veiculo` adicionado em fct_execucao (peso / capacidade veículo) |
| ✅ P1 | pipeline_v4.sql | 16 colunas LAG (D-1 + D-7) em mart_kpi_diario |
| ✅ P1 | pipeline_v5_publicacao.sql | `kpi_card_latest` reescrito: CTE ranked com LAG (sem subqueries correlacionadas) |
| ✅ P1 | pipeline_v5_publicacao.sql | `kpi_resumo_diario` LAG columns ajustados para não conflitar com mart |
| ✅ P2 | api/server.js | 5 endpoints limpos: hardcoded metas → dim_metas |
| ✅ P2 | api/server.js | Score operacional corrigido nos endpoints limpos |
| ✅ P2 | frontend/ | ResumoExecutivo → redirect para CockpitOperacional |
| ✅ P2 | frontend/ | TypeScript: aderenciaVolumes corrigido para `number \| null` |
| ✅ NEW | bigquery/regression_test.py | Snapshot/compare pré/pós-deploy |
| ✅ NEW | bigquery/validate_pipeline.py | 16 checks: row counts, freshness, ranges, formulas, parity |
| ✅ NEW | scripts/health_check.ps1 | BQ freshness check adicionado |

### Deploy Status pós-alterações

| Camada | Resultado |
|--------|-----------|
| v4 | 28/28 OK |
| v5 | 13/13 OK |
| Regression test | 0 deviações |
| Validation | 16/16 PASS |

---

## 10. Veredicto Geral

### A arquitetura faz sentido?

**SIM, na essência.** A modelagem dimensional (RAW → STG → DIM → FCT → MART) é correta e segue boas práticas de data warehousing. As camadas v4/v5/v6 como conceito estão certas — separar lógica analítica (v4), publicação para Sheets (v5) e consumo API (v6) é uma boa decisão.

### Onde está o problema?

O problema **não está na arquitetura conceitual**, mas sim na **execução do server.js**. A camada de API ignora completamente as views v6 e reimplementa tudo inline, criando:

1. **6 fórmulas diferentes de Score Operacional** — bug de integridade
2. **~1.300 linhas SQL desnecessário** — overhead de manutenção
3. **Thresholds divergentes** — dim_metas diz uma coisa, server.js diz outra
4. **Duplicação em cascata** — cada correção precisa ser aplicada em N pontos

### Recomendação estratégica

A ação de maior impacto é **R4: Migrar server.js para consumir views v6/v5**. Isso:
- Elimina ~1.100 linhas SQL inline
- Unifica score operacional (fonte única: marts v4 → views → API)
- Remove thresholds hardcoded
- Reduz o risco de drift para zero
- Simplifica deploys (alterar SQL = alterar view, não redeploy server.js)

Seguindo com materialização (R8) e data contracts (R10), o pipeline fica robusto para escalar.

### Nota final: o que NÃO precisa mudar

- **fct_execucao com 84 colunas**: correto para fact table, não simplificar
- **UDFs centralizados**: manter e expandir
- **dim_metas como fonte de verdade**: manter e respeitar
- **Separação v4/v5/v6**: manter — cada camada tem seu propósito
- **kpi_card_latest como UNNEST**: padrão BigQuery válido, só precisa ser table-driven
- **Frontend React com @tanstack/react-query**: stack moderno e correto
